// Les statuts qui soldent une opération ponctuelle (ADR-017) — permis de feu,
// plan de prévention —, dans un module feuille : le calendrier
// (`echeances.ts`) et les comptages de modules (`etablissements/modules.ts`)
// les lisent tous deux, et le second est importé par le premier.
// [2026-10-27, plan performance, lot 1 : déplacés d'`echeances.ts`.]

import type { StatutPermisFeu, StatutPlanPrevention } from "@prisma/client";

/** Statuts qui soldent un permis de feu — au-delà, plus rien à faire. Le
 *  calendrier et le tableau de bord parlent du même ensemble ; le `satisfies`
 *  garantit qu'un statut ajouté à l'enum ne passe pas inaperçu ici. */
export const STATUTS_PERMIS_FEU_CLOS = [
  "termine",
  "annule",
] as const satisfies readonly StatutPermisFeu[];
/** Idem pour une opération avec entreprise extérieure. */
export const STATUTS_PLAN_PREVENTION_CLOS = [
  "clos",
  "annule",
] as const satisfies readonly StatutPlanPrevention[];
