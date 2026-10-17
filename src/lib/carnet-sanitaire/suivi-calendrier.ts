import "server-only";
import { prisma } from "@/lib/prisma";
import type { CategorieEquipement } from "@prisma/client";

/**
 * La catégorie qui fait porter la surveillance des légionelles par le
 * RÉFÉRENTIEL (2026-10-17, sous-lot F, décision de la propriétaire) :
 * `ecs-temperature-mensuelle` et `ecs-legionelles-analyse-annuelle`, une ligne
 * de chaque par installation déclarée.
 */
export const CATEGORIE_EAU_CHAUDE_SUIVIE: CategorieEquipement =
  "EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC";

/**
 * L'établissement est-il un ERP qui a déclaré au moins une installation de la
 * catégorie ?
 *
 * ERP, et pas seulement « déclarée » : les deux lignes ne naissent qu'en ERP
 * (`typologies: { erp: true }`, champ de l'art. 1er). Un établissement non
 * ERP qui déclarerait la catégorie n'en reçoit aucune ; s'il fallait taire le
 * carnet pour lui aussi, il ne lui resterait plus aucun rappel.
 *
 * Lu par l'échéance du carnet (`calendrier/echeances.ts`, `sourceLegionelles`)
 * et par la ligne du tableau de bord (`dashboard/queries.ts`) : quand la
 * réponse est oui, le calendrier porte déjà l'analyse annuelle et la
 * température mensuelle, et le module se tait sur ces rappels — un seul
 * rappel par acte (ADR-010, amendement du 2026-10-17). Une seule lecture,
 * pour que les deux surfaces ne puissent pas diverger.
 *
 * `scope` porte le prédicat de compte (`etablissement.entreprise.userId`) :
 * la lecture ne dépend pas de la provenance de son argument.
 */
export async function eauChaudeSuivieParLeCalendrier(scope: {
  etablissementId: string;
  etablissement: { entreprise: { userId: string } };
}): Promise<boolean> {
  const n = await prisma.equipement.count({
    where: {
      etablissementId: scope.etablissementId,
      etablissement: { ...scope.etablissement, estERP: true },
      categorie: CATEGORIE_EAU_CHAUDE_SUIVIE,
    },
  });
  return n > 0;
}
