import { enPaquets, feuillesParAnnee, LIGNES_PAR_PAQUET, type SegmentAnnuel } from "./paquets";
import type { LigneRapport, LigneVerif, RegistreData } from "./RegistreDocument";

/**
 * Le découpage du registre en `<Page>`, écrit UNE fois : le document le rend
 * (`RegistreDocument.tsx`), le garde-fou le pèse (`poids.ts`). Deux copies du
 * même appel avaient déjà divergé une fois — l'index coupé en rapports, pesé
 * en lignes (revue finale de la PR #286, 2026-11-10).
 */

/**
 * Les lignes qu'un rapport imprime dans l'index : la sienne, une par point à
 * corriger, et la mention de R. 4226-19 sous un rapport d'électricité à
 * points (`LigneRapportPdf`).
 */
export function lignesDuRapport(r: { points: readonly unknown[]; domaine: LigneRapport["domaine"] }): number {
  return 1 + r.points.length + (r.points.length > 0 && r.domaine === "electricite" ? 1 : 0);
}

export type DecoupageDuRegistre = {
  /** Le corps des fiches, une seule `<Page>` : ses lignes de tableau. */
  lignesDesFiches: number;
  /** L'index des rapports, une entrée par `<Page>` ; vide sans rapport. */
  feuillesRapports: SegmentAnnuel<LigneRapport>[][];
  /** Les lignes pesées de chaque feuille de l'index, dans le même ordre. */
  poidsDesFeuilles: number[];
  /** Les vérifications en attente, une entrée par `<Page>` ; au moins une,
   *  vide s'il n'y a rien en attente (elle porte alors le fait de l'attente
   *  vide, puis la tenue du registre). */
  paquetsAttente: LigneVerif[][];
};

export function decoupageDuRegistre(data: RegistreData): DecoupageDuRegistre {
  const feuillesRapports = feuillesParAnnee(
    data.rapports,
    (r) => r.dateRapport,
    LIGNES_PAR_PAQUET,
    lignesDuRapport,
  );
  return {
    lignesDesFiches: data.parties
      .flatMap((p) => p.fiches)
      .reduce(
        (n, f) => n + (f.champs?.length ?? 0) + (f.lignes?.length ?? 0) + (f.tenues?.length ?? 0),
        0,
      ),
    feuillesRapports,
    poidsDesFeuilles: feuillesRapports.map((feuille) =>
      feuille.reduce((n, s) => n + s.lignes.reduce((m, r) => m + lignesDuRapport(r), 0), 0),
    ),
    paquetsAttente: data.verifsEnAttente.length === 0 ? [[]] : enPaquets(data.verifsEnAttente),
  };
}
