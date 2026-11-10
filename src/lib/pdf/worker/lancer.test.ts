// Le vrai fil d'exécution des PDF, empaqueté par esbuild avant les tests
// (lot pdf-b1, ADR-059) : même PDF que dans le processus, tas dépassé et
// délai confinés au fil, annulation, et un paquet qui n'atteint aucun module
// serveur.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { build, type BuildOptions } from "esbuild";
import { renderToBuffer } from "@react-pdf/renderer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { optionsWorkerPdf } from "../../../../scripts/construire-worker-pdf.mjs";
import { elementDuDocument, type DemandePdf } from "../documents";
import type { RegistreData } from "../RegistreDocument";
import {
  PdfAbandonne,
  PdfDelaiDepasse,
  PdfMemoireDepassee,
  rendreDansUnWorker,
} from "./lancer";

let dossier: string;
let chemin: string;
let modules: string[];

beforeAll(async () => {
  dossier = mkdtempSync(path.join(tmpdir(), "pdf-worker-"));
  chemin = path.join(dossier, "pdf-worker.mjs");
  const resultat = await build({
    ...(optionsWorkerPdf(chemin) as BuildOptions),
    metafile: true,
    logLevel: "silent",
  });
  modules = Object.keys(resultat.metafile!.inputs);
}, 60_000);

afterAll(() => rmSync(dossier, { recursive: true, force: true }));

/** Un registre de `n` rapports, sur trois années. */
function registre(n: number): DemandePdf {
  const data: RegistreData = {
    entreprise: "Btry",
    etablissement: "Le Comptoir",
    adresse: "1 rue des Lilas",
    genereLe: new Date("2026-11-10T10:00:00Z"),
    calendrier: { etat: "a_jour" },
    regime: { estERP: true, estIGH: false },
    inventaire: null,
    bilan: { dues: 0, outillees: 0, faites: 0, aRemplir: 0, tenuesAilleurs: 0, nonOutillees: 0 },
    parties: [],
    rapports: Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      dateRapport: new Date(Date.UTC(2026, 10, 1) - i * 86_400_000),
      resultat: "conforme",
      realisePar: "Bureau de contrôle",
      libelleObligation: `Vérification périodique des installations électriques ${i}`,
      equipementLibelle: `Tableau ${i % 12}`,
      domaine: "electricite",
      fichierNomOriginal: "r.pdf",
      commentaires: null,
      points: [],
    })),
    verifsEnAttente: [],
  };
  return { type: "registre", props: { data } };
}

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

describe("rendreDansUnWorker", () => {
  it("rend le même PDF que la mise en page dans le processus (preuve 2)", async () => {
    const demande = registre(150);
    const parLeFil = await rendreDansUnWorker(demande, limites, chemin);
    const surPlace = await renderToBuffer(elementDuDocument(demande));
    expect(parLeFil.subarray(0, 4).toString()).toBe("%PDF");
    expect(contenu(parLeFil)).toEqual(contenu(surPlace));
    expect(contenu(parLeFil).pages).toBeGreaterThan(3);
  }, 60_000);

  it("un tas dépassé ne tue que le fil ; le rendu suivant passe", async () => {
    await expect(
      rendreDansUnWorker(registre(3_000), { tasMaxMo: 16, delaiMaxMs: 30_000 }, chemin),
    ).rejects.toBeInstanceOf(PdfMemoireDepassee);
    const pdf = await rendreDansUnWorker(registre(5), limites, chemin);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  }, 60_000);

  it("au-delà du délai, le fil est arrêté", async () => {
    await expect(
      rendreDansUnWorker(registre(500), { tasMaxMo: 256, delaiMaxMs: 50 }, chemin),
    ).rejects.toBeInstanceOf(PdfDelaiDepasse);
  }, 60_000);

  it("un client parti arrête le rendu, avant comme pendant", async () => {
    const deja = new AbortController();
    deja.abort();
    await expect(
      rendreDansUnWorker(registre(5), { ...limites, signal: deja.signal }, chemin),
    ).rejects.toBeInstanceOf(PdfAbandonne);

    const pendant = new AbortController();
    const rendu = rendreDansUnWorker(registre(500), { ...limites, signal: pendant.signal }, chemin);
    setTimeout(() => pendant.abort(), 20);
    await expect(rendu).rejects.toBeInstanceOf(PdfAbandonne);
  }, 60_000);

  it("une erreur de mise en page revient du fil comme une erreur", async () => {
    const casse = { type: "registre", props: { data: { parties: null } } } as unknown as DemandePdf;
    await expect(rendreDansUnWorker(casse, limites, chemin)).rejects.toThrow();
  }, 60_000);

  it("une donnée non clonable est refusée avant tout rendu (preuve 3)", async () => {
    const demande = registre(1);
    (demande.props as unknown as { data: Record<string, unknown> }).data.fonction = () => 1;
    await expect(rendreDansUnWorker(demande, limites, chemin)).rejects.toThrow(/clone/i);
  });
});

describe("le paquet du fil", () => {
  it("n'atteint aucun module serveur : ni Prisma, ni authentification, ni Next", () => {
    const serveur = modules.filter((m) =>
      /@prisma|\.prisma|better-auth|\/next\/|src\/lib\/auth\/|src\/lib\/prisma|server-only/.test(m),
    );
    expect(serveur).toEqual([]);
  });
});
