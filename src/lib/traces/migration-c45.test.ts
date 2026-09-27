import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * La migration C45 part en production avec le déploiement (`prisma migrate
 * deploy` au build Vercel). Ce qu'elle a le droit de faire : ajouter trois
 * colonnes nullables, rien d'autre — ni défaut qui répondrait à la place du
 * dirigeant ou inventerait une date, ni rétro-remplissage, ni NOT NULL, ni
 * retrait. Même garde que `prestataires/migration-dates-attestation.test.ts`.
 * Le test lit des fichiers ; il ne touche aucune base.
 */
const RACINE = process.cwd();
const SQL = readFileSync(
  join(
    RACINE,
    "prisma/migrations/20260927140000_traces_c45_chiffons_duerp_plan/migration.sql",
  ),
  "utf8",
);
const instructions = SQL.split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((i) => i.replace(/\s+/g, " ").trim())
  .filter(Boolean);

function bloc(modele: string): string {
  const schema = readFileSync(join(RACINE, "prisma/schema.prisma"), "utf8");
  const debut = schema.slice(schema.indexOf(`model ${modele} {`));
  return debut.slice(0, debut.indexOf("\n}"));
}

describe("migration 20260927140000 — C45", () => {
  it("n'ajoute que les trois colonnes nullables, sans défaut ni remplissage", () => {
    expect(instructions).toEqual([
      'ALTER TABLE "Etablissement" ADD COLUMN "chiffonsImpregnes" BOOLEAN',
      'ALTER TABLE "DuerpVersion" ADD COLUMN "transmiseSpstLe" TIMESTAMP(3)',
      'ALTER TABLE "PlanPrevention" ADD COLUMN "inspectionTravailInformeeLe" TIMESTAMP(3)',
    ]);
  });

  it("ne contient aucun mot qui écrirait ou retirerait des données", () => {
    const code = instructions.join(" ");
    for (const interdit of [/NOT\s+NULL/i, /DEFAULT/i, /UPDATE/i, /DROP/i, /DELETE/i, /INSERT/i]) {
      expect(code, String(interdit)).not.toMatch(interdit);
    }
  });

  it("le schéma Prisma déclare les trois champs nullables, sans défaut", () => {
    expect(bloc("Etablissement")).toMatch(/^\s*chiffonsImpregnes\s+Boolean\?\s*$/m);
    expect(bloc("DuerpVersion")).toMatch(/^\s*transmiseSpstLe\s+DateTime\?\s*$/m);
    expect(bloc("PlanPrevention")).toMatch(/^\s*inspectionTravailInformeeLe\s+DateTime\?\s*$/m);
  });
});
