import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { repondreAuxQuestionsTransverses, type QuestionTransverseRepondue } from "./etat";

/**
 * Les réponses du DUERP d'un établissement aux questions transverses, pour un
 * écran qui n'est pas celui du DUERP — la fiche d'un salarié (ADR-038).
 *
 * `null` : l'établissement n'a pas de DUERP, ou il n'appartient pas à
 * l'utilisateur. Les deux se lisent pareil à l'écran (« aucune réponse »), et
 * le second ne doit rien laisser voir de plus : l'appartenance est portée dans
 * le `where`, même quand l'appelant vient de la vérifier (ADR-005).
 */
export async function chargerReponsesTransverses(
  etablissementId: string,
): Promise<{ duerpId: string; repondues: QuestionTransverseRepondue[] } | null> {
  const user = await requireUser();
  const duerp = await prisma.duerp.findFirst({
    where: { etablissementId, etablissement: { entreprise: { userId: user.id } } },
    select: {
      id: true,
      reponsesTransverses: true,
      unites: {
        where: { estTransverse: true },
        select: { risques: { select: { referentielId: true } } },
      },
    },
  });
  if (!duerp) return null;
  const actifs = duerp.unites
    .flatMap((u) => u.risques.map((r) => r.referentielId))
    .filter((x): x is string => x !== null);
  return {
    duerpId: duerp.id,
    repondues: repondreAuxQuestionsTransverses(actifs, duerp.reponsesTransverses),
  };
}
