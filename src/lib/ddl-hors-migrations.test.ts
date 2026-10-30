// Aucun DDL ailleurs que dans `prisma/migrations` (plan de bascule, point
// 0.13 ; ADR-051 § 6).
//
// L'app et les scripts se connectent avec le rôle PROPRIÉTAIRE de la base, le
// seul que Clever Cloud fournit : rien, en base, n'empêche une requête du code
// de créer, modifier ou détruire une table, de retirer la RLS ou de donner
// des droits. Cette garde est la seule barrière. Le schéma ne change que par
// une migration, relue et appliquée au déploiement.
//
// Ce qui est lu : chaque littéral de chaîne et de gabarit (`'…'`, `"…"`,
// `` `…` ``, y compris les gabarits `$queryRaw`, `$executeRaw`, `Prisma.sql`)
// des fichiers de code de `src/` et `scripts/`, tests exclus, par le
// compilateur TypeScript — pas une expression régulière sur le fichier, qui
// lirait aussi les commentaires et les motifs des autres gardes. Les fichiers
// `.sql` et `.sh` de `scripts/` sont lus en entier, sauf `sante-base.sql`
// (lecture seule, lancé à la main par la propriétaire).
//
// Un DDL se reconnaît à son mot d'ouverture EN TÊTE D'INSTRUCTION (début du
// littéral ou après un `;`), toute casse : une phrase d'écran qui contient
// « create » ou « drop » n'en est pas une.
//
// Les tests sont exclus : ils ne tournent jamais contre la production, et une
// doublure de test peut avoir à écrire du SQL qui en ressemble.
//
// Ce qu'elle ne voit pas : un DDL assemblé par concaténation (`"ALTER " +
// "TABLE …"`) ou lu dans un fichier à l'exécution. Elle ferme l'oubli et la
// copie maladroite, pas l'intention.
//
// Éprouvée le 2026-10-30 par quatre injections, toutes tombées : un
// `ALTER TABLE … NO FORCE ROW LEVEL SECURITY` sur plusieurs lignes dans un
// `$executeRaw` de `registre/actions.ts`, un `drop table ${id}` après un `;`
// dans un gabarit à interpolation, un `GRANT` dans un `$executeRawUnsafe` d'un
// script `.ts`, un `TRUNCATE` dans un `.sql` de `scripts/`. Au premier
// passage, la classe Tailwind `truncate` et l'`ALTER SYSTEM` de
// `scripts/perf/mesurer.mjs` étaient pris pour des DDL : le motif a été
// resserré (cas ajoutés plus bas).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const DEPOT = join(__dirname, "..", "..");

const OBJETS = [
  "TABLE",
  "INDEX",
  "UNIQUE\\s+INDEX",
  "SCHEMA",
  "FUNCTION",
  "PROCEDURE",
  "TRIGGER",
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
  "EVENT\\s+TRIGGER",
  "DEFAULT\\s+PRIVILEGES",
].join("|");
// `ALTER SYSTEM` n'y est pas : il exige un superutilisateur (ou le droit
// `pg_alter_system`), que le rôle propriétaire n'a pas, et
// `scripts/perf/mesurer.mjs` s'en sert sur le conteneur Docker local pour
// régler le journal des requêtes. Ce n'est pas une porte du rôle de l'app.

/** Un DDL en tête d'instruction : début du texte ou après un `;`. */
const DDL = new RegExp(
  String.raw`(?:^|;)\s*(?:` +
    String.raw`(?:CREATE|ALTER|DROP)\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+|UNLOGGED\s+)?(?:${OBJETS})\b` +
    String.raw`|GRANT\b|REVOKE\b|DO\s+\$` +
    // `truncate` est aussi une classe Tailwind (« truncate px-1 … ») : le SQL
    // se reconnaît à une table suivie d'une fin d'instruction ou d'une option.
    String.raw`|TRUNCATE\s+(?:TABLE\s+)?(?:ONLY\s+)?(?:"[^"]+"|[A-Za-z_][\w.]*)\s*(?:$|[;,)]|\s+(?:CASCADE|RESTRICT|RESTART|CONTINUE)\b)` +
    String.raw`)`,
  "i",
);

function contientDdl(texte: string): boolean {
  return DDL.test(texte);
}

/** Le texte des littéraux d'un fichier TypeScript ou JavaScript, interpolations retirées. */
function litteraux(fichier: string, source: string): string[] {
  const sf = ts.createSourceFile(fichier, source, ts.ScriptTarget.Latest, true);
  const textes: string[] = [];
  const visiter = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      textes.push(n.text);
    } else if (ts.isTemplateExpression(n)) {
      // `${…}` remplacé par une valeur neutre : l'instruction reste lisible.
      textes.push(n.head.text + n.templateSpans.map((s) => "x" + s.literal.text).join(""));
    }
    ts.forEachChild(n, visiter);
  };
  visiter(sf);
  return textes;
}

const CODE = /\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/;
const TEST = /\.test\.(?:ts|tsx)$/;
const TEXTE_ENTIER = /\.(?:sql|sh)$/;
const EXCLUS = new Set(["scripts/sante-base.sql"]);

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    if (nom === "node_modules") return [];
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return [chemin];
  });
}

type Trouve = { fichier: string; extrait: string };

function balayer(): { lus: number; trouves: Trouve[] } {
  const trouves: Trouve[] = [];
  let lus = 0;
  for (const racine of ["src", "scripts"]) {
    for (const chemin of fichiers(join(DEPOT, racine))) {
      const rel = relative(DEPOT, chemin);
      if (EXCLUS.has(rel) || TEST.test(rel)) continue;
      const source = readFileSync(chemin, "utf8");
      let textes: string[];
      if (CODE.test(rel)) textes = litteraux(rel, source);
      else if (racine === "scripts" && TEXTE_ENTIER.test(rel)) textes = [source];
      else continue;
      lus++;
      for (const t of textes) {
        if (contientDdl(t)) trouves.push({ fichier: rel, extrait: t.trim().slice(0, 80) });
      }
    }
  }
  return { lus, trouves };
}

describe("le motif reconnaît un DDL en tête d'instruction, et rien d'autre", () => {
  it.each([
    'ALTER TABLE "Entreprise" DISABLE ROW LEVEL SECURITY',
    "alter table entreprise no force row level security",
    'DROP TABLE "Risque"',
    "drop index concurrently x",
    'CREATE INDEX "x" ON "Action"("id")',
    "create unique index x on y(z)",
    "CREATE OR REPLACE FUNCTION f() RETURNS void AS $$ $$ LANGUAGE sql",
    "CREATE TEMP TABLE t (id int)",
    "CREATE POLICY p ON t USING (true)",
    "CREATE ROLE essai",
    "ALTER ROLE x BYPASSRLS",
    "ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO x",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO lecteur",
    "revoke all on t from x",
    'TRUNCATE "Verification"',
    'truncate table "Action", "Risque" cascade',
    "TRUNCATE t RESTART IDENTITY",
    "DO $$ BEGIN EXECUTE 'DROP TABLE t'; END $$",
    'SELECT 1; DROP TABLE "Entreprise"',
    '\n    ALTER TABLE "Action" ADD COLUMN x int',
  ])("DDL : %s", (sql) => {
    expect(contientDdl(sql)).toBe(true);
  });

  it.each([
    'SELECT 1 FROM "Verification" WHERE "id" = x FOR UPDATE',
    'UPDATE "Equipement" SET "updatedAt" = NOW()',
    'INSERT INTO "LimiteDebit" ("cle") VALUES (x) ON CONFLICT DO UPDATE SET n = 1',
    "DELETE FROM t WHERE id = x",
    "Créer un établissement",
    "Drop-down de l'année",
    "Ce bouton crée une table des matières",
    "create",
    "truncate",
    "truncate px-1 font-mono text-[0.6rem] uppercase",
    "truncate py-2.5",
    "ALTER SYSTEM SET log_min_duration_statement = 0",
    "La vérification a été créée ; drop des anciennes lignes à venir",
  ])("pas un DDL : %s", (texte) => {
    expect(contientDdl(texte)).toBe(false);
  });
});

describe("aucun DDL dans le code hors des migrations", () => {
  const { lus, trouves } = balayer();

  it("le balayage lit bien le code (borne basse : il n'est pas vide)", () => {
    expect(lus).toBeGreaterThan(500);
  });

  it("aucun littéral de src/ ni de scripts/ ne porte un DDL", () => {
    expect(trouves).toEqual([]);
  });
});
