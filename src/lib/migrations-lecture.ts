/**
 * Lecture des fichiers de migration, pour les gardes qui les relisent
 * (`migrations-rls.test.ts`, `migrations-index.test.ts`,
 * `migrations-contraintes.test.ts`). Aucune base : du texte.
 *
 * Sortie le 2026-10-28 (plan performance) de `migrations-rls.test.ts`, qui la
 * portait seul : la garde des index en a besoin, et trois copies de la même
 * lecture divergeaient déjà — la plus récente ignorait les noms
 * `public."X"` et les renommages de table.
 *
 * Module de test : rien dans l'application ne l'importe.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DOSSIER_MIGRATIONS = join(RACINE, "prisma", "migrations");

export type Migration = { nom: string; sql: string };

/** Contenu de chaque migration.sql, trié par nom de dossier (donc chronologiquement). */
export function lireMigrations(): Migration[] {
  return readdirSync(DOSSIER_MIGRATIONS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((nom) => ({
      nom,
      sql: readFileSync(join(DOSSIER_MIGRATIONS, nom, "migration.sql"), "utf8"),
    }));
}

/**
 * Retire les commentaires `--` et `/* … *\/` : une ligne commentée ne doit pas
 * compter, ni une instruction citée dans une explication.
 */
export function sansCommentaires(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/**
 * Les instructions de premier niveau d'une migration : commentaires retirés,
 * corps `$$ … $$` (fonctions, `DO`) et chaînes `'…'` vidés pour qu'un `;` ou
 * un mot-clé qui s'y trouve ne compte pas, puis découpe sur `;`.
 */
export function instructionsDe(sql: string): string[] {
  return sansCommentaires(sql)
    .replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, "$$$$")
    .replace(/'(?:[^']|'')*'/g, "''")
    .split(";")
    .map((i) => i.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** `"X"`, `public."X"` ou `"public"."X"` → `X`. Les autres schémas sont écartés. */
export const NOM = String.raw`(?:(?:"public"|public)\.)?"([^"]+)"`;

export type EvenementTable =
  | { type: "creation"; table: string }
  | { type: "suppression"; table: string }
  | { type: "renommage"; de: string; vers: string };

/** Les motifs de la vie d'une table : création, suppression, renommage. */
export const MOTIFS_TABLES: { re: RegExp; lire: (m: RegExpExecArray) => EvenementTable }[] = [
  {
    re: new RegExp(String.raw`\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${NOM}`, "gi"),
    lire: (m) => ({ type: "creation", table: m[1] }),
  },
  {
    re: new RegExp(String.raw`\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?${NOM}`, "gi"),
    lire: (m) => ({ type: "suppression", table: m[1] }),
  },
  {
    re: new RegExp(
      String.raw`\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?${NOM}\s+RENAME\s+TO\s+"([^"]+)"`,
      "gi",
    ),
    lire: (m) => ({ type: "renommage", de: m[1], vers: m[2] }),
  },
];

/** Applique un événement de table à l'ensemble des tables vivantes. */
export function appliquer(tables: Set<string>, e: EvenementTable): void {
  if (e.type === "creation") tables.add(e.table);
  else if (e.type === "suppression") tables.delete(e.table);
  else {
    tables.delete(e.de);
    tables.add(e.vers);
  }
}

/** Les événements de table d'un SQL déjà sans commentaires, dans l'ordre du fichier. */
export function evenementsDeTables(sql: string): EvenementTable[] {
  const trouves: { position: number; evenement: EvenementTable }[] = [];
  for (const { re, lire } of MOTIFS_TABLES) {
    for (const m of sql.matchAll(re)) {
      trouves.push({ position: m.index ?? 0, evenement: lire(m as RegExpExecArray) });
    }
  }
  return trouves.sort((a, b) => a.position - b.position).map((t) => t.evenement);
}
