import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

// ADR-005 : scope par userId via la relation entreprise.

export async function getEtablissement(id: string) {
  const user = await requireUser();
  return prisma.etablissement.findFirst({
    where: { id, entreprise: { userId: user.id } },
    include: {
      entreprise: true,
      duerps: {
        orderBy: { updatedAt: "desc" },
        include: {
          versions: {
            orderBy: { numero: "desc" },
            take: 1,
          },
        },
      },
    },
  });
}

export async function listerEtablissementsDeLEntreprise(entrepriseId: string) {
  const user = await requireUser();
  return prisma.etablissement.findMany({
    where: { entrepriseId, entreprise: { userId: user.id } },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { duerps: true } },
    },
  });
}
