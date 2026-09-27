import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * La migration de la décision B2 part en production avec le déploiement
 * (`prisma migrate deploy` au build Vercel). Ce qu'elle a le droit de faire :
 * ajouter deux colonnes nullables à `Prestataire`, rien d'autre — ni défaut
 * qui inventerait une date, ni rétro-remplissage, ni NOT NULL, ni retrait.
 * Le test lit des fichiers ; il ne touche aucune base.
 */
const RACINE = process.cwd();
const SQL = readFileSync(
  join(
    RACINE,
    "prisma/migrations/20260927130000_prestataire_dates_attestation_vigilance/migration.sql",
  ),
  "utf8",
);
/** Les instructions, commentaires retirés. */
const instructions = SQL.split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((i) => i.replace(/\s+/g, " ").trim())
  .filter(Boolean);

describe("migration 20260927130000 — dates de l'attestation de vigilance", () => {
  it("n'ajoute que les deux colonnes nullables, sans défaut ni remplissage", () => {
    expect(instructions).toEqual([
      'ALTER TABLE "Prestataire" ADD COLUMN "attestationUrssafRemiseLe" TIMESTAMP(3)',
      'ALTER TABLE "Prestataire" ADD COLUMN "attestationUrssafEmiseLe" TIMESTAMP(3)',
    ]);
  });

  it("ne contient aucun mot qui écrirait ou retirerait des données", () => {
    // Borne haute, indépendante de la forme exacte ci-dessus.
    const code = instructions.join(" ");
    for (const interdit of [/NOT\s+NULL/i, /DEFAULT/i, /UPDATE/i, /DROP/i, /DELETE/i, /INSERT/i]) {
      expect(code, String(interdit)).not.toMatch(interdit);
    }
  });

  it("le schéma Prisma déclare les deux champs `DateTime?`", () => {
    const schema = readFileSync(join(RACINE, "prisma/schema.prisma"), "utf8");
    const modele = schema.slice(schema.indexOf("model Prestataire {"));
    const bloc = modele.slice(0, modele.indexOf("\n}"));
    expect(bloc).toMatch(/^\s*attestationUrssafRemiseLe\s+DateTime\?\s*$/m);
    expect(bloc).toMatch(/^\s*attestationUrssafEmiseLe\s+DateTime\?\s*$/m);
  });
});
