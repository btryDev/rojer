import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { requireEtablissement } from "@/lib/auth/scope";

export async function getCarnetSanitaire(etablissementId: string) {
  const { etablissement } = await requireEtablissement(etablissementId);
  return prisma.carnetSanitaire.findUnique({
    where: { etablissementId: etablissement.id },
    include: {
      pointsReleve: {
        where: { actif: true },
        include: {
          releves: {
            orderBy: { dateReleve: "desc" },
            take: 20,
          },
        },
        orderBy: { nom: "asc" },
      },
      analyses: {
        orderBy: { dateAnalyse: "desc" },
        take: 10,
      },
    },
  });
}

/**
 * Dernier relevé par point — utilisé pour afficher un statut rapide en
 * dashboard / page index.
 *
 * Le prédicat d'appartenance est porté ici aussi, bien que le `carnetId`
 * soit destiné à sortir d'une lecture scopée : sans RLS (ADR-005), une
 * lecture qui ne le porte pas devient une fuite au premier appelant qui
 * prendra l'identifiant ailleurs.
 *
 * **Sans appelant au 2026-08-28.** La requête vivante équivalente est dans
 * `dashboard/queries.ts` (`getModulesMatrice`), qui porte le même prédicat.
 * Constatée morte, non supprimée — même traitement que `ComplianceTimeline`
 * (`docs/dette-chantier-porteur-echeance.md` § 6.4) : la suppression est une
 * décision à part, pas un effet de bord d'un lot de sécurité.
 */
export async function dernierRelevesParPoint(carnetId: string) {
  const user = await requireUser();
  const points = await prisma.pointReleve.findMany({
    where: {
      carnetId,
      actif: true,
      carnet: { etablissement: { entreprise: { userId: user.id } } },
    },
    include: {
      releves: {
        orderBy: { dateReleve: "desc" },
        take: 1,
      },
    },
    orderBy: { nom: "asc" },
  });
  return points.map((p) => ({
    ...p,
    dernier: p.releves[0] ?? null,
  }));
}
