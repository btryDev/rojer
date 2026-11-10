import type { DemandePdf } from "./documents";
import type { RegistreData } from "./RegistreDocument";
import { enPaquets, feuillesParAnnee } from "./paquets";

/**
 * Le poids d'un PDF avant sa mise en page (lot pdf-b0, 2026-11-10).
 *
 * Deux grandeurs, parce que deux défauts de `@react-pdf` 4.5.1 :
 *   - `total` : les lignes de tout le document. La mise en page garde tout le
 *     document en mémoire jusqu'à la fin ; c'est elle qui tue le processus
 *     (banc de charge : registre de 3 899 rapports, tas saturé en XS).
 *   - `plusGrosBloc` : les lignes de la plus grosse `<Page>` — la mise en page
 *     d'une `<Page>` coûte le carré de son nombre de lignes, et fige toute
 *     l'application pendant ce temps.
 *
 * Une « ligne » est une ligne de tableau ; un point à corriger, une mesure de
 * prévention ou une ligne de journal en sont une aussi, parce qu'ils
 * s'impriment comme telles. Les blocs suivent les `<Page>` réelles de chaque
 * document : un tableau découpé par le lot pdf-a1 compte par paquet.
 *
 * CE QUI N'EST PAS COMPTÉ, exprès : la longueur des textes (un libellé long
 * fait une ligne plus haute, pas une ligne de plus) et ce que la cible borne
 * (en-têtes de parties et de fiches du registre, axes de couverture et
 * matériels non couverts du dossier, dix rapports récents au plus). Le
 * garde-fou compte ce qui grossit avec le dossier.
 */
export type PoidsPdf = { total: number; plusGrosBloc: number };

export function poidsDuDocument(demande: DemandePdf): PoidsPdf {
  return depuisBlocs(blocsDuDocument(demande));
}

function depuisBlocs(blocs: number[]): PoidsPdf {
  return {
    total: blocs.reduce((a, b) => a + b, 0),
    plusGrosBloc: blocs.reduce((a, b) => Math.max(a, b), 0),
  };
}

/** Les lignes de chaque `<Page>` du document, dans l'ordre. */
function blocsDuDocument(demande: DemandePdf): number[] {
  switch (demande.type) {
    case "registre":
      return blocsDuRegistre(demande.props.data);
    case "dossier-conformite": {
      const d = demande.props.data;
      return [
        d.etatsPermanents.etats.length + d.etatsPermanents.faits.length,
        d.verifsEnRetard.length + d.verifsAConfirmer.length + d.verifsPourInformation.length,
        d.actionsEnCours.length + d.pointsEnCours.length,
        d.rapportsRecents.length,
      ];
    }
    case "plan-actions":
      return [demande.props.data.actions.length];
    case "points-a-corriger":
      return [demande.props.data.ouverts.length + demande.props.data.corriges.length];
    case "duerp": {
      // Une entrée par `<Page>` de `DuerpDocument` qui grossit avec lui :
      //   - les unités (et celles hors référentiel, au plus autant) ;
      //   - l'inventaire : risques, leurs mesures, la liste des risques CMR ;
      //   - le plan de prévention : risques priorisés et mesures prévues ;
      //   - l'annexe des expositions : au plus un risque par ligne ;
      //   - l'historique des versions, une de plus à chaque mise à jour.
      const { snapshot, historique } = demande.props;
      const risques = snapshot.unites.flatMap((u) => u.risques);
      const mesures = risques.flatMap((r) => r.mesures);
      return [
        snapshot.unites.length * 2,
        risques.length + mesures.length + risques.filter((r) => r.exposeCMR).length,
        risques.length + mesures.filter((m) => m.statut === "prevue").length,
        risques.length,
        historique.length,
      ];
    }
  }
}

function blocsDuRegistre(data: RegistreData): number[] {
  // Le corps des fiches est une seule `<Page>` (lot pdf-a1 : hors découpage).
  const fiches = data.parties
    .flatMap((p) => p.fiches)
    .reduce(
      (n, f) => n + (f.champs?.length ?? 0) + (f.lignes?.length ?? 0) + (f.tenues?.length ?? 0),
      0,
    );
  // L'index des rapports, par `<Page>` comme le document le découpe ; un
  // point à corriger s'imprime sous son rapport, une ligne de plus, et un
  // rapport d'électricité à points porte en plus la mention de R. 4226-19.
  const rapports = feuillesParAnnee(data.rapports, (r) => r.dateRapport).map((feuille) =>
    feuille
      .flatMap((s) => s.lignes)
      .reduce(
        (n, r) =>
          n + 1 + r.points.length + (r.points.length > 0 && r.domaine === "electricite" ? 1 : 0),
        0,
      ),
  );
  const attente = enPaquets(data.verifsEnAttente).map((p) => p.length);
  return [fiches, ...rapports, ...attente];
}
