import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAMPS_TRI_ETAT } from "@/lib/equipements/schema";

/**
 * C41 (2026-09-27). La migration qui efface les `false` écrits par l'ancienne
 * case « groupe électrogène », décochée par défaut. Elle part avec le
 * déploiement (`prisma migrate deploy`, dernier maillon de `pnpm build`) ; ce
 * test ne touche pas à la base, il lit le fichier, comme
 * `migrations-contraintes.test.ts`.
 *
 * Ce qu'il tient : la migration ne retire QUE la clé `aGroupeElectrogene`, et
 * seulement quand elle vaut `false`. Un `true` était une case cochée — une
 * réponse — et doit survivre ; les autres clés du JSON aussi. Elle a été
 * exécutée pour de vrai sur une base jetable le 2026-09-27 (journal, C41).
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FICHIER = join(
  RACINE,
  "prisma",
  "migrations",
  "20260927120000_groupe_electrogene_tri_etat",
  "migration.sql",
);

/** Le SQL sans ses commentaires, espaces écrasés. */
function sqlExecutable(): string {
  return readFileSync(FICHIER, "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("migration C41 — les « non » de l'ancienne case groupe électrogène", () => {
  it("existe", () => {
    expect(existsSync(FICHIER)).toBe(true);
  });

  it("porte sur une question désormais à trois états", () => {
    expect(CHAMPS_TRI_ETAT).toContain("aGroupeElectrogene");
  });

  it("ne vise que la valeur `false` de la seule clé `aGroupeElectrogene`", () => {
    const sql = sqlExecutable();
    expect(sql).toContain(
      `WHERE jsonb_typeof("caracteristiques") = 'object' AND "caracteristiques" -> 'aGroupeElectrogene' = 'false'::jsonb`,
    );
    // Un `true` est une case cochée : une réponse, qu'on ne touche pas.
    expect(sql).not.toMatch(/'true'::jsonb/);
    // On retire une clé, jamais le JSON entier (sauf s'il ne reste rien).
    const retraits = [...sql.matchAll(/"caracteristiques" - '([^']+)'/g)].map(
      (m) => m[1],
    );
    expect(retraits.length).toBeGreaterThan(0);
    expect(new Set(retraits)).toEqual(new Set(["aGroupeElectrogene"]));
  });

  it("ne touche qu'aux données : une seule instruction, un UPDATE", () => {
    const sql = sqlExecutable();
    const instructions = sql.split(";").map((s) => s.trim()).filter(Boolean);
    expect(instructions).toHaveLength(1);
    expect(instructions[0]).toMatch(/^UPDATE "Equipement" SET "caracteristiques" = /);
    expect(sql).not.toMatch(/\b(ALTER|CREATE|DROP|DELETE|TRUNCATE)\b/i);
  });
});
