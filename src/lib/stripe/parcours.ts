import "server-only";
// Les appels Stripe du parcours d'abonnement (ADR-053 §§ 8 à 10), sans rien
// savoir du compte : l'appelant passe les métadonnées qui le désignent
// (`metadata.userId` aujourd'hui, `metadata.compteId` avec l'ADR-054) et la
// clé d'idempotence. Chaque création porte une clé : un double clic ou une
// relance du navigateur ne crée ni deux clients, ni deux essais.

import type Stripe from "stripe";
import { LOOKUP_KEYS } from "@/lib/abonnements/formules";

export const DUREE_ESSAI_JOURS = 30;

export type Metadonnees = Record<string, string>;

/** Le client Stripe d'un compte, créé une fois (la clé d'idempotence dérive du compte). */
export async function creerClientStripe(
  stripe: Stripe,
  { email, metadata, idempotence }: { email: string; metadata: Metadonnees; idempotence: string },
): Promise<string> {
  const client = await stripe.customers.create({ email, metadata }, { idempotencyKey: `client-${idempotence}` });
  return client.id;
}

/**
 * L'essai gratuit (§ 9) : 30 jours, sans moyen de paiement ; à la fin sans
 * carte, l'abonnement se met en pause (saisie fermée, lecture ouverte). La
 * carte ajoutée pendant l'essai devient le moyen de paiement de l'abonnement.
 */
export async function demarrerEssai(
  stripe: Stripe,
  { customerId, priceId, metadata, idempotence }: { customerId: string; priceId: string; metadata: Metadonnees; idempotence: string },
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: DUREE_ESSAI_JOURS,
      payment_settings: { save_default_payment_method: "on_subscription" },
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      metadata,
    },
    { idempotencyKey: `essai-${idempotence}` },
  );
}

/**
 * Changer de formule PENDANT l'essai (§ 10) : dans Rojer, parce que le portail
 * met fin à l'essai. L'essai garde sa date de fin ; rien n'est proratisé.
 */
export async function changerFormuleEssai(
  stripe: Stripe,
  { subscriptionId, itemId, priceId }: { subscriptionId: string; itemId: string; priceId: string },
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "none",
  });
}

/** Le portail (§ 10) : ajouter une carte, reprendre, résilier, télécharger les factures. */
export async function ouvrirPortail(stripe: Stripe, { customerId, retour }: { customerId: string; retour: string }) {
  return (await stripe.billingPortal.sessions.create({ customer: customerId, return_url: retour })).url;
}

/**
 * Souscrire de nouveau après une résiliation (§ 10) : Checkout hébergé, case
 * des conditions générales, numéro de TVA. Jamais pendant un essai.
 */
export async function ouvrirCheckout(
  stripe: Stripe,
  {
    customerId,
    priceId,
    metadata,
    succes,
    annulation,
  }: { customerId: string; priceId: string; metadata: Metadonnees; succes: string; annulation: string },
) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata },
    consent_collection: { terms_of_service: "required" },
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    billing_address_collection: "required",
    success_url: succes,
    cancel_url: annulation,
  });
  if (!session.url) throw new Error("session Checkout sans adresse");
  return session.url;
}

export type PrixAffiche = { priceId: string; montantCentimes: number; devise: string };

let cachePrix: { lu: number; prix: Map<string, PrixAffiche> } | undefined;
const DUREE_CACHE_PRIX_MS = 10 * 60_000;

/**
 * Les prix des formules, lus chez Stripe (qui les facture) par `lookup_key`.
 * Gardés dix minutes : un changement de prix dans Stripe s'affiche au plus
 * dix minutes plus tard.
 */
export async function prixDesFormules(stripe: Stripe, maintenant = Date.now()): Promise<Map<string, PrixAffiche>> {
  if (cachePrix && maintenant - cachePrix.lu < DUREE_CACHE_PRIX_MS) return cachePrix.prix;
  const liste = await stripe.prices.list({ lookup_keys: LOOKUP_KEYS, active: true, limit: 10 });
  const prix = new Map<string, PrixAffiche>();
  for (const p of liste.data) {
    if (p.lookup_key && p.unit_amount !== null) {
      prix.set(p.lookup_key, { priceId: p.id, montantCentimes: p.unit_amount, devise: p.currency });
    }
  }
  cachePrix = { lu: maintenant, prix };
  return prix;
}

/** Pour les tests. */
export function oublierLesPrix() {
  cachePrix = undefined;
}
