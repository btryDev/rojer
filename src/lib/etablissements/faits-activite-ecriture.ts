import { prisma } from "@/lib/prisma";
import { questionTransverseParId } from "@/lib/transverses/etat";
import {
  poserRisqueTransverse,
  type RetraitDuRisque,
} from "@/lib/transverses/risque-transverse";
import { faitParChamp, type ChampFaitActivite } from "./faits-activite";

/**
 * Écrit un fait d'activité sur l'établissement et, si le fait a une question
 * transverse et que l'établissement a un DUERP, pose ou retire le risque que
 * cette question ajoute au document — dans la même transaction (ADR-041).
 *
 * C'est le SEUL écrivain des colonnes de `FAITS_ACTIVITE` : l'écran Équipe,
 * la relance de la fiche établissement et l'étape transverse du DUERP passent
 * tous par lui, si bien que la réponse et le risque ne peuvent pas diverger
 * selon l'écran qui a répondu.
 *
 * L'appartenance est vérifiée par l'appelant (action serveur) ; ce module ne
 * reçoit qu'un identifiant déjà contrôlé.
 *
 * Rend `conserve: true` quand un risque travaillé (coté ou avec des actions)
 * a été laissé au DUERP malgré une réponse « non » donnée hors du DUERP.
 */
export async function ecrireFaitActivite(
  etablissementId: string,
  champ: ChampFaitActivite,
  valeur: boolean | null,
  retrait: RetraitDuRisque,
): Promise<{ conserve: boolean }> {
  const fait = faitParChamp(champ);
  const question = fait.questionTransverse
    ? questionTransverseParId(fait.questionTransverse)
    : undefined;
  return prisma.$transaction(async (tx) => {
    await tx.etablissement.update({
      where: { id: etablissementId },
      data: { [champ]: valeur },
    });
    if (!question) return { conserve: false };
    const duerp = await tx.duerp.findUnique({
      where: { etablissementId },
      select: { id: true },
    });
    if (!duerp) return { conserve: false };
    const conserve = await poserRisqueTransverse(
      tx,
      duerp.id,
      question,
      valeur === true,
      retrait,
    );
    return { conserve };
  });
}
