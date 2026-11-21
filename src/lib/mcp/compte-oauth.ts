import "server-only";
// Le compte d'un consentement OAuth (ADR-062 § 4, ADR-054). Appelé par le
// fournisseur (`postLogin`, `auth/better-auth.ts`) après la connexion et
// avant le consentement : le compte actif de la session n'est qu'une
// préférence, l'appartenance est relue dans `Membre`.
//
// Module hors compte nommé, comme `auth/membres.ts` : il lit `Membre` avant
// que la portée existe. Il n'importe pas `auth/better-auth.ts`, qui l'importe.

import { prisma } from "@/lib/prisma";
import { estRole } from "@/lib/auth/roles";

/** Nom du claim qui porte le compte dans le jeton d'accès. */
export const CLAIM_COMPTE = "compte";

async function comptesDe(userId: string): Promise<string[]> {
  const lignes = await prisma.membre.findMany({
    where: { userId },
    select: { compteId: true, role: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return lignes.filter((l) => estRole(l.role)).map((l) => l.compteId);
}

/**
 * Faut-il passer par `/oauth/compte` ? Oui pour qui n'a aucun compte (la page
 * le dit) ; non pour qui n'en a qu'un ; pour qui en a plusieurs, oui tant
 * qu'il n'est pas revenu de la page avec un compte actif dont il est membre —
 * `isContinuation` vient du client et ne prouve rien, d'où la relecture.
 */
export async function doitChoisirLeCompte(
  userId: string,
  compteActifId: string | null | undefined,
  isContinuation: boolean,
): Promise<boolean> {
  const comptes = await comptesDe(userId);
  if (comptes.length === 1) return false;
  if (comptes.length === 0) return true;
  return !(isContinuation && compteActifId != null && comptes.includes(compteActifId));
}

/**
 * Le compte auquel le consentement est lié : le compte actif s'il en est
 * membre, sinon son seul compte. Lève sinon — le fournisseur arrête alors
 * l'autorisation (« YOU must fail », docs de `postLogin`).
 */
export async function compteDuConsentement(
  userId: string,
  compteActifId: string | null | undefined,
): Promise<string> {
  const comptes = await comptesDe(userId);
  if (compteActifId && comptes.includes(compteActifId)) return compteActifId;
  if (comptes.length === 1) return comptes[0];
  throw new Error("consentement OAuth sans compte désigné dont la personne est membre");
}
