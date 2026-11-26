"use server";
// Les gestes de l'abonnement (ADR-053 §§ 8 à 12), réservés au propriétaire du
// compte (ADR-054). Tous restent ouverts à un compte impayé ou dont l'essai
// est fini : c'est par eux qu'il reprend la main (`saisie-gardee.test.ts`,
// liste OUVERTES). L'essai se compte chez Rojer (ADR-053 § 9, amendé le
// 2026-11-16) : pas de client Stripe avant « s'abonner ».

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { publicAppUrl } from "@/lib/email";
import { memeCompteQueLaPage } from "@/lib/auth/compte-attendu";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { abonnementCourant, motifDErreur, synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import {
  abonnementsDuClient,
  annulerBaisse,
  apercuDeMontee,
  monterDeFormule,
  ouvrirCheckout,
  ouvrirPortail,
  planifierBaisse,
  prixDesFormules,
  tauxDeTva,
} from "@/lib/stripe/parcours";
import { clientStripeDuCompte } from "./client-stripe";
import { demarrerEssaiDuCompte, PAGE_ESSAI, type EtatEssai } from "./essai";
import { aNomProvisoire, abonnementEnCours, resiliationDemandee } from "./droits";
import { INTERVALLE_STRIPE, estLookupKey, formuleDeLookupKey, formuleDuPrix } from "./formules";
import { sensDuChangement, type Sens } from "./changement";
import type { RefusChangement } from "./refus-changement";
import { depassements } from "./quotas";
import { PAGE_ABONNEMENT, verifierProprietaire, verifierRole, type Proprietaire } from "./saisie";
import { PAGE_FORMULES } from "./sous-pages";
import { ouvrirAuGel } from "./gel-saisie";
import { demandeDuCompte, PAGE_SUPPRESSION } from "@/lib/compte/suppression";

/**
 * Démarrer l'essai (écran « Votre essai gratuit »). Le rôle d'abord : le
 * compte n'existe peut-être pas encore, la propriété se vérifie une fois créé.
 */
export async function demarrerEssaiAction(_prev: EtatEssai, formData: FormData): Promise<EtatEssai> {
  await verifierRole();
  ouvrirAuGel(); // l'essai s'écrit quand la saisie est encore fermée (ADR-053 § 3)
  return demarrerEssaiDuCompte(formData.get("accepte") === "oui", formData);
}

/**
 * La ligne d'abonnement du compte que `verifierProprietaire` a vérifié —
 * jamais du compte actif relu (un autre onglet a pu en changer) —, ou la
 * page qui dit pourquoi il n'y en a pas. Son client Stripe peut manquer
 * (essai) : `avecClient` l'exige.
 */
async function clientDuCompte({ compte, db }: Proprietaire, formData: FormData | null) {
  // Le compte de la page (`ChampCompteAttendu`) : un autre onglet a pu changer
  // le compte actif, et le geste partirait sur celui-là. La page, rendue de
  // nouveau sur le compte actif, dit que rien n'a été fait. `null` : le retour
  // de Stripe, que la session de paiement rattache déjà à son client.
  if (formData && !memeCompteQueLaPage(formData, compte.compteId)) redirect(`${PAGE_ABONNEMENT}?compte=change`);
  // Une suppression demandée ferme tous les gestes d'abonnement (s'abonner,
  // changer de formule, le portail) : on ne paie pas pour un compte qui va
  // disparaître, et la fin programmée par la demande ne se défait pas au
  // portail (ADR-058 § 8). On annule d'abord — la page de la suppression.
  if (formData && (await demandeDuCompte(compte.compteId))) redirect(PAGE_SUPPRESSION);
  const config = configurationStripe();
  if (!config.active) redirect(PAGE_ABONNEMENT);
  const ligne = await db.abonnement.findUnique({
    where: { compteId: compte.compteId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!ligne) redirect(PAGE_ESSAI);
  return { stripe: clientStripe(config), db, ligne, compteId: compte.compteId, conditionsSurCheckout: config.conditionsSurCheckout };
}

/** Les gestes sur un abonnement Stripe (portail, facture, formule) : sans client, rien à gérer. */
async function avecClient(proprietaire: Proprietaire, formData: FormData) {
  const lu = await clientDuCompte(proprietaire, formData);
  const customerId = lu.ligne.stripeCustomerId;
  if (!customerId) redirect(PAGE_ABONNEMENT);
  return { ...lu, customerId };
}

/**
 * Le portail Stripe : la carte, les factures, reprendre, résilier (le
 * changement de formule se fait dans Rojer, `sAbonnerAction` et
 * `changerFormuleAction`). Le nom de l'entreprise passe
 * sur le client Stripe juste avant : la facture le porte.
 *
 * `geste=resilier` (2026-11-17) : le portail s'ouvre sur l'écran de
 * résiliation de l'abonnement du compte — son identifiant vient de la copie
 * locale du compte vérifié, jamais du formulaire.
 */
export async function ouvrirPortailAction(formData: FormData): Promise<void> {
  const proprietaire = await verifierProprietaire();
  const { stripe, db, customerId, ligne } = await avecClient(proprietaire, formData);
  const resilier = formData.get("geste") === "resilier" ? ligne.stripeSubscriptionId : null;
  let url: string;
  try {
    // Seulement si le nom est encore le provisoire (l'adresse) : un nom saisi
    // au paiement, dans Checkout ou le portail, ne s'écrase pas.
    const client = await stripe.customers.retrieve(customerId);
    if (!client.deleted && aNomProvisoire(client)) {
      const entreprise = await db.entreprise.findFirst({ orderBy: { createdAt: "asc" }, select: { raisonSociale: true } });
      if (entreprise) await stripe.customers.update(customerId, { name: entreprise.raisonSociale });
    }
    url = await ouvrirPortail(stripe, { customerId, retour: `${publicAppUrl()}${PAGE_ABONNEMENT}`, resilier });
  } catch {
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  redirect(url);
}

/**
 * S'abonner (ADR-053 § 9, amendé le 2026-11-16) : la formule et le rythme
 * choisis dans Rojer, puis Checkout en mode abonnement — Stripe y porte la
 * carte, la confirmation de la banque, les conditions et l'adresse ; le
 * premier paiement est immédiat. Pendant l'essai, après lui, ou après une
 * résiliation : le même geste. Le client Stripe naît ici s'il manque.
 * Stripe fait foi : un abonnement qui court ne se double jamais — la copie
 * est relue et la page le dit.
 */
export async function sAbonnerAction(formData: FormData): Promise<void> {
  const proprietaire = await verifierProprietaire();
  // S'abonner se fait AUSSI quand la saisie est fermée (essai fini, abonnement
  // terminé) : le client Stripe s'écrit alors sur la ligne d'abonnement
  // (répétition locale du 2026-11-17 — sans cela, impossible de s'abonner
  // après l'essai).
  ouvrirAuGel();
  // ~~Rojer pas encore ouvert au public (`lib/ouverture.ts`, 2026-11-23,
  // décision de la propriétaire : Stripe non validé) : pas de paiement.~~
  // [2026-11-26 : Stripe validé ; le paiement ne dépend plus de l'ouverture
  // au public — la page publique peut être fermée pendant que les comptes
  // venus par lien direct paient. Décision de la propriétaire.]
  const { stripe, db, ligne, compteId, conditionsSurCheckout } = await clientDuCompte(proprietaire, formData);
  const formule = String(formData.get("formule") ?? "");
  if (!estLookupKey(formule)) redirect(PAGE_ABONNEMENT);
  const email = proprietaire.user.email;
  if (!email) redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  const base = `${publicAppUrl()}${PAGE_ABONNEMENT}`;
  // `null` : un abonnement court déjà (notre copie retardait).
  let url: string | null = null;
  try {
    const customerId = await clientStripeDuCompte(stripe, db, { compteId, email, enregistre: ligne.stripeCustomerId });
    const { courant } = abonnementCourant(await abonnementsDuClient(stripe, customerId));
    // ~~Un premier paiement en attente (`incomplete`) renvoyait à sa facture~~
    // [2026-11-17 : Checkout ne crée l'abonnement qu'une fois le paiement
    // passé — une confirmation de la banque ratée laisse la session ouverte,
    // sans abonnement (répétition du jour). Un abonnement qui court, quel
    // que soit son état, se gère au portail : la copie est relue.]
    if (courant && abonnementEnCours(courant.status)) {
      await synchroniserClientStripe(stripe, customerId).catch(() => null);
    } else {
      const [catalogue, tauxTva] = await Promise.all([prixDesFormules(stripe), tauxDeTva(stripe)]);
      const prix = catalogue.get(formule);
      if (!prix || !tauxTva) throw new Error("prix ou TVA introuvable");
      // La marque d'abord : la suppression du compte (ADR-058) la lit sous
      // verrou et attend une heure, le temps que la page expire. Plus de
      // ligne (compte effacé entre-temps) : pas de paiement.
      // … ni de demande de suppression posée depuis la lecture (ADR-058 § 8) :
      // relue APRÈS la marque. ~~Filtre `compte: { suppressionDemandeeLe: null }`
      // dans la marque~~ [2026-11-26 : le client borné refuse tout filtre vers
      // `Compte` (ErreurPortee) — « S'abonner » échouait en production pour
      // tous ; les tests simulaient la base et ne l'ont pas vu.]
      const marque = await db.abonnement.updateMany({
        where: { compteId },
        data: { paiementOuvertLe: new Date() },
      });
      url =
        marque.count !== 1 || (await demandeDuCompte(compteId))
          ? PAGE_ABONNEMENT
          : await ouvrirCheckout(stripe, {
              customerId,
              priceId: prix.priceId,
              tauxTva,
              metadata: { compteId },
              // Stripe remplace `{CHECKOUT_SESSION_ID}` : la page ne croit ce
              // retour que pour une session payée de ce client.
              succes: `${base}?paiement=termine&session={CHECKOUT_SESSION_ID}`,
              // Annuler ramène au choix de la formule (2026-11-17).
              annulation: `${publicAppUrl()}${PAGE_FORMULES}`,
              conditions: conditionsSurCheckout,
            });
    }
  } catch (e) {
    // Le même geste parti d'un autre onglet est passé ou passe : rien n'a
    // échoué, la page relit l'état (jamais « rien ne vous a été facturé »).
    if (dejaEnCours(e)) redirect(PAGE_ABONNEMENT);
    console.error(`abonnement : s'abonner en échec — ${motifDErreur(e)}`);
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  redirect(url ?? `${PAGE_ABONNEMENT}?abonnement=en-cours`);
}

/** Le même geste envoyé deux fois : Stripe le dit par un 409, ou par un planning déjà rattaché. */
const dejaEnCours = (e: unknown) =>
  e instanceof Stripe.errors.StripeIdempotencyError ||
  (e as { statusCode?: number })?.statusCode === 409 ||
  /already (has|attached to) a (subscription )?schedule/i.test(e instanceof Error ? e.message : "");

/** L'aperçu d'une montée, ou rien : la fenêtre le dit, et le paiement reste fermé. */
export type ApercuDeChangement = { aujourdhuiCentimes: number; jusquAu: string | null; prorationDate: number } | { erreur: true };

type Visee = { priceId: string; intervalle: (typeof INTERVALLE_STRIPE)[keyof typeof INTERVALLE_STRIPE] };

/**
 * L'abonnement à changer, relu chez Stripe, et le prix visé — ou le refus :
 * un abonnement qui n'est pas à jour, une résiliation prévue. Une seule
 * écriture de ces règles, pour l'aperçu et pour le changement.
 */
async function aChanger(
  stripe: Stripe,
  customerId: string,
  formule: string,
  periodicite: keyof typeof INTERVALLE_STRIPE,
): Promise<{ refus: RefusChangement } | { courant: Stripe.Subscription; item: Stripe.SubscriptionItem; sens: Sens | null; visee: Visee }> {
  const [abonnements, catalogue] = await Promise.all([abonnementsDuClient(stripe, customerId), prixDesFormules(stripe)]);
  const { courant } = abonnementCourant(abonnements);
  const item = courant?.items.data[0];
  if (!courant || courant.status !== "active" || !item) return { refus: "impossible" };
  // Une résiliation est prévue : on ne change pas une formule qui s'arrête.
  if (resiliationDemandee(courant)) return { refus: "resiliation-prevue" };
  const prix = catalogue.get(formule);
  if (!prix) throw new Error("prix introuvable");
  return { courant, item, sens: sensDuChangement(formuleDuPrix(item.price), formule), visee: { priceId: prix.priceId, intervalle: INTERVALLE_STRIPE[periodicite] } };
}

/**
 * L'aperçu d'une montée, pour la fenêtre de confirmation (retour de test du
 * 2026-11-23) : ce que Stripe prélèverait aujourd'hui, sans rien prélever.
 * Les mêmes gardes que le changement lui-même (`aChanger`).
 */
export async function apercuMonteeAction(formData: FormData): Promise<ApercuDeChangement> {
  const proprietaire = await verifierProprietaire();
  const { stripe, customerId } = await avecClient(proprietaire, formData);
  const formule = String(formData.get("formule") ?? "");
  const visee = formuleDeLookupKey(formule);
  if (!visee) return { erreur: true };
  try {
    const c = await aChanger(stripe, customerId, formule, visee.periodicite);
    if ("refus" in c || c.sens !== "montee") return { erreur: true };
    const a = await apercuDeMontee(stripe, c.courant, c.visee);
    return { aujourdhuiCentimes: a.aujourdhuiCentimes, jusquAu: a.jusquAu?.toISOString() ?? null, prorationDate: a.prorationDate };
  } catch (e) {
    console.error(`abonnement : aperçu d'une montée en échec — ${motifDErreur(e)}`);
    return { erreur: true };
  }
}

/** Ce que le changement a fait, ou pourquoi il est refusé : dit dans la fenêtre de confirmation. */
export type ResultatChangement =
  | { etat: "changee"; preleveCentimes: number | null; prochainLe: string | null }
  | { etat: "prevue"; le: string | null }
  | { etat: "refus"; refus: RefusChangement }
  | null;

/**
 * L'instant du prorata de l'aperçu montré : repris s'il date de moins d'une
 * heure et n'est pas dans le futur, sinon Stripe prend l'instant présent.
 */
function prorationDeLApercu(formData: FormData): number | undefined {
  const v = Number(formData.get("prorationDate"));
  const maintenant = Math.floor(Date.now() / 1000);
  return Number.isInteger(v) && v <= maintenant && v > maintenant - 3600 ? v : undefined;
}

/**
 * Changer de formule, pour un abonnement qui paie (§ 10, amendé le
 * 2026-11-06). Montée : tout de suite, la différence prélevée aussitôt et la
 * formule appliquée seulement si ce paiement passe. Baisse : à la fin de la
 * période payée, refusée tant que le compte a plus d'utilisateurs que la
 * formule visée n'en permet ; ce qui dépasse d'autre passera en lecture
 * seule (§ 14, la fenêtre le dit avant le geste). Le résultat et les refus
 * reviennent à la fenêtre de confirmation (2026-11-23) ; une facture à
 * régler mène à sa page.
 */
export async function changerFormuleAction(_prev: ResultatChangement, formData: FormData): Promise<ResultatChangement> {
  const proprietaire = await verifierProprietaire();
  const { stripe, db, customerId, compteId } = await avecClient(proprietaire, formData);
  const formule = String(formData.get("formule") ?? "");
  const visee = formuleDeLookupKey(formule);
  if (!visee) redirect(PAGE_ABONNEMENT);
  let cible = PAGE_ABONNEMENT;
  let resultat: ResultatChangement = null;
  try {
    const c = await aChanger(stripe, customerId, formule, visee.periodicite);
    if ("refus" in c) {
      resultat = { etat: "refus", refus: c.refus };
    } else if (c.sens === "montee") {
      const fait = await monterDeFormule(stripe, c.courant, c.visee, prorationDeLApercu(formData));
      await synchroniserClientStripe(stripe, customerId).catch(() => null);
      // Une facture à régler mène à sa page ; une montée pas encore
      // appliquée (paiement en attente) ne se dit pas faite : la page la relit.
      if (fait.aRegler) cible = fait.aRegler;
      else if (fait.appliquee) {
        resultat = { etat: "changee", preleveCentimes: fait.preleveCentimes, prochainLe: fait.prochainLe?.toISOString() ?? null };
      }
    } else if (c.sens === "baisse") {
      if ((await depassements(db, compteId, formule)).some((d) => d.quota === "membres")) {
        resultat = { etat: "refus", refus: "trop-d-utilisateurs" };
      } else {
        await planifierBaisse(stripe, c.courant, c.visee);
        // Une invitation partie entre la vérification et le planning : on
        // revérifie, et la baisse est rendue si elle ne tient plus.
        if ((await depassements(db, compteId, formule)).some((d) => d.quota === "membres")) {
          await annulerBaisse(stripe, (await abonnementsDuClient(stripe, customerId)).find((a) => a.id === c.courant.id) ?? c.courant);
          resultat = { etat: "refus", refus: "trop-d-utilisateurs" };
        } else {
          const fin = c.item.current_period_end;
          resultat = { etat: "prevue", le: fin ? new Date(fin * 1000).toISOString() : null };
        }
      }
    }
  } catch (e) {
    // Un double clic : le premier envoi est passé (clé d'idempotence, ou
    // planning déjà créé) — la page relit l'état, sans erreur.
    if (dejaEnCours(e)) redirect(PAGE_ABONNEMENT);
    console.error(`abonnement : changement de formule en échec — ${motifDErreur(e)}`);
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  if (resultat) return resultat;
  redirect(cible);
}

/** Renoncer à une baisse de formule planifiée (§ 10). */
export async function annulerBaisseAction(formData: FormData): Promise<void> {
  const proprietaire = await verifierProprietaire();
  const { stripe, customerId } = await avecClient(proprietaire, formData);
  try {
    const { courant } = abonnementCourant(await abonnementsDuClient(stripe, customerId));
    if (courant) await annulerBaisse(stripe, courant);
  } catch {
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  redirect(`${PAGE_ABONNEMENT}?formule=gardee`);
}
