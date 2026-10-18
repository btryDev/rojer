import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LABEL_COURT_SOURCE_PRESCRIPTION,
  LABEL_SOURCE_PRESCRIPTION,
  MARQUAGE_CONTRACTUEL,
  SOURCES_PRESCRIPTION,
  estEcheanceContractuelle,
  estSourceContractuelle,
} from "./sources";

/**
 * ADR-032. Ce que ces tests protègent tient en une phrase : le produit peut
 * recevoir une demande d'assureur, et il ne peut jamais la servir comme du
 * droit.
 *
 * Trois couches, séparées à dessein — une liste exhaustive des ~~six~~
 * [2026-10-18 : deux] sources se
 * réparerait en la recopiant, et cesserait alors de vérifier quoi que ce soit.
 */

describe("sources de prescription — la borne basse", () => {
  it("la demande d'assureur est contractuelle", () => {
    expect(estSourceContractuelle("demande_assureur")).toBe(true);
  });

  it("le marquage nomme les deux moitiés : ce que la ligne engage, et ce qu'elle n'engage pas", () => {
    // Un marquage qui dirait seulement « engagement d'assurance » laisserait
    // le lecteur libre de supposer que c'est aussi une obligation légale.
    expect(MARQUAGE_CONTRACTUEL.toLowerCase()).toContain("assurance");
    expect(MARQUAGE_CONTRACTUEL.toLowerCase()).toContain(
      "pas une obligation légale",
    );
  });
});

describe("sources de prescription — la borne haute", () => {
  it("une seule source est contractuelle, et c'est la demande d'assureur", () => {
    // Ce test tombe dans les deux sens : si un acte d'autorité entre dans la
    // liste contractuelle — un arrêté préfectoral marqué « engagement
    // d'assurance » sous-dirait une obligation réelle —, et si la demande
    // d'assureur en sort, ce qui la ferait passer pour du droit. C'est la
    // ligne que l'ADR-032 refuse de franchir dans les deux directions.
    expect(SOURCES_PRESCRIPTION.filter(estSourceContractuelle)).toEqual([
      "demande_assureur",
    ]);
  });

  it("une source inconnue n'est pas contractuelle", () => {
    // Le prédicat accepte `string` : une valeur venue d'une lecture qui a
    // dérivé doit répondre « non », pas faire tomber un rendu. L'erreur va
    // alors dans le sens visible — la ligne s'affiche sans marquage, et son
    // libellé de source, lui, ne compile pas s'il manque.
    expect(estSourceContractuelle("arrete_du_prefet_de_police")).toBe(false);
    expect(estSourceContractuelle("")).toBe(false);
  });
});

describe("sources de prescription — la couche voisine", () => {
  it("chaque source a un libellé, et aucun n'est vide", () => {
    // Le cliquet réel est le type (`Record<SourcePrescription, string>`) :
    // une source sans libellé ne compile pas. Ce test attrape ce que le type
    // laisse passer — une entrée présente mais vide, qui afficherait un
    // sélecteur muet.
    for (const s of SOURCES_PRESCRIPTION) {
      expect(LABEL_SOURCE_PRESCRIPTION[s].trim().length).toBeGreaterThan(0);
    }
  });

  it("une échéance sans prescription n'est jamais marquée", () => {
    expect(estEcheanceContractuelle({ prescription: null })).toBe(false);
    expect(estEcheanceContractuelle({})).toBe(false);
  });

  it("une échéance née d'un acte d'autorité n'est jamais marquée", () => {
    expect(
      estEcheanceContractuelle({
        prescription: { source: "autre" },
      }),
    ).toBe(false);
  });

  it("une échéance née d'une demande d'assureur est marquée", () => {
    expect(
      estEcheanceContractuelle({
        prescription: { source: "demande_assureur" },
      }),
    ).toBe(true);
  });
});

// 2026-10-18, décision de la propriétaire : deux sources, « demande de
// l'assureur » et « autre ». Un acte d'autorité reçu se saisit en « Autre ».

const SCHEMA = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
const MIGRATION = readFileSync(
  join(process.cwd(), "prisma/migrations/20261018090000_sources_prescription_deux/migration.sql"),
  "utf8",
);
/**
 * Les valeurs que l'enum portait AVANT cette migration, relues dans les
 * migrations qui l'ont construit — pas recopiées : une liste écrite à la main
 * se réparerait en même temps que la migration qu'elle prétend vérifier.
 */
function valeursAvant(nomMigration: string): string[] {
  const dossier = join(process.cwd(), "prisma/migrations");
  const valeurs: string[] = [];
  for (const m of readdirSync(dossier).filter((d) => d < nomMigration).sort()) {
    let sql: string;
    try {
      sql = readFileSync(join(dossier, m, "migration.sql"), "utf8");
    } catch {
      continue;
    }
    const cree = /CREATE TYPE "SourcePrescription" AS ENUM \(([^)]*)\)/.exec(sql);
    if (cree) valeurs.splice(0, valeurs.length, ...[...cree[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    for (const x of sql.matchAll(/ALTER TYPE "SourcePrescription" ADD VALUE (?:IF NOT EXISTS )?'([^']+)'/g)) {
      if (!valeurs.includes(x[1])) valeurs.push(x[1]);
    }
  }
  return valeurs;
}

const ANCIENNES = valeursAvant("20261018090000_sources_prescription_deux").filter(
  (v) => !(SOURCES_PRESCRIPTION as readonly string[]).includes(v),
);

/** Les sources que l'UPDATE convertit : celles du `CASE`, et celles du `WHERE`. */
function convertiesPar(migration: string): { cas: string[]; ou: string[] } {
  const update = /UPDATE "PrescriptionParticuliere"[\s\S]*?;/.exec(migration)?.[0] ?? "";
  const cas = [...update.matchAll(/WHEN '([^']+)' THEN/g)].map((x) => x[1]);
  const ou = [...(/WHERE "source"::text IN \(([^)]*)\)/.exec(update)?.[1] ?? "").matchAll(/'([^']+)'/g)].map(
    (x) => x[1],
  );
  return { cas, ou };
}

function valeursEnumPrisma(schema: string): string[] {
  const bloc = /enum SourcePrescription \{([^}]*)\}/.exec(schema)?.[1] ?? "";
  return bloc
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, "").trim())
    .filter(Boolean);
}

describe("deux sources (2026-10-18)", () => {
  it("l'enum Prisma et le code disent les mêmes sources, dans le même ordre", () => {
    expect(valeursEnumPrisma(SCHEMA)).toEqual([...SOURCES_PRESCRIPTION]);
  });

  it("cassure : une valeur de plus dans l'enum Prisma est vue", () => {
    const casse = SCHEMA.replace("enum SourcePrescription {\n  demande_assureur", "enum SourcePrescription {\n  arrete_prefectoral\n  demande_assureur");
    expect(valeursEnumPrisma(casse)).not.toEqual([...SOURCES_PRESCRIPTION]);
  });

  it("la migration passe chaque ancienne source en `autre`, son libellé préfixé, AVANT de changer le type", () => {
    const update = MIGRATION.indexOf('UPDATE "PrescriptionParticuliere"');
    const bascule = MIGRATION.indexOf('ALTER COLUMN "source" TYPE');
    expect(update).toBeGreaterThan(-1);
    expect(bascule).toBeGreaterThan(update);
    for (const s of ANCIENNES) expect(MIGRATION, s).toMatch(new RegExp(`WHEN '${s}' THEN '[^']+(?:''[^']+)* — '`));
    expect(MIGRATION).toMatch(/"source" = 'autre'/);
    expect(MIGRATION).toMatch(/CREATE TYPE "SourcePrescription" AS ENUM \('demande_assureur', 'autre'\)/);
  });

  it("chaque ancienne valeur figure à la fois dans le `CASE` et dans le `WHERE` — et aucune autre", () => {
    // Borne basse : les anciennes valeurs sont bien relues (cinq, de
    // `arrete_prefectoral` à `inspection_travail`).
    expect(ANCIENNES.length).toBeGreaterThanOrEqual(5);
    expect(ANCIENNES).toContain("arrete_icpe");
    const { cas, ou } = convertiesPar(MIGRATION);
    expect([...cas].sort()).toEqual([...ANCIENNES].sort());
    expect([...ou].sort()).toEqual([...ANCIENNES].sort());
  });

  it("cassure : une valeur retirée du `WHERE` (ou du `CASE`) est vue", () => {
    const sansWhere = MIGRATION.replace(", 'arrete_icpe', 'inspection_travail');", ", 'inspection_travail');");
    expect(sansWhere).not.toBe(MIGRATION);
    expect([...convertiesPar(sansWhere).ou].sort()).not.toEqual([...ANCIENNES].sort());
    const sansCase = MIGRATION.replace(/\s*WHEN 'arrete_icpe' THEN [^\n]*/, "");
    expect(sansCase).not.toBe(MIGRATION);
    expect([...convertiesPar(sansCase).cas].sort()).not.toEqual([...ANCIENNES].sort());
  });

  it("le libellé « Autre » dit où va un acte d'autorité reçu", () => {
    expect(LABEL_SOURCE_PRESCRIPTION.autre).toMatch(/arrêté/);
    expect(LABEL_SOURCE_PRESCRIPTION.autre).toMatch(/commission de sécurité/);
  });
});

describe("la liste des prescriptions dit la source en court (revue du 2026-10-18)", () => {
  it("« Autre acte », sans la consigne du sélecteur", () => {
    expect(LABEL_COURT_SOURCE_PRESCRIPTION.autre).toBe("Autre acte");
    expect(LABEL_COURT_SOURCE_PRESCRIPTION.autre).not.toMatch(/\(/);
  });

  it("la page de liste lit le libellé court, pas celui du sélecteur", () => {
    const page = readFileSync(join(process.cwd(), "src/app/etablissements/[id]/prescriptions/page.tsx"), "utf8");
    expect(page).toMatch(/LABEL_COURT_SOURCE_PRESCRIPTION\[/);
    expect(page).not.toMatch(/\bLABEL_SOURCE_PRESCRIPTION\b/);
  });
});
