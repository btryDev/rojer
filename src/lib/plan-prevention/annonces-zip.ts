/**
 * Les lignes de `R. 4512-12` sous un plan du fichier `07_Plans_de_prevention.txt`.
 *
 * Elles prennent le PLAN, pas un booléen : la route du ZIP n'a plus de
 * condition à écrire, donc plus de condition à se tromper. La première
 * version recevait `ecritObligatoire` — un `|| true` glissé dans la route
 * passait toutes les gardes (contre-lecture du 2026-09-26), et la durée non
 * renseignée taisait l'article. Le diagnostic est celui de la fiche.
 */
import { annoncesZip } from "./annonces-plan";
import { diagnostiquerPlan } from "./schema";

export function lignesR4512_12Zip(
  plan: {
    dureeHeuresEstimee: number | null;
    travauxDangereux: boolean;
    /** R. 4512-12, 2° (C45) : la date déclarée, ou `null`. */
    inspectionTravailInformeeLe: Date | null;
    /** R. 4512-7, 1°, seconde phrase (2026-10-12) : la révision notée. */
    heuresPrevisiblesRevisees?: number | null;
    heuresPrevisiblesReviseesLe?: Date | null;
  },
  formater: (d: Date) => string,
): string[] {
  return annoncesZip.parPlan(
    diagnostiquerPlan(plan).ecrit,
    plan.inspectionTravailInformeeLe
      ? formater(plan.inspectionTravailInformeeLe)
      : null,
  );
}

// ~~`ligneInspectionZip` — la ligne de l'inspection commune préalable
// (R. 4512-2) sous un plan du 07, « date non renseignée » plutôt que « NON
// RÉALISÉE » : Rojer ne tient qu'une date.~~ [2026-11-21, décision de la
// propriétaire : le 07 n'est plus qu'un index ; l'inspection commune se lit
// dans le PDF joint, qui dit de même « Aucune date d'inspection commune
// enregistrée. »]
