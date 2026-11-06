import "server-only";
// Passer au payant pendant l'essai, ou reprendre un abonnement en pause
// (ADR-053 § 10, amendé le 2026-11-05) : la formule et le rythme se
// choisissent dans Rojer, la carte s'enregistre sur la page hébergée de
// Stripe (Checkout, mode « setup »), puis la formule s'applique à
// l'abonnement qui court.
//
// `finaliserCarte` se joue deux fois, et c'est voulu : au retour de Checkout
// (la page appelle l'action dès son ouverture) et par le webhook
// (`checkout.session.completed`), si le client a fermé l'onglet. Elle est
// idempotente. Tout se relit chez Stripe : la session (son client, son état,
// la formule posée par Rojer à sa création), puis les abonnements du client.

import type Stripe from "stripe";
import { abonnementsDuClient, appliquerFormule, prixDesFormules } from "@/lib/stripe/parcours";
import { abonnementCourant, synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import { SANS_PAIEMENT_ENCORE } from "./droits";
import { estLookupKey } from "./formules";

const idDe = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

export type IssueCarte = "appliquee" | "rien";

/**
 * Appliquer ce qu'une session Checkout « carte » a recueilli. `customerId` :
 * le client attendu (l'action le lit sur le compte connecté) ; une session
 * d'un autre client ne fait rien.
 */
export async function finaliserCarte(
  stripe: Stripe,
  sessionId: string,
  attendu?: { customerId: string },
): Promise<IssueCarte> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["setup_intent"] });
  const customerId = idDe(session.customer);
  if (session.mode !== "setup" || session.status !== "complete" || !customerId) return "rien";
  if (attendu && attendu.customerId !== customerId) return "rien";
  const formule = session.metadata?.formule;
  const intention = session.setup_intent;
  const paymentMethodId = intention && typeof intention === "object" ? idDe(intention.payment_method) : null;
  if (!estLookupKey(formule) || !paymentMethodId) return "rien";

  const { courant } = abonnementCourant(await abonnementsDuClient(stripe, customerId));
  // Déjà payant (une première finalisation est passée) ou terminé : rien à faire.
  if (!courant || !SANS_PAIEMENT_ENCORE.has(courant.status)) return "rien";
  const prix = (await prixDesFormules(stripe)).get(formule);
  if (!prix) throw new Error("prix introuvable");

  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  await appliquerFormule(stripe, courant, {
    priceId: prix.priceId,
    paymentMethodId,
    immediat: session.metadata?.immediat === "oui",
  });
  await synchroniserClientStripe(stripe, customerId);
  return "appliquee";
}
