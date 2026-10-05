// Les réponses fermées d'un DUERP — oui, non, ou rien —, lues depuis une
// colonne JSON.
//
// Deux colonnes portent ce format : `reponsesActivitesNonCouvertes` (ADR-020)
// et `reponsesTransverses` (ADR-038). La lecture est la même pour les deux, et
// elle vit ici une fois : la seconde colonne a été créée en reprenant le
// format de la première, et deux lecteurs du même format finissent par ne plus
// dire la même chose — c'est le défaut que `extrait-continu.ts` a été extrait
// pour empêcher, ailleurs, le 2026-09-26.
//
// L'écriture est dans `ecrire-reponse-fermee.ts` : ce module-ci reste pur, il
// est importé par des écrans et des fonctions de calcul qui n'ont rien à faire
// du client Prisma.

/**
 * Trois états, et c'est tout l'intérêt du format : `true` (oui), `false`
 * (refus délibéré), **clé absente** (question jamais tranchée). Le troisième
 * n'est pas un `false` par défaut — un DUERP part chez un tiers, et lui faire
 * dire « le dirigeant a déclaré que non » alors que personne n'a répondu
 * serait une affirmation inventée.
 */
export type ReponsesFermees = Record<string, boolean>;

/**
 * Lit la colonne JSON en réponses exploitables. Tolérante par construction :
 * `null` (aucune réponse jamais donnée), un tableau, un scalaire ou une
 * valeur non booléenne rendent tous une réponse absente, jamais un `false`.
 *
 * La tolérance n'est pas de la complaisance : la colonne est un `Json` libre,
 * elle peut avoir été écrite par une version antérieure du produit ou par une
 * main humaine en base. Tout ce qui n'est pas un « oui » ou un « non »
 * lisible est traité comme « on ne sait pas ».
 */
export function lireReponsesFermees(brut: unknown): ReponsesFermees {
  if (brut === null || typeof brut !== "object" || Array.isArray(brut)) {
    return {};
  }
  const reponses: ReponsesFermees = {};
  for (const [cle, valeur] of Object.entries(brut as Record<string, unknown>)) {
    if (typeof valeur === "boolean") reponses[cle] = valeur;
  }
  return reponses;
}
