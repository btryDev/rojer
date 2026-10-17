// Les autres types d'ERP en base (ADR-045, lot 2). Le moteur et les actions
// supposent un fait que seule la base garantit : jamais le premier type parmi
// eux. Hors ERP, ils sont GARDÉS (décision du 2026-10-17 : décocher « ERP »
// ne perd rien) et le moteur les ignore — pas de contrainte, et ce test
// vérifie qu'aucune ne revient. Les actions écrivent une liste
// cohérente (`typesErpAutresCoherents`) ; la base refuse le reste. Ce test fait
// le lien, comme `absence-erp.test.ts` pour le type et la catégorie : si une
// contrainte disparaît des migrations, il tombe.
//
// Éprouvé en retirant la contrainte de la migration (commit du lot).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RACINE = join(process.cwd(), "prisma");

function sqlDesMigrations(): string {
  const dir = join(RACINE, "migrations");
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      try {
        return readFileSync(join(dir, d.name, "migration.sql"), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
}

const espaces = (s: string) => s.replace(/\s+/g, " ");

describe("typesErpAutres : la colonne et sa contrainte", () => {
  const sql = espaces(sqlDesMigrations());

  it("la colonne est non nulle, vide par défaut — aucun dossier existant ne change", () => {
    expect(sql).toMatch(
      /ADD COLUMN "typesErpAutres" "TypeErp"\[\] NOT NULL DEFAULT ARRAY\[\]::"TypeErp"\[\]/,
    );
    expect(readFileSync(join(RACINE, "schema.prisma"), "utf8")).toMatch(
      /typesErpAutres\s+TypeErp\[\]\s+@default\(\[\]\)/,
    );
  });

  it("la contrainte « sans le premier type » est posée, et aucune migration ne la retire", () => {
    const nom = "Etablissement_types_erp_autres_sans_premier";
    expect(sql).toMatch(
      new RegExp(
        `ADD CONSTRAINT "${nom}" CHECK \\( "typeErp" IS NULL OR NOT \\("typeErp" = ANY \\("typesErpAutres"\\)\\) \\)`,
      ),
    );
    expect(sql).not.toMatch(new RegExp(`DROP\\s+CONSTRAINT\\s+(IF\\s+EXISTS\\s+)?"?${nom}"?`, "i"));
  });

  it("aucune contrainte ne vide les autres types hors ERP : décocher « ERP » ne perd rien", () => {
    expect(sql).not.toMatch(/CHECK \( "estERP" OR cardinality\("typesErpAutres"\)/);
  });
});
