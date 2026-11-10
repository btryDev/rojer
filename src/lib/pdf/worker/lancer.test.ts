// Le vrai fil d'exécution des PDF, empaqueté par esbuild avant les tests
// (lot pdf-b1, ADR-059) : même PDF que dans le processus, tas dépassé et
// délai confinés au fil, annulation, et un paquet qui n'atteint aucun module
// serveur.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { build, type BuildOptions } from "esbuild";
import { renderToBuffer } from "@react-pdf/renderer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { optionsWorkerPdf } from "../../../../scripts/construire-worker-pdf.mjs";
import { elementDuDocument, type DemandePdf } from "../documents";
import {
  dossier,
  duerp,
  planActions,
  pointsACorriger,
  registre,
  VIDE,
} from "../donnees-essai.test-utils";
import {
  PdfAbandonne,
  PdfDelaiDepasse,
  PdfMemoireDepassee,
  rendreDansUnWorker,
} from "./lancer";

let temporaire: string;
let chemin: string;
let modules: string[];

beforeAll(async () => {
  temporaire = mkdtempSync(path.join(tmpdir(), "pdf-worker-"));
  chemin = path.join(temporaire, "pdf-worker.mjs");
  const resultat = await build({
    ...(optionsWorkerPdf(chemin) as BuildOptions),
    metafile: true,
    logLevel: "silent",
  });
  modules = Object.keys(resultat.metafile!.inputs);
}, 60_000);

afterAll(() => rmSync(temporaire, { recursive: true, force: true }));

/** Une demande de registre de `n` rapports. */
const demandeRegistre = (n: number): DemandePdf => ({ type: "registre", props: { data: registre(n) } });

const limites = { tasMaxMo: 256, delaiMaxMs: 30_000 };
/**
 * Le contenu d'un PDF, comparable d'un rendu à l'autre : ses flux (pages,
 * polices) décompressés et triés, et son nombre de pages. Ni l'ordre des
 * objets (pdfkit les écrit dans l'ordre où ils se terminent), ni la
 * compression, ni la date de création ne disent ce qui est imprimé.
 */
const contenu = (pdf: Buffer) => {
  const texte = pdf.toString("latin1");
  const flux = [...texte.matchAll(/stream\n([\s\S]*?)\nendstream/g)]
    .map((m) => inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"))
    .sort();
  const pages = (texte.match(/\/Type \/Page\b(?!s)/g) ?? []).length;
  return { pages, flux };
};

/** Une demande de chaque type, sur les données d'essai partagées. */
const parType: DemandePdf[] = [
  { type: "registre", props: { data: registre(150) } },
  { type: "dossier-conformite", props: { data: dossier(VIDE) } },
  { type: "plan-actions", props: { data: planActions() } },
  { type: "points-a-corriger", props: { data: pointsACorriger() } },
  { type: "duerp", props: { snapshot: duerp(), historique: [] } },
];

/** La durée d'un rendu court par le fil, démarrage compris. */
async function dureeDUnRenduCourt(): Promise<number> {
  const t0 = performance.now();
  await rendreDansUnWorker(demandeRegistre(5), limites, chemin);
  return performance.now() - t0;
}

describe("rendreDansUnWorker", () => {
  it.each(parType.map((d) => [d.type, d] as const))(
    "%s : même contenu que la mise en page sur place (preuve 2)",
    async (_type, demande) => {
      const parLeFil = await rendreDansUnWorker(demande, limites, chemin);
      const surPlace = await renderToBuffer(elementDuDocument(demande));
      expect(parLeFil.subarray(0, 4).toString()).toBe("%PDF");
      expect(contenu(parLeFil)).toEqual(contenu(surPlace));
    },
    60_000,
  );

  it("les données de chaque type se clonent sans perte (preuve 3)", () => {
    for (const d of parType) expect(structuredClone(d)).toEqual(d);
  });

  it("un tas dépassé PENDANT le rendu ne tue que le fil ; le rendu suivant passe", async () => {
    // 64 Mo suffisent à charger le paquet et à rendre un petit registre…
    const petit = { tasMaxMo: 64, delaiMaxMs: 30_000 };
    expect((await rendreDansUnWorker(demandeRegistre(5), petit, chemin)).subarray(0, 4).toString()).toBe("%PDF");
    // … pas un gros : c'est le rendu qui dépasse, pas le chargement.
    await expect(rendreDansUnWorker(demandeRegistre(3_000), petit, chemin)).rejects.toBeInstanceOf(
      PdfMemoireDepassee,
    );
    expect((await rendreDansUnWorker(demandeRegistre(5), petit, chemin)).subarray(0, 4).toString()).toBe("%PDF");
  }, 60_000);

  it("au-delà du délai, le fil est arrêté EN COURS de rendu", async () => {
    // Un rendu court tient largement dans le délai : ce n'est pas le
    // démarrage du fil qui l'épuise.
    const delaiMaxMs = 1_000;
    expect(await dureeDUnRenduCourt()).toBeLessThan(delaiMaxMs / 2);
    const t0 = performance.now();
    await expect(
      rendreDansUnWorker(demandeRegistre(2_500), { tasMaxMo: 512, delaiMaxMs }, chemin),
    ).rejects.toBeInstanceOf(PdfDelaiDepasse);
    expect(performance.now() - t0).toBeGreaterThanOrEqual(delaiMaxMs);
  }, 60_000);

  it("un client parti arrête le rendu, avant comme pendant", async () => {
    const deja = new AbortController();
    deja.abort();
    await expect(
      rendreDansUnWorker(demandeRegistre(5), { ...limites, signal: deja.signal }, chemin),
    ).rejects.toBeInstanceOf(PdfAbandonne);

    // Pendant : l'abandon tombe après le temps d'un rendu court entier.
    const apresMs = 700;
    expect(await dureeDUnRenduCourt()).toBeLessThan(apresMs / 2);
    const pendant = new AbortController();
    const rendu = rendreDansUnWorker(
      demandeRegistre(2_500),
      { tasMaxMo: 512, delaiMaxMs: 30_000, signal: pendant.signal },
      chemin,
    );
    setTimeout(() => pendant.abort(), apresMs);
    await expect(rendu).rejects.toBeInstanceOf(PdfAbandonne);
  }, 60_000);

  it("une erreur de mise en page revient du fil, avec sa pile", async () => {
    const casse = { type: "registre", props: { data: { parties: null } } } as unknown as DemandePdf;
    const e = await rendreDansUnWorker(casse, limites, chemin).catch((x: Error) => x);
    expect(e).toBeInstanceOf(Error);
    // La pile vient du fil : elle nomme son fichier.
    expect((e as Error).stack).toContain("pdf-worker.mjs");
  }, 60_000);

  it("une fonction dans les données est refusée avant tout rendu", async () => {
    const demande = demandeRegistre(1);
    (demande.props as unknown as { data: Record<string, unknown> }).data.fonction = () => 1;
    await expect(rendreDansUnWorker(demande, limites, chemin)).rejects.toThrow(/clone/i);
  });
});

describe("la borne de tas du fil", () => {
  it("un --max-old-space-size qui l'annule fait refuser le rendu par le fil lui-même", () => {
    // Un processus à part, lancé avec NODE_OPTIONS : le fil y reçoit 2 Go de
    // limite au lieu des 64 demandés, et doit le dire.
    const script = `
      const { Worker } = require("node:worker_threads");
      const w = new Worker(${JSON.stringify(chemin)}, {
        workerData: { tasMaxMo: 64 },
        resourceLimits: { maxOldGenerationSizeMb: 64 },
      });
      w.once("message", (r) => { console.log(JSON.stringify(r)); w.terminate(); });
      w.postMessage({ type: "plan-actions", props: { data: ${JSON.stringify(planActions())} } });
    `;
    const sortie = spawnSync(process.execPath, ["-e", script], {
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=2048" },
      encoding: "utf8",
      timeout: 30_000,
    });
    const reponse = JSON.parse(sortie.stdout.trim().split("\n").pop()!);
    expect(reponse).toMatchObject({ ok: false });
    expect(reponse.message).toMatch(/borne de tas non appliquée/);
  }, 60_000);
});

describe("le paquet du fil", () => {
  it("n'atteint aucun module serveur : ni Prisma, ni authentification, ni Next", () => {
    const serveur = modules.filter((m) =>
      /@prisma|\.prisma|better-auth|\/next\/|src\/lib\/auth\/|src\/lib\/prisma|server-only/.test(m),
    );
    expect(serveur).toEqual([]);
  });
});
