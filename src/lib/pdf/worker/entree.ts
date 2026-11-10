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

import { parentPort } from "node:worker_threads";
import { renderToBuffer } from "@react-pdf/renderer";
import { elementDuDocument, type DemandePdf } from "../documents";

/** Ce que le fil renvoie : le PDF, ou le message d'une erreur de rendu. */
export type ReponseWorker = { ok: true; pdf: ArrayBuffer } | { ok: false; message: string };

if (!parentPort) throw new Error("pdf-worker : à lancer comme worker_thread, pas directement.");
const port = parentPort;

port.once("message", async (demande: DemandePdf) => {
  let reponse: ReponseWorker;
  try {
    const buf = await renderToBuffer(elementDuDocument(demande));
    // Copie dans un ArrayBuffer propre, transféré sans recopie au parent.
    const pdf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    reponse = { ok: true, pdf };
    port.postMessage(reponse, [pdf]);
  } catch (e) {
    reponse = { ok: false, message: e instanceof Error ? e.message : String(e) };
    port.postMessage(reponse);
  }
});
