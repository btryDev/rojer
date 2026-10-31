// Qui peut toucher au client Prisma brut, qui voit tous les comptes (ADR-051 § 3).
// Ses trois portes (`@/lib/prisma`, `mcp/prisma`, `mcp/db`) ne s'importent que
// depuis les modules NOMMÉS, chacun avec son motif, ou ceux encore À MIGRER vers
// `requireCompte()` : un cliquet qui ne fait que raccourcir. Les rouages du
// client borné ne s'importent que là où la portée s'établit, et la valeur
// `PrismaClient` que dans les deux modules qui fabriquent un client.
// Échappent : un chemin calculé, `globalThis.prisma`. Tests exclus (doublures).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sansCommentairesNiChaines } from "@/lib/auth/tenancy-sonde";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PORTES_BRUTES = ["src/lib/prisma", "src/lib/mcp/prisma", "src/lib/mcp/db"];
const FABRIQUES = new Set(["src/lib/prisma.ts", "src/lib/mcp/prisma.ts"]);
/** SQL brut sous requireProprietaireSql, jusqu'au chantier `{ sql, db }`. */
const SQL_BRUT = { motif: "SQL brut borné par requireProprietaireSql (ADR-051 § 5)", usages: ["prisma.$queryRaw"] };
/**
 * Les modules nommés, leur motif et les seuls usages du client brut qu'il
 * couvre : chaque `prisma.…` de leur code (commentaires et chaînes retirés)
 * doit en être un. Sans quoi le motif couvrirait le fichier entier, et une
 * lecture de modèle ajoutée demain passerait sans borne (revue du
 * 2026-10-31). La fabrique du client borné, seule, a droit au client entier —
 * et, sur cc, l'adaptateur de Better Auth.
 */
const NOMMES_PRISMA: Record<string, { motif: string; usages: string[] | "tous" }> = {
  "src/lib/auth/portee/client.ts": { motif: "fabrique le client borné à partir du client brut", usages: "tous" },
  // cc : l'adaptateur de Better Auth reçoit le client entier (prismaAdapter).
  "src/lib/auth/better-auth.ts": {
    motif:
      "adaptateur Better Auth (ADR-052) : User, Session, Account, AuthVerification, TwoFactor, hors compte, lus avant toute identité",
    usages: "tous",
  },
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
  "src/lib/signatures/verification-publique.ts": {
    motif: "vérification publique d'une signature, sans session",
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
  "src/lib/etablissements/modules.ts": SQL_BRUT,
  "src/lib/rapports/queries.ts": SQL_BRUT,
  "src/lib/rapports/joindre-realisations.ts": SQL_BRUT,
};
/** Cliquet : importeurs du client brut encore à migrer vers requireCompte(). */
const A_MIGRER = new Set([
  "src/lib/access-tokens/revocation.ts",
  "src/lib/mcp/db.ts",
  "src/lib/mcp/queries.ts",
  "src/lib/signatures/actions.ts",
  "src/lib/signatures/appartenance.ts",
  "src/lib/signatures/contenu-a-signer.ts",
  "src/lib/signatures/etat-signable.ts",
  "src/lib/signatures/hash-objet.ts",
  "src/lib/signatures/libelle-document.ts",
  "src/lib/signatures/queries.ts",
  "src/lib/signatures/statut-objet.ts",
  "src/lib/signatures/trace.ts",
  "src/lib/signatures/verrou-contenu.ts",
]);
const NOMMES_ROUAGES: Record<string, Record<string, string>> = {
  "src/lib/auth/portee/client": {
    "src/lib/auth/compte.ts": "requireCompte : la portée vient de la session",
    "src/lib/auth/portee/lot-verifie.ts": "types du client et de la transaction",
    "src/test/garde-simulee.ts": "tests seuls : le client simulé que rendent les gardes simulées",
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
