"use server";
// Les gestes de l'abonnement (ADR-053 §§ 8 à 12), réservés au propriétaire du
// compte (ADR-054). Tous restent ouverts à un compte impayé : c'est par eux
// qu'il reprend la main (`saisie-gardee.test.ts`, liste OUVERTES).

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
  appliquerFormule,
  factureARegler,
  monterDeFormule,
  ouvrirCheckout,
  ouvrirCheckoutCarte,
  ouvrirPortail,
  planifierBaisse,
  prixDesFormules,
  tauxDeTva,
} from "@/lib/stripe/parcours";
import { carteParDefaut, finaliserCarte, type IssueCarte } from "./souscription";
import { demarrerEssaiDuCompte, PAGE_ESSAI, type EtatEssai } from "./essai";
import { A_REGLER, aNomProvisoire, abonnementEnCours, resiliationDemandee, SANS_PAIEMENT_ENCORE } from "./droits";
import { INTERVALLE_STRIPE, estLookupKey, formuleDeLookupKey, formuleDuPrix } from "./formules";
import { sensDuChangement } from "./changement";
import { depassements } from "./quotas";
import { PAGE_ABONNEMENT, verifierProprietaire, verifierRole, type Proprietaire } from "./saisie";
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
 * Le client Stripe du compte que `verifierProprietaire` a vérifié — jamais du
 * compte actif relu (un autre onglet a pu en changer) —, ou la page qui dit
 * pourquoi il n'y en a pas.
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
    select: { stripeCustomerId: true, statut: true },
  });
  if (!ligne) redirect(PAGE_ESSAI);
  return { stripe: clientStripe(config), db, ligne, compteId: compte.compteId };
}

/**
 * Le portail Stripe : la carte, les factures, reprendre, résilier (le
 * changement de formule se fait dans Rojer, `sAbonnerAction` et
 * `changerFormuleAction`). Le nom de l'entreprise passe
 * sur le client Stripe juste avant : la facture le porte.
 */
export async function ouvrirPortailAction(formData: FormData): Promise<void> {
  const proprietaire = await verifierProprietaire();
  const { stripe, db, ligne } = await clientDuCompte(proprietaire, formData);
  let url: string;
  try {
    // Seulement si le nom est encore le provisoire de l'essai (l'adresse) : un
    // nom saisi au paiement, dans Checkout ou le portail, ne s'écrase pas.
    const client = await stripe.customers.retrieve(ligne.stripeCustomerId);
    if (!client.deleted && aNomProvisoire(client)) {
      const entreprise = await db.entreprise.findFirst({ orderBy: { createdAt: "asc" }, select: { raisonSociale: true } });
      if (entreprise) await stripe.customers.update(ligne.stripeCustomerId, { name: entreprise.raisonSociale });
    }
    url = await ouvrirPortail(stripe, { customerId: ligne.stripeCustomerId, retour: `${publicAppUrl()}${PAGE_ABONNEMENT}` });
  } catch {
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  redirect(url);
}

/**
 * S'abonner (§ 10, amendé le 2026-11-05) : la formule et le rythme choisis
 * dans Rojer. Un abonnement qui court sans payer encore (essai, pause) reçoit
 * la carte par Checkout « setup », puis la formule (`souscription.ts`) ;
 * après une résiliation, Checkout souscrit un nouvel abonnement. Stripe fait
 * foi : un abonnement déjà payant ne se double jamais — la copie est relue et
 * la page le dit. `immediat` : l'essai s'arrête et le premier mois se paie
 * tout de suite (valider un document légal pendant l'essai).
 */
export async function sAbonnerAction(formData: FormData): Promise<void> {
  const proprietaire = await verifierProprietaire();
  const { stripe, ligne, compteId } = await clientDuCompte(proprietaire, formData);
  const formule = String(formData.get("formule") ?? "");
  if (!estLookupKey(formule)) redirect(PAGE_ABONNEMENT);
  const immediat = formData.get("immediat") === "oui";
  const base = `${publicAppUrl()}${PAGE_ABONNEMENT}`;
  // `null` : un abonnement paie déjà (notre copie retardait).
  let url: string | null = null;
  try {
    const { courant } = abonnementCourant(await abonnementsDuClient(stripe, ligne.stripeCustomerId));
    if (courant && SANS_PAIEMENT_ENCORE.has(courant.status)) {
      // Une carte est déjà enregistrée : la formule s'applique sans repasser
      // par Stripe (changer de formule pendant l'essai, reprendre une pause).
      const [carte, catalogue] = await Promise.all([carteParDefaut(stripe, ligne.stripeCustomerId), prixDesFormules(stripe)]);
      if (resiliationDemandee(courant)) {
        // Une résiliation est prévue (portail, pendant l'essai) : on ne
        // change pas une formule qui s'arrête — même règle que
        // `changerFormuleAction`.
        url = `${base}?formule=resiliation-prevue`;
      } else if (carte) {
        const prix = catalogue.get(formule);
        if (!prix) throw new Error("prix introuvable");
        const paye = immediat || courant.status === "paused";
        const aRegler = await appliquerFormule(stripe, courant, {
          priceId: prix.priceId,
          paymentMethodId: carte,
          immediat: paye,
          choisiLe: Math.floor(Date.now() / 1000),
          // Le même choix envoyé de deux onglets ne se joue qu'une fois : le
          // second reçoit de Stripe un refus d'idempotence (paramètres
          // différents d'une seconde) ou un 409, et la page relit l'état
          // (`dejaEnCours` plus bas). Le dernier choix appliqué
          // (`rojerChoixLe`) entre dans la clé, pour qu'un retour au même
          // choix plus tard ne soit pas pris pour un rejeu.
          idempotence: `formule-${courant.id}-${courant.metadata?.rojerChoixLe ?? "0"}-${prix.priceId}-${paye ? "maintenant" : "fin-essai"}`,
        });
        await synchroniserClientStripe(stripe, ligne.stripeCustomerId).catch(() => null);
        url = aRegler ?? `${base}${paye ? "?paiement=termine" : "?abonnement=formule-choisie"}`;
      } else url = await ouvrirCheckoutCarte(stripe, {
        customerId: ligne.stripeCustomerId,
        metadata: { compteId, formule, immediat: immediat ? "oui" : "non" },
        // `{CHECKOUT_SESSION_ID}` : remplacé par Stripe au retour.
        succes: `${base}?carte={CHECKOUT_SESSION_ID}`,
        annulation: base,
      });
    } else if (courant?.status === "incomplete") {
      // Un premier paiement resté en attente (Checkout abandonné à
      // l'authentification) : on le termine, au lieu d'attendre que Stripe
      // l'expire (environ 23 heures).
      url = await versLaFactureEnAttente(stripe, courant);
    } else if (courant && abonnementEnCours(courant.status)) {
      await synchroniserClientStripe(stripe, ligne.stripeCustomerId).catch(() => null);
    } else {
      const [catalogue, tauxTva] = await Promise.all([prixDesFormules(stripe), tauxDeTva(stripe)]);
      const prix = catalogue.get(formule);
      if (!prix || !tauxTva) throw new Error("prix ou TVA introuvable");
      url = await ouvrirCheckout(stripe, {
        customerId: ligne.stripeCustomerId,
        priceId: prix.priceId,
        tauxTva,
        metadata: { compteId },
        succes: `${base}?paiement=termine`,
        annulation: base,
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

/**
 * La page hébergée de la facture qui attend ; sans facture payable trouvée,
 * la page de l'abonnement le dit (ce n'est jamais « à jour »).
 */
async function versLaFactureEnAttente(stripe: Stripe, courant: Stripe.Subscription): Promise<string> {
  return (await factureARegler(stripe, courant.latest_invoice)) ?? `${PAGE_ABONNEMENT}?facture=introuvable`;
}

/**
 * Régler la facture en attente (impayé, premier paiement à authentifier) :
 * la page hébergée de la facture, où une autre carte peut servir. Changer
 * de carte au portail ne relance pas une facture déjà marquée impayée
 * (audit du 2026-11-16). Rien à régler : la page de l'abonnement.
 */
export async function reglerFactureAction(formData: FormData): Promise<void> {
  const proprietaire = await verifierProprietaire();
  const { stripe, ligne } = await clientDuCompte(proprietaire, formData);
  let cible = `${PAGE_ABONNEMENT}?facture=aucune`;
  try {
    const { courant } = abonnementCourant(await abonnementsDuClient(stripe, ligne.stripeCustomerId));
    if (courant && A_REGLER.has(courant.status)) cible = await versLaFactureEnAttente(stripe, courant);
  } catch {
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  redirect(cible);
}

/**
 * Au retour de Checkout « carte » : appliquer la formule choisie. Appelée
 * par la page dès son ouverture ; le webhook fait de même si l'onglet a été
 * fermé (`finaliserCarte` est idempotente).
 */
export async function finaliserCarteAction(sessionId: string): Promise<void> {
  const proprietaire = await verifierProprietaire();
  const { stripe, ligne } = await clientDuCompte(proprietaire, null);
  let issue: IssueCarte = { issue: "rien" };
  try {
    if (/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      issue = await finaliserCarte(stripe, sessionId, { customerId: ligne.stripeCustomerId });
    }
  } catch (e) {
    // Le webhook applique la même session au même instant (clé d'idempotence
    // partagée) : ce n'est pas un échec, la page relira l'état.
    if (dejaEnCours(e)) redirect(PAGE_ABONNEMENT);
    console.error(`abonnement : finalisation de la carte en échec — ${motifDErreur(e)}`);
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  if (issue.issue === "aRegler") redirect(issue.url);
  if (issue.issue === "appliquee") {
    redirect(`${PAGE_ABONNEMENT}${issue.immediat ? "?paiement=termine" : "?abonnement=formule-choisie"}`);
  }
  redirect(PAGE_ABONNEMENT);
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
  const { stripe, db, ligne, compteId } = await clientDuCompte(proprietaire, formData);
  const formule = String(formData.get("formule") ?? "");
  const visee = formuleDeLookupKey(formule);
  if (!visee) redirect(PAGE_ABONNEMENT);
  let cible = PAGE_ABONNEMENT;
  try {
    const { courant } = abonnementCourant(await abonnementsDuClient(stripe, ligne.stripeCustomerId));
    const item = courant?.items.data[0];
    if (!courant || courant.status !== "active" || !item) {
      cible = `${PAGE_ABONNEMENT}?formule=impossible`;
    } else if (resiliationDemandee(courant)) {
      // Une résiliation est prévue : on ne change pas une formule qui s'arrête.
      cible = `${PAGE_ABONNEMENT}?formule=resiliation-prevue`;
    } else {
      const sens = sensDuChangement(formuleDuPrix(item.price), formule);
      const prix = (await prixDesFormules(stripe)).get(formule);
      if (!prix) throw new Error("prix introuvable");
      if (sens === "montee") {
        const aRegler = await monterDeFormule(stripe, courant, prix.priceId);
        await synchroniserClientStripe(stripe, ligne.stripeCustomerId).catch(() => null);
        cible = aRegler ?? `${PAGE_ABONNEMENT}?formule=changee`;
      } else if (sens === "baisse") {
        const trop = await depassements(db, compteId, formule);
        if (trop.some((d) => d.quota === "membres")) {
          cible = `${PAGE_ABONNEMENT}?formule=trop-d-utilisateurs`;
        } else {
          await planifierBaisse(stripe, courant, { priceId: prix.priceId, intervalle: INTERVALLE_STRIPE[visee.periodicite] });
          // Une invitation partie entre la vérification et le planning : on
          // revérifie, et la baisse est rendue si elle ne tient plus.
          if ((await depassements(db, compteId, formule)).some((d) => d.quota === "membres")) {
            await annulerBaisse(stripe, (await abonnementsDuClient(stripe, ligne.stripeCustomerId)).find((a) => a.id === courant.id) ?? courant);
            cible = `${PAGE_ABONNEMENT}?formule=trop-d-utilisateurs`;
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
  const { stripe, ligne } = await clientDuCompte(proprietaire, formData);
  try {
    const { courant } = abonnementCourant(await abonnementsDuClient(stripe, ligne.stripeCustomerId));
    if (courant) await annulerBaisse(stripe, courant);
  } catch {
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  redirect(`${PAGE_ABONNEMENT}?formule=gardee`);
}
