// Qui peut toucher au client Prisma brut et aux rouages du client borné
// (ADR-051 § 3). Garde qui relit le code, comme les gardes `tenancy-*`.
//
// - `@/lib/prisma` (le client brut, qui voit tous les comptes) ne s'importe
//   que depuis les modules NOMMÉS ci-dessous, chacun avec son motif, et depuis
//   ceux qui restent À MIGRER vers `requireCompte()`. Cette seconde liste est
//   un cliquet : un fichier nouveau ne peut pas y entrer sans qu'une revue le
//   voie, et un fichier migré doit en sortir (le test le rappelle). Elle se
//   vide au fil du lot 2b, module par module.
// - `clientBorne` (qui fabrique un client pour N'IMPORTE QUELLE portée) et
//   `borne.ts` ne s'importent que depuis les modules qui établissent la
//   portée eux-mêmes.
//
// Le client brut a trois portes : `@/lib/prisma`, et le client du serveur MCP
// (`mcp/prisma.ts`, rendu par `dbMcp()` de `mcp/db.ts`). Les trois sont
// gardées ; `new PrismaClient` ne s'écrit que dans les deux modules qui
// fabriquent un client. Sont lus : `import … from`, `import()` à chaîne ou
// gabarit littéral, `require()`, dans les .ts/.tsx/.js/.mjs/.cjs de `src/`.
// Ce qui échappe : un import dont le chemin est calculé, et `globalThis.prisma`
// (hors production seulement).
//
// Les tests sont exclus : ils montent leurs propres doublures.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SRC = join(DEPOT, "src");

/** Les modules qui rendent un client brut. */
const PORTES_BRUTES = ["src/lib/prisma", "src/lib/mcp/prisma", "src/lib/mcp/db"];

/** Modules qui peuvent importer un client brut, et pourquoi. */
const NOMMES_PRISMA: Record<string, string> = {
  "src/lib/auth/portee/client.ts": "fabrique le client borné à partir du client brut",
};

/** Les seuls modules qui fabriquent un client Prisma. */
const FABRIQUES = new Set(["src/lib/prisma.ts", "src/lib/mcp/prisma.ts"]);

/** Cliquet : importeurs du client brut encore à migrer vers requireCompte(). */
const A_MIGRER = new Set([
  "src/lib/access-tokens/revocation.ts",
  "src/lib/access-tokens/verify.ts",
  "src/lib/accessibilite/actions.ts",
  "src/lib/accessibilite/queries.ts",
  "src/lib/calendrier/actions.ts",
  "src/lib/calendrier/reconciliation.ts",
  "src/lib/carnet-sanitaire/suivi-calendrier.ts",
  "src/lib/dashboard/transmissions.ts",
  "src/lib/duerps/queries.ts",
  "src/lib/etablissements/dossier-du-rendu.ts",
  "src/lib/etablissements/epi-constate.ts",
  "src/lib/etablissements/modules.ts",
  "src/lib/etablissements/queries.ts",
  "src/lib/mcp/acces-oauth-deps.ts", // par dbMcp()
  "src/lib/mcp/db.ts",
  "src/lib/mcp/queries.ts", // par dbMcp()
  "src/lib/prescriptions/lecture-preuves.ts",
  "src/lib/prescriptions/libelles-retires.ts",
  "src/lib/rapports/joindre-realisations.ts",
  "src/lib/rapports/queries.ts",
  "src/lib/securite/limite-debit.ts",
  "src/lib/signatures/actions.ts",
  "src/lib/signatures/appartenance.ts",
  "src/lib/signatures/contenu-a-signer.ts",
  "src/lib/signatures/etat-signable.ts",
  "src/lib/signatures/hash-objet.ts",
  "src/lib/signatures/libelle-document.ts",
  "src/lib/signatures/queries.ts",
  "src/lib/signatures/statut-objet.ts",
  "src/lib/signatures/trace.ts",
  "src/lib/signatures/verification-publique.ts",
  "src/lib/signatures/verrou-contenu.ts",
]);

/** Modules qui peuvent importer les rouages du client borné. */
const NOMMES_ROUAGES: Record<string, Record<string, string>> = {
  "src/lib/auth/portee/client": {
    "src/lib/auth/compte.ts": "requireCompte : la portée vient de la session",
    "src/lib/auth/portee/lot-verifie.ts": "types du client et de la transaction",
  },
  "src/lib/auth/portee/borne": {
    "src/lib/auth/portee/client.ts": "l'extension",
    "src/lib/auth/portee/lot-verifie.ts": "erreurs et classement des modèles",
  },
};

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(?:tsx?|m?js|cjs)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

const IMPORT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'`]([^"'`$]+)["'`]/g;

/** Les modules importés par un fichier, en chemins du dépôt sans extension. */
function importsDe(chemin: string): string[] {
  const texte = readFileSync(chemin, "utf8");
  return [...texte.matchAll(IMPORT)].map(([, spec]) => {
    if (spec.startsWith("@/")) return "src/" + spec.slice(2);
    if (spec.startsWith(".")) return relative(DEPOT, resolve(dirname(chemin), spec));
    return spec;
  }).map((s) => s.replace(/\.(ts|tsx|m?js|cjs)$/, "").replace(/\/index$/, ""));
}

const GRAPHE = new Map(fichiers(SRC).map((f) => [relative(DEPOT, f), importsDe(f)]));
const importeurs = (cible: string) =>
  [...GRAPHE].filter(([, imports]) => imports.includes(cible)).map(([f]) => f).sort();

describe("client Prisma brut", () => {
  const brut = [...new Set(PORTES_BRUTES.flatMap(importeurs))].sort();

  it("le relevé voit les importeurs (borne basse)", () => {
    expect(brut.length).toBeGreaterThan(0);
  });

  it("aucun module nouveau n'importe le client brut", () => {
    expect(brut.filter((f) => !(f in NOMMES_PRISMA) && !A_MIGRER.has(f))).toEqual([]);
  });

  it("un module migré sort de la liste À MIGRER", () => {
    expect([...A_MIGRER].filter((f) => !brut.includes(f))).toEqual([]);
  });
});

/**
 * Vrai si le fichier peut obtenir la VALEUR `PrismaClient` : un import non
 * typé qui la nomme (alias compris), un import d'espace de noms, un
 * `require`/`import()` du paquet. Les imports de types et de `Prisma` seuls
 * restent libres.
 */
function peutFabriquer(texte: string): boolean {
  const nommes = [...texte.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']@prisma\/client["']/g)];
  if (nommes.some(([, type, liste]) => !type && /(^|[,{\s])PrismaClient\b/.test(liste.replace(/\btype\s+\w+/g, ""))))
    return true;
  if (/import\s+\*\s+as\s+\w+\s+from\s*["']@prisma\/client["']/.test(texte)) return true;
  if (/import\s+\w+\s*(,|from)\s*[^;]*["']@prisma\/client["']/.test(texte)) return true;
  return /(?:require|import)\s*\(\s*["'`]@prisma\/client["'`]\s*\)/.test(texte);
}

describe("fabrication d'un client Prisma", () => {
  it("la valeur PrismaClient ne s'obtient que dans les modules qui fabriquent un client", () => {
    const fabriquent = fichiers(SRC)
      .filter((f) => peutFabriquer(readFileSync(f, "utf8")))
      .map((f) => relative(DEPOT, f));
    expect(fabriquent.filter((f) => !FABRIQUES.has(f))).toEqual([]);
  });

  it.each([
    ['import { PrismaClient } from "@prisma/client";', true],
    ['import { PrismaClient as P } from "@prisma/client";', true],
    ['import { Prisma, PrismaClient } from "@prisma/client";', true],
    ['import * as client from "@prisma/client";', true],
    ['const m = require("@prisma/client");', true],
    ['const m = await import("@prisma/client");', true],
    ['import type { PrismaClient } from "@prisma/client";', false],
    ['import { type PrismaClient, Prisma } from "@prisma/client";', false],
    ['import { Prisma } from "@prisma/client";', false],
  ])("%s → %s", (texte, attendu) => {
    expect(peutFabriquer(texte)).toBe(attendu);
  });
});

describe.each(Object.entries(NOMMES_ROUAGES))("rouages : %s", (cible, nommes) => {
  it("ne s'importe que depuis les modules nommés", () => {
    expect(importeurs(cible).filter((f) => !(f in nommes))).toEqual([]);
  });
});
