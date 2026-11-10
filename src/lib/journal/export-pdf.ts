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
 * Le niveau d'un export : `warn` quand un seuil approche, pour que la
 * génération en tâche de fond arrive avant le premier refus ; `warn` aussi
 * pour un refus, `error` pour un échec de rendu.
 *
 * « Approche » ne se lit pas pareil pour les deux seuils (revue finale de la
 * PR #286) :
 *   - le TOTAL grandit avec les années : il avertit dès la MOITIÉ ;
 *   - le BLOC, non — la plus grosse `<Page>` d'un registre est le corps des
 *     fiches, qui suit le parc (environ 300 lignes pour les 100 appareils de
 *     la cible, sur 400) : à la moitié, tout registre de la cible
 *     avertirait toujours, et le signal ne dirait plus rien. Il avertit à
 *     90 % de son seuil.
 */
export const PART_AVERTISSEMENT_TOTAL = 0.5;
export const PART_AVERTISSEMENT_BLOC = 0.9;

export function niveauExportPdf(e: ExportPdf): NiveauJournal {
  if (e.issue === "echec") return "error";
  if (e.issue === "trop_volumineux") return "warn";
  const approche =
    (e.total ?? 0) >= e.seuilTotal * PART_AVERTISSEMENT_TOTAL ||
    (e.plusGrosBloc ?? 0) >= e.seuilBloc * PART_AVERTISSEMENT_BLOC;
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
