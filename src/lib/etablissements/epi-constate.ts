import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";

/**
 * Une mesure de protection individuelle vaut « oui » à « Fournissez-vous des
 * EPI à vos salariés ? » (décision de la propriétaire du 2026-10-22).
 *
 * Le besoin d'EPI naît de l'évaluation des risques (R. 4321-4, « en tant que
 * de besoin ») : quand le DUERP ou le plan d'actions porte une mesure de type
 * `protection_individuelle`, la réponse est déjà donnée, et la reposer ferait
 * doublon. Même règle que l'EPI déclaré au parc (`constaterEpiDeclare`,
 * `equipements/actions.ts`) : la mesure l'emporte sur un « non » ou un
 * silence. Une mesure abandonnée ne compte pas.
 *
 * L'inverse ne se déduit pas : l'absence de mesure ne vaut pas « non » — un
 * DUERP en cours n'est pas une réponse.
 *
 * À appeler après toute écriture d'une `Action` dont le type peut être
 * `protection_individuelle`. L'appartenance est vérifiée par l'appelant.
 * Rend `true` si la réponse a changé ; le calendrier est alors régénéré, la
 * consigne d'utilisation (R. 4323-105) pouvant naître d'un « non » levé.
 */
export async function constaterEpiParLesMesures(etablissementId: string): Promise<boolean> {
  const { count } = await prisma.etablissement.updateMany({
    where: {
      id: etablissementId,
      OR: [{ epiPresents: false }, { epiPresents: null }],
      actions: {
        some: { type: "protection_individuelle", statut: { not: "abandonnee" } },
      },
    },
    data: { epiPresents: true },
  });
  if (count === 0) return false;
  await regenererApresMutation(etablissementId, "epi/mesure");
  revalidatePath(`/etablissements/${etablissementId}`);
  return true;
}
