import "server-only";
// Les appels Stripe du parcours d'abonnement (ADR-053 §§ 8 à 10), sans rien
// savoir du compte : l'appelant passe les métadonnées qui le désignent
// (~~`metadata.userId` aujourd'hui~~ `metadata.compteId`, ADR-054 ; la
// synchronisation relit encore un ancien `metadata.userId`) et la
// clé d'idempotence, dérivée du COMPTE (jamais de la personne : avec
// l'ADR-054, une personne peut ouvrir deux comptes). Ces clés n'arrêtent qu'un
// double clic : Stripe ne les garde que 24 heures. La vraie garde contre deux
// clients ou deux essais est la ligne `Abonnement` réservée en base avant
// l'appel (lot de branchement).

import type Stripe from "stripe";
import { OPTIONS_RELECTURE } from "./client";
import { INTERVALLE_STRIPE, LOOKUP_KEYS, formuleDeLookupKey } from "@/lib/abonnements/formules";

export const DUREE_ESSAI_JOURS = 30;

export type Metadonnees = Record<string, string>;

/**
 * Le client Stripe d'un compte. Nom et adresse : ceux qu'une facture
 * française entre professionnels doit porter — le portail ne les demande pas
 * sur le chemin essai → payant. E-mails Stripe (rappels, factures) en français.
 */
export async function creerClientStripe(
  stripe: Stripe,
  {
    email,
    nom,
    adresse,
    metadata,
    idempotence,
  }: { email: string; nom: string; adresse?: Stripe.AddressParam; metadata: Metadonnees; idempotence: string },
): Promise<string> {
  const client = await stripe.customers.create(
    { email, name: nom, address: adresse, preferred_locales: ["fr"], metadata },
    { idempotencyKey: `client-${idempotence}` },
  );
  return client.id;
}

/**
 * L'essai gratuit (§ 9) : 30 jours, sans moyen de paiement ; à la fin sans
 * carte, l'abonnement se met en pause (saisie fermée, lecture ouverte). La
 * carte se pose dans le portail (moyen de paiement par défaut du client).
 * La formule entre dans la clé : un retour en arrière pour en choisir une
 * autre n'est pas refusé par Stripe comme une requête rejouée différemment.
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
    { idempotencyKey: `essai-${idempotence}-${priceId}` },
  );
}

/**
 * Le portail (§ 10) : ajouter une carte, changer de formule (réglé pour
 * garder l'essai, `trial_update_behavior: continue_trial`), reprendre,
 * résilier, télécharger les factures.
 */
export async function ouvrirPortail(stripe: Stripe, { customerId, retour }: { customerId: string; retour: string }) {
  return (await stripe.billingPortal.sessions.create({ customer: customerId, return_url: retour })).url;
}

/**
 * Souscrire de nouveau après une résiliation (§ 10) : Checkout hébergé, case
 * des conditions générales (exige leur URL dans les réglages publics Stripe),
 * numéro de TVA. L'APPELANT refuse tant qu'un abonnement n'est pas terminé :
 * deux onglets, ce seraient deux abonnements.
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
  await expirerSessionsOuvertes(stripe, customerId);
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

/**
 * Les abonnements d'un client, relus chez Stripe, qui fait foi : notre copie
 * peut retarder d'un webhook. Les plus récents d'abord ; un client Rojer n'en
 * a qu'un ou deux (l'essai, puis un réabonnement après résiliation).
 */
export async function abonnementsDuClient(stripe: Stripe, customerId: string): Promise<Stripe.Subscription[]> {
  const liste = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 }, OPTIONS_RELECTURE);
  return liste.data;
}

/**
 * Les sessions Checkout encore ouvertes du client, expirées avant d'en ouvrir
 * une neuve : deux onglets ne paient pas deux abonnements.
 */
async function expirerSessionsOuvertes(stripe: Stripe, customerId: string) {
  const ouvertes = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 10 }, OPTIONS_RELECTURE);
  await Promise.all(ouvertes.data.map((s) => stripe.checkout.sessions.expire(s.id)));
}

/**
 * La carte d'un client qui a déjà un abonnement (essai, en pause) : Checkout
 * en mode « setup » — la page hébergée enregistre la carte sans rien
 * prélever. La formule choisie voyage dans les métadonnées de la session,
 * relue à son retour (`abonnements/souscription.ts`).
 */
export async function ouvrirCheckoutCarte(
  stripe: Stripe,
  { customerId, metadata, succes, annulation }: { customerId: string; metadata: Metadonnees; succes: string; annulation: string },
) {
  await expirerSessionsOuvertes(stripe, customerId);
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    currency: "eur",
    metadata,
    setup_intent_data: { metadata },
    success_url: succes,
    cancel_url: annulation,
  });
  if (!session.url) throw new Error("session Checkout sans adresse");
  return session.url;
}

/**
 * Appliquer la formule choisie et la carte enregistrée à l'abonnement qui
 * court encore sans payer : l'essai continue (`proration_behavior: none`,
 * rien n'est facturé avant sa fin), sauf `immediat` — l'essai s'arrête et le
 * premier mois est prélevé tout de suite (valider un document légal pendant
 * l'essai, décision du 2026-11-05) ; un abonnement en pause reprend et paie.
 * Idempotent : rejouée (retour de Checkout, puis webhook), elle ne refait rien.
 */
export async function appliquerFormule(
  stripe: Stripe,
  abonnement: Stripe.Subscription,
  { priceId, paymentMethodId, immediat }: { priceId: string; paymentMethodId: string; immediat: boolean },
) {
  const item = abonnement.items.data[0];
  const pmActuel = typeof abonnement.default_payment_method === "string"
    ? abonnement.default_payment_method
    : abonnement.default_payment_method?.id;
  const finEssai = immediat && abonnement.status === "trialing";
  const dejaFait = item?.price.id === priceId && pmActuel === paymentMethodId && !finEssai && abonnement.status !== "paused";
  if (dejaFait) return;
  await stripe.subscriptions.update(abonnement.id, {
    items: item ? [{ id: item.id, price: priceId }] : [{ price: priceId }],
    default_payment_method: paymentMethodId,
    proration_behavior: "none",
    ...(finEssai ? { trial_end: "now" as const } : {}),
  });
  if (abonnement.status === "paused") {
    // Reprise : la période repart à aujourd'hui (le défaut de l'API) et se paie.
    await stripe.subscriptions.resume(abonnement.id, { proration_behavior: "none" });
  }
}

export type PrixAffiche = { priceId: string; montantCentimes: number; devise: string };

let cachePrix: { lu: number; prix: ReadonlyMap<string, PrixAffiche> } | undefined;
const DUREE_CACHE_PRIX_MS = 10 * 60_000;

/**
 * Les prix des formules, lus chez Stripe (qui les facture) par `lookup_key`.
 * Un prix dont l'intervalle contredit sa clé (annuel posé sur un prix
 * mensuel) est écarté et signalé : il serait affiché et facturé faux. Gardés
 * dix minutes, seulement complets : un catalogue partiel se relit à chaque
 * appel.
 */
export async function prixDesFormules(stripe: Stripe, maintenant = Date.now()): Promise<ReadonlyMap<string, PrixAffiche>> {
  if (cachePrix && maintenant - cachePrix.lu < DUREE_CACHE_PRIX_MS) return cachePrix.prix;
  const liste = await stripe.prices.list({ lookup_keys: LOOKUP_KEYS, active: true, limit: 10 });
  const prix = new Map<string, PrixAffiche>();
  for (const p of liste.data) {
    const cle = formuleDeLookupKey(p.lookup_key);
    if (!cle || p.unit_amount === null) continue;
    if (p.recurring?.interval !== INTERVALLE_STRIPE[cle.periodicite]) {
      console.error(`stripe : le prix ${p.id} (${p.lookup_key}) n'a pas l'intervalle de sa clé`);
      continue;
    }
    prix.set(p.lookup_key!, { priceId: p.id, montantCentimes: p.unit_amount, devise: p.currency });
  }
  if (prix.size === LOOKUP_KEYS.length) cachePrix = { lu: maintenant, prix };
  return prix;
}

/** Pour les tests. */
export function oublierLesPrix() {
  cachePrix = undefined;
}
