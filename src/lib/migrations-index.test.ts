import { describe, expect, it } from "vitest";

import {
  NOM,
  appliquer,
  evenementsDeTables,
  instructionsDe,
  lireMigrations,
  sansCommentaires,
  type Migration,
} from "./migrations-lecture";

/**
 * Une migration ne verrouille pas une table qui existe déjà (plan
 * performance, 2026-10-28).
 *
 * En production, `scripts/migrer-en-production.sh` passe `migrate deploy`
 * après la compilation et avant la mise en ligne, pendant que la version
 * précédente sert encore les requêtes. Une instruction qui prend un verrou
 * lourd sur une table vivante — un index construit en bloquant les
 * écritures, un `DROP INDEX`, une contrainte qui bâtit son index ou relit
 * toute la table — arrête alors l'application, d'autant plus longtemps que
 * la table a grossi. Décision de la propriétaire : on pense à long terme, on
 * ne tranche pas sur la taille de la table au jour de la migration.
 *
 * La règle, pour toute migration à partir du 2026-10-28, sur une table créée
 * par une migration ANTÉRIEURE :
 *  - `CREATE [UNIQUE] INDEX` → `CONCURRENTLY` ;
 *  - `DROP INDEX` → `CONCURRENTLY` (quelle que soit la table) ;
 *  - `ADD CONSTRAINT … UNIQUE | PRIMARY KEY` → seulement `USING INDEX`, sur
 *    un index posé en `CONCURRENTLY` dans une migration précédente ;
 *  - `ADD CONSTRAINT … FOREIGN KEY` → `NOT VALID`, puis `VALIDATE CONSTRAINT`
 *    dans une migration suivante ;
 *  - une instruction `CONCURRENTLY` est SEULE dans son fichier : PostgreSQL
 *    exécute dans une transaction implicite un envoi qui en compte plusieurs,
 *    et `CONCURRENTLY` y est refusé.
 * Une table créée dans le même fichier est vide : rien n'y est exigé.
 *
 * `prisma migrate dev` écrit la forme ordinaire : à réécrire à la main, comme
 * `20261028200000_rapport_index_dernier_par_ligne` et
 * `20261028200100_rapport_retrait_index_verification`. Ce que la garde ne lit
 * pas — `ALTER COLUMN … TYPE`, `SET NOT NULL` — reste à juger à la relecture.
 */

/** Les migrations antérieures à la règle ne sont pas relues. */
const DEPUIS = "20261028";

const CREATION_INDEX = new RegExp(
  String.raw`^CREATE (?:UNIQUE )?INDEX (CONCURRENTLY )?(?:IF NOT EXISTS )?(?:${NOM} )?ON (?:ONLY )?${NOM}`,
  "i",
);
const RETRAIT_INDEX = /^DROP INDEX (CONCURRENTLY )?/i;
const AJOUT_CONTRAINTE = new RegExp(
  String.raw`^ALTER TABLE (?:IF EXISTS )?(?:ONLY )?${NOM} ADD CONSTRAINT ${NOM} (UNIQUE|PRIMARY KEY|FOREIGN KEY)\b(.*)$`,
  "i",
);

/** Les écarts à la règle dans une liste de migrations triées. */
function ecarts(liste: Migration[]): string[] {
  const vivantes = new Set<string>();
  const fautes: string[] = [];
  for (const { nom, sql } of liste) {
    const avant = new Set(vivantes);
    const ins = instructionsDe(sql);
    if (nom >= DEPUIS) {
      const existante = (table: string) => avant.has(table);
      for (const i of ins) {
        const cree = CREATION_INDEX.exec(i);
        if (cree && !cree[1] && existante(cree[3])) {
          fautes.push(`${nom} : index sur la table existante "${cree[3]}" sans CONCURRENTLY`);
        }
        const retire = RETRAIT_INDEX.exec(i);
        if (retire && !retire[1]) fautes.push(`${nom} : DROP INDEX sans CONCURRENTLY`);
        const contrainte = AJOUT_CONTRAINTE.exec(i);
        if (contrainte && existante(contrainte[1])) {
          const [, table, , genre, suite] = contrainte;
          if (/FOREIGN KEY/i.test(genre) && !/\bNOT VALID\b/i.test(suite)) {
            fautes.push(`${nom} : clé étrangère sur la table existante "${table}" sans NOT VALID`);
          }
          if (!/FOREIGN KEY/i.test(genre) && !/^\s*USING INDEX\b/i.test(suite)) {
            fautes.push(`${nom} : ${genre.toUpperCase()} sur la table existante "${table}" sans USING INDEX`);
          }
        }
      }
      if (ins.length > 1 && ins.some((i) => /\bCONCURRENTLY\b/i.test(i))) {
        fautes.push(`${nom} : CONCURRENTLY n'est pas seule dans son fichier (${ins.length} instructions)`);
      }
    }
    for (const e of evenementsDeTables(sansCommentaires(sql))) appliquer(vivantes, e);
  }
  return fautes;
}

describe("une migration ne verrouille pas une table existante", () => {
  const migrations = lireMigrations();

  it("relit bien les migrations (borne basse)", () => {
    expect(migrations.length).toBeGreaterThan(50);
  });

  it("aucune migration depuis le 2026-10-28 n'y déroge", () => {
    expect(ecarts(migrations)).toEqual([]);
  });

  // La garde elle-même, sur des migrations factices : qu'elle ne passe pas à vide.
  const base: Migration = { nom: "20200101000000_init", sql: 'CREATE TABLE "public"."Rapport" (id text);' };
  const apres = (sql: string): Migration[] => [base, { nom: "20261101000000_x", sql }];

  it.each([
    ['CREATE INDEX "i" ON "Rapport"("id")', "index nommé"],
    ['CREATE INDEX ON "public"."Rapport"("id")', "index sans nom, schéma écrit"],
    ['CREATE UNIQUE INDEX "i" ON "Rapport"("id")', "index unique"],
    ['DROP INDEX "i"', "retrait ordinaire"],
    ['ALTER TABLE "Rapport" ADD CONSTRAINT "u" UNIQUE ("id")', "contrainte d'unicité"],
    ['ALTER TABLE "Rapport" ADD CONSTRAINT "f" FOREIGN KEY ("id") REFERENCES "X"("id")', "clé étrangère validée"],
    ['CREATE INDEX CONCURRENTLY "i" ON "Rapport"("id"); SELECT 1', "CONCURRENTLY accompagnée"],
  ])("refuse : %s (%s)", (sql) => {
    expect(ecarts(apres(sql))).toHaveLength(1);
  });

  it("suit un renommage : l'ancienne table renommée reste existante", () => {
    const renommee: Migration = { nom: "20200102000000_r", sql: 'ALTER TABLE "Rapport" RENAME TO "Releve";' };
    expect(
      ecarts([base, renommee, { nom: "20261101000000_x", sql: 'CREATE INDEX "i" ON "Releve"("id")' }]),
    ).toHaveLength(1);
  });

  it.each([
    ['CREATE INDEX CONCURRENTLY "i" ON "Rapport"("id")', "index CONCURRENTLY seul"],
    ['DROP INDEX CONCURRENTLY "i"', "retrait CONCURRENTLY seul"],
    ['CREATE TABLE "Neuve" (id text); CREATE INDEX "n" ON "Neuve"("id")', "table neuve du même fichier"],
    [
      'CREATE TABLE "Neuve" (id text); ALTER TABLE "Neuve" ADD CONSTRAINT "f" FOREIGN KEY ("id") REFERENCES "Rapport"("id")',
      "clé étrangère d'une table neuve",
    ],
    ['ALTER TABLE "Rapport" ADD CONSTRAINT "f" FOREIGN KEY ("id") REFERENCES "X"("id") NOT VALID', "NOT VALID"],
    ['ALTER TABLE "Rapport" ADD CONSTRAINT "u" UNIQUE USING INDEX "i"', "USING INDEX"],
    ["DO $$ BEGIN PERFORM 1; DROP INDEX x; END $$", "un corps $$ ne compte pas"],
  ])("laisse passer : %s (%s)", (sql) => {
    expect(ecarts(apres(sql))).toEqual([]);
  });
});
