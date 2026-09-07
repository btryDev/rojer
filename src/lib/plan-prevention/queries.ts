import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { requireEtablissement } from "@/lib/auth/scope";
import { listSignatures } from "@/lib/signatures/queries";

export async function listPlansPrevention(etablissementId: string) {
  const { etablissement } = await requireEtablissement(etablissementId);
  return prisma.planPrevention.findMany({
    where: { etablissementId: etablissement.id },
    orderBy: [{ numero: "desc" }],
    include: { _count: { select: { lignes: true } } },
  });
}

export async function getPlanPrevention(
  etablissementId: string,
  planId: string,
) {
  const { etablissement } = await requireEtablissement(etablissementId);
  const plan = await prisma.planPrevention.findFirst({
    where: { id: planId, etablissementId: etablissement.id },
    include: {
      lignes: { orderBy: { ordre: "asc" } },
      // Le 1° de `R. 4512-8`, à ne pas confondre avec `lignes` ci-dessus, qui
      // porte l'analyse d'interférence de `R. 4512-6` — voir
      // `contenu-r4512-8.ts`.
      phasesDangereuses: { orderBy: { ordre: "asc" } },
    },
  });
  if (!plan) return null;
  const signatures = await listSignatures("plan_prevention", plan.id);
  return { ...plan, signatures };
}

/**
 * Le numéro suivant de la série de l'établissement. Même raison que
 * `nextNumeroPermisFeu` : un entier reste une lecture, et une lecture porte
 * sa portée (ADR-005).
 */
export async function nextNumeroPlan(
  etablissementId: string,
): Promise<number> {
  const user = await requireUser();
  const last = await prisma.planPrevention.findFirst({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
    },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return (last?.numero ?? 0) + 1;
}
