"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDuerp } from "@/lib/auth/scope";
import { calculerCriticite } from "@/lib/cotation";
import { ecrireReponseFermee } from "@/lib/duerps/ecrire-reponse-fermee";
import { risquesTransverses } from "@/lib/referentiels";
import { questionTransverseParId } from "./etat";

/**
 * Cloisonnement : `duerpId` vient du client. Sans garde, `validerTransverses`
 * marquait n'importe quel DUERP comme « transverses répondues » et le toggle
 * créait/supprimait des risques chez un autre client. `requireDuerp` remonte
 * jusqu'à `Entreprise.userId` et répond 404 sinon.
 */

async function obtenirUniteTransverse(
  tx: Prisma.TransactionClient,
  duerpId: string,
) {
  const existante = await tx.uniteTravail.findFirst({
    where: { duerpId, estTransverse: true },
  });
  if (existante) return existante;
  return tx.uniteTravail.create({
    data: {
      duerpId,
      nom: "Risques transverses",
      estTransverse: true,
    },
  });
}

/**
 * Enregistre la réponse d'un DUERP à une question transverse : oui, non, ou
 * `null` pour retirer la réponse (ADR-038). Remplace `toggleRisqueTransverse`,
 * qui ne savait qu'ajouter ou supprimer le risque — et donc ne savait pas dire
 * « non » autrement que par le silence.
 *
 * - « oui » crée le risque s'il manque, avec la cotation par défaut, et efface
 *   un « non » antérieur ;
 * - « non » supprime le risque s'il existe et écrit `false` ;
 * - `null` supprime le risque s'il existe et retire la clé : sans réponse.
 *
 * Le risque reste la seule vérité du « oui » (`transverses/etat.ts`). Les deux
 * écritures — le risque et la colonne — partent dans une même transaction :
 * une réponse à moitié écrite laisserait un « non » à côté d'un risque, ou un
 * risque supprimé sans son « non ».
 *
 * Supprimer le risque emporte sa cotation et ses actions (cascade) : c'était
 * déjà le cas du « Non » de `toggleRisqueTransverse`, rien ne change ici.
 */
export async function repondreQuestionTransverse(
  duerpId: string,
  questionId: string,
  reponse: boolean | null,
): Promise<void> {
  const { duerp } = await requireDuerp(duerpId);
  const question = questionTransverseParId(questionId);
  if (!question) throw new Error(`Question transverse inconnue : ${questionId}`);
  const ref = risquesTransverses.find((r) => r.id === question.risqueIdAssocie);
  if (!ref) {
    throw new Error(`Risque transverse inconnu : ${question.risqueIdAssocie}`);
  }
  const referentielId = ref.id;

  await prisma.$transaction(async (tx) => {
    const unite = await obtenirUniteTransverse(tx, duerpId);
    const existant = await tx.risque.findUnique({
      where: { uniteId_referentielId: { uniteId: unite.id, referentielId } },
    });

    if (reponse === true) {
      // Deux « oui » simultanés (deux onglets) lisent tous deux « absent » et
      // créent tous deux : le second se heurte à l'unicité
      // (uniteId, referentielId). C'est la réponse qu'il voulait écrire — le
      // risque existe —, donc on ne lève pas.
      //
      // `createMany` + `skipDuplicates`, et non `upsert` : relevé sur la base
      // locale le 2026-10-05, l'`upsert` à `update: {}` sur cette clé composée
      // est ÉMULÉ par Prisma 6 — un SELECT puis un INSERT, sans ON CONFLICT —,
      // donc la course restait entière. `skipDuplicates` émet
      // `INSERT … ON CONFLICT DO NOTHING`, que PostgreSQL arbitre.
      if (!existant) {
        const gravite = ref.graviteParDefaut;
        const probabilite = ref.probabiliteParDefaut;
        const maitrise = ref.maitriseParDefaut ?? 2;
        await tx.risque.createMany({
          data: [
            {
              uniteId: unite.id,
              referentielId,
              libelle: ref.libelle,
              description: ref.description,
              gravite,
              probabilite,
              maitrise,
              criticite: calculerCriticite({ gravite, probabilite, maitrise }),
            },
          ],
          skipDuplicates: true,
        });
      }
    } else if (existant) {
      await tx.risque.delete({ where: { id: existant.id } });
    }

    // « oui » efface la clé : il se lit sur le risque, et un `false` resté là
    // contredirait le document le jour où le risque serait retiré ailleurs.
    const lignes = await ecrireReponseFermee(
      tx,
      "reponsesTransverses",
      duerpId,
      question.id,
      reponse === false ? false : null,
    );
    // `requireDuerp` vient de garantir la ligne : zéro veut dire qu'elle a
    // disparu entre-temps, et l'écran afficherait une réponse non enregistrée.
    if (lignes === 0) throw new Error(`DUERP introuvable à l'écriture : ${duerpId}`);
  });

  revalidatePath(`/duerp/${duerpId}/transverses`);
  revalidatePath(`/duerp/${duerpId}/synthese`);
  // Les fiches salarié lisent ces réponses (« Formations liées aux risques du
  // poste ») ; le tableau de bord aussi (`dashboard/transmissions.ts`).
  revalidatePath(`/etablissements/${duerp.etablissementId}`, "layout");
}

export async function validerTransverses(duerpId: string): Promise<void> {
  await requireDuerp(duerpId);

  await prisma.duerp.update({
    where: { id: duerpId },
    data: { transversesRepondues: true },
  });
  revalidatePath(`/duerp/${duerpId}/transverses`);
  revalidatePath(`/duerp/${duerpId}/synthese`);
}
