import "server-only";
// L'essai gratuit (ADR-053 §§ 8, 9, 12) : l'aiguillage qui y mène, et son
// démarrage. L'écran « Votre essai gratuit » se tient entre la confirmation
// de l'adresse et l'onboarding : l'onboarding se fait pendant l'essai.
//
// Le démarrage, dans l'ordre, chaque étape rejouable :
// 1. le compte (la porte unique de création, ADR-054 § 5) — propriétaire seul ;
// 2. le client Stripe, puis la ligne `Abonnement` RÉSERVÉE : c'est elle, et
//    non la clé d'idempotence (24 heures), qui empêche un second client ;
// 3. le VERROU de l'essai (`essaiUtiliseLe`, mise à jour conditionnelle) :
//    c'est lui qui empêche un second essai, deux onglets compris ;
// 4. la preuve d'acceptation des conditions (version, empreinte) ;
// 5. l'essai chez Stripe (30 jours, sans carte, en pause à la fin) ;
// 6. la relecture immédiate : la saisie s'ouvre sans attendre le webhook.

import type Stripe from "stripe";
import { redirect } from "next/navigation";
import { getOptionalCompte, requireCompteDOnboarding, type Db } from "@/lib/auth/compte";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { creerClientStripe, demarrerEssai, prixDesFormules } from "@/lib/stripe/parcours";
import { codePrisma, synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import { VERSION_CONDITIONS } from "./conditions";
import { empreinteConditions } from "./conditions-empreinte";
import { essaiDisponible } from "./droits";
import { estLookupKey } from "./formules";
import { PAGE_ABONNEMENT, PAGE_MEMBRES, abonnementDuCompte, contexteDroits, offreLancee } from "./saisie";

export const PAGE_ESSAI = "/essai";

/**
 * Où envoyer une personne connectée AVANT l'onboarding (après
 * `aiguillageSansCompte`, qui mène une personne invitée à son compte) :
 * l'écran d'essai si l'offre est lancée et que son compte — s'il en a un, et
 * qu'elle en est la propriétaire — n'a jamais eu d'abonnement. `null` sinon.
 * Un membre n'y est pas envoyé : l'essai est le geste du propriétaire.
 */
export async function aiguillageEssai(): Promise<string | null> {
  if (!offreLancee(contexteDroits())) return null;
  const c = await getOptionalCompte();
  if (!c) return PAGE_ESSAI;
  if (c.compte.role !== "owner") return null;
  return essaiDisponible(await abonnementDuCompte(c.db, c.compte.compteId)) ? PAGE_ESSAI : null;
}

export type EtatEssai = { status: "idle" } | { status: "error"; message: string };

const erreur = (message: string): EtatEssai => ({ status: "error", message });

/**
 * Démarre l'essai du compte de la personne connectée, puis l'envoie à
 * l'onboarding. Rend une erreur affichable, ou redirige.
 */
export async function demarrerEssaiDuCompte(formule: string, accepte: boolean): Promise<EtatEssai> {
  const config = configurationStripe();
  if (!config.active || !offreLancee(contexteDroits())) redirect("/onboarding");
  if (!estLookupKey(formule)) return erreur("Choisissez une formule.");
  if (!accepte) return erreur("Cochez la case pour accepter les conditions générales.");

  // Le prix d'abord : une formule indisponible ne laisse derrière elle ni
  // compte, ni client, ni preuve.
  const stripe = clientStripe(config);
  let prix;
  try {
    prix = (await prixDesFormules(stripe)).get(formule);
  } catch {
    prix = undefined;
  }
  if (!prix) return erreur("Cette formule n'est pas disponible pour le moment. Réessayez dans quelques minutes.");

  const { user, compte, db } = await requireCompteDOnboarding();
  if (compte.role !== "owner") redirect(`${PAGE_MEMBRES}?reserve=proprietaire`);
  if (!user.email) return erreur("Votre compte n'a pas d'adresse e-mail : contactez l'assistance.");
  const email = user.email;
  const compteId = compte.compteId;

  const existante = await db.abonnement.findUnique({
    where: { compteId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true, essaiUtiliseLe: true },
  });
  // Un essai par compte ; un abonnement existant se gère depuis sa page.
  if (!essaiDisponible(existante)) redirect(PAGE_ABONNEMENT);

  let customerId: string;
  try {
    customerId = existante?.stripeCustomerId ?? (await reserverClient(stripe, db, { compteId, email }));
    // Le VERROU de l'essai, avant Stripe : de deux envois simultanés (deux
    // onglets, deux formules), un seul pose `essaiUtiliseLe`. Rendu si l'essai
    // n'a pas pu être créé, pour qu'un nouvel essai reste possible.
    const verrou = new Date();
    const { count } = await db.abonnement.updateMany({
      where: { compteId, essaiUtiliseLe: null, stripeSubscriptionId: null },
      data: { essaiUtiliseLe: verrou },
    });
    if (count !== 1) return erreur("Votre essai est déjà en cours de démarrage.");
    const preuve = await db.acceptationConditions.create({
      data: { compteId, userId: user.id, version: VERSION_CONDITIONS, empreinte: empreinteConditions(), contexte: "essai" },
      select: { id: true },
    });
    try {
      await demarrerEssai(stripe, { customerId, priceId: prix.priceId, metadata: { compteId }, idempotence: compteId });
    } catch (e) {
      // Pas d'essai, donc ni verrou ni preuve d'un contrat qui n'a pas commencé.
      await db.acceptationConditions.delete({ where: { id: preuve.id } });
      await db.abonnement.updateMany({ where: { compteId, essaiUtiliseLe: verrou }, data: { essaiUtiliseLe: null } });
      throw e;
    }
  } catch (e) {
    if (e instanceof ClientDejaReserve) return erreur("Votre abonnement est déjà en cours de création.");
    console.error(`essai : démarrage en échec pour un compte — ${e instanceof Error ? e.name : "erreur"}`);
    return erreur("L'essai n'a pas pu démarrer. Réessayez dans un instant ; rien ne vous a été facturé.");
  }

  // L'essai existe chez Stripe. Le relire ouvre la saisie tout de suite ; s'il
  // échoue, le webhook s'en charge dans les secondes qui suivent — ce n'est
  // pas un échec de l'essai.
  try {
    await synchroniserClientStripe(stripe, customerId);
  } catch (e) {
    console.error(`essai : relecture différée au webhook — ${e instanceof Error ? e.name : "erreur"}`);
  }
  redirect("/onboarding");
}

class ClientDejaReserve extends Error {}

/**
 * Le client Stripe du compte, puis sa ligne `Abonnement` RÉSERVÉE : c'est elle,
 * et non la clé d'idempotence (24 heures), qui empêche un second client.
 */
async function reserverClient(
  stripe: Stripe,
  db: Db,
  { compteId, email }: { compteId: string; email: string },
): Promise<string> {
  const customerId = await creerClientStripe(stripe, {
    email,
    // Le nom de l'entreprise n'est pas encore connu : le portail le pose avant
    // le premier paiement (`ouvrirPortailAction`).
    nom: email,
    metadata: { compteId },
    idempotence: compteId,
  });
  try {
    await db.abonnement.create({ data: { compteId, stripeCustomerId: customerId } });
  } catch (e) {
    // Un double clic l'a réservée : la même ligne, ou celle d'un autre client.
    if (codePrisma(e) !== "P2002") throw e;
    const reservee = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
    if (reservee?.stripeCustomerId !== customerId) throw new ClientDejaReserve();
  }
  return customerId;
}
