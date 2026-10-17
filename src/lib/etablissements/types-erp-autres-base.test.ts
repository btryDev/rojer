// Les autres types d'ERP en base (ADR-045, lot 2). Le moteur et les actions
// supposent deux faits que seule la base garantit : pas d'autres types hors
// ERP, et jamais le premier type parmi eux. Les actions écrivent une liste
// cohérente (`typesErpAutresCoherents`) ; la base refuse le reste. Ce test fait
// le lien, comme `absence-erp.test.ts` pour le type et la catégorie : si une
// contrainte disparaît des migrations, il tombe.
//
// Éprouvé en retirant chaque contrainte de la migration (commit du lot).
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

describe("typesErpAutres : la colonne et ses deux contraintes", () => {
  const sql = espaces(sqlDesMigrations());

  it("la colonne est non nulle, vide par défaut — aucun dossier existant ne change", () => {
    expect(sql).toMatch(
      /ADD COLUMN "typesErpAutres" "TypeErp"\[\] NOT NULL DEFAULT ARRAY\[\]::"TypeErp"\[\]/,
    );
    expect(readFileSync(join(RACINE, "schema.prisma"), "utf8")).toMatch(
      /typesErpAutres\s+TypeErp\[\]\s+@default\(\[\]\)/,
    );
  });

  it.each([
    ["Etablissement_types_erp_autres_si_erp", /CHECK \( "estERP" OR cardinality\("typesErpAutres"\) = 0 \)/],
    [
      "Etablissement_types_erp_autres_sans_premier",
      /CHECK \( "typeErp" IS NULL OR NOT \("typeErp" = ANY \("typesErpAutres"\)\) \)/,
    ],
  ])("la contrainte %s est posée, et aucune migration ne la retire", (nom, corps) => {
    expect(sql).toMatch(new RegExp(`ADD CONSTRAINT "${nom}" ${corps.source}`));
    expect(sql).not.toMatch(new RegExp(`DROP\\s+CONSTRAINT\\s+(IF\\s+EXISTS\\s+)?"?${nom}"?`, "i"));
  });
});
