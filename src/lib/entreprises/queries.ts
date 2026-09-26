import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

// ADR-005 : toutes les lectures d'Entreprise passent par requireUser() et
// filtrent sur userId. Les entreprises orphelines (userId = NULL, héritage
// avant auth) sont donc invisibles.

export async function listerEntreprises() {
  const user = await requireUser();
  return prisma.entreprise.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      etablissements: {
        include: {
          _count: { select: { duerps: true } },
        },
      },
    },
  });
}

/**
 * L'entreprise du user connecté, ou `null` si l'onboarding n'a pas eu lieu.
 *
 * `Entreprise.userId` reste `@unique` après l'ADR-028 — c'est ce que cette
 * ADR ne touche pas —, donc « l'entreprise du compte » est toujours une notion
 * définie, là où « l'établissement du compte » a cessé de l'être. C'est elle
 * qu'il faut pour ouvrir un établissement de plus : le formulaire de création a
 * besoin du parent, pas d'un frère.
 */
export async function getEntrepriseDuUser() {
  const user = await requireUser();
  return prisma.entreprise.findFirst({
    where: { userId: user.id },
    select: { id: true, raisonSociale: true, effectif: true },
  });
}

export async function getEntreprise(id: string) {
  const user = await requireUser();
  return prisma.entreprise.findFirst({
    where: { id, userId: user.id },
    include: {
      etablissements: {
        orderBy: { createdAt: "asc" },
        include: {
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
      },
    },
  });
}
