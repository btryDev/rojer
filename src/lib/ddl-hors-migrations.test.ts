// Aucun DDL ailleurs que dans `prisma/migrations` (plan de bascule, point
// 0.13 ; ADR-051 § 6).
//
// L'app et les scripts se connectent avec le rôle PROPRIÉTAIRE de la base, le
// seul que Clever Cloud fournit : rien, en base, n'empêche une requête du code
// de créer, modifier ou détruire une table, de retirer la RLS ou de donner
// des droits. Cette garde est la seule barrière. Le schéma ne change que par
// une migration, relue et appliquée au déploiement.
//
// Ce qui est lu, dans `src/` et `scripts/` (décision de la propriétaire du
// 2026-10-30), tests exclus :
// - dans le code (`.ts`, `.tsx`, `.js`, `.mjs`…), chaque littéral de chaîne et
//   de gabarit, extrait par le compilateur TypeScript — les commentaires du
//   code et les motifs des autres gardes ne sont donc pas lus ; une
//   interpolation `${…}` compte comme une coupure d'instruction ;
// - les fichiers `.sql`, commentaires SQL retirés, et `.sh`, lignes de
//   commentaire `#` retirées, sauf `scripts/sante-base.sql` (lecture seule,
//   lancé à la main par la propriétaire).
//
// Un DDL se reconnaît à son mot d'ouverture EN TÊTE D'INSTRUCTION : début de
// ligne, après un `;`, une interpolation, une parenthèse ou un guillemet
// (`psql -c 'DROP …'`), commentaires SQL retirés (`/* x */ DROP …`), toute
// casse. Une phrase d'écran qui contient « create » ou « drop » n'en est pas
// une.
//
// Ce qui est HORS DU MOTIF, et pourquoi :
// - `ALTER SYSTEM` : il exige un superutilisateur (ou `pg_alter_system`), que
//   le rôle propriétaire n'a pas ; `scripts/perf/mesurer.mjs` s'en sert sur le
//   conteneur Docker local ;
// - `LOCK`, `VACUUM`, `CLUSTER`, `REINDEX` : verrous et entretien, ni schéma
//   ni droits ; `COMMENT ON`, `SECURITY LABEL`, `ANALYZE` : métadonnées ;
// - `SET ROLE`, `SET SESSION AUTHORIZATION` : un seul rôle, personne d'autre à
//   endosser.
//
// Ce qu'elle ne voit pas : un DDL assemblé par concaténation (`"ALTER " +
// "TABLE …"`) ou lu dans un fichier à l'exécution. Elle ferme l'oubli et la
// copie maladroite, pas l'intention.
//
// Hors du périmètre décidé, et signalé : `prisma/seed.ts`, que `pnpm db:seed`
// lance avec le même rôle (jamais contre la production).
//
// Les tests sont exclus : ils ne tournent jamais contre la production, et une
// doublure de test peut avoir à écrire du SQL qui en ressemble.
//
// Éprouvée le 2026-10-30 par injections, toutes tombées (première version) :
// un `ALTER TABLE … NO FORCE ROW LEVEL SECURITY` sur plusieurs lignes dans un
// `$executeRaw` de `registre/actions.ts`, un `drop table ${id}` après un `;`
// dans un gabarit à interpolation, un `GRANT` dans un `$executeRawUnsafe` d'un
// script `.ts`, un `TRUNCATE` dans un `.sql` de `scripts/`. La revue
// indépendante du même jour a relevé ce que cette version ratait — un DDL
// après un commentaire SQL ou au milieu d'un `.sql`/`.sh`, `DO LANGUAGE`,
// `DROP OWNED BY`, `CREATE CONSTRAINT TRIGGER`, `${…}` en tête, les noms
// qualifiés `public."X"` — : chacun est un cas du tableau ci-dessous. Après
// correction, seconde épreuve, cinq injections toutes tombées : un
// `CREATE INDEX` précédé d'un commentaire `--` dans un `$executeRaw`, un
// `${Prisma.raw(x)} DROP OWNED BY`, un `TRUNCATE public."Action"` en troisième
// instruction d'un `.sql` qui commence par un commentaire, un
// `psql -c 'DO LANGUAGE plpgsql …'` dans un `.sh`, et un second DDL écrit dans
// le fichier qui porte une citation exemptée.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { sansCommentaires } from "./migrations-lecture";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const OBJETS = [
  "TABLE",
  "INDEX",
  "UNIQUE\\s+INDEX",
  "SCHEMA",
  "FUNCTION",
  "PROCEDURE",
  "TRIGGER",
  "EVENT\\s+TRIGGER",
  "ROLE",
  "USER",
  "GROUP",
  "POLICY",
  "VIEW",
  "MATERIALIZED\\s+VIEW",
  "EXTENSION",
  "TYPE",
  "SEQUENCE",
  "DATABASE",
  "DOMAIN",
  "RULE",
  "AGGREGATE",
  "OPERATOR",
  "PUBLICATION",
  "SUBSCRIPTION",
  "DEFAULT\\s+PRIVILEGES",
  "SERVER",
  "DATA\\s+WRAPPER",
  "CAST",
  "COLLATION",
  "CONVERSION",
  "STATISTICS",
  "TEXT\\s+SEARCH",
  "LANGUAGE",
  "TRANSFORM",
  "ACCESS\\s+METHOD",
  "TABLESPACE",
  "LARGE\\s+OBJECT",
].join("|");

/** Un identifiant SQL, éventuellement qualifié : `t`, `"T"`, `public."T"`. */
const ID = String.raw`(?:"[^"]+"|[A-Za-z_]\w*)(?:\.(?:"[^"]+"|[A-Za-z_]\w*))?`;

/** Marque d'une interpolation `${…}` : une coupure d'instruction. */
const COUPURE = "\u0000";

const DDL = new RegExp(
  String.raw`(?:^|[;\u0000'"(])\s*(?:` +
    [
      String.raw`(?:CREATE|ALTER|DROP)\s+(?:OR\s+REPLACE\s+)?(?:(?:GLOBAL|LOCAL)\s+)?(?:TEMP(?:ORARY)?\s+|UNLOGGED\s+)?(?:(?:RECURSIVE|CONSTRAINT|FOREIGN|TRUSTED|PROCEDURAL)\s+)*(?:${OBJETS})\b`,
      String.raw`(?:DROP|REASSIGN)\s+OWNED\b`,
      String.raw`IMPORT\s+FOREIGN\s+SCHEMA\b`,
      String.raw`GRANT\s[^;]*?\s(?:ON|TO)\s`,
      String.raw`REVOKE\s[^;]*?\s(?:ON|FROM)\s`,
      String.raw`DO\s+(?:LANGUAGE\s+\w+\s+)?[$']`,
      // `SELECT … INTO t` crée une table (sans RLS).
      String.raw`SELECT\s[^;]*?\sINTO\s+(?:(?:TEMP(?:ORARY)?|UNLOGGED|TABLE)\s+)*${ID}`,
      // `truncate` est aussi une classe Tailwind (« truncate px-1 … ») : le
      // SQL se reconnaît à une table suivie d'une fin d'instruction ou d'une
      // option.
      String.raw`TRUNCATE\s+(?:TABLE\s+)?(?:ONLY\s+)?${ID}\*?\s*(?:$|[;,)]|\s+(?:CASCADE|RESTRICT|RESTART|CONTINUE)\b)`,
    ].join("|") +
    ")",
  "im",
);

/** Vrai si le texte, commentaires SQL retirés, porte un DDL en tête d'instruction. */
function contientDdl(texte: string): boolean {
  return DDL.test(sansCommentaires(texte));
}

/** Le texte des littéraux d'un fichier de code, interpolations marquées. */
function litteraux(fichier: string, source: string): string[] {
  const sf = ts.createSourceFile(fichier, source, ts.ScriptTarget.Latest, true);
  const textes: string[] = [];
  const visiter = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      textes.push(n.text);
    } else if (ts.isTemplateExpression(n)) {
      textes.push(n.head.text + n.templateSpans.map((s) => COUPURE + s.literal.text).join(""));
    }
    ts.forEachChild(n, visiter);
  };
  visiter(sf);
  return textes;
}

/** Un script shell, lignes de commentaire retirées (le `--` des options est gardé). */
function sansCommentairesShell(source: string): string {
  return source.replace(/^\s*#.*$/gm, "");
}

const CODE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const TEST = /\.test\.(?:ts|tsx)$/;
const EXCLUS = new Set(["scripts/sante-base.sql"]);

/**
 * Littéraux qui CITENT un DDL sans l'exécuter, nommés un par un avec leur
 * motif. L'exemption porte sur le début exact du texte, pas sur le fichier :
 * un autre DDL écrit dans le même fichier fait tomber la garde.
 */
const CITATIONS: { fichier: string; debut: string; motif: string }[] = [
  {
    fichier: "scripts/seed-dossier-complet.ts",
    debut: 'docker exec duerp-db psql -U duerp -d postgres -c "CREATE DATABASE duerp_demo OWNER duerp;"',
    motif: "ligne d'un message d'erreur : la commande à taper pour créer une base Docker locale neuve",
  },
];

function estCitation(fichier: string, texte: string): boolean {
  return CITATIONS.some((c) => c.fichier === fichier && texte.trimStart().startsWith(c.debut));
}

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    if (nom === "node_modules") return [];
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return [chemin];
  });
}

type Trouve = { fichier: string; extrait: string };
type Lu = { racine: string; genre: "code" | "sql" | "sh" };

function balayer(): { lus: Lu[]; trouves: Trouve[] } {
  const trouves: Trouve[] = [];
  const lus: Lu[] = [];
  for (const racine of ["src", "scripts"]) {
    for (const chemin of fichiers(join(DEPOT, racine))) {
      const rel = relative(DEPOT, chemin);
      if (EXCLUS.has(rel) || TEST.test(rel)) continue;
      const source = readFileSync(chemin, "utf8");
      let textes: string[];
      let genre: Lu["genre"];
      if (CODE.test(rel)) [textes, genre] = [litteraux(rel, source), "code"];
      else if (rel.endsWith(".sql")) [textes, genre] = [[source], "sql"];
      else if (rel.endsWith(".sh")) [textes, genre] = [[sansCommentairesShell(source)], "sh"];
      else continue;
      lus.push({ racine, genre });
      for (const t of textes) {
        if (contientDdl(t) && !estCitation(rel, t)) trouves.push({ fichier: rel, extrait: t.trim().slice(0, 80) });
      }
    }
  }
  return { lus, trouves };
}

describe("le motif reconnaît un DDL en tête d'instruction", () => {
  it.each([
    'ALTER TABLE "Entreprise" DISABLE ROW LEVEL SECURITY',
    "alter table entreprise no force row level security",
    'ALTER TABLE ONLY public."Action" OWNER TO autre',
    'DROP TABLE "Risque"',
    "drop index concurrently x",
    'CREATE INDEX CONCURRENTLY "x" ON "Action"("id")',
    "create unique index x on y(z)",
    "CREATE OR REPLACE FUNCTION f() RETURNS void AS $$ $$ LANGUAGE sql",
    "CREATE TEMP TABLE t (id int)",
    "CREATE GLOBAL TEMPORARY TABLE t (id int)",
    "CREATE TABLE t AS SELECT 1",
    "CREATE OR REPLACE RECURSIVE VIEW v (n) AS SELECT 1",
    "CREATE CONSTRAINT TRIGGER x AFTER INSERT ON t FOR EACH ROW EXECUTE FUNCTION f()",
    "CREATE FOREIGN TABLE f () SERVER s",
    "CREATE FOREIGN DATA WRAPPER w",
    "IMPORT FOREIGN SCHEMA public FROM SERVER s INTO public",
    "CREATE POLICY p ON t USING (true)",
    "CREATE ROLE essai",
    "ALTER ROLE x BYPASSRLS",
    "CREATE USER MAPPING FOR current_user SERVER s",
    "ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO x",
    "DROP OWNED BY current_user",
    "REASSIGN OWNED BY a TO b",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO lecteur",
    "grant lecteur to app",
    "revoke all on t from x",
    'TRUNCATE "Verification"',
    'TRUNCATE public."Verification"',
    'truncate table "Action", "Risque" cascade',
    "TRUNCATE t RESTART IDENTITY",
    "TRUNCATE t*",
    "DO $$ BEGIN EXECUTE 'DROP TABLE t'; END $$",
    "DO LANGUAGE plpgsql $$ BEGIN NULL; END $$",
    "DO 'BEGIN NULL; END'",
    'SELECT * INTO nouvelle FROM "Action"',
    'SELECT 1; DROP TABLE "Entreprise"',
    '\n    ALTER TABLE "Action" ADD COLUMN x int',
    "\n  -- index manquant\n  CREATE INDEX i ON t(c)",
    "/* x */ DROP TABLE t",
    "CREATE/**/TABLE t (id int)",
    "CREATE -- c\nTABLE t (id int)",
    `${COUPURE} ALTER TABLE t DISABLE ROW LEVEL SECURITY`,
    "-- Purge\nTRUNCATE \"Action\" CASCADE;",
    "#!/bin/sh\nset -e\npsql \"$URL\" -c 'DROP TABLE \"Action\"'",
    "psql <<SQL\nALTER TABLE \"Entreprise\" DISABLE ROW LEVEL SECURITY;\nSQL",
  ])("DDL : %s", (sql) => {
    expect(contientDdl(sql)).toBe(true);
  });
});

describe("le motif laisse passer ce qui n'est pas un DDL", () => {
  it.each([
    'SELECT 1 FROM "Verification" WHERE "id" = x FOR UPDATE',
    'UPDATE "Equipement" SET "updatedAt" = NOW()',
    'INSERT INTO "LimiteDebit" ("cle") VALUES (x) ON CONFLICT DO UPDATE SET n = 1',
    'INSERT INTO "A" SELECT * FROM "B"',
    "DELETE FROM t WHERE id = x",
    "Créer un établissement",
    "Drop-down de l'année",
    "Ce bouton crée une table des matières",
    "create",
    "truncate",
    "truncate px-1 font-mono text-[0.6rem] uppercase",
    "truncate py-2.5",
    "grant_type",
    "/revoke",
    "ALTER SYSTEM SET log_min_duration_statement = 0",
    "La vérification a été créée ; drop des anciennes lignes à venir",
  ])("pas un DDL : %s", (texte) => {
    expect(contientDdl(texte)).toBe(false);
  });

  it("une ligne de commentaire shell ne compte pas", () => {
    expect(contientDdl(sansCommentairesShell("set -e; psql x\n# plus tard ; drop table t"))).toBe(false);
  });
});

describe("aucun DDL dans le code hors des migrations", () => {
  const { lus, trouves } = balayer();
  const compte = (f: (l: Lu) => boolean) => lus.filter(f).length;

  // Bornes basses par racine et par genre : la perte silencieuse d'une
  // branche du balayage doit faire tomber le test, pas le laisser vert.
  it("le balayage lit le code de src/", () => {
    expect(compte((l) => l.racine === "src" && l.genre === "code")).toBeGreaterThan(500);
  });
  it("le balayage lit le code de scripts/", () => {
    expect(compte((l) => l.racine === "scripts" && l.genre === "code")).toBeGreaterThanOrEqual(10);
  });
  it("le balayage lit les scripts shell", () => {
    expect(compte((l) => l.genre === "sh")).toBeGreaterThanOrEqual(1);
  });

  it("chaque citation exemptée existe encore (sinon, la retirer de la liste)", () => {
    for (const c of CITATIONS) {
      const source = readFileSync(join(DEPOT, c.fichier), "utf8");
      expect(litteraux(c.fichier, source).some((t) => contientDdl(t) && estCitation(c.fichier, t))).toBe(true);
    }
  });

  it("aucun littéral, .sql ni .sh de src/ et scripts/ ne porte un DDL", () => {
    expect(trouves).toEqual([]);
  });
});
