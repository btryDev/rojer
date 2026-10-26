import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import type { EntrepriseConnue } from "@/lib/onboarding/rattachement";

// ADR-005 : toutes les lectures d'Entreprise passent par requireUser() et
// filtrent sur userId. Les entreprises orphelines (userId = NULL, héritage
// avant auth) sont donc invisibles.

// ~~`listerEntreprises`~~ [2026-10-26 : retirée, aucun appelant.]

// ~~`getEntrepriseDuUser` — « l'entreprise du compte »~~ [2026-10-26 : retirée.
// Un compte suit plusieurs entreprises (une par SIREN) ; la notion n'existe plus.]

/**
 * Les entreprises du compte que le parcours peut reprendre : celles dont le
 * SIREN est connu. Le moins possible quitte le serveur — ni identifiant, ni
 * adresse —, et la lecture est bornée au compte : un SIREN ne se cherche
 * jamais dans toute la base, sinon un compte apprendrait qu'un autre suit la
 * même société.
 */
export async function listerEntreprisesConnues(): Promise<EntrepriseConnue[]> {
  const user = await requireUser();
  const entreprises = await prisma.entreprise.findMany({
    where: { userId: user.id, siren: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { siren: true, raisonSociale: true, effectif: true },
  });
  return entreprises.flatMap((e) =>
    e.siren ? [{ siren: e.siren, raisonSociale: e.raisonSociale, effectif: e.effectif }] : [],
  );
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
