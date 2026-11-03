import "server-only";
// La réception des notifications Stripe (ADR-053 § 5), au format « léger »
// que Stripe recommande pour une intégration neuve : la notification ne porte
// que le type et l'identifiant de l'objet ; tout le reste est relu par l'API.
//
// 1. Signature vérifiée sur le corps BRUT (tolérance par défaut : 5 minutes,
//    l'anti-rejeu). Refusée : 400, sans rien journaliser de la charge utile.
// 2. Mode de l'événement = mode de la clé : un `whsec_` ne dit pas le sien.
// 3. Prise en charge par identifiant (`evenements.ts`) : un doublon répond
//    200 sans rien refaire ; une livraison déjà en cours, 409 (Stripe relance).
// 4. Le client Stripe de l'objet, puis `synchroniserClientStripe`.
// 5. Échec : 500, l'événement est rendu à la relance suivante de Stripe
//    (3 jours en production), avec un motif écrit par Rojer.

import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import type { ModeStripe } from "./config";
import { marquerEchec, marquerTraite, oublierLesAnciens, prendreEnCharge } from "./evenements";
import { OPTIONS_WEBHOOK, synchroniserClientStripe } from "./synchronisation";

/** Une notification légère pèse moins d'un kilo-octet. */
export const TAILLE_MAX_NOTIFICATION = 64 * 1024;

export type NotificationStripe = Stripe.V2.Core.EventNotification;

/**
 * Les événements à abonner sur la destination Stripe (format léger), et les
 * seuls que Rojer traite. Toute la famille `v1.customer.subscription.*` est
 * traitée de la même façon.
 */
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
] as const;

const FACTURES = new Set(["v1.invoice.paid", "v1.invoice.payment_failed", "v1.invoice.payment_action_required"]);

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
    return estErreurStripe(e) && e.type === "StripeSignatureVerificationError"
      ? { ok: false, motif: "signature refusée" }
      : { ok: false, motif: "format inattendu (la destination doit envoyer des événements légers)" };
  }
}

const idDe = (c: string | { id: string } | null | undefined) => (typeof c === "string" ? c : (c?.id ?? null));

/** Le client Stripe de l'objet de la notification, relu par l'API ; `null` : rien à suivre. */
async function clientDeLObjet(stripe: Stripe, n: NotificationStripe): Promise<string | null> {
  const objet = "related_object" in n ? (n.related_object as { id?: unknown } | null) : null;
  const id = objet?.id;
  if (typeof id !== "string" || !id) return null;
  if (n.type.startsWith("v1.customer.subscription.")) {
    return idDe((await stripe.subscriptions.retrieve(id, {}, OPTIONS_WEBHOOK)).customer);
  }
  if (n.type === "v1.checkout.session.completed") {
    const session = await stripe.checkout.sessions.retrieve(id, {}, OPTIONS_WEBHOOK);
    return session.mode === "subscription" ? idDe(session.customer) : null;
  }
  if (FACTURES.has(n.type)) return idDe((await stripe.invoices.retrieve(id, {}, OPTIONS_WEBHOOK)).customer);
  return null;
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

  const prise = await prendreEnCharge(n.id, n.type);
  if (prise === "deja-traite") return 200;
  if (prise === "en-cours") return 409;

  try {
    const customerId = await clientDeLObjet(stripe, n);
    const r = customerId
      ? await synchroniserClientStripe(stripe, customerId)
      : ({ issue: "ignore", motif: "événement sans client Stripe à suivre" } as const);
    const motif = r.issue === "ignore" ? r.motif : null;
    if (motif) console.warn(`stripe : ${n.type} ${n.id} sans effet — ${motif}`);
    await marquerTraite(n.id, motif);
    await oublierLesAnciens();
    return 200;
  } catch (e) {
    const motif = motifDErreur(e);
    console.error(`stripe : ${n.type} ${n.id} en échec — ${motif}`);
    await marquerEchec(n.id, motif);
    return 500;
  }
}

type ErreurStripe = { type: string; statusCode?: number; code?: string };

function estErreurStripe(e: unknown): e is ErreurStripe {
  return typeof e === "object" && e !== null && typeof (e as ErreurStripe).type === "string"
    && (e as ErreurStripe).type.startsWith("Stripe");
}

/** Un motif écrit par Rojer : la nature de l'erreur, jamais son message (qui peut citer des données). */
export function motifDErreur(e: unknown): string {
  if (estErreurStripe(e)) return `API Stripe : ${e.type}${e.statusCode ? ` ${e.statusCode}` : ""}${e.code ? ` (${e.code})` : ""}`;
  if (e instanceof Prisma.PrismaClientKnownRequestError) return `base : ${e.code}`;
  return "erreur inattendue";
}
