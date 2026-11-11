/**
 * Où en est une unité dans l'étape « Risques par unité » (2026-11-12) : les
 * trois gestes — inventorier, coter, prévoir les mesures — lus sur ses
 * risques. Une seule lecture pour la vue d'ensemble et la page de l'unité.
 */
export type RisqueEvalue = {
  id: string;
  libelle: string;
  cotationSaisie: boolean;
  mesures: readonly unknown[];
  /** Ajouté par Rojer au « oui » d'une activité (ADR-060), pas par le dirigeant. */
  activiteId: string | null;
};

export type EtatUnite = {
  nbRisques: number;
  /** Déclarée « aucun risque significatif », justifiée. */
  declareeSansRisque: boolean;
  /**
   * Le dirigeant a fait un geste ici (2026-11-12) : un risque qu'il a coché
   * ou ajouté, ou une cotation. Les risques que Rojer ajoute seul ne
   * comptent pas — « si pas fait par vous, pas en cours ».
   */
  touchee: boolean;
  /** Inventaire fait par le dirigeant, ou unité déclarée sans risque. */
  inventoriee: boolean;
  aCoter: RisqueEvalue[];
  /** Cotés, sans aucune mesure. */
  sansMesure: RisqueEvalue[];
  cotee: boolean;
  mesuree: boolean;
  /** Les trois gestes faits, ou l'unité déclarée sans risque. */
  terminee: boolean;
};

export function etatUnite(unite: {
  risques: readonly RisqueEvalue[];
  aucunRisqueJustif: string | null;
}): EtatUnite {
  const nbRisques = unite.risques.length;
  const declareeSansRisque = nbRisques === 0 && Boolean(unite.aucunRisqueJustif);
  const aCoter = unite.risques.filter((r) => !r.cotationSaisie);
  const sansMesure = unite.risques.filter(
    (r) => r.cotationSaisie && r.mesures.length === 0,
  );
  const touchee = unite.risques.some((r) => r.cotationSaisie || r.activiteId === null);
  const inventoriee = touchee || declareeSansRisque;
  const cotee = nbRisques > 0 && aCoter.length === 0;
  const mesuree = cotee && sansMesure.length === 0;
  return {
    nbRisques,
    declareeSansRisque,
    touchee,
    inventoriee,
    aCoter,
    sansMesure,
    cotee,
    mesuree,
    terminee: declareeSansRisque || mesuree,
  };
}
