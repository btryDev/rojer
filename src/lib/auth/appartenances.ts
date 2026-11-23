import "server-only";
// Les appartenances d'une personne à ses comptes (ADR-054 § 3), lues dans
// `Membre`. Module feuille : il n'importe ni `better-auth.ts` ni rien qui
// l'importe, pour que le fournisseur OAuth (`mcp/compte-oauth.ts`, appelé par
// `better-auth.ts`) lise la même règle que `requireCompte` (`membres.ts`, qui
// le réexporte) sans import circulaire.
//
// Module hors compte nommé (`portee/imports.test.ts`).

import { prisma } from "@/lib/prisma";
import { estRole, type Role } from "./roles";

export type Appartenance = { compteId: string; role: Role };

/** Les comptes dont la personne est membre, le plus ancien d'abord ; un rôle inconnu est écarté. */
export async function appartenancesDe(userId: string): Promise<Appartenance[]> {
  const lignes = await prisma.membre.findMany({
    where: { userId },
    select: { compteId: true, role: true },
    // Le plus ancien d'abord, à égalité départagé par l'identifiant : deux
    // lectures concurrentes désignent le même (`compteDOnboarding`).
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return lignes.filter((l): l is Appartenance => estRole(l.role));
}
