// L'entrée du fil d'exécution qui met un PDF en page (lot pdf-b1, 2026-11-10,
// `docs/plan-pdf-sous-processus.md`, ADR-059).
//
// Empaquetée à part par `scripts/construire-worker-pdf.mjs` en un seul fichier
// autonome (`dist-pdf/pdf-worker.mjs`), react et @react-pdf compris : le
// serveur la charge par son chemin, sans dépendre du traçage de Next.
//
// Elle ne fait QUE la mise en page : la demande arrive déjà lue en base,
// contrôlée (accès, abonnement) et pesée par le processus web (`rendre.ts`).
// Un rendu par fil : le processus web la lance, attend un message, puis la
// termine — toute sa mémoire est rendue.

import { getHeapStatistics } from "node:v8";
import { parentPort, workerData } from "node:worker_threads";
import { renderToBuffer } from "@react-pdf/renderer";
import { elementDuDocument, type DemandePdf } from "../documents";

/** Ce que le fil renvoie : le PDF, ou le message et la pile d'une erreur. */
export type ReponseWorker =
  | { ok: true; pdf: ArrayBuffer }
  | { ok: false; message: string; pile?: string };

/** Ce que le lanceur passe au fil (`lancer.ts`). */
export type DonneesWorker = { tasMaxMo: number };

/**
 * Marge entre le tas demandé et la limite que V8 annonce : la jeune
 * génération et les espaces de code s'y ajoutent (mesuré : 48 Mo pour 64 ou
 * 384 demandés). Au-delà, une option de Node a pris le pas sur la borne.
 */
const MARGE_TAS_MO = 64;

if (!parentPort) throw new Error("pdf-worker : à lancer comme worker_thread, pas directement.");
const port = parentPort;

port.once("message", async (demande: DemandePdf) => {
  let reponse: ReponseWorker;
  // LA BORNE EST-ELLE TENUE ? `--max-old-space-size` (option de Node ou
  // NODE_OPTIONS) prend le pas sur `resourceLimits` : le fil grossirait sans
  // borne (mesuré : 2 096 Mo de limite pour 64 demandés). Refusé ici aussi,
  // au cas où le contrôle du démarrage (`demarrage.ts`) serait contourné.
  const { tasMaxMo } = workerData as DonneesWorker;
  const limiteMo = getHeapStatistics().heap_size_limit / 1_048_576;
  if (limiteMo > tasMaxMo + MARGE_TAS_MO) {
    reponse = {
      ok: false,
      message: `pdf-worker : borne de tas non appliquée (${Math.round(limiteMo)} Mo pour ${tasMaxMo} demandés)`,
    };
    port.postMessage(reponse);
    return;
  }
  try {
    const buf = await renderToBuffer(elementDuDocument(demande));
    // Copie dans un ArrayBuffer propre, transféré sans recopie au parent.
    const pdf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    reponse = { ok: true, pdf };
    port.postMessage(reponse, [pdf]);
  } catch (e) {
    // Le message et la pile : du code, pas de donnée du dossier.
    reponse =
      e instanceof Error
        ? { ok: false, message: e.message, pile: e.stack }
        : { ok: false, message: String(e) };
    port.postMessage(reponse);
  }
});
