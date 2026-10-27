import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `regenererSansControleDeSession` écrit sans vérifier à qui appartient le
// dossier : elle ne doit être appelée que par le script de maintenance et par
// `regenererSansInvalider`, qui contrôle l'appartenance avant (2026-10-27).
const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n);
    if (statSync(p).isDirectory()) return n === "node_modules" ? [] : fichiers(p);
    return /\.(ts|tsx|mts)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe("regenererSansControleDeSession — hors session seulement", () => {
  it("n'est nommée que par actions.ts et le script de maintenance", () => {
    const appelants = [...fichiers(join(RACINE, "src")), ...fichiers(join(RACINE, "scripts"))]
      .filter((f) => readFileSync(f, "utf8").includes("regenererSansControleDeSession"))
      .map((f) => relative(RACINE, f).split("\\").join("/"))
      .sort();
    expect(appelants).toEqual(["scripts/regenerer-calendriers.ts", "src/lib/calendrier/actions.ts"]);
  });
});
