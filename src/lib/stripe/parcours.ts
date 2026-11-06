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
import { idStripe } from "./synchronisation";
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

/** L'adresse de la facture à régler d'un abonnement, si sa dernière facture attend un paiement (refus, 3DS). */
async function factureARegler(stripe: Stripe, derniere: Stripe.Subscription["latest_invoice"]): Promise<string | null> {
  if (!derniere) return null;
  const facture = typeof derniere === "string" ? await stripe.invoices.retrieve(derniere) : derniere;
  return facture.status === "open" ? (facture.hosted_invoice_url ?? null) : null;
}

/**
 * Appliquer la formule choisie et la carte enregistrée à l'abonnement qui
 * court encore sans payer : l'essai continue (`proration_behavior: none`,
 * rien n'est facturé avant sa fin), sauf `immediat` — l'essai s'arrête et le
 * premier mois est prélevé tout de suite (valider un document légal pendant
 * l'essai, décision du 2026-11-05) ; un abonnement en pause reprend et paie.
 *
 * Rejouée (retour de Checkout, webhook, rechargement), elle ne refait rien :
 * - même session : clés d'idempotence dérivées de la session ; un appel
 *   concurrent reçoit un 409 de Stripe, rejoué plus tard sans effet ;
 * - session plus ancienne que la dernière appliquée (`rojerChoixLe` posé sur
 *   l'abonnement) : ignorée, le dernier choix l'emporte ;
 * - pause dont la reprise attend déjà un paiement : on renvoie la facture en
 *   attente au lieu d'en créer une autre.
 * Rend l'adresse d'une facture à régler (paiement refusé, authentification
 * demandée), ou `null`.
 */
export async function appliquerFormule(
  stripe: Stripe,
  abonnement: Stripe.Subscription,
  choix: { priceId: string; paymentMethodId: string; immediat: boolean; choisiLe: number; idempotence?: string },
): Promise<string | null> {
  if (choix.choisiLe < Number(abonnement.metadata?.rojerChoixLe ?? 0)) return null;
  const enPause = abonnement.status === "paused";
  if (enPause) {
    const enAttente = await factureARegler(stripe, abonnement.latest_invoice);
    if (enAttente) return enAttente;
  }
  const item = abonnement.items.data[0];
  const pmActuel = idStripe(abonnement.default_payment_method);
  const finEssai = choix.immediat && abonnement.status === "trialing";
  if (item?.price.id === choix.priceId && pmActuel === choix.paymentMethodId && !finEssai && !enPause) return null;

  const cle = (etape: string) => (choix.idempotence ? { idempotencyKey: `${choix.idempotence}-${etape}` } : {});
  const misAJour = await stripe.subscriptions.update(
    abonnement.id,
    {
      items: item ? [{ id: item.id, price: choix.priceId }] : [{ price: choix.priceId }],
      default_payment_method: choix.paymentMethodId,
      proration_behavior: "none",
      metadata: { rojerChoixLe: String(choix.choisiLe) },
      expand: ["latest_invoice"],
      ...(finEssai ? { trial_end: "now" as const } : {}),
    },
    cle("maj"),
  );
  if (!enPause) return finEssai ? factureARegler(stripe, misAJour.latest_invoice) : null;
  // Reprise : la période repart à aujourd'hui (le défaut de l'API) et se paie ;
  // l'abonnement reste en pause tant que cette facture n'est pas réglée.
  const repris = await stripe.subscriptions.resume(
    abonnement.id,
    { proration_behavior: "none", expand: ["latest_invoice"] },
    cle("reprise"),
  );
  return factureARegler(stripe, repris.latest_invoice);
}

/**
 * Monter de formule (ADR-053 § 10, client qui paie) : tout de suite, la
 * différence facturée au prorata et prélevée aussitôt. `pending_if_incomplete`
 * : la nouvelle formule ne s'applique que si ce paiement passe — sinon
 * l'abonnement garde l'ancienne, et la facture attend (rendue à régler). Une
 * baisse déjà planifiée est abandonnée d'abord : le dernier choix l'emporte.
 */
export async function monterDeFormule(stripe: Stripe, abonnement: Stripe.Subscription, priceId: string): Promise<string | null> {
  const item = abonnement.items.data[0];
  if (!item || item.price.id === priceId) return null;
  const planning = idStripe(abonnement.schedule);
  if (planning) await stripe.subscriptionSchedules.release(planning);
  const misAJour = await stripe.subscriptions.update(
    abonnement.id,
    {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    },
    { idempotencyKey: `monter-${abonnement.id}-${item.price.id}-${priceId}` },
  );
  return factureARegler(stripe, misAJour.latest_invoice);
}

/**
 * Baisser de formule (client qui paie) : à la FIN de la période payée, sans
 * crédit (pratique courante — Notion, Airtable, HubSpot). Un planning Stripe
 * (« subscription schedule ») porte la période en cours, puis la nouvelle
 * formule, et rend l'abonnement à lui-même ensuite (`release`).
 */
export async function planifierBaisse(
  stripe: Stripe,
  abonnement: Stripe.Subscription,
  { priceId, intervalle }: { priceId: string; intervalle: "month" | "year" },
): Promise<void> {
  const item = abonnement.items.data[0];
  if (!item) return;
  // Stripe refuse un planning sur un abonnement réglé pour se mettre en pause à
  // la fin de l'essai (réglage de l'essai, §§ 8-9) : une fois payant, il ne
  // sert plus, on le rend à sa valeur par défaut.
  if (abonnement.trial_settings?.end_behavior?.missing_payment_method === "pause") {
    await stripe.subscriptions.update(abonnement.id, {
      trial_settings: { end_behavior: { missing_payment_method: "create_invoice" } },
    });
  }
  const existant = idStripe(abonnement.schedule);
  const planning = existant
    ? await stripe.subscriptionSchedules.retrieve(existant)
    : await stripe.subscriptionSchedules.create({ from_subscription: abonnement.id });
  const enCours = planning.current_phase ?? planning.phases[0];
  await stripe.subscriptionSchedules.update(planning.id, {
    end_behavior: "release",
    proration_behavior: "none",
    phases: [
      {
        items: [{ price: item.price.id, quantity: item.quantity ?? 1 }],
        start_date: enCours.start_date,
        end_date: enCours.end_date,
      },
      // Une période dans la nouvelle formule, puis l'abonnement continue seul.
      { items: [{ price: priceId, quantity: 1 }], duration: { interval: intervalle, interval_count: 1 } },
    ],
  });
}

/** Renoncer à une baisse planifiée : l'abonnement reste sur sa formule. */
export async function annulerBaisse(stripe: Stripe, abonnement: Stripe.Subscription): Promise<void> {
  const planning = idStripe(abonnement.schedule);
  if (planning) await stripe.subscriptionSchedules.release(planning);
}

/** La baisse planifiée d'un abonnement, s'il y en a une : le prix visé et la date. */
export async function baissePrevue(
  stripe: Stripe,
  abonnement: Stripe.Subscription,
): Promise<{ priceId: string; lookupKey: string | null; le: Date } | null> {
  const id = idStripe(abonnement.schedule);
  if (!id) return null;
  const planning = await stripe.subscriptionSchedules.retrieve(id, { expand: ["phases.items.price"] });
  const maintenant = Math.floor(Date.now() / 1000);
  const suivante = planning.phases.find((p) => p.start_date > maintenant);
  const prix = suivante?.items[0]?.price;
  if (!suivante || !prix) return null;
  const lookupKey = typeof prix !== "string" && "lookup_key" in prix ? prix.lookup_key : null;
  return { priceId: typeof prix === "string" ? prix : prix.id, lookupKey, le: new Date(suivante.start_date * 1000) };
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
