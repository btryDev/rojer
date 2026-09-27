// Les fichiers déposés joints au ZIP de contrôle : chacun sous un nom
// assaini, unique et lisible ; un fichier illisible compté manquant, pas
// d'archive qui tombe.

import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import type { FileStorage } from "@/lib/storage";
import { randomBytes } from "node:crypto";
import {
  joindreFichiers,
  LECTURES_SIMULTANEES,
  zipEnFlux,
  type FichierDepose,
} from "./fichiers-zip";

const f = (id: string, cle: string, nom: string | null, etiquette: string | null): FichierDepose => ({
  id,
  cle,
  nomOriginal: nom,
  date: new Date("2026-09-15T10:00:00Z"),
  etiquette,
});

function stockage(fichiers: Record<string, string>): FileStorage {
  return {
    put: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    get: vi.fn(async (cle: string) => {
      if (!(cle in fichiers)) throw new Error(`absent ${cle}`);
      return Buffer.from(fichiers[cle]);
    }),
  };
}

describe("joindreFichiers", () => {
  it("joint chaque fichier dans son dossier, nom daté, assaini, unique", async () => {
    const zip = new JSZip();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const c = await joindreFichiers(
      zip,
      "Rapports",
      [
        f("rap_aaaaaaaa11", "k1", "rapport élec.pdf", "Tableau électrique TGBT"),
        f("rap_bbbbbbbb22", "k2", "rapport élec.pdf", "Tableau électrique TGBT"),
        f("rap_cccccccc33", "k3", "../../etc/passwd", null),
        f("rap_dddddddd44", "absente", "x.pdf", "Extincteurs"),
      ],
      stockage({ k1: "A", k2: "B", k3: "C" }),
      "rapport.pdf",
    );
    expect(c).toEqual({ deposes: 4, inclus: 3, manquants: 1 });
    const noms = Object.keys(zip.files).filter((n) => !n.endsWith("/")).sort();
    expect(noms).toEqual([
      "Rapports/2026-09-15_Tableau__lectrique_TGBT_rapport__lec.pdf",
      "Rapports/2026-09-15_passwd",
      "Rapports/bbbbbb22_2026-09-15_Tableau__lectrique_TGBT_rapport__lec.pdf",
    ].sort());
    expect(await zip.file("Rapports/2026-09-15_passwd")!.async("string")).toBe("C");
    // Aucune entrée ne sort du dossier.
    expect(noms.every((n) => n.startsWith("Rapports/") && !n.includes(".."))).toBe(true);
  });

  it("sans stockage : tout est compté manquant, rien ne lève", async () => {
    const zip = new JSZip();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const c = await joindreFichiers(zip, "Rapports", [f("a", "k", "r.pdf", null)], null, "rapport.pdf");
    expect(c).toEqual({ deposes: 1, inclus: 0, manquants: 1 });
  });

  it("aucun fichier : aucun dossier créé, aucun appel au stockage", async () => {
    const zip = new JSZip();
    const s = stockage({});
    expect(await joindreFichiers(zip, "Rapports", [], s, "r.pdf")).toEqual({ deposes: 0, inclus: 0, manquants: 0 });
    expect(Object.keys(zip.files)).toEqual([]);
    expect(s.get).not.toHaveBeenCalled();
  });
});

describe("lectures en parallèle borné", () => {
  it(`jamais plus de ${LECTURES_SIMULTANEES} lectures à la fois, toutes faites`, async () => {
    let enCours = 0;
    let max = 0;
    const s: FileStorage = {
      put: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      get: vi.fn(async (cle: string) => {
        enCours++;
        max = Math.max(max, enCours);
        await new Promise((r) => setTimeout(r, 5));
        enCours--;
        return Buffer.from(cle);
      }),
    };
    const fichiers = Array.from({ length: 11 }, (_, i) => f(`id${i}`, `k${i}`, `r${i}.pdf`, null));
    const c = await joindreFichiers(new JSZip(), "Rapports", fichiers, s, "r.pdf");
    expect(c).toEqual({ deposes: 11, inclus: 11, manquants: 0 });
    expect(max).toBe(LECTURES_SIMULTANEES);
  });
});

describe("l'archive en flux", () => {
  it("un ZIP de plus de 4,5 Mo sort entier par une Response réelle, octet pour octet", async () => {
    const zip = new JSZip();
    // Incompressible : trois « rapports » de 2 Mo font une archive de plus de 6 Mo.
    const pieces = [randomBytes(2_000_000), randomBytes(2_000_000), randomBytes(2_000_000)];
    pieces.forEach((p, i) => zip.file(`Rapports/r${i}.pdf`, p));
    const reponse = new Response(zipEnFlux(zip));
    const octets = new Uint8Array(await reponse.arrayBuffer());
    expect(octets.byteLength).toBeGreaterThan(4.5 * 1024 * 1024);
    const relu = await JSZip.loadAsync(octets);
    for (const [i, p] of pieces.entries()) {
      const b = await relu.file(`Rapports/r${i}.pdf`)!.async("uint8array");
      expect(Buffer.from(b).equals(p)).toBe(true);
    }
  });

  it("le flux livre plusieurs morceaux — ce n'est pas un bloc déguisé", async () => {
    const zip = new JSZip();
    zip.file("a.bin", randomBytes(3_000_000));
    const lecteur = zipEnFlux(zip).getReader();
    let morceaux = 0;
    for (;;) {
      const { done } = await lecteur.read();
      if (done) break;
      morceaux++;
    }
    expect(morceaux).toBeGreaterThan(1);
  });
});
