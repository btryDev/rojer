// Les réglages d'export lus dans l'environnement (`EXPORTS_SIMULTANES`,
// `EXPORT_TAS_MAX_MO`, `EXPORT_DELAI_MAX_MS`) : UNE règle, lue ici et par
// `src/env.ts` au démarrage — les deux ne peuvent pas se contredire (revue de
// la PR #127, 2026-10-30).

/** Un entier ≥ 1 écrit en chiffres. */
export const FORME_ENTIER_POSITIF = /^[1-9]\d*$/;

/**
 * La valeur d'un réglage : absente, le défaut ; bien formée, sa valeur ; mal
 * formée, une erreur — jamais un repli silencieux, qui ferait tourner
 * l'instance avec un réglage qu'on croit autre.
 */
export function lireEntierPositif(nom: string, valeur: string | undefined, defaut: number): number {
  const v = valeur?.trim();
  if (!v) return defaut;
  if (!FORME_ENTIER_POSITIF.test(v)) throw new Error(`${nom} doit être un entier ≥ 1.`);
  return Number(v);
}
