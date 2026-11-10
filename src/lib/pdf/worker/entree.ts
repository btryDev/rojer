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

/** Ce que le processus renvoie : le PDF, ou le message et la pile d'une erreur. */
export type ReponseWorker =
  | { ok: true; pdf: ArrayBuffer }
  | { ok: false; message: string; pile?: string };

/**
 * Marge entre le tas demandé et la limite que V8 annonce : la jeune
 * génération et les espaces de code s'y ajoutent (mesuré : 48 Mo pour 64 ou
 * 384 demandés). Au-delà, un drapeau d'ailleurs a pris le pas sur la borne.
 */
const MARGE_TAS_MO = 64;

if (!process.send) throw new Error("pdf-worker : à lancer par fork (lancer.ts), pas directement.");
const envoyer = (r: ReponseWorker) => process.send!(r);

/** Le tas demandé, passé en premier argument par `lancer.ts`. */
const tasMaxMo = Number(process.argv[2]);

process.once("message", async (demande: DemandePdf) => {
  // LA BORNE EST-ELLE TENUE ? Le lanceur pose `--max-old-space-size` et
  // retire `NODE_OPTIONS` ; si un autre drapeau l'emportait encore, le
  // processus grossirait sans borne. Refusé ici, avant tout rendu.
  const limiteMo = getHeapStatistics().heap_size_limit / 1_048_576;
  if (!Number.isFinite(tasMaxMo) || limiteMo > tasMaxMo + MARGE_TAS_MO) {
    envoyer({
      ok: false,
      message: `pdf-worker : borne de tas non appliquée (${Math.round(limiteMo)} Mo pour ${tasMaxMo} demandés)`,
    });
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
