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

/**
 * La ligne de l'inspection commune préalable (art. R. 4512-2) sous un plan.
 *
 * ROJER NE SAIT PAS N'EST PAS « PAS FAIT » (revue finale de l'intégration d,
 * 2026-09-26). Sans date, la route imprimait « Inspection commune : NON
 * RÉALISÉE ». Le dossier ne tient qu'une DATE, facultative à la saisie : son
 * absence dit qu'on ne l'a pas saisie, pas que l'inspection n'a pas eu lieu —
 * et le destinataire du ZIP est un inspecteur, qui aurait lu un manquement
 * affirmé. Même partage que `pdf/fait-retards.ts` : on dit le fait qu'on
 * tient, la date, ou qu'on ne la tient pas. La fiche du plan dit de même :
 * « Aucune date d'inspection commune enregistrée. »
 */
export function ligneInspectionZip(
  inspectionDate: Date | null,
  formater: (d: Date) => string,
): string {
  return inspectionDate
    ? `  Inspection commune : ${formater(inspectionDate)}`
    : "  Inspection commune : date non renseignée";
}
