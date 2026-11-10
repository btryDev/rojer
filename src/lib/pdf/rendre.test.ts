import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DemandePdf } from "./documents";

const h = vi.hoisted(() => ({
  rendu: vi.fn<(element: unknown) => Promise<Buffer>>(async () => Buffer.from("%PDF")),
}));
vi.mock("@react-pdf/renderer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@react-pdf/renderer")>()),
  renderToBuffer: h.rendu,
}));

const { rendrePdf, PdfTropVolumineux, raisonEchecRendu } = await import("./rendre");

/** Un plan d'actions de `k` lignes : le plus simple des documents à peser. */
const plan = (k: number) =>
  ({
    type: "plan-actions",
    props: {
      data: {
        entreprise: "E",
        etablissement: "E",
        adresse: "A",
        genereLe: new Date("2026-11-10T10:00:00Z"),
        totalOuvertes: 0,
        totalEnCours: 0,
        totalLevees: 0,
        actions: Array.from({ length: k }, () => ({})),
      },
    },
  }) as unknown as DemandePdf;

const seuils = { total: 100, bloc: 40 };
let journal: { info: ReturnType<typeof vi.spyOn>; warn: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };

beforeEach(() => {
  h.rendu.mockClear();
  journal = {
    info: vi.spyOn(console, "info").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
  };
});
afterEach(() => vi.restoreAllMocks());

/** La seule ligne de journal écrite, lue. */
const ligneEcrite = () => {
  const lignes = [journal.info, journal.warn, journal.error].flatMap((s) => s.mock.calls);
  expect(lignes).toHaveLength(1);
  return JSON.parse(String(lignes[0][0]));
};

describe("rendrePdf — garde-fou", () => {
  it("sous les seuils : met en page et journalise « ok » en info", async () => {
    const pdf = await rendrePdf(plan(10), seuils);
    expect(pdf.toString()).toBe("%PDF");
    expect(h.rendu).toHaveBeenCalledTimes(1);
    expect(journal.info).toHaveBeenCalledTimes(1);
    expect(ligneEcrite()).toMatchObject({ document: "plan-actions", total: 10, issue: "ok" });
  });

  it("au-delà d'un seuil : refuse SANS mettre en page", async () => {
    const refus = rendrePdf(plan(41), seuils);
    await expect(refus).rejects.toBeInstanceOf(PdfTropVolumineux);
    expect(h.rendu).not.toHaveBeenCalled();
    expect(journal.warn).toHaveBeenCalledTimes(1);
    expect(ligneEcrite()).toMatchObject({ issue: "trop_volumineux", plusGrosBloc: 41 });
  });

  it("au seuil exact : met encore en page", async () => {
    await rendrePdf(plan(40), seuils);
    expect(h.rendu).toHaveBeenCalledTimes(1);
  });

  it("à la moitié d'un seuil : met en page, mais avertit", async () => {
    await rendrePdf(plan(20), seuils);
    expect(journal.warn).toHaveBeenCalledTimes(1);
    expect(ligneEcrite()).toMatchObject({ niveau: "warn", issue: "ok" });
  });

  it("un échec de mise en page est journalisé en erreur, puis relancé", async () => {
    h.rendu.mockRejectedValueOnce(new Error("clipBorderTop"));
    await expect(rendrePdf(plan(1), seuils)).rejects.toThrow("clipBorderTop");
    expect(journal.error).toHaveBeenCalledTimes(1);
    expect(ligneEcrite()).toMatchObject({ issue: "echec" });
  });

  it("la raison du ZIP ne nomme que le refus du garde-fou", () => {
    expect(raisonEchecRendu(new PdfTropVolumineux("registre", { total: 1, plusGrosBloc: 1 }))).toMatch(
      /trop volumineux/,
    );
    expect(raisonEchecRendu(new Error("autre"))).toBeUndefined();
  });
});

// Le garde-fou ne protège que ce qui passe par `rendrePdf` : un appel direct à
// `renderToBuffer` ailleurs le contournerait, sans poids ni journal.
describe("garde : un seul endroit met un PDF en page", () => {
  it("aucun `renderToBuffer` hors de src/lib/pdf/rendre.ts", () => {
    const racine = join(process.cwd(), "src");
    const fichiers: string[] = [];
    const parcourir = (dossier: string) => {
      for (const nom of readdirSync(dossier)) {
        const chemin = join(dossier, nom);
        if (statSync(chemin).isDirectory()) parcourir(chemin);
        else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) fichiers.push(chemin);
      }
    };
    parcourir(racine);
    const fautifs = fichiers
      .filter((f) => /\brenderTo(Buffer|Stream|File|String)\s*\(/.test(readFileSync(f, "utf8")))
      .map((f) => relative(process.cwd(), f));
    expect(fautifs).toEqual(["src/lib/pdf/rendre.ts"]);
  });
});
