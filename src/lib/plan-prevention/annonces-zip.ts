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

export function lignesR4512_12Zip(plan: {
  dureeHeuresEstimee: number | null;
  travauxDangereux: boolean;
}): string[] {
  return annoncesZip.parPlan(diagnostiquerPlan(plan).ecrit);
}
