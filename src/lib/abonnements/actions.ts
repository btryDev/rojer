"use server";
// Les gestes de l'abonnement (ADR-053 §§ 8 à 12), réservés au propriétaire du
// compte (ADR-054). Tous restent ouverts à un compte impayé : c'est par eux
// qu'il reprend la main (`saisie-gardee.test.ts`, liste OUVERTES).

import { redirect } from "next/navigation";
import { requireCompte } from "@/lib/auth/compte";
import { publicAppUrl } from "@/lib/email";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import { abonnementsDuClient, ouvrirCheckout, ouvrirPortail, prixDesFormules } from "@/lib/stripe/parcours";
import { demarrerEssaiDuCompte, PAGE_ESSAI, type EtatEssai } from "./essai";
import { aNomProvisoire, abonnementEnCours } from "./droits";
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
 * Souscrire de nouveau, après un abonnement terminé (§ 10) : Checkout.
 * Refusé tant qu'un abonnement court — deux onglets feraient deux abonnements.
 */
export async function souscrireAction(formData: FormData): Promise<void> {
  await verifierProprietaire();
  const { stripe, ligne, compteId } = await clientDuCompte();
  if (abonnementEnCours(ligne.statut)) redirect(PAGE_ABONNEMENT);
  const formule = String(formData.get("formule") ?? "");
  if (!estLookupKey(formule)) redirect(PAGE_ABONNEMENT);
  // `null` : un abonnement court déjà chez Stripe (notre copie retardait) —
  // on la remet à jour, et la page le dit.
  let url: string | null = null;
  try {
    if ((await abonnementsDuClient(stripe, ligne.stripeCustomerId)).some((a) => abonnementEnCours(a.status))) {
      await synchroniserClientStripe(stripe, ligne.stripeCustomerId).catch(() => null);
    } else {
      const prix = (await prixDesFormules(stripe)).get(formule);
      if (!prix) throw new Error("prix introuvable");
      url = await ouvrirCheckout(stripe, {
        customerId: ligne.stripeCustomerId,
        priceId: prix.priceId,
        metadata: { compteId },
        succes: `${publicAppUrl()}${PAGE_ABONNEMENT}?paiement=termine`,
        annulation: `${publicAppUrl()}${PAGE_ABONNEMENT}`,
      });
    }
  } catch {
    redirect(`${PAGE_ABONNEMENT}?stripe=indisponible`);
  }
  redirect(url ?? `${PAGE_ABONNEMENT}?abonnement=en-cours`);
}
