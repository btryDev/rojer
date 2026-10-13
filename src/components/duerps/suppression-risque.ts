/**
 * Ce que la suppression d'un risque emporte, dit avant de la faire (relecture
 * indépendante du 2026-10-12). Les actions rattachées partent en cascade
 * (`Action.risqueId`, `onDelete: Cascade`), levées comprises — et une levée
 * porte toujours son justificatif (`cloturerAction` l'exige).
 */
export function detailSuppressionRisque(p: {
  referentiel: boolean;
  nbActions: number;
  nbLevees: number;
}): string {
  const actions =
    p.nbActions === 0
      ? "Sa cotation est supprimée avec lui"
      : `Sa cotation et ${p.nbActions === 1 ? "son action" : `ses ${p.nbActions} actions`}${
          p.nbLevees === 0
            ? ""
            : p.nbLevees === p.nbActions
              ? p.nbActions === 1
                ? ", levée avec son justificatif,"
                : `, toutes levées avec leur justificatif,`
              : ` — dont ${p.nbLevees} levée${p.nbLevees > 1 ? "s" : ""} avec ${p.nbLevees > 1 ? "leur" : "son"} justificatif —`
        } sont supprimées avec lui`;
  const retour = p.referentiel
    ? " ; il retourne parmi les autres risques du référentiel."
    : ".";
  return `${actions}${retour} Le DUERP n'en gardera pas trace.`;
}
