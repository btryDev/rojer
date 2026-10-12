/**
 * Un SIRET déjà présent dans l'annuaire de l'établissement
 * (`@@unique([etablissementId, siret])`). Hors du module `"use server"` des
 * actions : toute fonction exportée d'un tel module devient un point d'entrée
 * appelable depuis le navigateur.
 */
export const MESSAGE_SIRET_EN_DOUBLE =
  "Un prestataire de votre annuaire porte déjà ce SIRET.";

/**
 * P2002 sur le SIRET — la seule contrainte unique de la table qu'une saisie
 * puisse heurter, l'identifiant étant tiré côté serveur. Reconnu par sa
 * forme, comme `versions/numerotation.ts`, sans charger le client Prisma.
 * Toute autre erreur doit remonter telle quelle.
 */
export function estSiretEnDouble(erreur: unknown): boolean {
  if (typeof erreur !== "object" || erreur === null) return false;
  const e = erreur as { code?: unknown; meta?: { target?: unknown } };
  if (e.code !== "P2002") return false;
  const target = e.meta?.target;
  if (Array.isArray(target)) return target.includes("siret");
  if (typeof target === "string") return target.includes("siret");
  // P2002 sans cible exploitable : la seule contrainte unique saisissable.
  return true;
}
