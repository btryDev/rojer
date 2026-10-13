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
 * LE CODE DE PRODUCTION, PAR RÈGLE ET NON PAR LISTE :
 * - tout `src/`, sauf les tests et un module que seuls des tests importent
 *   (un outil de test rangé dans `src/`, qui n'entre pas dans le serveur) ;
 *   les points d'entrée — `src/app/**`, et les fichiers posés à la racine de
 *   `src/` (`proxy.ts`, `middleware.ts`, `instrumentation.ts` s'ils y vivent)
 *   — comptent même si rien ne les importe ;
 * - les fichiers source de la RACINE du dépôt (`middleware.ts`,
 *   `next.config.ts`…), que Next charge. Un `<outil>.config.*` n'y compte que
 *   si son outil est lui-même une dépendance de production : `next.config.ts`
 *   oui, `vitest.config.ts` ou `eslint.config.mjs` non — c'est l'outil de
 *   développement qui les lit.
 *
 * Un import ou une RÉEXPORTATION (`export … from "pkg"`) en valeur compte ;
 * `import type` / `export type`, effacés à la compilation, non.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const RACINE = path.resolve(__dirname, "..", "..");
const SRC = path.join(RACINE, "src");

const pkg = JSON.parse(readFileSync(path.join(RACINE, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const PROD = Object.keys(pkg.dependencies ?? {});
const DEV = Object.keys(pkg.devDependencies ?? {});

const SOURCE = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
const estSource = (f: string) => SOURCE.test(f) && !f.endsWith(".d.ts");
const estTest = (f: string) => /\.test\.[cm]?[jt]sx?$/.test(f);

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((n) => {
    const p = path.join(dossier, n);
    if (statSync(p).isDirectory()) return fichiers(p);
    return estSource(n) ? [p] : [];
  });
}

/** Les paquets importés ou réexportés en VALEUR par un fichier. */
function importsDeValeur(source: string): string[] {
  const motifs = [
    /^\s*(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s+["']([^"'.][^"']*)["']/gm,
    /^\s*import\s+["']([^"'.][^"']*)["']/gm,
    /\bimport\(\s*["']([^"'.][^"']*)["']\s*\)/g,
    /\brequire\(\s*["']([^"'.][^"']*)["']\s*\)/g,
  ];
  return motifs.flatMap((m) => [...source.matchAll(m)].map((r) => r[1]));
}

const paquet = (specifier: string) =>
  specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];

/** Un fichier source de la racine du dépôt, chargé par la production ? */
function racineDeProduction(nom: string): boolean {
  const outil = /^([^.]+)\.config\./.exec(nom)?.[1];
  return outil === undefined || PROD.includes(outil);
}

const deSrc = fichiers(SRC);
const deRacine = readdirSync(RACINE)
  .filter((n) => estSource(n) && statSync(path.join(RACINE, n)).isFile() && racineDeProduction(n))
  .map((n) => path.join(RACINE, n));
const sources = new Map([...deSrc, ...deRacine].map((f) => [f, readFileSync(f, "utf8")]));

const estPointDEntree = (f: string) =>
  deRacine.includes(f) || path.dirname(f) === SRC || f.startsWith(path.join(SRC, "app") + path.sep);

/** Un module que seuls des tests importent n'entre pas dans le serveur. */
function importeHorsTests(fichier: string): boolean {
  const nom = path.basename(fichier).replace(SOURCE, "");
  const motif = new RegExp(`["'][^"']*/${nom}["']`);
  return [...sources].some(([f, src]) => !estTest(f) && f !== fichier && motif.test(src));
}

function fautes(): string[] {
  const resultat: string[] = [];
  for (const [f, src] of sources) {
    if (estTest(f)) continue;
    const devImportes = importsDeValeur(src).map(paquet).filter((p) => DEV.includes(p));
    if (devImportes.length === 0) continue;
    if (!estPointDEntree(f) && !importeHorsTests(f)) continue;
    resultat.push(`${path.relative(RACINE, f)} → ${[...new Set(devImportes)].join(", ")}`);
  }
  return resultat;
}

describe("dépendances de production", () => {
  it("le relevé couvre la racine chargée par Next, et laisse les configurations d'outils de développement", () => {
    const relatifs = deRacine.map((f) => path.relative(RACINE, f));
    expect(relatifs).toContain("next.config.ts");
    expect(relatifs).not.toContain("vitest.config.ts");
  });

  it("une réexportation compte comme un import, un `export type` non", () => {
    expect(importsDeValeur(`export { JSDOM } from "jsdom";`)).toEqual(["jsdom"]);
    expect(importsDeValeur(`export * from "jsdom";`)).toEqual(["jsdom"]);
    expect(importsDeValeur(`export type { JSDOM } from "jsdom";`)).toEqual([]);
  });

  it("aucun module de production n'importe une devDependency", () => {
    expect(fautes()).toEqual([]);
  });
});
