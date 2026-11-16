import "server-only";
// L'essai gratuit (ADR-053 §§ 8, 9 — amendé le 2026-11-16 : compté chez
// Rojer, sans rien chez Stripe) : l'aiguillage qui y mène, et son démarrage.
// L'écran « Votre essai gratuit » se tient entre la confirmation de l'adresse
// et l'onboarding : l'onboarding se fait pendant l'essai.
//
// Le démarrage, en une transaction : la ligne `Abonnement` (date de début,
// fin d'essai, horloge de suppression à la fin de l'essai) et la preuve
// d'acceptation des conditions. Un seul essai par compte : la date de début
// n'est jamais effacée ; deux onglets se départagent par l'unicité du compte
// et l'écriture conditionnelle.

import { redirect } from "next/navigation";
import { getOptionalCompte, requireCompteDOnboarding } from "@/lib/auth/compte";
import { MESSAGE_COMPTE_CHANGE } from "@/lib/auth/compte-attendu";
import { configurationStripe } from "@/lib/stripe/config";
import { DUREE_ESSAI_JOURS } from "@/lib/stripe/parcours";
import { codePrisma } from "@/lib/stripe/synchronisation";
import { ajouterJours } from "@/lib/dates";
import { VERSION_CONDITIONS } from "./conditions";
import { empreinteConditions } from "./conditions-empreinte";
import { essaiDisponible, gesteAbonnement } from "./droits";
import { CLES_FORMULES, lookupKey } from "./formules";
import { PAGE_ABONNEMENT, PAGE_MEMBRES, abonnementDuCompte, contexteDroits, offreLancee } from "./saisie";

export const PAGE_ESSAI = "/essai";

/**
 * Où envoyer une personne connectée AVANT l'onboarding (après
 * `aiguillageSansCompte`, qui mène une personne invitée à son compte) :
 * l'écran d'essai si l'offre est lancée et que son compte — s'il en a un, et
 * qu'elle en est la propriétaire — n'a jamais eu d'essai ni d'abonnement.
 * `null` sinon. Un membre n'y est pas envoyé : l'essai est le geste du
 * propriétaire.
 */
export async function aiguillageEssai(): Promise<string | null> {
  if (!offreLancee(contexteDroits())) return null;
  const c = await getOptionalCompte();
  const ligne = c ? await abonnementDuCompte(c.db, c.compte.compteId) : null;
  return gesteAbonnement({ ouvert: true, role: c?.compte.role ?? null, ligne }) === "essai" ? PAGE_ESSAI : null;
}

export type EtatEssai = { status: "idle" } | { status: "error"; message: string };

const erreur = (message: string): EtatEssai => ({ status: "error", message });

/**
 * Le prix affiché sur l'écran d'essai (la plus petite formule, mensuelle) :
 * la formule et le rythme se choisissent en s'abonnant.
 */
export const PRIX_D_ESSAI = lookupKey(CLES_FORMULES[0], "mensuel");

/**
 * Démarre l'essai du compte de la personne connectée, puis l'envoie à son
 * dossier (`/entreprises` aiguille : le dossier s'il existe, sinon
 * l'onboarding). Rend une erreur affichable, ou redirige. Rien chez Stripe :
 * le client y naît au moment de s'abonner.
 */
export async function demarrerEssaiDuCompte(accepte: boolean, formData: FormData): Promise<EtatEssai> {
  if (!configurationStripe().active || !offreLancee(contexteDroits())) redirect("/onboarding");
  if (!accepte) return erreur("Cochez la case pour accepter les conditions générales.");

  const lu = await requireCompteDOnboarding(formData, { page: PAGE_ESSAI });
  if (!lu) return erreur(MESSAGE_COMPTE_CHANGE);
  const { user, compte, db } = lu;
  if (compte.role !== "owner") redirect(`${PAGE_MEMBRES}?reserve=proprietaire`);
  const compteId = compte.compteId;

  const debut = new Date();
  const fin = ajouterJours(debut, DUREE_ESSAI_JOURS);
  // L'horloge de suppression (ADR-058) part de la fin de l'essai : un compte
  // qui ne s'abonne jamais est supprimé douze mois après. S'abonner la vide.
  const essai = { essaiUtiliseLe: debut, finEssai: fin, sansAbonnementDepuis: fin };
  try {
    const demarre = await db.$transaction(async (tx) => {
      const existante = await tx.abonnement.findUnique({ where: { compteId }, select: { essaiUtiliseLe: true, statut: true } });
      if (!essaiDisponible(existante)) return false;
      if (existante) {
        const pris = await tx.abonnement.updateMany({ where: { compteId, essaiUtiliseLe: null, statut: null }, data: essai });
        if (pris.count !== 1) return false;
      } else {
        await tx.abonnement.create({ data: { compteId, ...essai } });
      }
      // La preuve d'acceptation, avec l'essai : l'un ne va pas sans l'autre.
      await tx.acceptationConditions.create({
        data: { compteId, userId: user.id, version: VERSION_CONDITIONS, empreinte: empreinteConditions(), contexte: "essai" },
      });
      return true;
    });
    // Déjà pris (un autre onglet, un essai passé) : la page de l'abonnement le dit.
    if (!demarre) redirect(PAGE_ABONNEMENT);
  } catch (e) {
    // Deux onglets au même instant : l'unicité du compte a départagé.
    if (codePrisma(e) === "P2002") redirect(PAGE_ABONNEMENT);
    throw e;
  }
  redirect("/entreprises");
}
