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
import {
  PdfAbandonne,
  PdfDelaiDepasse,
  PdfMemoireDepassee,
  rendreDansUnProcessus,
  workerDisponible,
} from "./worker/lancer";
import { delaiMaxMs, tasMaxMo } from "./worker/reglages";

/**
 * LE SEUL ENDROIT QUI MET UN PDF EN PAGE (lot pdf-b0, 2026-11-10,
 * `docs/plan-pdf-sous-processus.md`). Les six routes PDF et les quatre rendus
 * du ZIP de contrôle y passent ; une garde (`rendre.test.ts`) refuse, dans
 * `src/`, tout autre appel à `renderToBuffer` (les scripts de `scripts/`, hors
 * de l'application, n'y sont pas soumis).
 *
 * Trois choses avant et après chaque rendu :
 *   1. le poids du document (`poids.ts`) ;
 *   2. le GARDE-FOU : au-delà d'un seuil, on refuse au lieu de mettre en page ;
 *   3. une ligne de journal (`journal/export-pdf.ts`).
 *
 * ⚠ LE GARDE-FOU EST UN PALLIATIF, NOMMÉ COMME TEL. Il borne la taille d'un
 * export ; ses seuils viennent du banc de charge. Il ne rend pas le document.
 * ~~Sous le seuil, un export fige encore l'application le temps de son
 * rendu~~ [lot pdf-b1 : en production, la mise en page tourne dans un
 * processus enfant (`mettreEnPage`, `worker/lancer.ts`) — le garde-fou devient
 * le PREMIER filet, qui refuse sans rien lancer ; le processus de rendu est le
 * second, qui confine un tas dépassé et laisse la boucle du serveur libre.] Il
 * se relève quand le rendu hors processus est mesuré (B3), et se retire quand
 * les gros exports passent en tâche de fond (lien par mail + ZIP). Inscrit à
 * `docs/chantiers-ouverts.md` § 23.
 */

type SeuilsPdf = { total: number; bloc: number };

/**
 * Les seuils, PAR TYPE de document : chaque document pèse ses lignes à sa
 * façon (`poids.ts`), un seuil ne se transpose pas de l'un à l'autre.
 *
 * REGISTRE — mesurés le 2026-11-10 sur le banc XS (1 cœur, 1 Go ;
 * `rojer-outils-cb`, `lot/charge-k6`), fca75951 + B0, le compte exact lu
 * dans la ligne `export_pdf` (en LIGNES du garde-fou, pas en rapports) :
 *   - 1 267 lignes (1 an, 682 rapports) : 5,3 s, 413 Mo ;
 *   - 2 115 (2 ans) : 10,2 s, 574 Mo ; 2 868 (2 ans, points longs) : 14,7 s ;
 *   - 2 921 (3 ans) : 15,1 s, 663 Mo — le dernier qui passe ;
 *   - environ 3 700 (4 ans) : processus tué, deux fois sur deux.
 * Total 2 000 : les deux tiers du dernier qui passe, 55 % de la mort, et un
 * gel borné à une dizaine de secondes en XS. Bloc 400 : le plus gros observé
 * était 299 (le corps des fiches) ; [2026-11-10, revue de la PR #286 :
 * depuis, toutes les pages du registre sont découpées à 100 lignes
 * (`decoupage-registre.ts`), et ce seuil ne le refuse plus — sauf un rapport seul de plus de 99 points à corriger
 * (399 ou plus), qu'aucune borne n'empêche ; il reste pour les documents non
 * découpés.] À REMESURER avec le worker (B1-B3) et en S.
 *
 * AUTRES DOCUMENTS — NON MESURÉS. Le dossier de conformité a passé le banc à
 * dix ans d'historique (2,6 s au plus) ; le DUERP, le plan d'actions et les
 * points à corriger n'y ont jamais été menés. Leur seuil n'est qu'une borne
 * d'absurdité, large exprès : leur appliquer celui du registre refusait un
 * DUERP de cent risques, document dû et versionné (revue du 2026-11-10).
 */
const NON_MESURE: SeuilsPdf = { total: 5_000, bloc: 2_000 };
export const SEUILS_PDF: Record<TypeDocument, SeuilsPdf> = {
  registre: { total: 2_000, bloc: 400 },
  "dossier-conformite": NON_MESURE,
  "plan-actions": NON_MESURE,
  "points-a-corriger": NON_MESURE,
  duerp: NON_MESURE,
};

/** Le document dépasse un seuil : il n'est pas mis en page. */
export class PdfTropVolumineux extends Error {
  constructor(
    readonly type: TypeDocument,
    readonly poids: PoidsPdf,
    options?: { cause?: unknown },
  ) {
    super(
      `PDF « ${type} » trop volumineux (${poids.total} lignes, bloc de ${poids.plusGrosBloc})`,
      options,
    );
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
  if (e instanceof PdfTropVolumineux) return "document trop volumineux pour être généré en un seul PDF";
  if (e instanceof PdfDelaiDepasse) return "génération interrompue, délai dépassé";
  if (e instanceof PdfAbandonne) return "génération abandonnée, la demande a été interrompue";
  return undefined;
}

export { PdfAbandonne, PdfDelaiDepasse };

type OptionsRendu = {
  /** Réservé aux tests : la production lit toujours `SEUILS_PDF`. */
  seuils?: SeuilsPdf;
  /** D'où vient l'export : une route PDF ou le ZIP de contrôle (journal). */
  origine?: OrigineExportPdf;
  /** Le signal de la requête : un client parti arrête le rendu. */
  signal?: AbortSignal;
};

/**
 * Pèse la demande et la refuse au-delà d'un seuil (`PdfTropVolumineux`,
 * journalisé). Calcul pur et rapide : une route PDF l'appelle AVANT de
 * prendre sa place dans la file d'export, pour qu'un refus ne fasse pas
 * attendre. Le ZIP de contrôle, lui, pèse chaque document DANS sa place : il
 * la tient pour toute l'archive (`controle-zip/route.ts`), par `rendrePdf`.
 */
export function controlerPoids(demande: DemandePdf, options: OptionsRendu = {}): PoidsPdf {
  const seuils = seuilsDe(demande, options);
  const journaliser = journal(demande, options.origine, seuils, performance.now());
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
  return mettreEnPage(demande, controlerPoids(demande, options), options);
}

/**
 * La mise en page d'une demande DÉJÀ pesée et admise par `controlerPoids` —
 * pour la route, qui pèse avant la file d'export et ne pèse pas deux fois.
 */
export async function mettreEnPage(
  demande: DemandePdf,
  poids: PoidsPdf,
  options: OptionsRendu = {},
): Promise<Buffer> {
  const journaliser = journal(demande, options.origine, seuilsDe(demande, options), performance.now());
  try {
    const pdf = await rendreSelonLeLieu(demande, options);
    journaliser("ok", poids);
    return pdf;
  } catch (e) {
    if (e instanceof PdfMemoireDepassee) {
      journaliser("memoire_depassee", poids);
      throw new PdfTropVolumineux(demande.type, poids, { cause: e });
    }
    journaliser(
      e instanceof PdfDelaiDepasse ? "delai_depasse" : e instanceof PdfAbandonne ? "abandonne" : "echec",
      poids,
    );
    throw e;
  }
}

/**
 * Où mettre en page. EN PRODUCTION, toujours dans un processus enfant, dont
 * le paquet doit exister (`dist-pdf/pdf-worker.mjs`). HORS PRODUCTION, dans
 * le processus, avec le code des documents à jour : un paquet construit au
 * démarrage de `next dev` imprimerait l'ancienne version d'un document
 * modifié depuis. `PDF_WORKER=1` force le processus enfant en local.
 */
async function rendreSelonLeLieu(demande: DemandePdf, options: OptionsRendu): Promise<Buffer> {
  if (process.env.NODE_ENV === "production" || process.env.PDF_WORKER === "1") {
    if (!workerDisponible()) {
      throw new Error(
        "pdf-worker introuvable (dist-pdf/pdf-worker.mjs) : `pnpm pdf-worker` le construit, " +
          "le build CC aussi.",
      );
    }
    return rendreDansUnProcessus(demande, {
      tasMaxMo: tasMaxMo(),
      delaiMaxMs: delaiMaxMs(),
      signal: options.signal,
    });
  }
  return renderToBuffer(elementDuDocument(demande));
}

function seuilsDe(demande: DemandePdf, options: OptionsRendu): SeuilsPdf {
  return options.seuils ?? SEUILS_PDF[demande.type];
}

/**
 * La ligne `export_pdf` d'une demande, écrite à son issue. `dureeMs` mesure
 * l'étape qui a tranché : la mise en page pour « ok » et pour un échec de
 * rendu, la pesée pour un refus et pour une pesée en échec.
 */
function journal(
  demande: DemandePdf,
  origine: OrigineExportPdf | undefined,
  seuils: SeuilsPdf,
  debut: number,
) {
  return (issue: IssueExportPdf, poids: PoidsPdf | null) =>
    ecrire({
      document: demande.type,
      origine: origine ?? "route",
      total: poids?.total ?? null,
      plusGrosBloc: poids?.plusGrosBloc ?? null,
      seuilTotal: seuils.total,
      seuilBloc: seuils.bloc,
      dureeMs: performance.now() - debut,
      issue,
    });
}

function ecrire(e: ExportPdf) {
  const niveau = niveauExportPdf(e);
  const ligne = ligneExportPdf(e, niveau);
  if (niveau === "error") console.error(ligne);
  else if (niveau === "warn") console.warn(ligne);
  else console.info(ligne);
}
