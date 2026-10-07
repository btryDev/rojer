/**
 * Le type d'un extincteur portatif, au sens du tableau A.1 de la norme
 * NF S 61-919 (août 2001), annexe A (normative) — C55 lot 3, item 3.
 *
 * POURQUOI CETTE QUESTION. La maintenance additionnelle approfondie et la
 * durée de vie dépendent du type, et de lui seul :
 *
 *   à mousse, eau et à base d'eau ......... à 5 et 15 ans · durée de vie 20 ans
 *   à poudre ................................ à 5 et 15 ans · 20 ans
 *   à poudre, opercule scellé, pression
 *     permanente ............................ à 15 ans      · 20 ans
 *   au CO2 .................................. —             · non fixée
 *
 * (Maintenance annuelle et révision en atelier à dix ans : tous types, hors
 * halon.) Les libellés reprennent les lignes du tableau mot pour mot.
 *
 * LE HALON N'EST PAS PROPOSÉ. Le tableau le cite (« Voir note 3 » : vidé et
 * récupéré, jamais rechargé) ; un extincteur au halon en service est une
 * exception que la cible ne rencontre pas, et le proposer ferait croire qu'il
 * a un régime de maintenance. Le silence le garde sur le régime général.
 *
 * LE SILENCE. La question est énumérée, sans case « je ne sais pas » stockée :
 * l'absence de réponse s'écrit par l'absence de la clé. Le moteur lit
 * `typeExtincteur` par `enum_differente`, qui est satisfaite au silence : un
 * extincteur dont le type n'a pas été dit garde la maintenance approfondie,
 * la règle la plus exigeante. C'est le sens que voit qui la subit.
 */

export const TYPES_EXTINCTEUR = [
  "eau_mousse",
  "poudre",
  "poudre_opercule_pression_permanente",
  "co2",
] as const;
export type TypeExtincteur = (typeof TYPES_EXTINCTEUR)[number];

export const LABEL_TYPE_EXTINCTEUR: Record<TypeExtincteur, string> = {
  eau_mousse: "À mousse, eau et à base d'eau",
  poudre: "À poudre",
  poudre_opercule_pression_permanente:
    "À poudre — avec opercule scellé, à pression permanente",
  co2: "Au CO₂ (dioxyde de carbone)",
};
