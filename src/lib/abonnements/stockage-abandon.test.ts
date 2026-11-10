import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Deux garanties du plafond de stockage (ADR-053 § 14) :
// - un fichier effacé l'est AVEC sa ligne du plafond : `abandonnerFichiers`
//   est le seul chemin, `libererFichiers` n'est appelé qu'à l'intérieur ;
// - un dépôt sur un site gelé est refusé AVANT de réserver et de téléverser.

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ put: vi.fn(async () => {}), motifDuGel: vi.fn(), refusStockage: vi.fn(async () => null) }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ put: h.put }) }));
vi.mock("./quotas", () => ({ motifDuGel: h.motifDuGel, refusStockage: h.refusStockage }));
vi.mock("./lancement", () => ({ contexteDroits: () => ({}), offreLancee: () => true }));

import type { Db } from "@/lib/auth/compte";
import { deposerFichier } from "./stockage";

const db = {
  fichierStocke: { upsert: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({})) },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
  $queryRaw: vi.fn(async () => []),
} as unknown as Db;

beforeEach(() => vi.clearAllMocks());

describe("deposerFichier sur un site gelé", () => {
  it("refusé avant toute réservation ni téléversement, avec le motif du gel", async () => {
    h.motifDuGel.mockResolvedValue("Ce site dépasse votre formule…");
    expect(await deposerFichier(db, "c1", "cle", Buffer.from("x"), "application/pdf", { etablissementId: "e1" })).toBe("Ce site dépasse votre formule…");
    expect(h.motifDuGel).toHaveBeenCalledWith(db, "c1", { etablissementId: "e1" });
    expect(h.put).not.toHaveBeenCalled();
    expect(h.refusStockage).not.toHaveBeenCalled();
  });

  it("site non gelé : le dépôt suit son cours", async () => {
    h.motifDuGel.mockResolvedValue(null);
    expect(await deposerFichier(db, "c1", "cle", Buffer.from("x"), "application/pdf", { etablissementId: "e1" })).toBeNull();
    expect(h.put).toHaveBeenCalled();
  });
});

describe("un seul chemin pour effacer un fichier", () => {
  const racine = join(process.cwd(), "src");
  const fichiers = (dossier: string): string[] =>
    readdirSync(dossier).flatMap((n) => {
      const p = join(dossier, n);
      return statSync(p).isDirectory() ? fichiers(p) : /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
    });
  // Le stockage lui-même, la définition de `libererFichiers`, et la seule
  // fonction qui l'appelle.
  const PERMIS = (r: string) =>
    r.startsWith("lib/storage/") ||
    r === "lib/suppression/fichiers.ts" ||
    r === "lib/abonnements/stockage.ts" ||
    // La suppression d'un compte entier (ADR-058) : ses lignes `FichierStocke`
    // partent avec le compte, en cascade, dans la même transaction.
    r === "lib/abonnements/suppression.ts";
  // Effacer sans rendre la ligne du plafond : `libererFichiers`, ou le
  // stockage en direct (`getStorage().delete(`, `storage?.delete(`).
  // Et rendre une ligne sans effacer le fichier (`fichierStocke.delete…`) :
  // compter trop peu. Un alias (`const s = getStorage()`) reste hors d'atteinte.
  const EFFACEMENT =
    /\b(libererFichiers|rendreReservations)\(|getStorage\(\)\s*\.delete\(|\b(storage|stockage)[?!]?\.delete\(|\bfichierStocke\.delete/;

  it("aucun module n'efface un fichier en direct : il passe par `abandonnerFichiers`", () => {
    const fautifs = fichiers(racine)
      .map((p) => p.slice(racine.length + 1))
      .filter((r) => !PERMIS(r) && EFFACEMENT.test(readFileSync(join(racine, r), "utf8")));
    expect(fautifs).toEqual([]);
  });
});
