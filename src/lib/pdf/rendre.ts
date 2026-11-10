import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { ligneExportPdf, niveauExportPdf, type ExportPdf, type IssueExportPdf } from "@/lib/journal/export-pdf";
import { elementDuDocument, NOM_DOCUMENT, type DemandePdf, type TypeDocument } from "./documents";
import { poidsDuDocument, type PoidsPdf } from "./poids";

/**
 * LE SEUL ENDROIT QUI MET UN PDF EN PAGE (lot pdf-b0, 2026-11-10,
 * `docs/plan-pdf-sous-processus.md`). Les six routes PDF et les quatre rendus
 * du ZIP de contrôle y passent ; une garde (`rendre.test.ts`) refuse tout
 * autre appel à `renderToBuffer`.
 *
 * Trois choses avant et après chaque rendu :
 *   1. le poids du document (`poids.ts`) ;
 *   2. le GARDE-FOU : au-delà d'un seuil, on refuse au lieu de mettre en page ;
 *   3. une ligne de journal (`journal/export-pdf.ts`).
 *
 * ⚠ LE GARDE-FOU EST UN PALLIATIF, NOMMÉ COMME TEL. La mise en page tourne
 * dans le processus web : un seul gros document peut figer l'application ou
 * saturer le tas et tuer le processus pour tous (banc de charge du
 * 2026-11-10). Refuser ne règle rien ; cela empêche un export de faire
 * tomber le service. Il se retire quand le rendu sort du processus (plan,
 * B1-B3) ou quand les gros exports passent en tâche de fond (lien par mail +
 * ZIP). Inscrit à `docs/chantiers-ouverts.md`.
 */

/**
 * Les seuils, PROVISOIRES : à remplacer par la mesure du registre après le
 * lot pdf-a1, en XS, sur le banc de charge (session `rojer-outils-cb`), avec
 * une marge de moitié — une ligne réelle pèse plus qu'une ligne du banc.
 *
 * Ordre de grandeur d'ici là (mesures synthétiques, 2026-11-10) : un tas de
 * 520 Mo sature vers 4 000 lignes même découpées ; un bloc de 700 lignes
 * d'un seul tenant fige l'application plusieurs secondes en XS.
 */
export const SEUILS_PDF = {
  /** Lignes de tout le document (mémoire). */
  total: 2_500,
  /** Lignes de la plus grosse `<Page>` (temps). */
  bloc: 400,
} as const;

export type SeuilsPdf = { total: number; bloc: number };

/** Le document dépasse un seuil : il n'est pas mis en page. */
export class PdfTropVolumineux extends Error {
  constructor(
    readonly type: TypeDocument,
    readonly poids: PoidsPdf,
  ) {
    super(`PDF « ${type} » trop volumineux (${poids.total} lignes, bloc de ${poids.plusGrosBloc})`);
    this.name = "PdfTropVolumineux";
  }
}

/** Ce que voit l'utilisateur d'un refus : le document reste à l'écran. */
export function messageTropVolumineux(type: TypeDocument): string {
  return (
    `Le ${NOM_DOCUMENT[type]} est trop volumineux pour être exporté en un seul PDF. ` +
    "Il reste consultable à l'écran, avec tout son contenu."
  );
}

/**
 * La raison d'un échec de rendu dans le ZIP de contrôle (README) : nommée
 * pour un refus, `undefined` sinon — l'appelant garde alors la sienne.
 */
export function raisonEchecRendu(e: unknown): string | undefined {
  return e instanceof PdfTropVolumineux
    ? "document trop volumineux pour être généré en un seul PDF"
    : undefined;
}

export async function rendrePdf(
  demande: DemandePdf,
  seuils: SeuilsPdf = SEUILS_PDF,
): Promise<Buffer> {
  const poids = poidsDuDocument(demande);
  const debut = performance.now();
  const journaliser = (issue: IssueExportPdf) =>
    ecrire({
      document: demande.type,
      total: poids.total,
      plusGrosBloc: poids.plusGrosBloc,
      seuilTotal: seuils.total,
      seuilBloc: seuils.bloc,
      dureeMs: performance.now() - debut,
      issue,
    });

  if (poids.total > seuils.total || poids.plusGrosBloc > seuils.bloc) {
    journaliser("trop_volumineux");
    throw new PdfTropVolumineux(demande.type, poids);
  }
  try {
    const pdf = await renderToBuffer(elementDuDocument(demande));
    journaliser("ok");
    return pdf;
  } catch (e) {
    journaliser("echec");
    throw e;
  }
}

function ecrire(e: ExportPdf) {
  const ligne = ligneExportPdf(e);
  const niveau = niveauExportPdf(e);
  if (niveau === "error") console.error(ligne);
  else if (niveau === "warn") console.warn(ligne);
  else console.info(ligne);
}
