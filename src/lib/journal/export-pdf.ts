// Un export PDF, en UNE ligne JSON — pour voir venir les gros dossiers
// (lot pdf-b0, 2026-11-10). Même forme que `erreur-requete.ts` : Clever Cloud
// collecte la sortie du processus, une ligne JSON s'y filtre sans service tiers.
//
// CE QUI N'Y EST PAS, exprès : aucune donnée du dossier — ni établissement, ni
// nom, ni identifiant. Le type du document, sa taille, sa durée, son issue.
//
// Module pur : il rend la ligne et son niveau, l'appelant l'écrit.

export type IssueExportPdf = "ok" | "trop_volumineux" | "echec";
/** D'où vient l'export : une route PDF ou le ZIP de contrôle. */
export type OrigineExportPdf = "route" | "zip";

export type ExportPdf = {
  document: string;
  origine: OrigineExportPdf;
  /** `null` quand la pesée elle-même a échoué (donnée malformée). */
  total: number | null;
  plusGrosBloc: number | null;
  seuilTotal: number;
  seuilBloc: number;
  dureeMs: number;
  issue: IssueExportPdf;
};

export type NiveauJournal = "info" | "warn" | "error";

/**
 * Le niveau d'un export : `warn` dès la MOITIÉ d'un seuil, pour que la
 * génération en tâche de fond arrive avant le premier refus ; `warn` aussi
 * pour un refus, `error` pour un échec de rendu.
 */
export function niveauExportPdf(e: ExportPdf): NiveauJournal {
  if (e.issue === "echec") return "error";
  if (e.issue === "trop_volumineux") return "warn";
  const approche =
    (e.total ?? 0) * 2 >= e.seuilTotal || (e.plusGrosBloc ?? 0) * 2 >= e.seuilBloc;
  return approche ? "warn" : "info";
}

export function ligneExportPdf(e: ExportPdf): string {
  return JSON.stringify({
    niveau: niveauExportPdf(e),
    evenement: "export_pdf",
    document: e.document,
    origine: e.origine,
    total: e.total,
    plusGrosBloc: e.plusGrosBloc,
    seuilTotal: e.seuilTotal,
    seuilBloc: e.seuilBloc,
    dureeMs: Math.round(e.dureeMs),
    issue: e.issue,
  });
}
