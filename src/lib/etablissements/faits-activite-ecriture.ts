import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { questionTransverseParId } from "@/lib/transverses/etat";
import {
  poserRisqueTransverse,
  type RetraitDuRisque,
} from "@/lib/transverses/risque-transverse";
import {
  FAITS_ACTIVITE,
  faitParChamp,
  type ChampFaitActivite,
  type ReponsesFaitsActivite,
} from "./faits-activite";

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
 * Rend `conserve: true` quand le DUERP garde une trace contraire à la réponse :
 * un risque travaillé (coté ou avec des actions) laissé malgré un « non »
 * donné hors du DUERP, ou un risque encore coché « exposition CMR ».
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
    const duerp = await tx.duerp.findUnique({
      where: { etablissementId },
      select: { id: true },
    });
    if (!duerp) return { conserve: false };
    // L'exposition CMR a une seconde trace au DUERP : la case de chaque risque
    // (`Risque.exposeCMR`), qu'imprime le document. Un « non » donné ici ne la
    // décoche pas — c'est le travail du dirigeant sur un risque précis — mais
    // il le dit (relecture du 2026-10-08, C3).
    if (champ === "expositionCMR") {
      if (valeur === true) return { conserve: false };
      const coches = await tx.risque.count({
        where: { exposeCMR: true, unite: { duerpId: duerp.id } },
      });
      return { conserve: coches > 0 };
    }
    if (!question) return { conserve: false };
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

/**
 * Pose dans un DUERP neuf les risques des faits déjà déclarés « oui » sur
 * l'établissement (ADR-041). Un dirigeant qui a répondu depuis Équipe retrouve
 * la question répondue ET son risque, qu'il crée son DUERP ou qu'il l'importe.
 * Partagé par `creerDuerp` et par l'import : une seule reprise (relecture du
 * 2026-10-08, C2 — l'import ne la faisait pas).
 */
export async function reprendreFaitsDansDuerp(
  tx: Prisma.TransactionClient,
  duerpId: string,
  faits: ReponsesFaitsActivite,
): Promise<void> {
  for (const f of FAITS_ACTIVITE) {
    const question = f.questionTransverse
      ? questionTransverseParId(f.questionTransverse)
      : undefined;
    if (question && faits[f.champ] === true) {
      await poserRisqueTransverse(tx, duerpId, question, true, "si_vierge");
    }
  }
}
