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
/**
 * Un module nommé : son motif ; `{ motif, typesSeuls: true }` s'il n'a droit
 * qu'aux types ; `{ motif, symboles }` s'il n'a droit qu'à ces valeurs.
 */
type Nomme = string | { motif: string; typesSeuls: true } | { motif: string; symboles: string[] };
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
    // [cc : pas d'OAuth MCP (ADR-052) — ni `clientDuCompteVerifie` ni `acces-oauth-deps.ts`.]
    "src/lib/mcp/db.ts": { motif: "MCP : établissement de la clé", symboles: ["clientDuProprietaire"] },
    "src/lib/signatures/actions.ts": { motif: "pose de signature par jeton vérifié", symboles: ["clientDuProprietaire"] },
    "src/lib/signatures/verification-publique.ts": { motif: "établissement d'une signature lue par son identifiant", symboles: ["clientDuProprietaire"] },
    "src/app/acces/[token]/page.tsx": { motif: "page d'un jeton vérifié", symboles: ["clientDuProprietaire"] },
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

/**
 * Le SQL brut (`$queryRaw`, `$executeRaw`) n'est pas borné par l'extension du
 * client borné (ADR-051 § 5) : chaque module qui en écrit est nommé, avec ce
 * qui borne SA requête. Une lecture bornée au propriétaire passe par
 * `requireLectureSqlProprietaire` (`auth/scope.ts`), qui pose le prédicat et
 * exécute — elle n'a pas à être ici (revue de code du 2026-10-31).
 */
const SQL_BRUT_NOMMES: Record<string, string> = {
  "src/lib/auth/scope.ts": "requireLectureSqlProprietaire : pose le prédicat propriétaire et exécute",
  "src/lib/securite/limite-debit.ts": "compteurs techniques, hors de tout compte",
  "src/lib/signatures/verrou-contenu.ts": "verrou FOR UPDATE de la ligne, borné à l'établissement",
  "src/lib/rapports/actions.ts": "verrou FOR UPDATE d'une ligne déjà lue par le client borné",
  "src/lib/salaries/suppression.ts": "verrou FOR UPDATE borné au salarié et à l'établissement gardés",
  "src/lib/calendrier/recalcul-ligne.ts": "verrou FOR UPDATE d'une ligne déjà lue par le client borné",
  "src/lib/entreprises/cycle-de-vie.ts": "verrou FOR UPDATE d'une entreprise déjà gardée",
  "src/lib/registre/actions.ts": "UPDATE jsonb borné à l'établissement gardé",
  "src/lib/duerps/ecrire-reponse-fermee.ts": "UPDATE jsonb d'un DUERP déjà gardé",
  "src/lib/calendrier/faux-prisma.ts": "faux client des tests",
  "src/lib/auth/tenancy-portee.ts": "sonde : le motif de détection du SQL brut, aucune requête",
  "src/lib/auth/tenancy-sonde.ts": "sonde : le motif de détection du SQL brut, aucune requête",
  "src/lib/auth/portee/client.ts": "commentaire seul : l'extension ne borne pas le SQL brut",
};
/**
 * Le motif se cherche sur le texte BRUT, commentaires et chaînes compris :
 * `db["$queryRaw"]`, `const { $queryRaw: q } = db` ou une clé calculée se
 * voient, et aucun analyseur ne peut se dérégler (une apostrophe dans du JSX
 * le faisait — revue de #149, 2026-10-31). Un module qui ne fait que NOMMER le
 * motif (commentaire, sonde) est nommé comme tel.
 */
// Sans le point : l'accès par crochets ou la déstructuration s'y voient aussi.
const SQL_BRUT = /\$(?:queryRaw|executeRaw)/;
const SQL_BRUT_UNSAFE = /\$(?:queryRaw|executeRaw)Unsafe\b/;
describe("SQL brut", () => {
  const ecrivent = [...TEXTES]
    .filter(([, t]) => SQL_BRUT.test(t))
    .map(([f]) => f)
    .sort();
  it("seuls les modules nommés en écrivent", () => {
    expect(ecrivent.filter((f) => !(f in SQL_BRUT_NOMMES))).toEqual([]);
  });
  it("un module nommé qui n'en écrit plus sort de la liste", () => {
    expect(Object.keys(SQL_BRUT_NOMMES).filter((f) => !ecrivent.includes(f))).toEqual([]);
  });
  it("jamais de forme Unsafe (chaîne SQL non paramétrée)", () => {
    const unsafe = [...TEXTES].filter(([, t]) => SQL_BRUT_UNSAFE.test(t)).map(([f]) => f);
    expect(unsafe).toEqual([]);
  });
  // Le helper vérifie la PRÉSENCE du prédicat, pas qu'il filtre : chaque
  // appelant est éprouvé par le résultat, sur base réelle (ADR-051 § 5). Un
  // appelant neuf qui n'entre pas dans ce test fait tomber celui-ci.
  it("chaque appelant de requireLectureSqlProprietaire est éprouvé sur base réelle", () => {
    const EPREUVE = "src/lib/auth/sql-proprietaire.integration.test.ts";
    const appelants = [...TEXTES]
      .filter(([f, t]) => f !== "src/lib/auth/scope.ts" && /\brequireLectureSqlProprietaire\b/.test(sansCommentairesNiChaines(t)))
      .map(([f]) => f.replace(/\.ts$/, ""))
      .sort();
    // Commentaires retirés : un import mis en commentaire n'éprouve plus rien.
    const code = readFileSync(join(DEPOT, EPREUVE), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const eprouves = [...code.matchAll(IMPORT)].map(([, s]) => cible(EPREUVE, s));
    expect(appelants.length).toBeGreaterThan(0);
    expect(appelants.filter((f) => !eprouves.includes(f))).toEqual([]);
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
    .filter(([, nomme]) => typeof nomme !== "string" && "typesSeuls" in nomme)
    .map(([f]) => [f, c] as const),
);
/**
 * Un module nommé avec ses `symboles` n'importe de la cible que ces valeurs-là
 * (les types restent libres) : nommé pour `clientDuProprietaire`, il ne peut
 * pas appeler `clientDuCompteVerifie(chaîne)` (revue du 2026-10-31).
 */
function valeursImportees(f: string, c: string): string[] {
  const texte = TEXTES.get(f)!;
  const statiques = [...texte.matchAll(IMPORT_STATIQUE)].filter(([, , , spec]) => cible(f, spec) === c);
  const valeurs = statiques.flatMap(([, type, clause]) => {
    if (type) return [];
    const accolades = clause.match(/^\{([^}]*)\}$/);
    if (!accolades) return ["<défaut ou espace de noms>"];
    return accolades[1]
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x && !x.startsWith("type "))
      .map((x) => x.split(/\s+as\s+/)[0]);
  });
  const dynamiques = [...texte.matchAll(IMPORT_DYNAMIQUE)].filter(([, spec]) => cible(f, spec) === c).map(() => "<import dynamique>");
  return [...valeurs, ...dynamiques];
}
const PAR_SYMBOLES = Object.entries(NOMMES_ROUAGES).flatMap(([c, nommes]) =>
  Object.entries(nommes).flatMap(([f, nomme]) =>
    typeof nomme !== "string" && "symboles" in nomme ? [[f, c, nomme.symboles] as const] : [],
  ),
);
it.each(PAR_SYMBOLES)("%s n'importe de %s que ses symboles nommés", (f, c, symboles) => {
  expect(valeursImportees(f, c).filter((v) => !symboles.includes(v))).toEqual([]);
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
