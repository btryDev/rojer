/**
 * Les pages authentifiées mesurées, en un seul endroit : la mesure par page
 * (`mesurer.mjs`, budget de requêtes en CI) et le test de charge
 * (`scripts/charge/k6/`) lisent la même liste. Module ES sans dépendance :
 * Node et k6 l'importent tous deux.
 *
 * `d` : { etablissementId, duerpId, equipementId?, controleId? }.
 */
export function pagesDuDossier(d) {
  const e = `/etablissements/${d.etablissementId}`;
  return [
    ["Tableau de bord", e],
    ["Calendrier", `${e}/calendrier`],
    ["Registre", `${e}/registre`],
    ["Équipements", `${e}/equipements`],
    ["Plan d'actions", `${e}/actions`],
    ["Équipe", `${e}/equipe`],
    ["Prestataires", `${e}/prestataires`],
    ["Carnet sanitaire", `${e}/carnet-sanitaire`],
    ["Documents", `${e}/documents`],
    ["DUERP (unités)", `/duerp/${d.duerpId}/unites`],
    ["DUERP (synthèse)", `/duerp/${d.duerpId}/synthese`],
    ...(d.equipementId
      ? [
          ["Fiche équipement", `${e}/equipements/${d.equipementId}`],
          ["Fiche contrôle", `${e}/equipements/${d.equipementId}/controles/${d.controleId}`],
        ]
      : []),
  ];
}
