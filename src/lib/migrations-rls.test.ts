import { describe, expect, it } from "vitest";

import {
  MOTIFS_TABLES,
  NOM,
  lireMigrations,
  sansCommentaires,
  type EvenementTable,
} from "./migrations-lecture";

/**
 * Toute table vivante de `public` a la RLS activée.
 *
 * Chez Supabase, l'API Data (PostgREST) expose `public` aux rôles `anon` et
 * `authenticated`, avec une clé publique par construction. Une table sans RLS
 * y est lisible par n'importe qui. L'app, elle, passe par Prisma avec le rôle
 * propriétaire, qui contourne la RLS : l'activer sans politique ne lui retire
 * rien, et refuse tout aux autres. Voir docs/revues/audit-owasp-2026-10-13.md
 * (S1) et la migration `20261013120000_rls_tables_restantes`.
 *
 * Le test ne porte aucune liste de tables : il rejoue les migrations dans
 * l'ordre (CREATE TABLE, DROP TABLE, RENAME TO, ENABLE / DISABLE ROW LEVEL
 * SECURITY) et en déduit l'état final. Une table créée demain sans sa ligne
 * ENABLE le fait échouer, en la nommant. Il lit des fichiers et ne touche à
 * aucune base.
 */

type Evenement = EvenementTable | { type: "rls"; table: string; active: boolean };

/** Les instructions qui comptent, dans l'ordre où elles apparaissent dans le fichier. */
function evenements(sql: string): Evenement[] {
  // La vie des tables est lue par `migrations-lecture.ts`, que la garde des
  // index partage ; seule la RLS est propre à cette garde.
  const motifs: { re: RegExp; lire: (m: RegExpExecArray) => Evenement }[] = [
    ...MOTIFS_TABLES,
    {
      re: new RegExp(
        String.raw`\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?${NOM}\s+(ENABLE|DISABLE)\s+ROW\s+LEVEL\s+SECURITY`,
        "gi",
      ),
      lire: (m) => ({ type: "rls", table: m[1], active: m[2].toUpperCase() === "ENABLE" }),
    },
  ];

  const trouves: { position: number; evenement: Evenement }[] = [];
  for (const { re, lire } of motifs) {
    for (const m of sql.matchAll(re)) {
      trouves.push({ position: m.index ?? 0, evenement: lire(m as RegExpExecArray) });
    }
  }
  return trouves.sort((a, b) => a.position - b.position).map((t) => t.evenement);
}

/** Rejoue les migrations : table vivante → RLS active ou non. */
function etatFinal(migrations: { nom: string; sql: string }[]): Map<string, boolean> {
  const tables = new Map<string, boolean>();
  for (const { sql } of migrations) {
    for (const e of evenements(sansCommentaires(sql))) {
      switch (e.type) {
        case "creation":
          // `IF NOT EXISTS` sur une table déjà là ne la recrée pas.
          if (!tables.has(e.table)) tables.set(e.table, false);
          break;
        case "suppression":
          tables.delete(e.table);
          break;
        case "renommage": {
          // La RLS suit la table renommée : c'est un attribut de la relation.
          const rls = tables.get(e.de) ?? false;
          tables.delete(e.de);
          tables.set(e.vers, rls);
          break;
        }
        case "rls":
          if (tables.has(e.table)) tables.set(e.table, e.active);
          break;
      }
    }
  }
  return tables;
}

describe("RLS sur toutes les tables de public (audit OWASP 2026-10-13, S1)", () => {
  const migrations = lireMigrations();
  const tables = etatFinal(migrations);

  it("trouve des migrations et des tables à contrôler", () => {
    // Garde-fou du test lui-même : un chemin faux ou un motif cassé ferait
    // passer l'assertion suivante à vide. Borne basse seulement : le nombre
    // de tables bouge à chaque lot.
    expect(migrations.length).toBeGreaterThan(0);
    expect(tables.size).toBeGreaterThan(20);
  });

  it("rejoue les suppressions : Mesure, créée puis supprimée, n'est plus vivante", () => {
    // Couche voisine : sans le DROP, le test exigerait la RLS d'une table
    // qui n'existe plus, et l'on « corrigerait » en l'ajoutant pour rien.
    expect(tables.has("Mesure")).toBe(false);
  });

  it("lit CREATE TABLE IF NOT EXISTS : PhaseDangereuse est vivante", () => {
    // La table qu'un relevé sur `CREATE TABLE "` avait manquée.
    expect(tables.has("PhaseDangereuse")).toBe(true);
  });

  it("active la RLS sur chaque table vivante", () => {
    const sansRls = [...tables].filter(([, rls]) => !rls).map(([t]) => t).sort();
    expect(
      sansRls,
      `Table(s) de public sans ROW LEVEL SECURITY : ${sansRls.join(", ")}. ` +
        `Chez Supabase, l'API Data les expose à la clé publique. Ajouter ` +
        `\`ALTER TABLE "<Table>" ENABLE ROW LEVEL SECURITY;\` dans la migration qui la crée.`,
    ).toEqual([]);
  });
});
