import type { Prisma } from "@prisma/client";
import { calculerCriticite } from "@/lib/cotation";
import { risquesTransverses } from "@/lib/referentiels";
import type { QuestionDetection } from "@/lib/referentiels/types";

/**
 * Le risque qu'une question transverse ajoute au DUERP, posé ou retiré dans
 * une transaction. Extrait de `repondreQuestionTransverse` le 2026-10-08
 * (ADR-041) : trois écrivains en ont besoin — l'étape transverse du DUERP, la
 * réponse à un fait d'activité depuis Équipe ou la fiche, et la création d'un
 * DUERP qui reprend les faits déjà déclarés. Trois copies auraient divergé.
 */

export async function obtenirUniteTransverse(
  tx: Prisma.TransactionClient,
  duerpId: string,
) {
  const existante = await tx.uniteTravail.findFirst({
    where: { duerpId, estTransverse: true },
  });
  if (existante) return existante;
  return tx.uniteTravail.create({
    data: { duerpId, nom: "Risques transverses", estTransverse: true },
  });
}

/**
 * Ce qu'on fait d'un risque déjà présent quand la réponse cesse d'être « oui » :
 * - `toujours` : le dirigeant répond dans le DUERP, après une confirmation qui
 *   lui a dit que la cotation et les actions partent avec le risque ;
 * - `si_vierge` : il répond ailleurs (Équipe, fiche établissement), sans voir
 *   le DUERP. On ne retire alors qu'un risque que personne n'a touché — pas de
 *   cotation saisie, aucune action, aucune intervention. Un risque travaillé reste au document, et
 *   l'étape transverse le signale : supprimer le travail du dirigeant depuis
 *   un écran qui ne le lui montre pas serait le perdre sans qu'il le sache.
 */
export type RetraitDuRisque = "toujours" | "si_vierge";

/** Rend `true` si un risque travaillé a été conservé malgré la réponse. */
export async function poserRisqueTransverse(
  tx: Prisma.TransactionClient,
  duerpId: string,
  question: Pick<QuestionDetection, "risqueIdAssocie">,
  present: boolean,
  retrait: RetraitDuRisque,
): Promise<boolean> {
  const ref = risquesTransverses.find((r) => r.id === question.risqueIdAssocie);
  if (!ref) throw new Error(`Risque transverse inconnu : ${question.risqueIdAssocie}`);
  const unite = await obtenirUniteTransverse(tx, duerpId);
  const existant = await tx.risque.findUnique({
    where: { uniteId_referentielId: { uniteId: unite.id, referentielId: ref.id } },
    select: {
      id: true,
      cotationSaisie: true,
      _count: { select: { actions: true, interventions: true } },
    },
  });

  if (present) {
    if (existant) return false;
    // `createMany` + `skipDuplicates`, et non `upsert` : relevé sur PostgreSQL
    // le 2026-10-05, l'`upsert` à `update: {}` sur cette clé composée est émulé
    // par Prisma 6 (SELECT puis INSERT) et deux « oui » simultanés levaient
    // P2002. `skipDuplicates` émet `INSERT … ON CONFLICT DO NOTHING`.
    const gravite = ref.graviteParDefaut;
    const probabilite = ref.probabiliteParDefaut;
    const maitrise = ref.maitriseParDefaut ?? 2;
    await tx.risque.createMany({
      data: [
        {
          uniteId: unite.id,
          referentielId: ref.id,
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
    return false;
  }

  if (!existant) return false;
  // Les interventions comptent aussi : leur lien au risque passe à `NULL` à sa
  // suppression (`onDelete: SetNull`), et on les détacherait en silence.
  const vierge =
    !existant.cotationSaisie &&
    existant._count.actions === 0 &&
    existant._count.interventions === 0;
  if (retrait === "si_vierge" && !vierge) return true;
  await tx.risque.delete({ where: { id: existant.id } });
  return false;
}
