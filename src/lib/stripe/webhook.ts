import "server-only";
// La réception des notifications Stripe (ADR-053 § 5), au format « léger »
// que Stripe recommande pour une intégration neuve : la notification ne porte
// que le type et l'identifiant de l'objet ; tout le reste est relu par l'API.
//
// 1. Corps lu avec une borne en octets, puis signature vérifiée sur ce corps
//    BRUT (tolérance par défaut : 5 minutes, l'anti-rejeu). Refusée : 400,
//    sans rien journaliser de la charge utile.
// 2. Mode de l'événement = mode de la clé : un `whsec_` ne dit pas le sien.
// 3. L'événement est enregistré « si absent » (`evenements.ts`), puis 200 :
//    ni appel Stripe ni logique dans la requête (ADR-053 § 5, amendé le
//    2026-11-10 — Stripe demande de répondre vite et de traiter par une
//    file). Un doublon répond 200 aussi. L'aiguillage et la relecture
//    suivent (`traitement.ts`). Base injoignable : 500, Stripe relance.

import Stripe from "stripe";
import type { ModeStripe } from "./config";
import { enregistrer } from "./evenements";
import { motifDErreur } from "./synchronisation";

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
  // Alerte et relecture du client (ADR-053 § 5, amendé le 2026-11-10).
  "v1.charge.dispute.created",
  "v1.charge.refunded",
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


/**
 * Le code HTTP à rendre à Stripe : l'événement enregistré, rien d'autre.
 * `true` en second : un événement neuf, à traiter après la réponse.
 */
export async function recevoirNotificationStripe(n: NotificationStripe, mode: ModeStripe): Promise<{ status: number; neuf: boolean }> {
  if (n.livemode !== (mode === "live")) {
    console.error(`stripe : événement ${n.livemode ? "de production" : "de test"} refusé, la clé est en mode ${mode}`);
    return { status: 400, neuf: false };
  }
  const objetId = (n as { related_object?: { id?: unknown } | null }).related_object?.id;
  try {
    const neuf = await enregistrer(n.id, n.type, typeof objetId === "string" ? objetId : null);
    return { status: 200, neuf };
  } catch (e) {
    console.error(`stripe : ${n.type} ${n.id} non enregistré — ${motifDErreur(e)}`);
    return { status: 500, neuf: false };
  }
}
