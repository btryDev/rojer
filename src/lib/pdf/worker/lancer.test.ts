// Le vrai processus de rendu des PDF, empaqueté par esbuild avant les tests
// (lot pdf-b1, ADR-059) : même PDF que dans le serveur, tas dépassé et délai
// confinés au processus, annulation, borne tenue malgré NODE_OPTIONS, et un
// paquet qui n'atteint aucun module serveur.

import { fork, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { build, type BuildOptions } from "esbuild";
import { renderToBuffer } from "@react-pdf/renderer";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
  drapeauxDuRendu,
  environnementDuRendu,
  PdfAbandonne,
  PdfDelaiDepasse,
  PdfMemoireDepassee,
  rendreDansUnProcessus,
} from "./lancer";

// `fork` observé, sans rien changer : le dernier processus lancé, pour lire
// s'il est mort au moment où l'issue revient.
const vus = vi.hoisted(() => ({ dernier: undefined as ChildProcess | undefined }));
vi.mock("node:child_process", async (importOriginal) => {
  const reel = await importOriginal<typeof import("node:child_process")>();
  return {
    ...reel,
    fork: (...args: Parameters<typeof reel.fork>) => (vus.dernier = reel.fork(...args)),
  };
});

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

/** La durée d'un rendu court par le processus, démarrage compris. */
async function dureeDUnRenduCourt(): Promise<number> {
  const t0 = performance.now();
  await rendreDansUnProcessus(demandeRegistre(5), limites, chemin);
  return performance.now() - t0;
}

describe("rendreDansUnProcessus", () => {
  it.each(parType.map((d) => [d.type, d] as const))(
    "%s : même contenu que la mise en page sur place (preuve 2)",
    async (_type, demande) => {
      const parLeFil = await rendreDansUnProcessus(demande, limites, chemin);
      const surPlace = await renderToBuffer(elementDuDocument(demande));
      expect(parLeFil.subarray(0, 4).toString()).toBe("%PDF");
      expect(contenu(parLeFil)).toEqual(contenu(surPlace));
    },
    60_000,
  );

  it("les données de chaque type se clonent sans perte (preuve 3)", () => {
    for (const d of parType) expect(structuredClone(d)).toEqual(d);
  });

  it("un tas dépassé PENDANT le rendu ne tue que le processus ; le rendu suivant passe", async () => {
    // 64 Mo suffisent à charger le paquet et à rendre un petit registre…
    const petit = { tasMaxMo: 64, delaiMaxMs: 30_000 };
    expect((await rendreDansUnProcessus(demandeRegistre(5), petit, chemin)).subarray(0, 4).toString()).toBe("%PDF");
    // … pas un gros : c'est le rendu qui dépasse, pas le chargement.
    await expect(rendreDansUnProcessus(demandeRegistre(3_000), petit, chemin)).rejects.toBeInstanceOf(
      PdfMemoireDepassee,
    );
    expect((await rendreDansUnProcessus(demandeRegistre(5), petit, chemin)).subarray(0, 4).toString()).toBe("%PDF");
  }, 60_000);

  it("au-delà du délai, le processus est arrêté EN COURS de rendu", async () => {
    // Un rendu court tient largement dans le délai : ce n'est pas le
    // démarrage du processus qui l'épuise.
    const delaiMaxMs = 1_000;
    expect(await dureeDUnRenduCourt()).toBeLessThan(delaiMaxMs / 2);
    const t0 = performance.now();
    await expect(
      rendreDansUnProcessus(demandeRegistre(2_500), { tasMaxMo: 512, delaiMaxMs }, chemin),
    ).rejects.toBeInstanceOf(PdfDelaiDepasse);
    expect(performance.now() - t0).toBeGreaterThanOrEqual(delaiMaxMs);
  }, 60_000);

  it("un client parti arrête le rendu, avant comme pendant", async () => {
    const deja = new AbortController();
    deja.abort();
    await expect(
      rendreDansUnProcessus(demandeRegistre(5), { ...limites, signal: deja.signal }, chemin),
    ).rejects.toBeInstanceOf(PdfAbandonne);

    // Pendant : l'abandon tombe après le temps d'un rendu court entier.
    const apresMs = 700;
    expect(await dureeDUnRenduCourt()).toBeLessThan(apresMs / 2);
    const pendant = new AbortController();
    const rendu = rendreDansUnProcessus(
      demandeRegistre(2_500),
      { tasMaxMo: 512, delaiMaxMs: 30_000, signal: pendant.signal },
      chemin,
    );
    setTimeout(() => pendant.abort(), apresMs);
    await expect(rendu).rejects.toBeInstanceOf(PdfAbandonne);
  }, 60_000);

  it("délai ou abandon : l'issue ne revient qu'une fois le processus mort", async () => {
    // Sinon la place d'export se libère pendant qu'il se défait, et le
    // suivant démarre à côté : deux tas en même temps.
    const lourd = demandeRegistre(2_500);
    await expect(rendreDansUnProcessus(lourd, { tasMaxMo: 512, delaiMaxMs: 300 }, chemin)).rejects.toBeInstanceOf(
      PdfDelaiDepasse,
    );
    // `signalCode` n'est posé qu'à la réception de l'`exit`.
    expect(vus.dernier?.signalCode).toBe("SIGKILL");
    const a = new AbortController();
    setTimeout(() => a.abort(), 300);
    await expect(
      rendreDansUnProcessus(lourd, { tasMaxMo: 512, delaiMaxMs: 30_000, signal: a.signal }, chemin),
    ).rejects.toBeInstanceOf(PdfAbandonne);
    expect(vus.dernier?.signalCode).toBe("SIGKILL");
  }, 60_000);

  it("une erreur de mise en page revient du processus, avec sa pile", async () => {
    const casse = { type: "registre", props: { data: { parties: null } } } as unknown as DemandePdf;
    const e = await rendreDansUnProcessus(casse, limites, chemin).catch((x: Error) => x);
    expect(e).toBeInstanceOf(Error);
    // La pile vient du processus de rendu : elle nomme son fichier.
    expect((e as Error).stack).toContain("pdf-worker.mjs");
  }, 60_000);

  it("une fonction dans les données est refusée avant tout rendu", async () => {
    const demande = demandeRegistre(1);
    (demande.props as unknown as { data: Record<string, unknown> }).data.fonction = () => 1;
    await expect(rendreDansUnProcessus(demande, limites, chemin)).rejects.toThrow(/clone/i);
  });
});

describe("la borne de tas du processus de rendu", () => {
  it("tient malgré un --max-old-space-size dans le NODE_OPTIONS du serveur", async () => {
    // Ce que Clever Cloud pose (ADR-059) : avec un worker_thread, la borne de
    // 64 Mo devenait 2 Go. Le processus de rendu, lui, ne reçoit pas
    // NODE_OPTIONS et pose son propre drapeau.
    vi.stubEnv("NODE_OPTIONS", "--max-old-space-size=2048");
    try {
      const petit = { tasMaxMo: 64, delaiMaxMs: 30_000 };
      expect((await rendreDansUnProcessus(demandeRegistre(5), petit, chemin)).subarray(0, 4).toString()).toBe(
        "%PDF",
      );
      await expect(rendreDansUnProcessus(demandeRegistre(3_000), petit, chemin)).rejects.toBeInstanceOf(
        PdfMemoireDepassee,
      );
    } finally {
      vi.unstubAllEnvs();
    }
  }, 60_000);

  it("le processus refuse de rendre si un drapeau d'ailleurs l'emporte sur la borne", async () => {
    // Lancé à la main avec 2 Go pour 64 demandés : il doit le dire.
    const enfant = fork(chemin, ["64"], {
      execArgv: ["--max-old-space-size=2048"],
      serialization: "advanced",
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    });
    const reponse = await new Promise<{ ok: boolean; message?: string }>((ok) => {
      enfant.once("message", (r) => ok(r as { ok: boolean; message?: string }));
      enfant.send({ type: "plan-actions", props: { data: planActions() } });
    });
    enfant.kill("SIGKILL");
    expect(reponse.ok).toBe(false);
    expect(reponse.message).toMatch(/borne de tas non appliquée/);
  }, 60_000);

  it("l'environnement du rendu perd NODE_OPTIONS, et rien d'autre", () => {
    const env = environnementDuRendu({ NODE_OPTIONS: "--max-old-space-size=1262", DATABASE_URL: "x", PATH: "/bin" } as unknown as NodeJS.ProcessEnv);
    expect(env).toEqual({ DATABASE_URL: "x", PATH: "/bin" });
    expect(drapeauxDuRendu(384)).toEqual(["--max-old-space-size=384"]);
  });
});

describe("le paquet du rendu", () => {
  it("n'atteint aucun module serveur : ni Prisma, ni authentification, ni Next", () => {
    const serveur = modules.filter((m) =>
      /@prisma|\.prisma|better-auth|\/next\/|src\/lib\/auth\/|src\/lib\/prisma|server-only/.test(m),
    );
    expect(serveur).toEqual([]);
  });
});
