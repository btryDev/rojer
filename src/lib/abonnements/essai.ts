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
// 4. la preuve d'acceptation des conditions (version, empreinte), journal ;
// 5. l'essai chez Stripe (sans carte, en pause à la fin) ; une réponse perdue
//    se tranche en relisant Stripe, qui fait foi ;
// 6. la relecture immédiate : la saisie s'ouvre sans attendre le webhook.

import type Stripe from "stripe";
import { redirect } from "next/navigation";
import { getOptionalCompte, requireCompteDOnboarding, type Db } from "@/lib/auth/compte";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { abonnementsDuClient, creerClientStripe, demarrerEssai, prixDesFormules } from "@/lib/stripe/parcours";
import { codePrisma, synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import { VERSION_CONDITIONS } from "./conditions";
import { empreinteConditions } from "./conditions-empreinte";
import { essaiDisponible, gesteAbonnement, nomProvisoire } from "./droits";
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
  const ctx = contexteDroits();
  if (!offreLancee(ctx)) return null;
  const c = await getOptionalCompte();
  const ligne = c ? await abonnementDuCompte(c.db, c.compte.compteId) : null;
  return gesteAbonnement({ ouvert: true, role: c?.compte.role ?? null, ligne }) === "essai" ? PAGE_ESSAI : null;
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
  const prix = await prixDesFormules(stripe).then((m) => m.get(formule), () => undefined);
  if (!prix) return erreur("Cette formule n'est pas disponible pour le moment. Réessayez dans quelques minutes.");

  const { user, compte, db } = await requireCompteDOnboarding();
  if (compte.role !== "owner") redirect(`${PAGE_MEMBRES}?reserve=proprietaire`);
  if (!user.email) return erreur("Votre compte n'a pas d'adresse e-mail : contactez l'assistance.");
  const compteId = compte.compteId;

  const existante = await db.abonnement.findUnique({
    where: { compteId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true, essaiUtiliseLe: true },
  });
  // Un abonnement existant (essai compris) se gère depuis sa page.
  if (!essaiDisponible(existante)) redirect(PAGE_ABONNEMENT);

  let customerId: string;
  try {
    customerId = existante?.stripeCustomerId ?? (await reserverClient(stripe, db, { compteId, email: user.email }));
  } catch (e) {
    return echec(e);
  }

  // Stripe fait foi : s'il a déjà un abonnement pour ce client (un démarrage
  // précédent dont la réponse s'est perdue), on le relit au lieu d'en créer un.
  const verrou = await prendreLeVerrou(db, compteId);
  if (!verrou) return erreur("Votre essai est déjà en cours de démarrage. Patientez un instant.");
  // Rendre le verrou, c'est remettre la valeur d'avant : un essai déjà
  // constaté chez Stripe (client supprimé depuis) ne s'efface jamais.
  const rendre = () => rendreLeVerrou(db, compteId, verrou.prise, existante?.essaiUtiliseLe ?? null);
  if (verrou.repris) {
    const deja = await abonnementChezStripe(stripe, customerId).catch(() => null);
    if (deja) return relireEtContinuer(stripe, customerId);
    if (deja === null) {
      await rendre();
      return echec(new Error("Stripe injoignable"));
    }
  }

  // La preuve d'acceptation, avant l'essai. Un journal : jamais effacée, même
  // si l'essai échoue — une acceptation sans essai ne nuit à personne, un
  // essai sans preuve, si.
  await db.acceptationConditions.create({
    data: { compteId, userId: user.id, version: VERSION_CONDITIONS, empreinte: empreinteConditions(), contexte: "essai" },
  });
  try {
    await demarrerEssai(stripe, { customerId, priceId: prix.priceId, metadata: { compteId }, idempotence: compteId });
  } catch (e) {
    // Une réponse perdue n'est pas un refus : si Stripe a créé l'essai, il
    // existe. Le verrou ne se rend que si Stripe confirme qu'il n'y a rien ;
    // si Stripe ne répond pas, il expire de lui-même (`VERROU_EXPIRE_MS`).
    const existe = await abonnementChezStripe(stripe, customerId).catch(() => null);
    if (existe) return relireEtContinuer(stripe, customerId);
    if (existe === false) await rendre();
    return echec(e);
  }
  return relireEtContinuer(stripe, customerId);
}

/** Au-delà, un verrou sans abonnement est celui d'un démarrage interrompu : il se reprend. */
export const VERROU_EXPIRE_MS = 5 * 60_000;

/**
 * Le VERROU de l'essai (`essaiUtiliseLe`, mise à jour conditionnelle) : de deux
 * envois simultanés (deux onglets, deux formules), un seul le prend. Un verrou
 * de plus de `VERROU_EXPIRE_MS` sans abonnement se reprend (`repris`) ; `null` :
 * un autre démarrage le tient.
 */
async function prendreLeVerrou(db: Db, compteId: string): Promise<{ prise: Date; repris: boolean } | null> {
  const prise = new Date();
  const libre = await db.abonnement.updateMany({
    where: { compteId, stripeSubscriptionId: null, essaiUtiliseLe: null },
    data: { essaiUtiliseLe: prise },
  });
  if (libre.count === 1) return { prise, repris: false };
  const ancien = await db.abonnement.updateMany({
    where: { compteId, stripeSubscriptionId: null, essaiUtiliseLe: { lt: new Date(prise.getTime() - VERROU_EXPIRE_MS) } },
    data: { essaiUtiliseLe: prise },
  });
  return ancien.count === 1 ? { prise, repris: true } : null;
}

async function rendreLeVerrou(db: Db, compteId: string, prise: Date, precedent: Date | null) {
  await db.abonnement.updateMany({ where: { compteId, essaiUtiliseLe: prise }, data: { essaiUtiliseLe: precedent } });
}

/** Le client Stripe a-t-il un abonnement, quel qu'en soit l'état ? */
const abonnementChezStripe = async (stripe: Stripe, customerId: string) =>
  (await abonnementsDuClient(stripe, customerId)).length > 0;

/**
 * L'essai existe chez Stripe. Le relire ouvre la saisie tout de suite ; s'il
 * échoue, le webhook s'en charge dans les secondes qui suivent — ce n'est pas
 * un échec de l'essai.
 */
async function relireEtContinuer(stripe: Stripe, customerId: string): Promise<never> {
  try {
    await synchroniserClientStripe(stripe, customerId);
  } catch (e) {
    console.error(`essai : relecture différée au webhook — ${e instanceof Error ? e.name : "erreur"}`);
  }
  redirect("/onboarding");
}

function echec(e: unknown): EtatEssai {
  console.error(`essai : démarrage en échec pour un compte — ${e instanceof Error ? e.name : "erreur"}`);
  return erreur("L'essai n'a pas pu démarrer. Réessayez dans un instant ; rien ne vous a été facturé.");
}

/**
 * Le client Stripe du compte, puis sa ligne `Abonnement` RÉSERVÉE : c'est elle,
 * et non la clé d'idempotence (24 heures), qui empêche un second client. Un
 * double clic qui l'a déjà réservée : on garde le client enregistré.
 */
async function reserverClient(
  stripe: Stripe,
  db: Db,
  { compteId, email }: { compteId: string; email: string },
): Promise<string> {
  const customerId = await creerClientStripe(stripe, {
    email,
    nom: nomProvisoire(email),
    metadata: { compteId },
    idempotence: compteId,
  });
  try {
    await db.abonnement.create({ data: { compteId, stripeCustomerId: customerId } });
    return customerId;
  } catch (e) {
    if (codePrisma(e) !== "P2002") throw e;
    const reservee = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
    if (!reservee) throw e;
    return reservee.stripeCustomerId;
  }
}
