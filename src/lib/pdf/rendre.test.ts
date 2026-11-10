import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DemandePdf } from "./documents";

const h = vi.hoisted(() => ({
  rendu: vi.fn<(demande: unknown, limites?: unknown) => Promise<Buffer>>(async () => Buffer.from("%PDF")),
  disponible: true,
}));
// Le fil d'exécution est simulé ici ; il est éprouvé pour de vrai dans
// `worker/lancer.test.ts`.
vi.mock("./worker/lancer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./worker/lancer")>()),
  workerDisponible: () => h.disponible,
  rendreDansUnWorker: h.rendu,
}));

const { rendrePdf, controlerPoids, SEUILS_PDF, PdfTropVolumineux, raisonEchecRendu, echecAttendu } =
  await import("./rendre");
const { PdfAbandonne, PdfDelaiDepasse, PdfMemoireDepassee } = await import("./worker/lancer");

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
  h.disponible = true;
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
    const pdf = await rendrePdf(plan(10), { seuils });
    expect(pdf.toString()).toBe("%PDF");
    expect(h.rendu).toHaveBeenCalledTimes(1);
    expect(journal.info).toHaveBeenCalledTimes(1);
    expect(ligneEcrite()).toMatchObject({ document: "plan-actions", total: 10, issue: "ok" });
  });

  it("au-delà d'un seuil : refuse SANS mettre en page", async () => {
    const refus = rendrePdf(plan(41), { seuils });
    await expect(refus).rejects.toBeInstanceOf(PdfTropVolumineux);
    expect(h.rendu).not.toHaveBeenCalled();
    expect(journal.warn).toHaveBeenCalledTimes(1);
    expect(ligneEcrite()).toMatchObject({ issue: "trop_volumineux", plusGrosBloc: 41 });
  });

  it("au-delà du TOTAL, chaque bloc restant sous le sien : refuse aussi", async () => {
    // Un registre de 250 rapports : trois paquets de 100, 100 et 50 lignes.
    const registre = {
      type: "registre",
      props: {
        data: {
          parties: [],
          verifsEnAttente: [],
          rapports: Array.from({ length: 250 }, (_, i) => ({
            id: String(i),
            dateRapport: new Date(Date.UTC(2026, 5, 1, 12)),
            points: [],
          })),
        },
      },
    } as unknown as DemandePdf;
    await expect(rendrePdf(registre, { seuils: { total: 200, bloc: 400 } })).rejects.toBeInstanceOf(
      PdfTropVolumineux,
    );
    expect(h.rendu).not.toHaveBeenCalled();
    expect(ligneEcrite()).toMatchObject({ issue: "trop_volumineux", total: 250, plusGrosBloc: 100 });
  });

  it("une donnée qui ne se pèse pas : échec journalisé, sans mise en page", async () => {
    const malforme = { type: "duerp", props: { snapshot: {}, historique: [] } } as unknown as DemandePdf;
    await expect(rendrePdf(malforme, { seuils })).rejects.toThrow();
    expect(h.rendu).not.toHaveBeenCalled();
    expect(ligneEcrite()).toMatchObject({ issue: "echec", total: null, niveau: "error" });
  });

  it("seuils par type : un DUERP de cent dix risques n'est pas jugé au seuil du registre", async () => {
    const risque = () => ({ mesures: [{ statut: "prevue" }, { statut: "existante" }, { statut: "existante" }] });
    const duerp = {
      type: "duerp",
      props: {
        snapshot: { unites: Array.from({ length: 5 }, () => ({ risques: Array.from({ length: 22 }, risque) })) },
        historique: [],
      },
    } as unknown as DemandePdf;
    // Admis à son propre seuil…
    expect(controlerPoids(duerp).plusGrosBloc).toBeGreaterThan(SEUILS_PDF.registre.bloc);
    // … quand le seuil du registre l'aurait refusé.
    expect(() => controlerPoids(duerp, { seuils: SEUILS_PDF.registre })).toThrow(PdfTropVolumineux);
  });

  it("l'origine du ZIP se lit dans le journal", async () => {
    await rendrePdf(plan(1), { seuils, origine: "zip" });
    expect(ligneEcrite()).toMatchObject({ origine: "zip" });
  });

  it("au seuil exact : met encore en page", async () => {
    await rendrePdf(plan(40), { seuils });
    expect(h.rendu).toHaveBeenCalledTimes(1);
  });

  it("à la moitié d'un seuil : met en page, mais avertit", async () => {
    await rendrePdf(plan(20), { seuils });
    expect(journal.warn).toHaveBeenCalledTimes(1);
    expect(ligneEcrite()).toMatchObject({ niveau: "warn", issue: "ok" });
  });

  it("un échec de mise en page est journalisé en erreur, puis relancé", async () => {
    h.rendu.mockRejectedValueOnce(new Error("clipBorderTop"));
    await expect(rendrePdf(plan(1), { seuils })).rejects.toThrow("clipBorderTop");
    expect(journal.error).toHaveBeenCalledTimes(1);
    expect(ligneEcrite()).toMatchObject({ issue: "echec" });
  });

  it("la ligne de journal ne porte rien du dossier, quelle que soit l'issue", async () => {
    const d = plan(41) as unknown as { props: { data: Record<string, unknown> } };
    Object.assign(d.props.data, {
      entreprise: "Boulangerie Secrète",
      etablissement: "Atelier rue Cachée",
      adresse: "12 impasse Privée",
    });
    await expect(rendrePdf(d as unknown as DemandePdf, { seuils })).rejects.toBeInstanceOf(PdfTropVolumineux);
    await rendrePdf(plan(1), { seuils });
    h.rendu.mockRejectedValueOnce(new Error("Atelier rue Cachée : échec"));
    await expect(rendrePdf(d as unknown as DemandePdf, { seuils: { total: 1_000, bloc: 1_000 } })).rejects.toThrow();
    const lignes = [journal.info, journal.warn, journal.error].flatMap((s) =>
      s.mock.calls.map((c: unknown[]) => String(c[0])),
    );
    expect(lignes).toHaveLength(3);
    for (const l of lignes) {
      expect(Object.keys(JSON.parse(l)).sort()).toEqual(
        ["document", "dureeMs", "evenement", "issue", "niveau", "origine", "plusGrosBloc", "seuilBloc", "seuilTotal", "total"],
      );
      expect(l).not.toMatch(/Secrète|Cachée|Privée/);
    }
  });

  it("dans le fil : les limites lues aux réglages et le signal de la requête sont passés", async () => {
    const signal = new AbortController().signal;
    await rendrePdf(plan(1), { seuils, signal });
    expect(h.rendu).toHaveBeenCalledWith(expect.anything(), {
      tasMaxMo: 384,
      delaiMaxMs: 60_000,
      signal,
    });
  });

  it("tas du fil dépassé : le même refus que le garde-fou, journalisé à part", async () => {
    h.rendu.mockRejectedValueOnce(new PdfMemoireDepassee());
    await expect(rendrePdf(plan(1), { seuils })).rejects.toBeInstanceOf(PdfTropVolumineux);
    expect(ligneEcrite()).toMatchObject({ issue: "memoire_depassee", niveau: "warn" });
  });

  it("délai dépassé et client parti : journalisés comme tels, relancés", async () => {
    h.rendu.mockRejectedValueOnce(new PdfDelaiDepasse(60_000));
    await expect(rendrePdf(plan(1), { seuils })).rejects.toBeInstanceOf(PdfDelaiDepasse);
    expect(ligneEcrite()).toMatchObject({ issue: "delai_depasse", niveau: "warn" });
    journal.warn.mockClear();
    h.rendu.mockRejectedValueOnce(new PdfAbandonne());
    await expect(rendrePdf(plan(1), { seuils })).rejects.toBeInstanceOf(PdfAbandonne);
    expect(ligneEcrite()).toMatchObject({ issue: "abandonne", niveau: "info" });
  });

  it("sans le fichier du fil, la production échoue au lieu de rendre sur place", async () => {
    h.disponible = false;
    vi.stubEnv("NODE_ENV", "production");
    try {
      await expect(rendrePdf(plan(1), { seuils })).rejects.toThrow(/pdf-worker introuvable/);
      expect(h.rendu).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("les échecs attendus ne sont pas des pannes", () => {
    expect(echecAttendu(new PdfDelaiDepasse(1))).toBe(true);
    expect(echecAttendu(new PdfAbandonne())).toBe(true);
    expect(echecAttendu(new Error("x"))).toBe(false);
  });

  it("la raison du ZIP ne nomme que le refus du garde-fou", () => {
    expect(raisonEchecRendu(new PdfTropVolumineux("registre", { total: 1, plusGrosBloc: 1 }))).toMatch(
      /trop volumineux/,
    );
    expect(raisonEchecRendu(new PdfDelaiDepasse(1))).toMatch(/délai dépassé/);
    expect(raisonEchecRendu(new Error("autre"))).toBeUndefined();
  });
});

// Le garde-fou ne protège que ce qui passe par `rendrePdf` : un rendu appelé
// ailleurs le contournerait, sans poids ni journal. On ne cherche pas les
// APPELS (un alias, `pdf(el).toBuffer()`, un import dynamique y échappent),
// on contrôle les IMPORTS : hors de rendre.ts, `@react-pdf/renderer` ne
// fournit que des primitives de mise en page et des types (revue du
// 2026-11-10).
const PRIMITIVES = new Set([
  "Document",
  "Page",
  "Text",
  "View",
  "Link",
  "StyleSheet",
  "DocumentProps",
]);

describe("garde : un seul endroit met un PDF en page", () => {
  const racine = join(process.cwd(), "src");
  const fichiers: string[] = [];
  const parcourir = (dossier: string) => {
    for (const nom of readdirSync(dossier)) {
      const chemin = join(dossier, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(nom) && !/\.test\.[a-z]+$/.test(nom)) fichiers.push(chemin);
    }
  };
  parcourir(racine);
  const relatif = (f: string) => relative(process.cwd(), f);

  it("hors de rendre.ts, @react-pdf/renderer n'apporte que des primitives et des types", () => {
    const fautifs: string[] = [];
    for (const f of fichiers) {
      // Les deux seuls lieux de rendu : le fil (lot pdf-b1) et le repli de
      // développement de rendre.ts.
      if (relatif(f) === "src/lib/pdf/rendre.ts" || relatif(f) === "src/lib/pdf/worker/entree.ts") continue;
      const source = readFileSync(f, "utf8");
      const mentions = source.match(/["']@react-pdf\/[^"']*["']/g) ?? [];
      // Chaque mention doit être un `import { … } from "@react-pdf/renderer"`
      // aux noms autorisés ; tout le reste (autre paquet @react-pdf, import
      // par défaut ou `* as`, import dynamique, require) est fautif.
      const importsNommes = [
        ...source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']@react-pdf\/renderer["']/g),
      ];
      if (importsNommes.length !== mentions.length) {
        fautifs.push(`${relatif(f)} : import non nommé ou autre paquet @react-pdf`);
        continue;
      }
      for (const m of importsNommes) {
        for (const brut of m[1].split(",")) {
          const nom = brut.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0];
          if (nom && !PRIMITIVES.has(nom)) fautifs.push(`${relatif(f)} : ${nom}`);
        }
      }
    }
    expect(fautifs).toEqual([]);
  });

  it("les seuls rendus du dépôt : le fil, et le repli de développement de rendre.ts", () => {
    const rendus = fichiers
      .filter((f) => /\brenderTo(Buffer|Stream|File|String)\s*\(|\bpdf\s*\(/.test(readFileSync(f, "utf8")))
      .map(relatif);
    expect(rendus.sort()).toEqual(["src/lib/pdf/rendre.ts", "src/lib/pdf/worker/entree.ts"]);
  });
});
