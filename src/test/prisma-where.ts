/**
 * Le filtre `where` de Prisma, rejoué en mémoire pour les faux clients des
 * tests. UNE implémentation (2026-10-30) : trois fichiers en portaient chacun
 * une copie, et chaque nouvel opérateur (le `OR` du plafond des liens) devait
 * être recopié trois fois — les copies avaient déjà divergé.
 *
 * Ce qu'il sait : égalité, `null` (absent ou nul), dates, `gt`/`gte`/`lt`/
 * `lte` (nombres et dates, par `valueOf`), `in`, `not` (comme en SQL : une
 * valeur nulle ne passe pas), `OR`, et les filtres de relation imbriqués
 * (`{ etablissement: { entreprise: { userId } } }`). Un opérateur inconnu
 * lève : un faux client qui accepterait en silence ce qu'il ne comprend pas
 * ferait passer un test pour une mauvaise raison.
 */

export type Ligne = Record<string, unknown>;

const OPERATEURS = ["gt", "gte", "lt", "lte", "in", "not"] as const;

function estOperateur(o: Ligne): boolean {
  return OPERATEURS.some((op) => op in o);
}

function compare(valeur: unknown, op: string, borne: unknown): boolean {
  switch (op) {
    case "gt":
      return valeur != null && (valeur as number) > (borne as number);
    case "gte":
      return valeur != null && (valeur as number) >= (borne as number);
    case "lt":
      return valeur != null && (valeur as number) < (borne as number);
    case "lte":
      return valeur != null && (valeur as number) <= (borne as number);
    case "in":
      return (borne as unknown[]).includes(valeur);
    case "not":
      return valeur != null && valeur !== borne;
    default:
      throw new Error(`opérateur inconnu du faux client : ${op}`);
  }
}

export function correspond(ligne: Ligne | undefined | null, where: Ligne): boolean {
  if (!ligne) return false;
  return Object.entries(where).every(([clef, attendu]) => {
    if (clef === "OR") return (attendu as Ligne[]).some((w) => correspond(ligne, w));
    const valeur = ligne[clef];
    if (attendu === null) return valeur === null || valeur === undefined;
    if (attendu instanceof Date) {
      return valeur instanceof Date && valeur.getTime() === attendu.getTime();
    }
    if (typeof attendu === "object") {
      const o = attendu as Ligne;
      if (!estOperateur(o)) return correspond(valeur as Ligne, o);
      return Object.entries(o).every(([op, borne]) => compare(valeur, op, borne));
    }
    return valeur === attendu;
  });
}
