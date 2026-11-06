"use server";
// Les gestes de l'abonnement (ADR-053 §§ 8 à 12), réservés au propriétaire du
// compte (ADR-054). Tous restent ouverts à un compte impayé : c'est par eux
// qu'il reprend la main (`saisie-gardee.test.ts`, liste OUVERTES).

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { requireCompte } from "@/lib/auth/compte";
import { publicAppUrl } from "@/lib/email";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { abonnementCourant, synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import { abonnementsDuClient, appliquerFormule, ouvrirCheckout, ouvrirCheckoutCarte, ouvrirPortail, prixDesFormules } from "@/lib/stripe/parcours";
import { carteParDefaut, finaliserCarte, type IssueCarte } from "./souscription";
import { demarrerEssaiDuCompte, PAGE_ESSAI, type EtatEssai } from "./essai";
import { aNomProvisoire, abonnementEnCours, SANS_PAIEMENT_ENCORE } from "./droits";
import { estLookupKey } from "./formules";
import { PAGE_ABONNEMENT, verifierProprietaire, verifierRole } from "./saisie";

/**
 * Démarrer l'essai (écran « Votre essai gratuit »). Le rôle d'abord : le
 * compte n'existe peut-être pas encore, la propriété se vérifie une fois créé.
 */
export async function demarrerEssaiAction(_prev: EtatEssai, formData: FormData): Promise<EtatEssai> {
  await verifierRole();
  return demarrerEssaiDuCompte(formData.get("accepte") === "oui");
}

/** Le client Stripe du compte, ou la page qui dit pourquoi il n'y en a pas. */
async function clientDuCompte() {
  const config = configurationStripe();
  if (!config.active) redirect(PAGE_ABONNEMENT);
  const { compte, db } = await requireCompte();
  const ligne = await db.abonnement.findUnique({
    where: { compteId: compte.compteId },
    select: { stripeCustomerId: true, statut: true },
  });
  if (!ligne) redirect(PAGE_ESSAI);
  return { stripe: clientStripe(config), db, ligne, compteId: compte.compteId };
}

/**
 * Le portail Stripe : ajouter une carte, changer de formule (l'essai continue),
 * reprendre, résilier, télécharger les factures. Le nom de l'entreprise passe
 * sur le client Stripe juste avant : la facture le porte.
 */
export async function ouvrirPortailAction(): Promise<void> {
  await verifierProprietaire();
  const { stripe, db, ligne } = await clientDuCompte();
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
  await verifierProprietaire();
  const { stripe, ligne, compteId } = await clientDuCompte();
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
      const carte = await carteParDefaut(stripe, ligne.stripeCustomerId);
      if (carte) {
        const prix = (await prixDesFormules(stripe)).get(formule);
        if (!prix) throw new Error("prix introuvable");
        const paye = immediat || courant.status === "paused";
        const aRegler = await appliquerFormule(stripe, courant, {
          priceId: prix.priceId,
          paymentMethodId: carte,
          immediat: paye,
          choisiLe: Math.floor(Date.now() / 1000),
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
    } else if (courant && abonnementEnCours(courant.status)) {
      await synchroniserClientStripe(stripe, ligne.stripeCustomerId).catch(() => null);
    } else {
      const prix = (await prixDesFormules(stripe)).get(formule);
      if (!prix) throw new Error("prix introuvable");
      url = await ouvrirCheckout(stripe, {
        customerId: ligne.stripeCustomerId,
        priceId: prix.priceId,
        metadata: { compteId },
        succes: `${base}?paiement=termine`,
        annulation: base,
      });
    }
  } catch {
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  redirect(url ?? `${PAGE_ABONNEMENT}?abonnement=en-cours`);
}

/**
 * Au retour de Checkout « carte » : appliquer la formule choisie. Appelée
 * par la page dès son ouverture ; le webhook fait de même si l'onglet a été
 * fermé (`finaliserCarte` est idempotente).
 */
export async function finaliserCarteAction(sessionId: string): Promise<void> {
  await verifierProprietaire();
  const { stripe, ligne } = await clientDuCompte();
  let issue: IssueCarte = { issue: "rien" };
  try {
    if (/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      issue = await finaliserCarte(stripe, sessionId, { customerId: ligne.stripeCustomerId });
    }
  } catch (e) {
    // Le webhook applique la même session au même instant (clé d'idempotence
    // partagée) : ce n'est pas un échec, la page relira l'état.
    if (e instanceof Stripe.errors.StripeIdempotencyError || (e as { statusCode?: number })?.statusCode === 409) {
      redirect(PAGE_ABONNEMENT);
    }
    console.error(`abonnement : finalisation de la carte en échec — ${e instanceof Error ? e.name : "erreur"}`);
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  if (issue.issue === "aRegler") redirect(issue.url);
  if (issue.issue === "appliquee") {
    redirect(`${PAGE_ABONNEMENT}${issue.immediat ? "?paiement=termine" : "?abonnement=formule-choisie"}`);
  }
  redirect(PAGE_ABONNEMENT);
}
