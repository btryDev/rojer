import "server-only";
// Les appels Stripe du parcours d'abonnement (ADR-053 §§ 8 à 10), sans rien
// savoir du compte : l'appelant passe les métadonnées qui le désignent
// (~~`metadata.userId` aujourd'hui~~ `metadata.compteId`, ADR-054 ; la
// synchronisation relit encore un ancien `metadata.userId`) et la
// clé d'idempotence, dérivée du COMPTE (jamais de la personne : avec
// l'ADR-054, une personne peut ouvrir deux comptes). Ces clés n'arrêtent qu'un
// double clic : Stripe ne les garde que 24 heures. La vraie garde contre deux
// clients est la ligne `Abonnement` qui réserve le client
// (`abonnements/client-stripe.ts`). L'essai se compte chez Rojer (ADR-053
// § 9) : Stripe ne voit qu'un abonnement payé, ouvert par Checkout.

import type Stripe from "stripe";
import { OPTIONS_RELECTURE } from "./client";
import { idStripe } from "./ids";
import { INTERVALLE_STRIPE, LOOKUP_KEYS, formuleDeLookupKey } from "@/lib/abonnements/formules";
import { tauxConformes } from "./tva";


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
 * Le portail (§ 10) : changer de carte, résilier, télécharger les factures
 * (le changement de formule se fait dans Rojer, qui contrôle les plafonds).
 */
export async function ouvrirPortail(
  stripe: Stripe,
  { customerId, retour, resilier }: { customerId: string; retour: string; resilier?: string | null },
) {
  return (
    await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: retour,
      // « Résilier l'abonnement » (page Abonnement, 2026-11-17) : le portail
      // s'ouvre directement sur l'écran de résiliation de cet abonnement, puis
      // revient dans Rojer.
      ...(resilier
        ? {
            flow_data: {
              type: "subscription_cancel" as const,
              subscription_cancel: { subscription: resilier },
              after_completion: { type: "redirect" as const, redirect: { return_url: retour } },
            },
          }
        : {}),
    })
  ).url;
}

/**
 * S'abonner — le seul chemin (ADR-053 § 9, amendé le 2026-11-16), pendant
 * l'essai, après lui ou après une résiliation : Checkout hébergé, case
 * des conditions générales (exige leur URL dans les réglages publics Stripe),
 * numéro de TVA. L'APPELANT refuse tant qu'un abonnement n'est pas terminé :
 * deux onglets, ce seraient deux abonnements.
 */
/** La durée de vie d'une page de paiement Checkout, en secondes. */
export const DUREE_PAGE_DE_PAIEMENT_S = 3600;

export async function ouvrirCheckout(
  stripe: Stripe,
  {
    customerId,
    priceId,
    tauxTva,
    metadata,
    succes,
    annulation,
    conditions = true,
  }: {
    customerId: string;
    priceId: string;
    tauxTva: string;
    metadata: Metadonnees;
    succes: string;
    annulation: string;
    /** Faire accepter les conditions générales (refusé sans adresse au compte Stripe). */
    conditions?: boolean;
  },
) {
  await expirerSessionsOuvertes(stripe, customerId);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    // La carte seulement, écrite ici et pas seulement réglée au tableau de
    // bord : un prélèvement différé (SEPA) rendrait l'abonnement actif avant
    // d'être encaissé (revue de sécurité du 2026-11-17).
    allowed_payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata, default_tax_rates: [tauxTva] },
    ...(conditions ? { consent_collection: { terms_of_service: "required" as const } } : {}),
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    billing_address_collection: "required",
    success_url: succes,
    cancel_url: annulation,
    // Une heure pour payer (Stripe : 30 min à 24 h). La suppression d'un
    // compte attend une heure après l'ouverture d'un paiement
    // (`paiementOuvertLe`) : la page ne peut plus être payée au-delà.
    expires_at: Math.floor(Date.now() / 1000) + DUREE_PAGE_DE_PAIEMENT_S,
  });
  if (!session.url) throw new Error("session Checkout sans adresse");
  return session.url;
}

/**
 * Les abonnements d'un client, relus chez Stripe, qui fait foi : notre copie
 * peut retarder d'un webhook. Les plus récents d'abord ; un client Rojer n'en
 * a qu'un ou deux (un abonnement, puis un réabonnement après résiliation).
 */
export async function abonnementsDuClient(stripe: Stripe, customerId: string): Promise<Stripe.Subscription[]> {
  const liste = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 }, OPTIONS_RELECTURE);
  return liste.data;
}

/**
 * Les sessions Checkout encore ouvertes du client, expirées : avant d'en
 * ouvrir une neuve, quand l'une est payée, avant une suppression — deux
 * onglets ne paient pas deux abonnements. `options` : celles de l'appelant
 * (la file du webhook a son propre délai, `OPTIONS_WEBHOOK`).
 */
export async function expirerSessionsOuvertes(stripe: Stripe, customerId: string, options: Stripe.RequestOptions = OPTIONS_RELECTURE) {
  const ouvertes = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 10 }, options);
  await Promise.all(ouvertes.data.map((s) => stripe.checkout.sessions.expire(s.id, {}, options)));
}

/**
 * L'adresse de la facture d'une montée de formule qui attend son paiement
 * (`open`) : la banque demande une confirmation, ou la carte est refusée.
 * `null` sinon. (Un impayé se règle au portail, pas ici.)
 */
async function factureARegler(stripe: Stripe, derniere: Stripe.Subscription["latest_invoice"]): Promise<string | null> {
  return (await factureOuverte(stripe, derniere))?.hosted_invoice_url ?? null;
}

/**
 * La dernière facture si elle attend encore un paiement : `open`, ou
 * `uncollectible` (marquée irrécouvrable à la fin des relances, toujours
 * payable sur sa page hébergée — audit du 2026-11-16).
 */
async function factureOuverte(stripe: Stripe, derniere: Stripe.Subscription["latest_invoice"]): Promise<Stripe.Invoice | null> {
  if (!derniere) return null;
  const facture = typeof derniere === "string" ? await stripe.invoices.retrieve(derniere) : derniere;
  return facture.status === "open" || facture.status === "uncollectible" ? facture : null;
}

const tauxEnVigueur = (stripe: Stripe) => tauxDeTva(stripe).catch(() => null);

type Visee = { priceId: string; intervalle: (typeof INTERVALLE_STRIPE)[keyof typeof INTERVALLE_STRIPE] };

/** Ce qu'une montée prélèverait aujourd'hui, et jusqu'à quand : dit dans la fenêtre de confirmation, avant le clic. */
export type ApercuDeMontee = {
  /** Le montant prélevé aujourd'hui, TTC (la facture de prorata, crédit du client déduit). */
  aujourdhuiCentimes: number;
  /** La fin de la période que ce prélèvement couvre : le prochain prélèvement. */
  jusquAu: Date | null;
  /** L'instant du prorata, repris par `monterDeFormule` : le montant prélevé est celui annoncé. */
  prorationDate: number;
};

/**
 * L'aperçu d'une montée (retour de test du 2026-11-23 : « passer à Pro
 * n'est pas clair ») : la facture que Stripe émettrait, sans rien créer ni
 * prélever (`invoices.createPreview`), aux mêmes réglages que la montée.
 */
export async function apercuDeMontee(stripe: Stripe, abonnement: Stripe.Subscription, { priceId, intervalle }: Visee, maintenant = new Date()): Promise<ApercuDeMontee> {
  const item = abonnement.items.data[0];
  const customer = idStripe(abonnement.customer);
  if (!item || !customer) throw new Error("abonnement sans article ni client");
  const prorationDate = Math.floor(maintenant.getTime() / 1000);
  const facture = await stripe.invoices.createPreview(
    {
      customer,
      subscription: abonnement.id,
      subscription_details: {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: "always_invoice",
        proration_date: prorationDate,
        ...(item.price.recurring?.interval !== intervalle ? { billing_cycle_anchor: { type: "now" as const } } : {}),
      },
    },
    OPTIONS_RELECTURE,
  );
  const fin = Math.max(0, ...facture.lines.data.map((l) => l.period?.end ?? 0));
  return { aujourdhuiCentimes: facture.amount_due, jusquAu: fin ? new Date(fin * 1000) : null, prorationDate };
}

/** Ce qu'une montée a fait : la facture à régler s'il en reste une, sinon le montant prélevé et le prochain prélèvement. */
export type MonteeFaite = { aRegler: string | null; preleveCentimes: number | null; prochainLe: Date | null };

/**
 * Monter de formule (ADR-053 § 10, client qui paie) : tout de suite, la
 * différence facturée au prorata et prélevée aussitôt. `pending_if_incomplete`
 * : la nouvelle formule ne s'applique que si ce paiement passe — sinon
 * l'abonnement garde l'ancienne, et la facture attend (rendue à régler). Une
 * baisse déjà planifiée est abandonnée d'abord : le dernier choix l'emporte.
 * `prorationDate` : celle de l'aperçu montré (`apercuDeMontee`), pour que le
 * montant prélevé soit celui annoncé.
 */
export async function monterDeFormule(
  stripe: Stripe,
  abonnement: Stripe.Subscription,
  { priceId, intervalle }: Visee,
  prorationDate?: number,
): Promise<MonteeFaite> {
  const item = abonnement.items.data[0];
  if (!item || item.price.id === priceId) return { aRegler: null, preleveCentimes: null, prochainLe: null };
  // Le rythme change (mois ↔ année) : la période repart aujourd'hui, comme la
  // page l'annonce. Stripe garde sinon la date d'origine de l'abonnement
  // (répétition du 2026-11-17 : passé à l'année le 10 juin, payé jusqu'au
  // 10 avril suivant).
  const rythmeChange = item.price.recurring?.interval !== intervalle;
  // La mise à jour d'abord : si elle échoue, la baisse prévue reste intacte.
  // Le taux de TVA n'y est pas reposé : une mise à jour en attente de
  // paiement (`pending_if_incomplete`) n'accepte que les articles et le
  // prorata. Seuls des abonnements de test sont nés sous l'ancien taux.
  const misAJour = await stripe.subscriptions.update(
    abonnement.id,
    {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: "always_invoice",
      // Un objet, `{ type }` (stripe-node 23, API `2026-10-28.endive`).
      ...(rythmeChange ? { billing_cycle_anchor: { type: "now" as const } } : {}),
      ...(prorationDate ? { proration_date: prorationDate } : {}),
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    },
    // La dernière facture entre dans la clé : la même montée refaite après un
    // renouvellement (dans les 24 h de la première) n'est pas un rejeu.
    { idempotencyKey: `monter-${abonnement.id}-${item.price.id}-${priceId}-${idStripe(abonnement.latest_invoice) ?? "sans-facture"}` },
  );
  // Monter, c'est le dernier choix : la baisse prévue est rendue, même si la
  // montée attend encore son paiement — la page le montre (plus de baisse
  // prévue, une facture à régler). ~~Une montée en attente gardait la
  // baisse, rendue au paiement~~ [2026-11-17, simplification : la garder
  // supposait de dater le planning contre la facture, et un planning
  // réutilisé par une baisse suivante trompait cette date.] Si Stripe
  // refuse, la page montre encore la baisse et propose « Garder ma formule ».
  const planning = idStripe(abonnement.schedule);
  if (planning) {
    try {
      await stripe.subscriptionSchedules.release(planning);
    } catch (e) {
      console.error(`stripe : baisse prévue non rendue après une montée (${planning}) — ${e instanceof Error ? e.name : "erreur"}`);
    }
  }
  const facture = typeof misAJour.latest_invoice === "object" ? misAJour.latest_invoice : null;
  const fin = misAJour.items?.data[0]?.current_period_end;
  return {
    aRegler: await factureARegler(stripe, misAJour.latest_invoice),
    preleveCentimes: facture?.status === "paid" ? facture.amount_paid : null,
    prochainLe: fin ? new Date(fin * 1000) : null,
  };
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
  const existant = idStripe(abonnement.schedule);
  const planning = existant
    ? await stripe.subscriptionSchedules.retrieve(existant)
    : await stripe.subscriptionSchedules.create({ from_subscription: abonnement.id });
  const enCours = planning.current_phase ?? planning.phases[0];
  // La TVA de l'abonnement, reposée sur chaque phase : la documentation de
  // Stripe ne dit pas qu'une phase qui l'omet la garde.
  // Le taux en vigueur, sinon celui de l'abonnement.
  const enVigueur = await tauxEnVigueur(stripe);
  const tva = enVigueur ? [enVigueur] : (abonnement.default_tax_rates ?? []).map((t) => t.id);
  const taxes = tva.length > 0 ? { default_tax_rates: tva } : {};
  try {
    await stripe.subscriptionSchedules.update(planning.id, {
    end_behavior: "release",
    proration_behavior: "none",
    phases: [
      {
        items: [{ price: item.price.id, quantity: item.quantity ?? 1 }],
        start_date: enCours.start_date,
        end_date: enCours.end_date,
        ...taxes,
      },
      // Une période dans la nouvelle formule, puis l'abonnement continue seul.
      { items: [{ price: priceId, quantity: 1 }], duration: { interval: intervalle, interval_count: 1 }, ...taxes },
    ],
    });
  } catch (e) {
    // Un planning créé ici sans sa baisse bloquerait le portail sans rien
    // afficher : on le rend avant de remonter l'erreur.
    if (!existant) {
      try {
        await stripe.subscriptionSchedules.release(planning.id);
      } catch {
        // L'erreur d'origine est celle qui compte ; le planning seul se rendra à la notification suivante.
      }
    }
    throw e;
  }
}

/**
 * Une seule carte, celle du CLIENT (2026-11-16) : le portail ne change
 * qu'elle, et une carte fixée sur l'abonnement passerait avant au
 * renouvellement. Appelée au paiement réussi d'une facture d'abonnement
 * (`invoice.paid`) :
 * - la carte qui a RÉELLEMENT payé cette facture (son paiement, lu chez
 *   Stripe) devient celle du client si elle en diffère et lui est rattachée.
 *   Une carte saisie sur la page d'une facture sans la case « sauvegarder »
 *   n'est rattachée à personne : Stripe refuse d'en faire la carte du client,
 *   rien à écrire (répétition du 2026-11-17 — c'est pourquoi un impayé se
 *   règle au portail, qui enregistre la carte). Un renouvellement ordinaire
 *   paie avec la carte du client : rien à écrire non plus ;
 * - la carte que Stripe fixe sur l'abonnement à chaque paiement
 *   (`save_default_payment_method: on_subscription`) en est retirée : elle
 *   passerait devant celle du client ; le réglage est posé sur l'abonnement
 *   né de Checkout.
 * Limite écrite : un changement fait au portail entre ce paiement et un
 * nouvel essai de cet événement serait remplacé par la carte qui a payé.
 * Sans clé d'idempotence : ces écritures posent une valeur.
 */
export async function carteQuiAPaye(stripe: Stripe, factureId: string): Promise<void> {
  // Quatre niveaux d'expansion au plus chez Stripe : la carte se relit à part
  // (répétition du 2026-11-17 — `property_expansion_max_depth`).
  const facture = await stripe.invoices.retrieve(factureId, { expand: ["payments.data.payment.payment_intent"] });
  const abonnementId = idStripe(facture.parent?.subscription_details?.subscription);
  const clientId = idStripe(facture.customer);
  if (!abonnementId || !clientId) return;
  const intention = facture.payments?.data.find((p) => p.status === "paid")?.payment.payment_intent;
  const carte = intention && typeof intention === "object" ? idStripe(intention.payment_method) : null;
  const [client, abonnement] = await Promise.all([stripe.customers.retrieve(clientId), stripe.subscriptions.retrieve(abonnementId)]);
  if (client.deleted || abonnement.status === "canceled" || abonnement.status === "incomplete_expired") return;
  if (carte && carte !== idStripe(client.invoice_settings?.default_payment_method)) {
    // Rattachée au client, ou rien : une carte à usage unique ne se pose pas.
    // Illisible (retirée entre-temps) : comme une carte à usage unique — le
    // rangement de l'abonnement, plus bas, se fait quand même.
    const moyen = await stripe.paymentMethods.retrieve(carte).catch(() => null);
    if (moyen && idStripe(moyen.customer) === clientId) {
      await stripe.customers.update(clientId, { invoice_settings: { default_payment_method: carte } });
    }
  }
  const fixee = idStripe(abonnement.default_payment_method);
  const reglage = abonnement.payment_settings?.save_default_payment_method === "on_subscription";
  if (fixee || !reglage) {
    await stripe.subscriptions.update(abonnement.id, {
      ...(fixee ? { default_payment_method: "" } : {}),
      ...(reglage ? {} : { payment_settings: { save_default_payment_method: "on_subscription" as const } }),
    });
  }
}

/**
 * Le planning d'une baisse a fait son office (la nouvelle formule court, plus
 * de phase à venir) : on le rend, sinon il resterait attaché une période
 * entière et le portail refuserait toute résiliation (doc du portail).
 */
export async function rendrePlanningEchu(stripe: Stripe, abonnement: Stripe.Subscription): Promise<void> {
  const id = idStripe(abonnement.schedule);
  if (!id) return;
  const planning = await stripe.subscriptionSchedules.retrieve(id);
  // L'heure est celle de Stripe (la phase en cours qu'il désigne), pas celle du
  // serveur : une horloge de simulation la décale. Un planning tout juste créé
  // n'a encore qu'une phase : `planifierBaisse` y ajoute la baisse dans la
  // foulée ; ne rendre que ceux qui ont porté une baisse, ou un orphelin de
  // plus de cinq minutes.
  const enCours = planning.current_phase;
  const derniere = planning.phases.at(-1);
  if (!enCours || !derniere || planning.status !== "active") return;
  const aPorteUneBaisse = planning.phases.length > 1 || planning.created < Math.floor(Date.now() / 1000) - 300;
  if (!aPorteUneBaisse || enCours.start_date < derniere.start_date) return;
  try {
    await stripe.subscriptionSchedules.release(id);
  } catch (e) {
    // Déjà rendu par un événement voisin (deux notifications du même passage
    // de phase) : rien à refaire. Sinon (429 au passage de phase, répétition
    // du 2026-11-16) l'erreur remonte, et la file retente l'événement.
    const relu = await stripe.subscriptionSchedules.retrieve(id).catch(() => null);
    if (relu && relu.status !== "active") return;
    throw e;
  }
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
  // La phase qui suit celle en cours, selon Stripe (voir `rendrePlanningEchu`).
  const depuis = planning.current_phase?.start_date ?? Math.floor(Date.now() / 1000);
  const suivante = planning.phases.find((p) => p.start_date > depuis);
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

let cacheTva: { lu: number; id: string } | undefined;

/**
 * Le taux de TVA posé sur chaque abonnement, créé une fois dans Stripe
 * (tableau de bord en production, `scripts/stripe-installer-test.ts` en test)
 * et reconnu à ses attributs (`stripe/tva.ts`) ; le plus ancien s'il y en a
 * plusieurs. `null` s'il manque : l'appelant refuse alors de créer
 * l'abonnement — aucune facture ne part sans TVA. Gardé dix minutes.
 */
export async function tauxDeTva(stripe: Stripe, maintenant = Date.now()): Promise<string | null> {
  if (cacheTva && maintenant - cacheTva.lu < DUREE_CACHE_PRIX_MS) return cacheTva.id;
  const { data } = await stripe.taxRates.list({ active: true, inclusive: true, limit: 100 });
  const conformes = tauxConformes(data);
  if (conformes.length === 0) {
    console.error("stripe : aucun taux de TVA actif (20 %, France, type TVA, incluse dans le prix) — abonnements refusés");
    return null;
  }
  if (conformes.length > 1) console.error(`stripe : ${conformes.length} taux de TVA conformes, le plus ancien est retenu`);
  cacheTva = { lu: maintenant, id: conformes[0].id };
  return cacheTva.id;
}

/** Pour les tests. */
export function oublierLesPrix() {
  cachePrix = undefined;
  cacheTva = undefined;
}
