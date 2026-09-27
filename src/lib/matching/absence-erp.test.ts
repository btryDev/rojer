import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchTypologie, type EtablissementMatching } from "./index";

/**
 * L'ASYMÉTRIE D'`evaluerErp` TIENT À UNE CONTRAINTE EN BASE (2026-09-27).
 *
 * Partout ailleurs, une réponse absente retient la ligne « à confirmer »
 * (règle du non-renseigné, ADR-022). Sur la catégorie et le type d'ERP, le
 * moteur écarte. Ce n'est défendable que si le cas n'existe pas — et il
 * n'existe plus : la migration `20260927180000_etablissement_erp_type_categorie_requis`
 * interdit un ERP sans type ou sans catégorie (comptage de production du même
 * jour : zéro).
 *
 * Ce test fait le lien. Si la contrainte disparaît des migrations, il tombe :
 * l'absence redevient possible, et `evaluerErp` doit alors retenir « à
 * confirmer » au lieu d'écarter (option B de
 * `docs/revues/analyse-reponse-absente-2026-09-27.md`). Éprouvé en retirant
 * le répertoire de la migration.
 */

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const CONTRAINTE = "Etablissement_erp_type_categorie_requis";

function sqlDesMigrations(): string {
  return readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      try {
        return readFileSync(join(MIGRATIONS, d.name, "migration.sql"), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
}

describe("catégorie et type d'ERP : l'absence écarte parce que la base l'interdit", () => {
  it("une migration pose la contrainte, sur les deux colonnes, et aucune ne la retire", () => {
    const sql = sqlDesMigrations();
    const pose = new RegExp(
      `ADD CONSTRAINT "${CONTRAINTE}" CHECK \\(\\s*NOT "estERP" OR \\("typeErp" IS NOT NULL AND "categorieErp" IS NOT NULL\\)`,
    );
    expect(
      pose.test(sql),
      `La contrainte ${CONTRAINTE} manque : un ERP sans type ou sans catégorie redevient possible, et evaluerErp (engine.ts) écarterait alors ses obligations en silence. Rétablir la contrainte, ou faire retenir « à confirmer » par evaluerErp.`,
    ).toBe(true);
    // `IF EXISTS` compris (revue du lot 1).
    expect(sql).not.toMatch(new RegExp(`DROP CONSTRAINT (IF EXISTS )?"${CONTRAINTE}"`));
  });

  it("le moteur écarte bien — c'est ce comportement que la contrainte rend sûr", () => {
    const erpSansCategorie: EtablissementMatching = {
      id: "e",
      effectifSurSite: 8,
      effectifEntreprise: 8,
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
      typeErp: "N",
      categorieErp: null,
      classeIgh: null,
      familleHabitation: null,
      personnesPresentesHabituellement: null,
      manipuleMatieresR422722: null,
      comporteLocauxSommeilPublic: null,
      chiffonsImpregnes: null,
    };
    expect(matchTypologie({ erp: { categories: ["N5"] } }, erpSansCategorie).ok).toBe(false);
    expect(
      matchTypologie({ erp: { categories: ["N5"], types: ["O"] } }, { ...erpSansCategorie, typeErp: null, categorieErp: "N5" }).ok,
    ).toBe(false);
  });
});
