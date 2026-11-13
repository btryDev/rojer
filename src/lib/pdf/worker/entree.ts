// L'entrée du processus qui met un PDF en page (lot pdf-b1, 2026-11-10,
// `docs/plan-pdf-sous-processus.md`, ADR-059).
//
// Empaquetée à part par `scripts/construire-worker-pdf.mjs` en un seul fichier
// autonome (`dist-pdf/pdf-worker.mjs`), react et @react-pdf compris : le
// serveur la lance par son chemin (`fork`, `lancer.ts`), sans dépendre du
// traçage de Next.
//
// Elle ne fait QUE la mise en page : la demande arrive déjà lue en base,
// contrôlée (accès, abonnement) et pesée par le serveur (`rendre.ts`). Un
// rendu par processus : le serveur le lance, attend un message, puis l'arrête
// — toute sa mémoire est rendue.

import { getHeapStatistics } from "node:v8";
import { renderToBuffer } from "@react-pdf/renderer";
import { elementDuDocument, type DemandePdf } from "../documents";
import { problemeDeBorne } from "./borne";

/** Ce que le processus renvoie : le PDF, ou le message et la pile d'une erreur. */
export type ReponseWorker =
  | { ok: true; pdf: ArrayBuffer }
  | { ok: false; message: string; pile?: string };

if (!process.send) throw new Error("pdf-worker : à lancer par fork (lancer.ts), pas directement.");
const envoyer = (r: ReponseWorker) => process.send!(r);

/** Le tas demandé, passé en premier argument par `lancer.ts`. */
const tasMaxMo = Number(process.argv[2]);

process.once("message", async (demande: DemandePdf) => {
  // LA BORNE EST-ELLE TENUE ? Le lanceur pose `--max-old-space-size` et
  // retire `NODE_OPTIONS` ; si un autre drapeau l'emportait encore, le
  // processus grossirait sans borne. Refusé ici, avant tout rendu.
  // [2026-11-10 : la marge fixe de 64 Mo, calée sur Node 22, refusait tout
  // sous Node 24 (+ 192 Mo de jeune génération) — `borne.ts`.]
  const probleme = problemeDeBorne({
    tasMaxMo,
    execArgv: process.execArgv,
    nodeOptions: process.env.NODE_OPTIONS,
    limiteMo: getHeapStatistics().heap_size_limit / 1_048_576,
  });
  if (probleme) {
    envoyer({ ok: false, message: `pdf-worker : borne de tas non appliquée (${probleme})` });
    return;
  }
  try {
    const buf = await renderToBuffer(elementDuDocument(demande));
    const pdf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    envoyer({ ok: true, pdf });
  } catch (e) {
    // Le message et la pile : du code, pas de donnée du dossier.
    envoyer(
      e instanceof Error
        ? { ok: false, message: e.message, pile: e.stack }
        : { ok: false, message: String(e) },
    );
  }
});
