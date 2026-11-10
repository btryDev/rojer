import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  ligneExportPdf,
  niveauExportPdf,
  type ExportPdf,
  type IssueExportPdf,
  type OrigineExportPdf,
} from "@/lib/journal/export-pdf";
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
 * ⚠ LE GARDE-FOU EST UN PALLIATIF, NOMMÉ COMME TEL. Il borne la taille d'un
 * export mis en page dans le processus web ; ses seuils viennent du banc de
 * charge. Il ne rend pas le document, et il n'empêche pas tout : sous le
 * seuil, un export fige encore l'application le temps de son rendu (banc,
 * XS, 2026-11-10 : environ 7 s pour un registre d'un an). Il se retire ou se
 * relève quand le rendu sort du processus (plan, B1-B3) ou quand les gros
 * exports passent en tâche de fond (lien par mail + ZIP). Inscrit à
 * `docs/chantiers-ouverts.md` § 23.
 */

/**
 * Les seuils, mesurés sur le banc de charge en XS (1 cœur, 1 Go ; session
 * `rojer-outils-cb`, registre après le lot pdf-a1, 2026-11-10) : 2 274
 * rapports passent (672 Mo), 3 080 tuent le processus deux fois sur deux.
 * Le total est la MOITIÉ du dernier qui passe — une ligne réelle pèse plus
 * qu'une ligne du banc.
 *
 * ⚠ Le banc compte des rapports, le garde-fou des lignes (rapports, points,
 * fiches, attentes) : le même dossier pèse plus ici. À recaler sur la ligne
 * `export_pdf` des dossiers du banc (champ `total`) au prochain passage.
 *
 * Le bloc reste à 400 : le corps des fiches du registre, d'un seul tenant,
 * reprend les équipements (environ 300 lignes pour les 100 de la cible).
 */
export const SEUILS_PDF = {
  /** Lignes de tout le document (mémoire). */
  total: 1_200,
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

export type OptionsRendu = {
  seuils?: SeuilsPdf;
  /** D'où vient l'export : une route PDF ou le ZIP de contrôle (journal). */
  origine?: OrigineExportPdf;
};

/**
 * Pèse la demande et la refuse au-delà d'un seuil (`PdfTropVolumineux`,
 * journalisé). Calcul pur et rapide : une route l'appelle AVANT de prendre sa
 * place dans la file d'export, pour qu'un refus ne fasse pas attendre.
 * `rendrePdf` l'appelle aussi : le ZIP n'a pas d'autre porte.
 */
export function controlerPoids(demande: DemandePdf, options: OptionsRendu = {}): PoidsPdf {
  const seuils = options.seuils ?? SEUILS_PDF;
  const journaliser = journal(demande, options, performance.now());
  let poids: PoidsPdf;
  try {
    poids = poidsDuDocument(demande);
  } catch (e) {
    // Une donnée malformée (un vieux snapshot) : l'export échoue, et se dit.
    journaliser("echec", null);
    throw e;
  }
  if (poids.total > seuils.total || poids.plusGrosBloc > seuils.bloc) {
    journaliser("trop_volumineux", poids);
    throw new PdfTropVolumineux(demande.type, poids);
  }
  return poids;
}

export async function rendrePdf(
  demande: DemandePdf,
  options: OptionsRendu = {},
): Promise<Buffer> {
  const poids = controlerPoids(demande, options);
  const journaliser = journal(demande, options, performance.now());
  try {
    const pdf = await renderToBuffer(elementDuDocument(demande));
    journaliser("ok", poids);
    return pdf;
  } catch (e) {
    journaliser("echec", poids);
    throw e;
  }
}

/** La ligne `export_pdf` d'une demande, écrite à son issue. */
function journal(demande: DemandePdf, options: OptionsRendu, debut: number) {
  const seuils = options.seuils ?? SEUILS_PDF;
  return (issue: IssueExportPdf, poids: PoidsPdf | null) =>
    ecrire({
      document: demande.type,
      origine: options.origine ?? "route",
      total: poids?.total ?? null,
      plusGrosBloc: poids?.plusGrosBloc ?? null,
      seuilTotal: seuils.total,
      seuilBloc: seuils.bloc,
      dureeMs: performance.now() - debut,
      issue,
    });
}

function ecrire(e: ExportPdf) {
  const ligne = ligneExportPdf(e);
  const niveau = niveauExportPdf(e);
  if (niveau === "error") console.error(ligne);
  else if (niveau === "warn") console.warn(ligne);
  else console.info(ligne);
}
