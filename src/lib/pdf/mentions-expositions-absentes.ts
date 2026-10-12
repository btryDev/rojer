// Ce que la méthodologie du DUERP dit des expositions déclarées absentes
// (chantiers-ouverts § 17.2, décision de la propriétaire du 2026-10-12).
//
// Hors du JSX pour la raison de `mentions-couverture.ts` : une condition
// inversée dans le document passe la suite verte, une phrase sortie d'ici se
// vérifie.
//
// La section décrit une réponse, elle n'en tire rien. Elle ne dit pas « aucun
// risque », ni « conforme », ni « non concerné » : elle cite la question, la
// réponse et sa date. Le chapeau dit aussi ce que la liste n'est pas — un
// silence n'y figure pas (ADR-022) —, sans quoi elle se lirait comme
// l'inventaire complet de ce qui a été examiné.

import { formaterDateCourteFr } from "@/lib/dates";
import { quandSansReponse } from "./mentions-couverture";

export const TITRE_EXPOSITIONS_ABSENTES =
  "Expositions examinées et déclarées absentes";

export const CHAPEAU_EXPOSITIONS_ABSENTES =
  "L'employeur a répondu « non » aux questions suivantes, posées lors de " +
  "l'évaluation. Elles figurent ici pour que le document dise ce qui a été " +
  "examiné, et pas seulement ce qui a été retenu. Une question restée sans " +
  "réponse n'y figure pas : le document n'en conclut rien.";

/**
 * « Réponse : non — version 3 du 12 oct. 2026 ». Sur un aperçu, il n'y a pas de
 * version validée à dater : la formule est celle des questions sans réponse
 * de la couverture (`quandSansReponse`), pour que les deux mentions du même
 * document parlent du même instant de la même façon.
 */
export function reponseDatee(ctx: {
  version: number;
  genereLe: string;
  brouillon: boolean;
}): string {
  const quand = ctx.brouillon
    ? quandSansReponse(true)
    : `version ${ctx.version} du ${formaterDateCourteFr(new Date(ctx.genereLe))}`;
  return `Réponse : non — ${quand}`;
}
