import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Un index sur une table qui existe déjà se pose sans verrouiller la table
 * (plan performance, 2026-10-28).
 *
 * `prisma migrate deploy` passe en production avant chaque build. Un
 * `CREATE INDEX` ordinaire bloque les écritures de la table le temps de sa
 * construction, un `DROP INDEX` la verrouille entièrement : sur une table qui
 * grandit avec les années — rapports, relevés, actions, signatures —, le
 * déploiement arrêterait l'application, et d'autant plus longtemps que le
 * dossier vieillit. Décision de la propriétaire : on pense à long terme, on
 * ne tranche pas sur la taille de la table au jour de la migration.
 *
 * La règle, pour toute migration à partir du 2026-10-28 :
 *  - un `CREATE [UNIQUE] INDEX` sur une table créée par une migration
 *    ANTÉRIEURE est `CONCURRENTLY` ;
 *  - un `DROP INDEX` est `CONCURRENTLY` ;
 *  - une instruction `CONCURRENTLY` est SEULE dans son fichier : PostgreSQL
 *    exécute dans une transaction implicite un envoi qui en compte plusieurs,
 *    et `CONCURRENTLY` y est refusé.
 * Un index sur une table créée dans le même fichier reste ordinaire : la
 * table est vide.
 *
 * `prisma migrate dev` écrit des index ordinaires : à réécrire à la main,
 * comme `20261028200000_rapport_index_dernier_par_ligne` et
 * `20261028200100_rapport_retrait_index_verification`.
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOSSIER = join(RACINE, "prisma", "migrations");

/** Les migrations antérieures à la règle ne sont pas relues. */
const DEPUIS = "20261028";

/** Le SQL sans ses commentaires, découpé en instructions. */
function instructions(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((i) => i.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const migrations = readdirSync(DOSSIER, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()
  .map((nom) => ({ nom, instructions: instructions(readFileSync(join(DOSSIER, nom, "migration.sql"), "utf8")) }));

/** Les tables créées par chaque migration, pour savoir lesquelles existaient avant. */
const TABLE_CREEE = /^CREATE TABLE (?:IF NOT EXISTS )?"?(\w+)"?/i;
const INDEX_CREE = /^CREATE (?:UNIQUE )?INDEX (CONCURRENTLY )?(?:IF NOT EXISTS )?"?\w+"? ON (?:ONLY )?"?(\w+)"?/i;
const INDEX_RETIRE = /^DROP INDEX (CONCURRENTLY )?/i;

/** Les écarts à la règle dans une liste de migrations triées. */
function ecarts(liste: { nom: string; instructions: string[] }[]): string[] {
  const tables = new Set<string>();
  const fautes: string[] = [];
  for (const { nom, instructions: ins } of liste) {
    const creeesIci = new Set(ins.map((i) => TABLE_CREEE.exec(i)?.[1]).filter(Boolean) as string[]);
    if (nom >= DEPUIS) {
      for (const i of ins) {
        const cree = INDEX_CREE.exec(i);
        if (cree && !cree[1] && tables.has(cree[2]) && !creeesIci.has(cree[2])) {
          fautes.push(`${nom} : index sur la table existante "${cree[2]}" sans CONCURRENTLY`);
        }
        const retire = INDEX_RETIRE.exec(i);
        if (retire && !retire[1]) fautes.push(`${nom} : DROP INDEX sans CONCURRENTLY`);
        if (/\bCONCURRENTLY\b/i.test(i) && ins.length > 1) {
          fautes.push(`${nom} : CONCURRENTLY n'est pas seule dans son fichier (${ins.length} instructions)`);
        }
      }
    }
    for (const t of creeesIci) tables.add(t);
  }
  return fautes;
}

describe("un index sur une table existante ne verrouille pas la table", () => {
  it("relit bien les migrations (borne basse)", () => {
    expect(migrations.length).toBeGreaterThan(50);
    expect(migrations.some((m) => m.instructions.some((i) => TABLE_CREEE.test(i) && /RapportVerification/.test(i)))).toBe(true);
  });

  it("aucune migration depuis le 2026-10-28 n'y déroge", () => {
    expect(ecarts(migrations)).toEqual([]);
  });

  // La garde elle-même, sur des migrations factices : qu'elle ne passe pas à vide.
  it("refuse un index ordinaire sur une table existante, un DROP ordinaire, et CONCURRENTLY accompagné", () => {
    const base = { nom: "20200101000000_init", instructions: instructions('CREATE TABLE "Rapport" (id text)') };
    expect(
      ecarts([base, { nom: "20261101000000_a", instructions: instructions('CREATE INDEX "i" ON "Rapport"("id")') }]),
    ).toHaveLength(1);
    expect(ecarts([base, { nom: "20261101000000_b", instructions: instructions('DROP INDEX "i"') }])).toHaveLength(1);
    expect(
      ecarts([
        base,
        {
          nom: "20261101000000_c",
          instructions: instructions('CREATE INDEX CONCURRENTLY "i" ON "Rapport"("id"); DROP INDEX CONCURRENTLY "j"'),
        },
      ]),
    ).toHaveLength(2);
  });

  it("laisse passer un index sur une table créée dans le même fichier, et CONCURRENTLY seul", () => {
    const base = { nom: "20200101000000_init", instructions: instructions('CREATE TABLE "Rapport" (id text)') };
    expect(
      ecarts([
        base,
        {
          nom: "20261101000000_d",
          instructions: instructions('CREATE TABLE "Neuve" (id text); CREATE INDEX "n" ON "Neuve"("id")'),
        },
        { nom: "20261101000001_e", instructions: instructions('CREATE INDEX CONCURRENTLY "i" ON "Rapport"("id")') },
      ]),
    ).toEqual([]);
  });
});
