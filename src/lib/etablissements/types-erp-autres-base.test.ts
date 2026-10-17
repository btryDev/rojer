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

  // ~~it("aucune contrainte ne vide les autres types hors ERP …") : `not.toMatch`
  // d'une écriture exacte~~ — retiré le 2026-10-17 (revue de c6) : il
  // n'interdisait qu'une rédaction, la moindre variante passait. Remplacé
  // par le test ci-dessous, qui lit toutes les contraintes de la colonne.

  it("les contraintes de la colonne sont celles-ci, et aucune ne lit le régime", () => {
    // Toute contrainte CHECK qui nomme `typesErpAutres`, quelle que soit sa
    // rédaction : aucune ne lit `estERP` (décocher « ERP » ne perd rien), et
    // une nouvelle se déclare ici, avec sa raison.
    const checks = [...sql.matchAll(/ADD CONSTRAINT "([^"]+)" CHECK \((.*?)\);/g)]
      .filter((m) => m[2].includes('"typesErpAutres"'));
    expect(checks.map((m) => m[1]).sort()).toEqual([
      "Etablissement_types_erp_autres_sans_null",
      "Etablissement_types_erp_autres_sans_premier",
    ]);
    for (const m of checks) expect(m[2], m[1]).not.toContain('"estERP"');
  });

  it("aucun élément NULL : la contrainte d'avant le laissait passer (revue de c6)", () => {
    // `'N' = ANY('{NULL}')` vaut NULL, et un CHECK NULL est satisfait. Rejoué
    // sur PGlite le 2026-10-17 : sans cette contrainte, `{O,NULL}` est accepté ;
    // avec, refusé. Éprouvé en retirant la migration : rouge.
    const nom = "Etablissement_types_erp_autres_sans_null";
    expect(sql).toMatch(
      new RegExp(`ADD CONSTRAINT "${nom}" CHECK \\( array_position\\("typesErpAutres", NULL\\) IS NULL \\)`),
    );
    expect(sql).not.toMatch(new RegExp(`DROP\\s+CONSTRAINT\\s+(IF\\s+EXISTS\\s+)?"?${nom}"?`, "i"));
  });
});
