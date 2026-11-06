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
import { abonnementCourant, idStripe, synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import { SANS_PAIEMENT_ENCORE } from "./droits";
import { estLookupKey } from "./formules";

/**
 * `appliquee` (`immediat` : le premier mois vient d'être prélevé) ; `aRegler` :
 * la facture attend un paiement (refus, authentification), à son adresse ;
 * `rien`.
 */
/** La carte par défaut du client Stripe, s'il en a une. */
export async function carteParDefaut(stripe: Stripe, customerId: string): Promise<string | null> {
  const client = await stripe.customers.retrieve(customerId);
  return client.deleted ? null : idStripe(client.invoice_settings?.default_payment_method);
}

export type IssueCarte = { issue: "appliquee"; immediat: boolean } | { issue: "aRegler"; url: string } | { issue: "rien" };
const RIEN: IssueCarte = { issue: "rien" };

/**
 * Appliquer ce qu'une session Checkout « carte » a recueilli. `customerId` :
 * le client attendu (l'action le lit sur le compte connecté) ; une session
 * d'un autre client ne fait rien. La session se passe par son identifiant,
 * ou déjà lue avec `setup_intent` développé (le webhook).
 */
export async function finaliserCarte(
  stripe: Stripe,
  sessionOuId: string | Stripe.Checkout.Session,
  { customerId: attendu, synchroniser = true }: { customerId?: string; synchroniser?: boolean } = {},
): Promise<IssueCarte> {
  const session =
    typeof sessionOuId === "string"
      ? await stripe.checkout.sessions.retrieve(sessionOuId, { expand: ["setup_intent"] })
      : sessionOuId;
  const customerId = idStripe(session.customer);
  if (session.mode !== "setup" || session.status !== "complete" || !customerId) return RIEN;
  if (attendu && attendu !== customerId) return RIEN;
  const formule = session.metadata?.formule;
  const intention = session.setup_intent;
  const paymentMethodId = intention && typeof intention === "object" ? idStripe(intention.payment_method) : null;
  if (!estLookupKey(formule) || !paymentMethodId) return RIEN;

  const { courant } = abonnementCourant(await abonnementsDuClient(stripe, customerId));
  // Déjà payant (une première finalisation est passée) ou terminé : rien à faire.
  if (!courant || !SANS_PAIEMENT_ENCORE.has(courant.status)) return RIEN;
  const prix = (await prixDesFormules(stripe)).get(formule);
  if (!prix) throw new Error("prix introuvable");

  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  const immediat = session.metadata?.immediat === "oui" || courant.status === "paused";
  const aRegler = await appliquerFormule(stripe, courant, {
    priceId: prix.priceId,
    paymentMethodId,
    immediat,
    choisiLe: session.created,
    idempotence: `carte-${session.id}`,
  });
  if (synchroniser) await synchroniserClientStripe(stripe, customerId);
  return aRegler ? { issue: "aRegler", url: aRegler } : { issue: "appliquee", immediat };
}
