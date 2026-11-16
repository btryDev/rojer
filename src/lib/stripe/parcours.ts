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

import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { OPTIONS_RELECTURE } from "./client";
import { idStripe } from "./synchronisation";
import { INTERVALLE_STRIPE, LOOKUP_KEYS, formuleDeLookupKey } from "@/lib/abonnements/formules";
import { tauxConformes } from "./tva";

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
 * La formule et le taux de TVA entrent dans la clé : un retour en arrière
 * pour choisir une autre formule, ou un taux changé entre deux essais, n'est
 * pas refusé par Stripe comme une requête rejouée différemment.
 */
export async function demarrerEssai(
  stripe: Stripe,
  {
    customerId,
    priceId,
    tauxTva,
    metadata,
    idempotence,
  }: { customerId: string; priceId: string; tauxTva: string; metadata: Metadonnees; idempotence: string },
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      default_tax_rates: [tauxTva],
      trial_period_days: DUREE_ESSAI_JOURS,
      // Chaque paiement réussi fixe sa carte sur l'abonnement : une carte
      // payée sur la page d'une facture sert ainsi au mois suivant. La
      // relecture la reporte sur le client et la retire de l'abonnement
      // (`carteAuClient`, synchronisation.ts) : une seule carte, celle du
      // client, que le portail change.
      payment_settings: { save_default_payment_method: "on_subscription" },
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      metadata,
    },
    { idempotencyKey: `essai-${idempotence}-${priceId}-${tauxTva}` },
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
    tauxTva,
    metadata,
    succes,
    annulation,
  }: { customerId: string; priceId: string; tauxTva: string; metadata: Metadonnees; succes: string; annulation: string },
) {
  await expirerSessionsOuvertes(stripe, customerId);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata, default_tax_rates: [tauxTva] },
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
export async function expirerSessionsOuvertes(stripe: Stripe, customerId: string) {
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
    // À ESSAYER à la prochaine répétition (revue du 2026-11-16) :
    // `allowed_payment_method_types: ["card"]`, pour qu'un prélèvement SEPA
    // activé par erreur dans le tableau de bord ne laisse pas la facture « en
    // traitement » et le client sur sa page. Non posé tant que Stripe ne l'a
    // pas accepté sur une vraie session : une erreur ici fermerait tout
    // enregistrement de carte.
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
 * L'adresse de la dernière facture d'un abonnement si elle attend un
 * paiement (`open`) : carte refusée, authentification demandée, impayé.
 * La page hébergée de la facture se règle avec une autre carte, 3-D Secure
 * compris. `null` sinon.
 */
export async function factureARegler(stripe: Stripe, derniere: Stripe.Subscription["latest_invoice"]): Promise<string | null> {
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

/**
 * La facture est-elle celle du prix choisi, TVA comprise ? Ce prix seul sur
 * ses lignes, et un total égal au sous-total : une facture d'avant les prix
 * TTC (TVA en sus) ne se reprend pas telle quelle.
 */
const factureAuPrixAffiche = (f: Stripe.Invoice, priceId: string) =>
  f.lines.data.length > 0 &&
  f.lines.data.every((l) => l.pricing?.price_details?.price === priceId) &&
  f.total === f.subtotal;

/** Le taux de TVA en vigueur, sans échouer : sans réponse, l'abonnement garde le sien. */
const tauxEnVigueur = (stripe: Stripe) => tauxDeTva(stripe).catch(() => null);

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
  choix: {
    priceId: string;
    immediat: boolean;
    choisiLe: number;
    idempotence?: string;
  },
): Promise<string | null> {
  if (choix.choisiLe < Number(abonnement.metadata?.rojerChoixLe ?? 0)) return null;
  const enPause = abonnement.status === "paused";
  if (enPause) {
    // Une reprise précédente attend son paiement : on la renvoie si elle est
    // de la formule choisie ; sinon elle est annulée, et la reprise se fait
    // au prix affiché (audit du 2026-11-16).
    const enAttente = await factureOuverte(stripe, abonnement.latest_invoice);
    if (enAttente && factureAuPrixAffiche(enAttente, choix.priceId)) return enAttente.hosted_invoice_url ?? null;
    if (enAttente) await stripe.invoices.voidInvoice(enAttente.id!);
  }
  // Payer maintenant : l'essai est relu juste avant. Un autre chemin (la
  // notification de Checkout, un autre onglet) a pu le finir : on ne le finit
  // pas deux fois, mais sa facture, si elle attend encore (carte refusée,
  // confirmation demandée par la banque), est renvoyée. Sans quoi le client
  // lisait « Paiement terminé » sans avoir payé (répétition du 2026-11-16,
  // carte 3-D Secure : la notification avait fini l'essai la première).
  if (choix.immediat && !enPause) {
    const frais = abonnement.status === "trialing" ? await stripe.subscriptions.retrieve(abonnement.id) : abonnement;
    if (frais.status !== "trialing") return factureARegler(stripe, frais.latest_invoice);
  }
  const item = abonnement.items.data[0];
  // Une seule carte, celle du CLIENT (`invoice_settings`), que le portail
  // change : une carte fixée sur l'abonnement passerait avant elle au
  // renouvellement, et un client qui change de carte resterait prélevé sur
  // l'ancienne (répétition dans le temps du 2026-11-16, doc Stripe « Subscription
  // invoices »). L'appelant a posé la carte sur le client ; on retire celle de
  // l'abonnement.
  const pmActuel = idStripe(abonnement.default_payment_method);
  const finEssai = choix.immediat && abonnement.status === "trialing";
  if (item?.price.id === choix.priceId && !pmActuel && !finEssai && !enPause) return null;

  // Le taux en vigueur est reposé : un abonnement né sous un ancien taux
  // paie le prix affiché.
  const taux = await tauxEnVigueur(stripe);
  const decision = {
    items: item ? [{ id: item.id, price: choix.priceId }] : [{ price: choix.priceId }],
    default_payment_method: "",
    // Stripe refuse `proration_behavior` sur un abonnement en pause
    // (« Resume the subscription first », répétition en local du
    // 2026-11-16) : la reprise qui suit le porte, et ne facture que la
    // nouvelle période.
    ...(enPause ? {} : { proration_behavior: "none" as const }),
    ...(finEssai ? { trial_end: "now" as const } : {}),
    ...(taux ? { default_tax_rates: [taux] } : {}),
  };
  // La clé d'idempotence porte l'EMPREINTE de la décision (formule, carte,
  // fin d'essai, TVA, prorata) : le même choix rejoué — deux onglets, un
  // événement relivré — retombe sur la même clé ; un geste rejoué après un
  // changement du code (paramètres différents) en prend une neuve au lieu
  // d'échouer pour toujours (`StripeIdempotencyError`, répétition du
  // 2026-11-16). L'état relu juste avant protège ce cas-là.
  // La TVA n'y entre pas : elle est LUE (cache, réseau), pas choisie, et un
  // chemin qui l'aurait manquée prendrait une autre clé que l'autre, pour un
  // même choix (revue du 2026-11-16).
  const choisi = { ...decision, default_tax_rates: undefined };
  const empreinte = createHash("sha256").update(JSON.stringify(choisi)).digest("hex").slice(0, 12);
  const cle = (etape: string) => (choix.idempotence ? { idempotencyKey: `${choix.idempotence}-${empreinte}-${etape}` } : {});
  const misAJour = await stripe.subscriptions.update(
    abonnement.id,
    { ...decision, metadata: { rojerChoixLe: String(choix.choisiLe) }, expand: ["latest_invoice"] },
    cle("maj"),
  );
  if (!enPause) return finEssai ? factureARegler(stripe, misAJour.latest_invoice) : null;
  // Reprise : la période repart à aujourd'hui (le défaut de l'API). Stripe
  // crée la facture de la reprise sans la prélever (constaté en local le
  // 2026-11-16 : `open`, jamais tentée) ; on la règle avec la carte du
  // client, que l'appelant vient de poser. Refusée ou à authentifier : sa page, où le client la
  // règle. L'abonnement reste en pause tant qu'elle n'est pas payée.
  const repris = await stripe.subscriptions.resume(
    abonnement.id,
    { proration_behavior: "none", expand: ["latest_invoice"] },
    cle("reprise"),
  );
  return reglerLaFacture(stripe, repris.latest_invoice);
}

/**
 * Régler tout de suite une facture ouverte avec la carte du client : `null` si
 * elle est payée (ou s'il n'y a rien à régler), sinon l'adresse de sa page
 * (carte refusée, authentification demandée).
 */
async function reglerLaFacture(
  stripe: Stripe,
  derniere: Stripe.Subscription["latest_invoice"],
): Promise<string | null> {
  const facture = await factureOuverte(stripe, derniere);
  if (!facture?.id) return null;
  try {
    // Une clé tirée de la FACTURE : les deux chemins qui finalisent la même
    // carte (retour de Checkout, webhook) règlent la même facture sous la
    // même clé — un seul règlement (revue du 2026-11-16).
    const payee = await stripe.invoices.pay(facture.id, {}, { idempotencyKey: `payer-${facture.id}` });
    return payee.status === "paid" ? null : (payee.hosted_invoice_url ?? facture.hosted_invoice_url ?? null);
  } catch (e) {
    // Le même règlement en cours ailleurs (409) : on ne sait pas encore s'il
    // passe — l'erreur remonte, l'appelant relit la page sans rien annoncer
    // (`dejaEnCours`, `finaliserCarteAction`).
    if ((e as { statusCode?: number })?.statusCode === 409) throw e;
    // Sinon, la facture fait foi : déjà payée (par l'autre chemin), rien à
    // faire ; encore ouverte (carte refusée, 3-D Secure), sa page.
    const relue = await stripe.invoices.retrieve(facture.id).catch(() => null);
    if (relue?.status === "paid") return null;
    return relue?.hosted_invoice_url ?? facture.hosted_invoice_url ?? null;
  }
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
  // La mise à jour d'abord : si elle échoue, la baisse prévue reste intacte.
  // Le taux de TVA n'y est pas reposé : une mise à jour en attente de
  // paiement (`pending_if_incomplete`) n'accepte que les articles et le
  // prorata. Seuls des abonnements de test sont nés sous l'ancien taux.
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
  // La montée est faite : rendre la baisse prévue ne doit pas la faire passer
  // pour un échec. Si Stripe refuse, la page montre encore la baisse et
  // propose « Garder ma formule ».
  const planning = idStripe(abonnement.schedule);
  if (planning) {
    try {
      await stripe.subscriptionSchedules.release(planning);
    } catch (e) {
      console.error(`stripe : baisse prévue non rendue après une montée (${planning}) — ${e instanceof Error ? e.name : "erreur"}`);
    }
  }
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
  if (aPorteUneBaisse && enCours.start_date >= derniere.start_date) await stripe.subscriptionSchedules.release(id);
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
