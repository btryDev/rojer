import "server-only";
// La réception des notifications Stripe (ADR-053 § 5), au format « léger »
// que Stripe recommande pour une intégration neuve : la notification ne porte
// que le type et l'identifiant de l'objet ; tout le reste est relu par l'API.
//
// 1. Corps lu avec une borne en octets, puis signature vérifiée sur ce corps
//    BRUT (tolérance par défaut : 5 minutes, l'anti-rejeu). Refusée : 400,
//    sans rien journaliser de la charge utile.
// 2. Mode de l'événement = mode de la clé : un `whsec_` ne dit pas le sien.
// 3. Prise en charge par identifiant (`evenements.ts`) : un doublon répond
//    200 sans rien refaire ; une livraison déjà en cours, 409 (Stripe relance).
// 4. Le client Stripe de l'objet, puis `synchroniserClientStripe`.
// 5. Échec : 500, l'événement est rendu à la relance suivante de Stripe
//    (3 jours en production), avec un motif écrit par Rojer.

import Stripe from "stripe";
import type { ModeStripe } from "./config";
import { OPTIONS_WEBHOOK } from "./client";
import { marquerEchec, marquerTraite, oublierLesAnciens, prendreEnCharge } from "./evenements";
import { codePrisma, synchroniserClientStripe, type Synchronisation } from "./synchronisation";

/** Une notification légère pèse moins d'un kilo-octet. */
export const TAILLE_MAX_NOTIFICATION = 64 * 1024;

export type NotificationStripe = Stripe.V2.Core.EventNotification;

/** Les événements à abonner sur la destination Stripe (format léger), et les seuls que Rojer traite. */
export const EVENEMENTS_ECOUTES = [
  "v1.checkout.session.completed",
  "v1.customer.subscription.created",
  "v1.customer.subscription.updated",
  "v1.customer.subscription.deleted",
  "v1.customer.subscription.paused",
  "v1.customer.subscription.resumed",
  "v1.customer.subscription.trial_will_end",
  "v1.invoice.paid",
  "v1.invoice.payment_failed",
  "v1.invoice.payment_action_required",
] as const satisfies readonly NotificationStripe["type"][];

/**
 * Le corps brut, lu au plus `max` octets — que l'expéditeur annonce sa
 * taille ou l'envoie par morceaux. `null` : trop gros.
 */
export async function lireCorpsBorne(request: Request, max = TAILLE_MAX_NOTIFICATION): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
  if (!request.body) return "";
  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let taille = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    taille += value.byteLength;
    if (taille > max) {
      await lecteur.cancel();
      return null;
    }
    morceaux.push(value);
  }
  return Buffer.concat(morceaux).toString("utf8");
}

export type Verification = { ok: true; notification: NotificationStripe } | { ok: false; motif: string };

export function verifierNotificationStripe(
  stripe: Stripe,
  corps: string,
  signature: string | null,
  secret: string,
): Verification {
  if (!signature) return { ok: false, motif: "en-tête Stripe-Signature absent" };
  try {
    return { ok: true, notification: stripe.parseEventNotification(corps, signature, secret) };
  } catch (e) {
    // L'erreur de signature porte la charge utile : on n'en garde que la nature.
    return e instanceof Stripe.errors.StripeSignatureVerificationError
      ? { ok: false, motif: "signature refusée" }
      : { ok: false, motif: "format inattendu (la destination doit envoyer des événements légers)" };
  }
}

const idDe = (c: string | { id: string } | null | undefined) => (typeof c === "string" ? c : (c?.id ?? null));

type ObjetSuivi = { customerId: string | null; abonnement?: Stripe.Subscription };

/** Le client Stripe de l'objet de la notification, relu par l'API ; `customerId` nul : rien à suivre. */
async function objetSuivi(stripe: Stripe, n: NotificationStripe): Promise<ObjetSuivi> {
  switch (n.type) {
    case "v1.customer.subscription.created":
    case "v1.customer.subscription.updated":
    case "v1.customer.subscription.deleted":
    case "v1.customer.subscription.paused":
    case "v1.customer.subscription.resumed":
    case "v1.customer.subscription.trial_will_end": {
      const abonnement = await stripe.subscriptions.retrieve(n.related_object.id, {}, OPTIONS_WEBHOOK);
      return { customerId: idDe(abonnement.customer), abonnement };
    }
    case "v1.checkout.session.completed": {
      const session = await stripe.checkout.sessions.retrieve(n.related_object.id, {}, OPTIONS_WEBHOOK);
      return { customerId: session.mode === "subscription" ? idDe(session.customer) : null };
    }
    case "v1.invoice.paid":
    case "v1.invoice.payment_failed":
    case "v1.invoice.payment_action_required":
      return { customerId: idDe((await stripe.invoices.retrieve(n.related_object.id, {}, OPTIONS_WEBHOOK)).customer) };
    default:
      return { customerId: null };
  }
}

const SANS_CLIENT: Synchronisation = { issue: "ignore", motif: "événement sans client Stripe à suivre" };

/** Au plus un ménage par heure et par processus, après la réponse : il ne la retarde ni ne la change. */
let dernierMenage = 0;
function menageDeTempsEnTemps() {
  if (Date.now() - dernierMenage < 60 * 60_000) return;
  dernierMenage = Date.now();
  void oublierLesAnciens().catch(() => console.warn("stripe : ménage des événements en échec"));
}

/** Le code HTTP à rendre à Stripe. */
export async function traiterNotificationStripe(
  stripe: Stripe,
  n: NotificationStripe,
  mode: ModeStripe,
): Promise<number> {
  if (n.livemode !== (mode === "live")) {
    console.error(`stripe : événement ${n.livemode ? "de production" : "de test"} refusé, la clé est en mode ${mode}`);
    return 400;
  }

  const p = await prendreEnCharge(n.id, n.type);
  if (p.etat !== "prise") return p.etat === "deja-traite" ? 200 : 409;

  try {
    const { customerId, abonnement } = await objetSuivi(stripe, n);
    const r = customerId ? await synchroniserClientStripe(stripe, customerId, { abonnementLu: abonnement }) : SANS_CLIENT;
    const motif = r.issue === "ignore" ? r.motif : null;
    if (r.issue === "ignore") {
      if (r.alerte) console.error(`stripe : ${n.type} ${n.id} non enregistré — ${r.motif}`);
      else console.warn(`stripe : ${n.type} ${n.id} sans effet — ${r.motif}`);
    }
    await marquerTraite(n.id, p.prise, motif);
  } catch (e) {
    const motif = motifDErreur(e);
    console.error(`stripe : ${n.type} ${n.id} en échec — ${motif}`);
    await marquerEchec(n.id, p.prise, motif);
    return 500;
  }
  menageDeTempsEnTemps();
  return 200;
}

/** Un motif écrit par Rojer : la nature de l'erreur, jamais son message (qui peut citer des données). */
export function motifDErreur(e: unknown): string {
  if (e instanceof Stripe.errors.StripeError) {
    return `API Stripe : ${e.type}${e.statusCode ? ` ${e.statusCode}` : ""}${e.code ? ` (${e.code})` : ""}`;
  }
  const code = codePrisma(e);
  return code ? `base : ${code}` : "erreur inattendue";
}
