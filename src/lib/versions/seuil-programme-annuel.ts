/**
 * Le seuil du programme annuel de prévention (art. L. 4121-3-1, III, 1°) lu
 * sur une version FIGÉE du document unique — la règle commune aux seuils
 * d'entreprise (C37), appliquée à ce que l'instantané porte.
 *
 * DEUX GÉNÉRATIONS D'INSTANTANÉS. Depuis le 2026-09-26 l'instantané fige
 * `effectifEntreprise` ; avant, il ne portait que `effectif` — le site, malgré
 * le nom. Une version figée avant se lit donc comme avant : l'entreprise
 * retombe sur le site, les deux nombres sont égaux, et `aConfirmer` est
 * toujours faux. On n'invente pas après coup un doute que la version ne
 * pouvait pas porter.
 *
 * Module pur : ni React, ni Prisma.
 */

import { seuilEntrepriseAtteint } from "@/lib/matching/effectif-entreprise";
import type { EntrepriseSnapshot } from "./snapshot";

/** « Au moins cinquante salariés » (L. 4121-3-1, III, 1°). */
export const SEUIL_PROGRAMME_ANNUEL_PREVENTION = 50;

export function seuilProgrammeAnnuelDuSnapshot(
  e: Pick<EntrepriseSnapshot, "effectif" | "effectifEntreprise">,
): { atteint: boolean; aConfirmer: boolean } {
  return seuilEntrepriseAtteint(SEUIL_PROGRAMME_ANNUEL_PREVENTION, {
    entreprise: e.effectifEntreprise ?? e.effectif,
    site: e.effectif,
  });
}
