import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { SELECT_FAITS_ACTIVITE, type ReponsesFaitsActivite } from "./faits-activite";

/**
 * Les faits d'activité d'un établissement (ADR-041), pour un écran qui n'est
 * pas la fiche établissement — la fiche d'un salarié, l'écran « Évaluer les
 * risques » d'Équipe.
 *
 * `null` : l'établissement n'appartient pas à l'utilisateur. L'appartenance
 * est portée dans le `where`, même quand l'appelant vient de la vérifier
 * (ADR-005) : une lecture qui ne la porte pas devient une fuite le jour où un
 * appelant nouveau ne vérifie pas. Éprouvé dans
 * `faits-activite-queries.test.ts`.
 */
export async function chargerFaitsActivite(
  etablissementId: string,
): Promise<ReponsesFaitsActivite | null> {
  const user = await requireUser();
  return prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    select: SELECT_FAITS_ACTIVITE,
  });
}
