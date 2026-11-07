// Les catégories jumelles réunies (ADR-057 § 5, 2026-11-07) : la migration,
// la table de la reprise, l'enum et le type déclaré disent la même chose.
//
// Ce que la garde empêche : une ancienne valeur oubliée dans l'enum recréé
// (le DROP TYPE échouerait en production, ou une rangée resterait sur une
// valeur que le code ne sait plus lire) ; une catégorie reprise sans son type
// (un harnais perdrait sa vérification de douze mois).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATEGORIES_EQUIPEMENT,
  CATEGORIES_REPRISES_ADR_057,
} from "./types-communs";
import { PROPRIETES_DE_TYPE, QUESTION_DE_TYPE } from "@/lib/equipements/type-appareil";
import { equipementSchema } from "@/lib/equipements/schema";

const RACINE = join(__dirname, "..", "..", "..");
const MIGRATION = readFileSync(
  join(RACINE, "prisma/migrations/20261107120100_categories_jumelles_reprise/migration.sql"),
  "utf8",
);
const SCHEMA = readFileSync(join(RACINE, "prisma/schema.prisma"), "utf8");

/** Les valeurs de l'enum `CategorieEquipement` du schéma Prisma. */
function enumDuSchema(): string[] {
  const bloc = SCHEMA.match(/enum CategorieEquipement \{([\s\S]*?)\n\}/)?.[1] ?? "";
  return bloc
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, "").trim())
    .filter(Boolean);
}

/** Les valeurs de l'enum recréé à la fin de la migration. */
function enumDeLaMigration(): string[] {
  const bloc = MIGRATION.match(/CREATE TYPE "CategorieEquipement" AS ENUM \(([\s\S]*?)\);/)?.[1] ?? "";
  return [...bloc.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
}

describe("catégories jumelles — ADR-057 § 5", () => {
  it("l'enum du schéma, celui de la migration et la liste du code sont les mêmes, dans le même ordre", () => {
    expect(enumDuSchema()).toEqual([...CATEGORIES_EQUIPEMENT]);
    expect(enumDeLaMigration()).toEqual([...CATEGORIES_EQUIPEMENT]);
  });

  it("aucune ancienne valeur ne survit, et chacune a sa reprise", () => {
    for (const [ancienne, nouvelle] of Object.entries(CATEGORIES_REPRISES_ADR_057)) {
      expect(CATEGORIES_EQUIPEMENT as readonly string[], ancienne).not.toContain(ancienne);
      expect(CATEGORIES_EQUIPEMENT, nouvelle).toContain(nouvelle);
      // La migration nomme l'ancienne valeur dans une reprise vers la nouvelle.
      expect(MIGRATION, ancienne).toContain(`'${ancienne}'`);
    }
  });

  it("la reprise pose le type de chaque ancienne catégorie qui en devient un", () => {
    const attendus: Record<string, string> = {
      PORTE_AUTO: "'porte'",
      PORTAIL_AUTO: "'portail'",
      EPI_ANTICHUTE: "'antichute'",
      EPI_RESPIRATOIRE: "'respiratoire'",
      EPI_GILET_SAUVETAGE: "'gilet_sauvetage'",
    };
    for (const [ancienne, valeur] of Object.entries(attendus)) {
      expect(MIGRATION).toMatch(new RegExp(`'${ancienne}' THEN ${valeur}`));
    }
    // La valeur posée appartient bien aux réponses du type.
    const valeurs = (c: "EPI" | "PORTE_PORTAIL_MOTORISE") =>
      QUESTION_DE_TYPE[c]!.options.map((o) => `'${o.valeur}'`);
    for (const v of ["'antichute'", "'respiratoire'", "'gilet_sauvetage'", "'autre'"]) {
      expect(valeurs("EPI")).toContain(v);
    }
    for (const v of ["'porte'", "'portail'"]) {
      expect(valeurs("PORTE_PORTAIL_MOTORISE")).toContain(v);
    }
  });

  it("les propriétés de type sont exactement celles des questions de type", () => {
    expect(Object.values(QUESTION_DE_TYPE).map((q) => q!.propriete).sort()).toEqual(
      [...PROPRIETES_DE_TYPE].sort(),
    );
  });

  it("le type est exigé à la saisie, et refusé hors de sa catégorie", () => {
    const sans = equipementSchema.safeParse({ libelle: "Harnais", categorie: "EPI" });
    expect(sans.success).toBe(false);
    expect(
      equipementSchema.safeParse({ libelle: "Harnais", categorie: "EPI", typeEpi: "antichute" }).success,
    ).toBe(true);
    expect(
      equipementSchema.safeParse({ libelle: "Porte", categorie: "PORTE_PORTAIL_MOTORISE" }).success,
    ).toBe(false);
    expect(
      equipementSchema.safeParse({ libelle: "Extincteur", categorie: "EXTINCTEUR", typeEpi: "antichute" })
        .success,
    ).toBe(false);
  });
});
