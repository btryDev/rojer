import { fork } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { DemandePdf } from "../documents";
import type { ReponseWorker } from "./entree";

/**
 * Un rendu PDF dans son propre PROCESSUS (lot pdf-b1, 2026-11-10, ADR-059).
 * Le processus est lancé pour UN rendu puis arrêté : toute sa mémoire est
 * rendue, et rien ne passe d'un export à l'autre.
 *
 * ~~Un worker_thread~~ [2026-11-10, soir : un processus enfant. Clever Cloud
 * pose lui-même `--max-old-space-size` ; or ce drapeau est global au
 * processus et annule le `resourceLimits` de tout worker_thread — mesuré :
 * 1 310 Mo de limite pour 64 demandés, par `NODE_OPTIONS` comme en argument.
 * Un enfant lancé avec SES drapeaux et un environnement sans `NODE_OPTIONS`
 * garde sa borne quel que soit le mode d'injection (mesuré : 432 Mo pour 384).
 * Le drapeau en ligne de commande l'emporte déjà sur `NODE_OPTIONS` (éprouvé
 * en cassant, 2026-11-10) : retirer `NODE_OPTIONS` est une seconde ceinture.]
 *
 * Ce que le processus apporte : la boucle du serveur reste libre pendant la
 * mise en page, et un tas dépassé ne tue que lui. Ce qu'il coûte : environ
 * 100 Mo de mémoire réelle de base par export, un démarrage plus lent qu'un
 * worker_thread. Ce qu'il n'apporte pas : la mémoire hors tas n'est pas bornée.
 */

/** Le paquet du rendu, à la racine du serveur : `dist-pdf/pdf-worker.mjs`.
 *  Le serveur autonome de Next se place dans son dossier au démarrage
 *  (`process.chdir(__dirname)`), `PDF_WORKER=1` en local tourne à la racine
 *  du dépôt : `process.cwd()` vaut pour les deux. */
export function cheminWorker(): string {
  // `turbopackIgnore` : sans lui, Turbopack (`next build`) prend le chemin
  // passé à `fork` pour un module à empaqueter, et échoue sans `dist-pdf`
  // (CI du budget de requêtes, 2026-11-10). Le paquet n'est jamais importé :
  // il est copié à côté du serveur (`preparer-standalone.sh`).
  return path.join(/* turbopackIgnore: true */ process.cwd(), "dist-pdf", "pdf-worker.mjs");
}

export function workerDisponible(): boolean {
  return existsSync(cheminWorker());
}

export type LimitesRendu = {
  tasMaxMo: number;
  delaiMaxMs: number;
  /** Le client est parti : le rendu s'arrête, personne ne l'attend plus. */
  signal?: AbortSignal;
};

/** Le processus a dépassé son tas : le document est trop gros pour être rendu ici. */
export class PdfMemoireDepassee extends Error {
  constructor() {
    super("pdf-worker : tas dépassé, processus de rendu arrêté par V8");
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

/**
 * Ce que le processus de rendu reçoit de l'environnement du serveur : une
 * liste FERMÉE (revue de code de B1, 2026-11-10). Il met en page des données
 * saisies par les utilisateurs et n'a besoin d'aucun secret — ni base, ni
 * authentification, ni paiement ; le paquet ne lit d'ailleurs que
 * `NODE_OPTIONS` (pour sa borne), qui n'est PAS transmise : elle porterait le
 * `--max-old-space-size` de la plateforme.
 */
const VARIABLES_DU_RENDU = ["PATH", "NODE_ENV", "TZ", "LANG", "LC_ALL"] as const;

export function environnementDuRendu(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const transmis: Record<string, string> = {};
  for (const nom of VARIABLES_DU_RENDU) {
    const valeur = env[nom];
    if (valeur !== undefined) transmis[nom] = valeur;
  }
  return transmis;
}

/** Les drapeaux du processus de rendu : la borne de tas, et rien d'hérité. */
export function drapeauxDuRendu(tasMaxMo: number): string[] {
  return [`--max-old-space-size=${tasMaxMo}`];
}

/**
 * Au-delà, l'issue revient même sans la fin du processus tué : `SIGKILL` est
 * immédiat, et une place d'export ne doit jamais rester prise (revue de code
 * de B1).
 */
const ATTENTE_FIN_MAX_MS = 5_000;

/**
 * Une sortie de processus qui dit un tas dépassé : V8 avorte (`SIGABRT`,
 * code 134 quand un shell le relaie).
 */
function sortieDeTasDepasse(code: number | null, signal: NodeJS.Signals | null): boolean {
  return signal === "SIGABRT" || code === 134;
}

export function rendreDansUnProcessus(
  demande: DemandePdf,
  limites: LimitesRendu,
  chemin = cheminWorker(),
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    if (limites.signal?.aborted) return reject(new PdfAbandonne());

    const enfant = fork(chemin, [String(limites.tasMaxMo)], {
      // Explicites : sans eux, `fork` reprend `process.execArgv` du serveur.
      execArgv: drapeauxDuRendu(limites.tasMaxMo),
      // Le type de Next exige NODE_ENV ; il est transmis quand il est posé.
      env: environnementDuRendu() as NodeJS.ProcessEnv,
      // Clonage structuré (Date, ArrayBuffer).
      serialization: "advanced",
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    });
    let termine = false;
    let fini = false;
    // Une seule issue par rendu, rendue APRÈS la fin du processus (revue
    // de B1) : sinon la place d'export se libère pendant qu'il se défait
    // encore, et le suivant démarre à côté — deux tas en même temps, que
    // `EXPORTS_SIMULTANES=1` devait empêcher. Un processus qui n'a jamais
    // démarré (`fork` en échec : pas de `pid`, et ni `exit` ni `close` ne
    // viendront) est déjà « fini » ; sinon, l'attente est bornée.
    const finir = (issue: () => void) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuterie);
      limites.signal?.removeEventListener("abort", surAbandon);
      if (termine || enfant.pid === undefined) return issue();
      const secours = setTimeout(issue, ATTENTE_FIN_MAX_MS);
      enfant.once("close", () => {
        clearTimeout(secours);
        issue();
      });
      enfant.kill("SIGKILL");
    };
    const minuterie = setTimeout(
      () => finir(() => reject(new PdfDelaiDepasse(limites.delaiMaxMs))),
      limites.delaiMaxMs,
    );
    const surAbandon = () => finir(() => reject(new PdfAbandonne()));
    limites.signal?.addEventListener("abort", surAbandon, { once: true });

    enfant.once("message", (r: ReponseWorker) =>
      finir(() => (r.ok ? resolve(Buffer.from(r.pdf)) : reject(erreurDuProcessus(r)))),
    );
    enfant.once("error", (e) => finir(() => reject(e)));
    // `close` et non `exit` : `exit` peut précéder la livraison du dernier
    // message (le PDF), `close` attend aussi la fermeture du canal IPC.
    enfant.once("close", (code, signal) => {
      termine = true;
      finir(() =>
        reject(
          sortieDeTasDepasse(code, signal)
            ? new PdfMemoireDepassee()
            : new Error(`pdf-worker : sorti (code ${code}, signal ${signal}) sans réponse`),
        ),
      );
    });

    try {
      // Clonage structuré : une fonction ou un symbole lève ici, avant tout
      // rendu. Une instance de classe, elle, passe copiée en objet simple —
      // ses méthodes perdues (d'où le test de clonage des données des PDF).
      enfant.send(demande, (e) => {
        if (e) finir(() => reject(e));
      });
    } catch (e) {
      finir(() => reject(e));
    }
  });
}

/** L'erreur d'un rendu, avec la pile du processus (du code, aucune donnée). */
function erreurDuProcessus(r: Extract<ReponseWorker, { ok: false }>): Error {
  const e = new Error(r.message);
  if (r.pile) e.stack = r.pile;
  return e;
}
