import "server-only";
// L'essai gratuit (ADR-053 §§ 8, 9, 12) : l'aiguillage qui y mène, et son
// démarrage. L'écran « Votre essai gratuit » se tient entre la confirmation
// de l'adresse et l'onboarding : l'onboarding se fait pendant l'essai.
//
// Le démarrage, dans l'ordre, chaque étape rejouable :
// 1. le compte (la porte unique de création, ADR-054 § 5) — propriétaire seul ;
// 2. le client Stripe, puis la ligne `Abonnement` RÉSERVÉE avant l'essai :
//    c'est elle, et non la clé d'idempotence (24 heures), qui empêche un
//    second client ou un second essai ;
// 3. la preuve d'acceptation des conditions (version, empreinte) ;
// 4. l'essai chez Stripe (30 jours, sans carte, en pause à la fin) ;
// 5. la relecture immédiate : la saisie s'ouvre sans attendre le webhook.

import { redirect } from "next/navigation";
import { getOptionalCompte, requireCompteDOnboarding, type Db } from "@/lib/auth/compte";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { creerClientStripe, demarrerEssai, prixDesFormules } from "@/lib/stripe/parcours";
import { codePrisma, synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import { VERSION_CONDITIONS } from "./conditions";
import { empreinteConditions } from "./conditions-empreinte";
import { LOOKUP_KEYS } from "./formules";
import { PAGE_ABONNEMENT, PAGE_MEMBRES, contexteDroits, offreLancee } from "./saisie";

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
  return (await essaiDisponible(c.db, c.compte.compteId)) ? PAGE_ESSAI : null;
}

/**
 * Le compte peut-il encore démarrer son essai ? Ni abonnement, ni essai déjà
 * pris. Une ligne réservée sans abonnement (un démarrage interrompu) le
 * laisse disponible.
 */
export async function essaiDisponible(db: Db, compteId: string): Promise<boolean> {
  const ligne = await db.abonnement.findUnique({
    where: { compteId },
    select: { stripeSubscriptionId: true, essaiUtiliseLe: true },
  });
  return !ligne?.stripeSubscriptionId && !ligne?.essaiUtiliseLe;
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
  if (!(LOOKUP_KEYS as readonly string[]).includes(formule)) return erreur("Choisissez une formule.");
  if (!accepte) return erreur("Cochez la case pour accepter les conditions générales.");

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
  if (existante?.stripeSubscriptionId || existante?.essaiUtiliseLe) redirect(PAGE_ABONNEMENT);

  const stripe = clientStripe(config);
  const prix = (await prixDesFormules(stripe)).get(formule);
  if (!prix) return erreur("Cette formule n'est pas disponible pour le moment. Réessayez dans quelques minutes.");

  try {
    let customerId = existante?.stripeCustomerId;
    if (!customerId) {
      customerId = await creerClientStripe(stripe, {
        email,
        // Le nom de l'entreprise n'est pas encore connu : le portail le reprend
        // de la fiche avant le premier paiement (`ouvrirLePortail`).
        nom: email,
        metadata: { compteId },
        idempotence: compteId,
      });
      try {
        await db.abonnement.create({ data: { compteId, stripeCustomerId: customerId } });
      } catch (e) {
        // Une livraison ou un double clic l'a réservée : on la relit.
        if (codePrisma(e) !== "P2002") throw e;
        const reservee = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
        if (reservee?.stripeCustomerId !== customerId) return erreur("Votre abonnement est déjà en cours de création.");
      }
    }
    await db.acceptationConditions.create({
      data: { compteId, userId: user.id, version: VERSION_CONDITIONS, empreinte: empreinteConditions(), contexte: "essai" },
    });
    await demarrerEssai(stripe, { customerId, priceId: prix.priceId, metadata: { compteId }, idempotence: compteId });
    await synchroniserClientStripe(stripe, customerId);
  } catch (e) {
    console.error(`essai : démarrage en échec pour un compte — ${e instanceof Error ? e.name : "erreur"}`);
    return erreur("L'essai n'a pas pu démarrer. Réessayez dans un instant ; rien ne vous a été facturé.");
  }
  redirect("/onboarding");
}
