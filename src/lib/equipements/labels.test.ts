import { describe, expect, it } from "vitest";
import {
  obligationParId,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { AIDE_GROUPE_ELECTROGENE } from "./labels";

/**
 * L'aide de la case « groupe électrogène » dit ce que la case déclenche, et
 * cite ce qui le fonde — lu dans le référentiel, pas recopié de mémoire. Elle a
 * cité EL 20 (installations temporaires) après que le référentiel l'avait
 * corrigé : c'est ce décalage que ce test ferme (C39).
 */
describe("aide de la case groupe électrogène", () => {
  it("ne cite pas EL 20", () => {
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/EL\s*20\b/);
  });

  it("parle de la seule ligne que la case gouverne, avec son article fondateur et son rythme", () => {
    const gouvernees = obligationsConformite.filter((o) =>
      (o.conditions ?? []).some(
        (c) => "propriete" in c && c.propriete === "aGroupeElectrogene",
      ),
    );
    expect(gouvernees.map((o) => o.id)).toEqual([
      "elec-erp-groupe-electrogene-annuel",
    ]);
    const o = obligationParId("elec-erp-groupe-electrogene-annuel")!;
    expect(o.periodicite).toBe("mensuelle");
    expect(o.referencesLegales[0].reference).toContain("EL 18 § 4");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("art. EL 18 § 4");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("chaque mois");
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/annuel|quinze/i);
  });

  it("porte la réserve du livre II, comme la référence de la ligne", () => {
    const o = obligationParId("elec-erp-groupe-electrogene-annuel")!;
    expect(o.referencesLegales[0].reference).toMatch(/livre II(?!I)/);
    expect(AIDE_GROUPE_ELECTROGENE).toMatch(/livre II(?!I)/);
  });
});
