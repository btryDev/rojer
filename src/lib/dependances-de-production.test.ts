/**
 * Ce que le code de production importe est une dépendance de production
 * (audit du 2026-10-13, B8).
 *
 * `@modelcontextprotocol/server` était en `devDependencies` alors que la route
 * `/api/mcp` l'importe : une installation de production (`pnpm install --prod`,
 * ce que fait un hébergeur Node qui n'installe pas les dépendances de
 * développement) livrait un serveur dont la route MCP tombait au premier
 * appel. La liste des paquets vient de `package.json`, pas de ce test.
 *
 * Exclu : les fichiers de test, les imports de TYPE (effacés à la
 * compilation), et un module que seuls des tests importent — un outil de
 * test rangé dans `src/`, qui n'entre pas dans le serveur.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const RACINE = path.resolve(__dirname, "..", "..");
const SRC = path.join(RACINE, "src");

const pkg = JSON.parse(readFileSync(path.join(RACINE, "package.json"), "utf8")) as {
  devDependencies?: Record<string, string>;
};
const DEV = Object.keys(pkg.devDependencies ?? {});

const estTest = (f: string) => /\.test\.tsx?$/.test(f);

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((n) => {
    const p = path.join(dossier, n);
    if (statSync(p).isDirectory()) return fichiers(p);
    return /\.(ts|tsx|mts)$/.test(n) ? [p] : [];
  });
}

/** Les paquets importés en VALEUR (pas `import type`) par un fichier. */
function importsDeValeur(source: string): string[] {
  const motifs = [
    /^\s*import\s+(?!type\b)[^;]*?from\s+["']([^"'.][^"']*)["']/gm,
    /^\s*import\s+["']([^"'.][^"']*)["']/gm,
    /\bimport\(\s*["']([^"'.][^"']*)["']\s*\)/g,
    /\brequire\(\s*["']([^"'.][^"']*)["']\s*\)/g,
  ];
  return motifs.flatMap((m) => [...source.matchAll(m)].map((r) => r[1]));
}

const paquet = (specifier: string) =>
  specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];

const tous = fichiers(SRC);
const sources = new Map(tous.map((f) => [f, readFileSync(f, "utf8")]));

/** Un module que seuls des tests importent n'entre pas dans le serveur. */
function importeHorsTests(fichier: string): boolean {
  const nom = path.basename(fichier).replace(/\.(ts|tsx|mts)$/, "");
  const motif = new RegExp(`["'][^"']*/${nom}["']`);
  return tous.some((f) => !estTest(f) && f !== fichier && motif.test(sources.get(f) ?? ""));
}

describe("dépendances de production", () => {
  it("aucun module de production n'importe une devDependency", () => {
    const fautes: string[] = [];
    for (const [f, src] of sources) {
      if (estTest(f)) continue;
      const devImportes = importsDeValeur(src).map(paquet).filter((p) => DEV.includes(p));
      if (devImportes.length === 0) continue;
      if (!importeHorsTests(f) && !/\/(app|pages)\//.test(f)) continue;
      fautes.push(`${path.relative(RACINE, f)} → ${[...new Set(devImportes)].join(", ")}`);
    }
    expect(fautes).toEqual([]);
  });
});
