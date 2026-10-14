import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { cache } from "react";

// ADR-005 : scope par userId via la relation entreprise.

/**
 * L'établissement du user, son entreprise et son dernier DUERP.
 *
 * Mémoïsé par `cache()` sur le rendu (audit Next.js du 2026-10-14, H2) : les
 * pages et les fonctions qu'elles appellent le relisent dans le même rendu.
 * La clé est l'identifiant, une primitive ; la portée est la requête HTTP,
 * jamais plus. Hors rendu RSC, la lecture se fait à chaque appel.
 */
export const getEtablissement = cache(async function getEtablissement(
  id: string,
) {
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
});

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
