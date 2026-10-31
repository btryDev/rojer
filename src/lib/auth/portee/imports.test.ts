// Qui peut toucher au client Prisma brut, qui voit tous les comptes (ADR-051 § 3).
// Ses portes (`@/lib/prisma`, `mcp/prisma`) ne s'importent que depuis les
// modules NOMMÉS, chacun avec son motif et ses seuls usages, ou ceux de la
// liste À MIGRER vers `requireCompte()` : un cliquet qui ne fait que
// raccourcir (vide depuis le lot 2b, voir `PORTES_BRUTES`). Les rouages du
// client borné ne s'importent que là où la portée s'établit, et la valeur
// `PrismaClient` que dans les deux modules qui fabriquent un client.
// Échappent : un chemin calculé, `globalThis.prisma`. Tests exclus (doublures).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sansCommentairesNiChaines } from "@/lib/auth/tenancy-sonde";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
// ~~`mcp/db`~~ n'est plus une porte depuis le 2026-10-31 : il ne rend que le
// client borné (lot 2b, MCP) ; la liste À MIGRER est vide depuis le même jour.
const PORTES_BRUTES = ["src/lib/prisma", "src/lib/mcp/prisma"];
const FABRIQUES = new Set(["src/lib/prisma.ts", "src/lib/mcp/prisma.ts"]);
/**
 * Les modules nommés, leur motif et les seuls usages du client brut qu'il
 * couvre : chaque `prisma.…` de leur code (commentaires et chaînes retirés)
 * doit en être un. Sans quoi le motif couvrirait le fichier entier, et une
 * lecture de modèle ajoutée demain passerait sans borne (revue du
 * 2026-10-31). La fabrique du client borné, seule, a droit au client entier.
 */
const NOMMES_PRISMA: Record<string, { motif: string; usages: string[] | "tous" }> = {
  "src/lib/auth/portee/client.ts": { motif: "fabrique le client borné à partir du client brut", usages: "tous" },
  "src/lib/calendrier/actions.ts": {
    motif: "écritures bornées par etablissementId, clés vérifiées contre une lecture bornée (clesDuPlanDansLaLecture)",
    usages: [
      "prisma.$transaction",
      "prisma.etablissement.update",
      "prisma.verification.createMany",
      "prisma.verification.deleteMany",
      "prisma.verification.updateMany",
    ],
  },
  "src/lib/securite/limite-debit.ts": {
    motif: "compteurs techniques, hors de tout compte",
    usages: ["prisma.$executeRaw", "prisma.$queryRaw"],
  },
  "src/lib/auth/compte-hors-session.ts": {
    motif: "accès sans session : le compte propriétaire de l'établissement d'une preuve vérifiée (jeton, signature publique, clé MCP)",
    usages: ["prisma.etablissement.findUnique"],
  },
  "src/lib/signatures/verification-publique.ts": {
    motif: "vérification publique d'une signature et confirmation /signe, sans session",
    usages: ["prisma.signature.findUnique"],
  },
  "src/lib/access-tokens/verify.ts": {
    motif: "recherche d'un jeton par son empreinte, quotas d'OTP",
    usages: [
      "prisma.accessToken.findMany",
      "prisma.accessToken.findUnique",
      "prisma.accessToken.updateMany",
      "prisma.quotaEnvoiOtp.createMany",
      "prisma.quotaEnvoiOtp.findUnique",
      "prisma.quotaEnvoiOtp.updateMany",
    ],
  },
  "src/lib/accessibilite/actions.ts": {
    motif: "slugs publics, uniques sur toute la table : seuls les slugs sont lus",
    usages: ["prisma.registreAccessibilite.findMany"],
  },
  "src/lib/accessibilite/queries.ts": {
    motif: "registre public par son slug, sans session",
    usages: ["prisma.registreAccessibilite.findUnique"],
  },
};
/** Cliquet : importeurs du client brut encore à migrer vers requireCompte(). */
const A_MIGRER = new Set<string>([]);
/** Un module nommé : son motif, ou `{ motif, typesSeuls: true }` s'il n'a droit qu'aux types. */
type Nomme = string | { motif: string; typesSeuls: true };
const NOMMES_ROUAGES: Record<string, Record<string, Nomme>> = {
  "src/lib/auth/portee/client": {
    "src/lib/auth/compte.ts": "requireCompte : la portée vient de la session",
    "src/lib/auth/portee/lot-verifie.ts": { motif: "types du client et de la transaction", typesSeuls: true },
    "src/test/garde-simulee.ts": "tests seuls : le client simulé que rendent les gardes simulées",
    "src/lib/auth/compte-hors-session.ts": "accès sans session : la portée vient de la preuve vérifiée",
  },
  // Un client borné à un compte tiré d'une chaîne (propriétaire d'un
  // établissement, identité OAuth) : seulement là où cette chaîne vient d'une
  // preuve vérifiée (jeton, signature, clé ou jeton MCP) — seconde lecture de
  // #146.
  "src/lib/auth/compte-hors-session": {
    "src/lib/mcp/db.ts": "MCP : établissement de la clé, identité du jeton OAuth vérifié",
    "src/lib/mcp/acces-oauth-deps.ts": "MCP OAuth : établissements du porteur vérifié",
    "src/lib/signatures/actions.ts": "pose de signature par jeton vérifié",
    "src/lib/signatures/verification-publique.ts": "établissement d'une signature lue par son identifiant",
    "src/app/acces/[token]/page.tsx": "page d'un jeton vérifié",
  },
  "src/lib/auth/portee/borne": {
    "src/lib/auth/portee/client.ts": "l'extension",
    "src/lib/auth/portee/lot-verifie.ts": "erreurs et classement des modèles",
  },
};

const fichiers = (dir: string): string[] =>
  readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(?:[mc]?[jt]s|[jt]sx)$/.test(nom) && !/\.test\.\w+$/.test(nom) ? [relative(DEPOT, chemin)] : [];
  });
const TEXTES = new Map(fichiers(join(DEPOT, "src")).map((f) => [f, readFileSync(join(DEPOT, f), "utf8")]));

const IMPORT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'`]([^"'`$]+)["'`]/g;
const cible = (f: string, spec: string) =>
  (spec.startsWith("@/") ? posix.normalize("src/" + spec.slice(2))
    : spec.startsWith(".") ? posix.join(posix.dirname(f), spec) : spec
  ).replace(/\.(?:[mc]?[jt]s|[jt]sx)$/, "").replace(/\/index$/, "");
const GRAPHE = [...TEXTES].map(([f, t]) => [f, [...t.matchAll(IMPORT)].map(([, s]) => cible(f, s))] as const);
const importeurs = (c: string) => GRAPHE.filter(([, i]) => i.includes(c)).map(([f]) => f).sort();

describe("client Prisma brut", () => {
  const brut = [...new Set(PORTES_BRUTES.flatMap(importeurs))].sort();
  it("seuls les modules nommés ou à migrer l'importent", () => {
    expect(brut.length).toBeGreaterThan(0);
    expect(brut.filter((f) => !(f in NOMMES_PRISMA) && !A_MIGRER.has(f))).toEqual([]);
  });
  it.each(Object.entries(NOMMES_PRISMA))("%s n'emploie le client brut que pour son motif", (f, { usages }) => {
    if (usages === "tous") return;
    const code = sansCommentairesNiChaines(TEXTES.get(f)!);
    const employes = [...code.matchAll(/\bprisma\s*\.\s*([$\w]+)(?:\s*\.\s*(\w+))?/g)].map(
      ([, a, b]) => (a.startsWith("$") || !b ? `prisma.${a}` : `prisma.${a}.${b}`),
    );
    expect(employes.length).toBeGreaterThan(0);
    expect(employes.filter((u) => !usages.includes(u))).toEqual([]);
  });
  it("un module migré sort de la liste À MIGRER", () => {
    expect([...A_MIGRER].filter((f) => !brut.includes(f))).toEqual([]);
  });
});

it.each(Object.entries(NOMMES_ROUAGES))("les rouages %s ne s'importent que des modules nommés", (c, nommes) => {
  expect(importeurs(c).filter((f) => !(f in nommes))).toEqual([]);
});

/**
 * Un module nommé `typesSeuls` n'importe des rouages que des TYPES : la
 * garde ci-dessus est par module, pas par symbole — sans celle-ci, un module
 * nommé pour un type pourrait appeler `clientBorne({ userId: … })` librement
 * (seconde lecture de #145).
 */
const IMPORT_STATIQUE = /(?:import|export)\s+(type\s+)?([^;"'`]*?)\s*from\s*["'`]([^"'`]+)["'`]/g;
const IMPORT_DYNAMIQUE = /(?:import|require)\s*\(\s*["'`]([^"'`]+)["'`]/g;
function importsDeValeur(f: string, c: string): string[] {
  const texte = TEXTES.get(f)!;
  const statiques = [...texte.matchAll(IMPORT_STATIQUE)].filter(([, , , spec]) => cible(f, spec) === c);
  const deValeur = statiques
    .filter(([, type, clause]) => {
      if (type) return false;
      const accolades = clause.match(/^\{([^}]*)\}$/);
      if (!accolades) return true; // défaut, espace de noms : une valeur
      return accolades[1].split(",").map((x) => x.trim()).filter(Boolean).some((x) => !x.startsWith("type "));
    })
    .map(([texteImport]) => texteImport);
  const dynamiques = [...texte.matchAll(IMPORT_DYNAMIQUE)].filter(([, spec]) => cible(f, spec) === c).map(([t]) => t);
  return [...deValeur, ...dynamiques];
}
const TYPES_SEULS = Object.entries(NOMMES_ROUAGES).flatMap(([c, nommes]) =>
  Object.entries(nommes)
    .filter(([, nomme]) => typeof nomme !== "string" && nomme.typesSeuls)
    .map(([f]) => [f, c] as const),
);
it("sessionStdio ne sert que le serveur stdio (scripts/mcp-server.ts) : aucun module de src ne l'emploie", () => {
  // Appelé dans le processus web, il y réintroduirait un second pool vers la
  // base (audit Next.js M5) ; scripts/ n'est pas relu par ces gardes.
  const emploient = [...TEXTES]
    .filter(([f, t]) => f !== "src/lib/auth/compte-hors-session.ts" && /\bsessionStdio\b/.test(sansCommentairesNiChaines(t)))
    .map(([f]) => f);
  expect(emploient).toEqual([]);
});
it("les modules nommés `typesSeuls` existent", () => {
  expect(TYPES_SEULS.length).toBeGreaterThan(0);
});
it.each(TYPES_SEULS)("%s n'importe de %s que des types", (f, c) => {
  expect(importsDeValeur(f, c)).toEqual([]);
});

/** Vrai si le texte obtient la VALEUR `PrismaClient` (nommée, défaut, espace de noms, require, import()). */
const PAQUET = String.raw`["'\`](?:@prisma|\.prisma)\/client(?:\/[^"'\`]*)?["'\`]`;
function peutFabriquer(texte: string): boolean {
  // `import` comme `export … from` (ré-export, `export *`) ; `default` nommé
  // entre accolades compte comme l'import par défaut.
  const statiques = texte.matchAll(
    new RegExp(String.raw`(?:import|export)\s+(type\s+)?([^;"'\`]*?)\s*from\s*` + PAQUET, "g"),
  );
  return [...statiques].some(([, type, clause]) =>
    !type &&
    /^(?:\w|\*)|\bPrismaClient\b|\bdefault\b/.test(clause.replace(/\btype\s+\w+(?:\s+as\s+\w+)?/g, "")),
  ) || new RegExp(String.raw`(?:require|import)\s*\(\s*` + PAQUET).test(texte);
}

describe("fabrication d'un client Prisma", () => {
  it("la valeur PrismaClient ne s'obtient que dans les modules qui fabriquent un client", () => {
    expect([...TEXTES].filter(([f, t]) => peutFabriquer(t) && !FABRIQUES.has(f)).map(([f]) => f)).toEqual([]);
  });
  it.each([
    ['import { Prisma, PrismaClient as P } from "@prisma/client";', true],
    ['export { PrismaClient } from "@prisma/client";', true],
    ['export * from "@prisma/client";', true],
    ['import { default as P } from "@prisma/client";', true],
    ['export type { PrismaClient } from "@prisma/client";', false],
    ['export { Prisma } from "@prisma/client";', false],
    ['import * as client from "@prisma/client";', true],
    ['import { PrismaClient } from "@prisma/client/runtime/library";', true],
    ['import { PrismaClient } from ".prisma/client";', true],
    ['const m = require("@prisma/client/default");', true],
    ['import type { A } from "./a";\nimport { PrismaClient } from "@prisma/client";', true],
    ['import type { PrismaClient } from "@prisma/client";', false],
    ['import { type PrismaClient, Prisma } from "@prisma/client";', false],
  ])("%s → %s", (texte, attendu) => expect(peutFabriquer(texte)).toBe(attendu));
});
