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
import { sensDuChangement } from "./changement";
import { depassements } from "./quotas";
import { PAGE_ABONNEMENT, verifierProprietaire, verifierRole, type Proprietaire } from "./saisie";
import { PAGE_FORMULES } from "./sous-pages";
import { ouvrirAuGel } from "./gel-saisie";

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
      const marque = await db.abonnement.updateMany({ where: { compteId }, data: { paiementOuvertLe: new Date() } });
      url =
        marque.count !== 1
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

/**
 * Changer de formule, pour un abonnement qui paie (§ 10, amendé le
 * 2026-11-06). Montée : tout de suite, la différence prélevée aussitôt et la
 * formule appliquée seulement si ce paiement passe. Baisse : à la fin de la
 * période payée, refusée tant que le compte a plus d'utilisateurs que la
 * formule visée n'en permet ; ce qui dépasse d'autre passera en lecture
 * seule (§ 14, la page le dit avant le clic).
 */
export async function changerFormuleAction(formData: FormData): Promise<void> {
  const proprietaire = await verifierProprietaire();
  const { stripe, db, customerId, compteId } = await avecClient(proprietaire, formData);
  const formule = String(formData.get("formule") ?? "");
  const visee = formuleDeLookupKey(formule);
  if (!visee) redirect(PAGE_ABONNEMENT);
  let cible = PAGE_ABONNEMENT;
  try {
    const { courant } = abonnementCourant(await abonnementsDuClient(stripe, customerId));
    const item = courant?.items.data[0];
    if (!courant || courant.status !== "active" || !item) {
      cible = `${PAGE_FORMULES}?formule=impossible`;
    } else if (resiliationDemandee(courant)) {
      // Une résiliation est prévue : on ne change pas une formule qui s'arrête.
      cible = `${PAGE_FORMULES}?formule=resiliation-prevue`;
    } else {
      const sens = sensDuChangement(formuleDuPrix(item.price), formule);
      const prix = (await prixDesFormules(stripe)).get(formule);
      if (!prix) throw new Error("prix introuvable");
      if (sens === "montee") {
        const aRegler = await monterDeFormule(stripe, courant, { priceId: prix.priceId, intervalle: INTERVALLE_STRIPE[visee.periodicite] });
        await synchroniserClientStripe(stripe, customerId).catch(() => null);
        cible = aRegler ?? `${PAGE_ABONNEMENT}?formule=changee`;
      } else if (sens === "baisse") {
        const trop = await depassements(db, compteId, formule);
        if (trop.some((d) => d.quota === "membres")) {
          cible = `${PAGE_FORMULES}?formule=trop-d-utilisateurs`;
        } else {
          await planifierBaisse(stripe, courant, { priceId: prix.priceId, intervalle: INTERVALLE_STRIPE[visee.periodicite] });
          // Une invitation partie entre la vérification et le planning : on
          // revérifie, et la baisse est rendue si elle ne tient plus.
          if ((await depassements(db, compteId, formule)).some((d) => d.quota === "membres")) {
            await annulerBaisse(stripe, (await abonnementsDuClient(stripe, customerId)).find((a) => a.id === courant.id) ?? courant);
            cible = `${PAGE_FORMULES}?formule=trop-d-utilisateurs`;
          } else cible = `${PAGE_ABONNEMENT}?formule=prevue`;
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
