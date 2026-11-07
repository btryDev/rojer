import "server-only";
// Un essai par entreprise (ADR-053 § 8, grille du 2026-11-05) : l'essai est
// limité à un par compte (`essaiUtiliseLe`) ET à un par SIREN. L'essai démarre
// avant l'onboarding, quand le SIREN n'est pas encore connu : la règle se
// tient donc à la création de l'entreprise. Pendant un essai, une entreprise
// dont le SIREN a déjà servi l'essai d'un AUTRE compte ne se crée pas — elle
// se créera une fois l'abonnement payé.
//
// Refuser plutôt que finir l'essai (relecture du 2026-11-07) : rien n'est
// créé, rien n'est touché chez Stripe, les autres entreprises du compte
// gardent leur essai. Et LE SIREN N'EST PAS VÉRIFIÉ (il est public, un tiers
// peut le déclarer le premier) : le vrai dirigeant d'une entreprise ainsi
// bloquée garde son essai intact, et l'assistance n'a qu'une ligne à effacer.

import { prisma } from "@/lib/prisma";
import type { Db } from "@/lib/auth/compte";

export const MESSAGE_ENTREPRISE_DEJA_ESSAYEE =
  "Cette entreprise a déjà bénéficié d'un essai gratuit de Rojer avec un autre compte. Pour la suivre, abonnez-vous dès maintenant depuis la page Abonnement de votre compte. Si elle n'a jamais utilisé Rojer, écrivez à l'assistance.";

/** Le compte est-il en essai ? Hors essai, la règle ne joue pas. */
export async function compteEnEssai(db: Db, compteId: string): Promise<boolean> {
  const ligne = await db.abonnement.findUnique({ where: { compteId }, select: { statut: true } });
  return ligne?.statut === "trialing";
}

/** Le SIREN a-t-il déjà servi l'essai d'un AUTRE compte ? À lire avant de créer. */
export async function sirenEssayeAilleurs(siren: string, compteId: string): Promise<boolean> {
  const premier = await prisma.essaiEntreprise.findUnique({ where: { siren }, select: { compteId: true } });
  return premier !== null && premier.compteId !== compteId;
}

/**
 * Noter le SIREN sous ce compte, après la création, s'il est neuf. De deux
 * comptes qui le créent au même instant, le premier noté le garde ; l'autre
 * a passé le contrôle — une fenêtre de quelques millisecondes, acceptée.
 */
export async function noterEssaiEntreprise(siren: string, compteId: string): Promise<void> {
  await prisma.essaiEntreprise.createMany({ data: [{ siren, compteId }], skipDuplicates: true });
}
