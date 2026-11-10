import { existsSync } from "node:fs";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { DemandePdf } from "../documents";
import type { DonneesWorker, ReponseWorker } from "./entree";

/**
 * Un rendu PDF dans son propre fil d'exécution (lot pdf-b1, 2026-11-10,
 * ADR-059). Le fil est lancé pour UN rendu puis terminé : toute sa mémoire
 * est rendue, et rien ne passe d'un export à l'autre.
 *
 * Ce que le fil apporte : la boucle du serveur reste libre pendant la mise en
 * page (étude de viabilité : pages p99 34 ms au lieu de 3,1 s sur un cœur),
 * et un tas dépassé ne tue que le fil. Ce qu'il n'apporte pas : la mémoire
 * hors tas n'est pas bornée, et le rendu est plus lent (environ + 50 % sur
 * un cœur).
 */

/** Le fil, à la racine du serveur : `dist-pdf/pdf-worker.mjs`. Le serveur
 *  autonome de Next se place dans son dossier au démarrage
 *  (`process.chdir(__dirname)`), `PDF_WORKER=1` en local tourne à la racine
 *  du dépôt : `process.cwd()` vaut pour les deux. */
export function cheminWorker(): string {
  return path.join(process.cwd(), "dist-pdf", "pdf-worker.mjs");
}

export function workerDisponible(chemin = cheminWorker()): boolean {
  return existsSync(chemin);
}

export type LimitesRendu = {
  tasMaxMo: number;
  delaiMaxMs: number;
  /** Le client est parti : le rendu s'arrête, personne ne l'attend plus. */
  signal?: AbortSignal;
};

/** Le fil a dépassé son tas : le document est trop gros pour être rendu ici. */
export class PdfMemoireDepassee extends Error {
  constructor() {
    super("pdf-worker : tas dépassé (ERR_WORKER_OUT_OF_MEMORY)");
    this.name = "PdfMemoireDepassee";
  }
}

export class PdfDelaiDepasse extends Error {
  constructor(readonly delaiMs: number) {
    super(`pdf-worker : rendu arrêté après ${delaiMs} ms`);
    this.name = "PdfDelaiDepasse";
  }
}

export class PdfAbandonne extends Error {
  constructor() {
    super("pdf-worker : rendu abandonné, le client est parti");
    this.name = "PdfAbandonne";
  }
}

export function rendreDansUnWorker(
  demande: DemandePdf,
  limites: LimitesRendu,
  chemin = cheminWorker(),
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    if (limites.signal?.aborted) return reject(new PdfAbandonne());

    const donnees: DonneesWorker = { tasMaxMo: limites.tasMaxMo };
    const fil = new Worker(chemin, {
      workerData: donnees,
      resourceLimits: { maxOldGenerationSizeMb: limites.tasMaxMo },
    });
    let fini = false;
    // Une seule issue par rendu, et le fil toujours terminé — sur succès
    // comme sur erreur, délai ou abandon. L'issue n'est rendue qu'APRÈS la
    // mort du fil (revue de B1, 2026-11-10) : sinon la place d'export se
    // libère pendant que l'ancien fil se défait encore, et le suivant démarre
    // à côté — deux tas en même temps, que `EXPORTS_SIMULTANES=1` devait
    // empêcher.
    const finir = (issue: () => void) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuterie);
      limites.signal?.removeEventListener("abort", surAbandon);
      fil.terminate().then(issue, issue);
    };
    const minuterie = setTimeout(
      () => finir(() => reject(new PdfDelaiDepasse(limites.delaiMaxMs))),
      limites.delaiMaxMs,
    );
    const surAbandon = () => finir(() => reject(new PdfAbandonne()));
    limites.signal?.addEventListener("abort", surAbandon, { once: true });

    fil.once("message", (r: ReponseWorker) =>
      finir(() => (r.ok ? resolve(Buffer.from(r.pdf)) : reject(erreurDuFil(r)))),
    );
    // Une réponse qui ne se désérialise pas : sans cet écouteur, le délai
    // tomberait 60 s plus tard avec un « réessayez » trompeur.
    fil.once("messageerror", () =>
      finir(() => reject(new Error("pdf-worker : réponse illisible"))),
    );
    fil.once("error", (e: Error & { code?: string }) =>
      finir(() => reject(e.code === "ERR_WORKER_OUT_OF_MEMORY" ? new PdfMemoireDepassee() : e)),
    );
    fil.once("exit", (code) =>
      finir(() => reject(new Error(`pdf-worker : sorti (code ${code}) sans réponse`))),
    );

    try {
      // Clonage structuré : une fonction ou un symbole lève ici, avant tout
      // rendu. Une instance de classe, elle, passe copiée en objet simple —
      // ses méthodes perdues (d'où le test de clonage des données des PDF).
      fil.postMessage(demande);
    } catch (e) {
      finir(() => reject(e));
    }
  });
}

/** L'erreur d'un rendu, avec la pile du fil (du code, aucune donnée). */
function erreurDuFil(r: Extract<ReponseWorker, { ok: false }>): Error {
  const e = new Error(r.message);
  if (r.pile) e.stack = r.pile;
  return e;
}
