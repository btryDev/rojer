import { describe, expect, it } from "vitest";
import {
  obligationParId,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { AIDE_GROUPE_ELECTROGENE } from "./labels";
import { CHAMPS_TRI_ETAT, VALEURS_TRI_ETAT } from "./schema";

/**
 * L'aide de la question « groupe électrogène » dit ce que chaque réponse
 * déclenche, et cite ce qui le fonde — lu dans le référentiel, pas recopié de
 * mémoire. Elle a cité EL 20 (installations temporaires) après que le
 * référentiel l'avait corrigé (C39) ; la case est devenue une question à
 * trois états le 2026-09-27 (C41).
 */
const GOUVERNEES = [
  "elec-erp-groupe-electrogene-annuel",
  "elec-erp-groupe-electrogene-quinzaine",
];

describe("aide de la question groupe électrogène", () => {
  it("ne cite pas EL 20", () => {
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/EL\s*20\b/);
  });

  it("est une question à trois états", () => {
    expect(CHAMPS_TRI_ETAT).toContain("aGroupeElectrogene");
  });

  it("gouverne les deux lignes d'EL 18 § 4, par une condition qui survit au silence", () => {
    const gouvernees = obligationsConformite.filter((o) =>
      (o.conditions ?? []).some(
        (c) => "propriete" in c && c.propriete === "aGroupeElectrogene",
      ),
    );
    expect(gouvernees.map((o) => o.id).sort()).toEqual(GOUVERNEES);
    for (const o of gouvernees) {
      expect(o.conditions, o.id).toEqual([
        {
          type: "equipement_propriete_non_infirmee",
          categorie: "INSTALLATION_ELECTRIQUE",
          propriete: "aGroupeElectrogene",
        },
      ]);
      expect(o.referencesLegales[0].reference, o.id).toContain("EL 18 § 4");
    }
  });

  it("dit le rythme de chacune, lu dans le référentiel", () => {
    expect(obligationParId("elec-erp-groupe-electrogene-annuel")!.periodicite).toBe(
      "mensuelle",
    );
    expect(
      obligationParId("elec-erp-groupe-electrogene-quinzaine")!.periodicite,
    ).toBe("bimensuelle");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("art. EL 18 § 4");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("chaque mois");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("toutes les deux semaines");
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/annuel/i);
    // Rien hors ERP : les deux lignes portent `erp: true`, le texte le dit.
    expect(AIDE_GROUPE_ELECTROGENE).toContain("recevant du public seulement");
    // Plus de case : le texte ne peut plus parler de « cochée ».
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/coch/i);
  });

  it("nomme les trois réponses par les libellés mêmes du menu", () => {
    const citees = [...AIDE_GROUPE_ELECTROGENE.matchAll(/« ([^»]+) »/g)].map(
      (m) => m[1],
    );
    const libelles: string[] = VALEURS_TRI_ETAT.map((v) => v.label);
    expect(new Set(citees)).toEqual(new Set(libelles));
  });

  it("porte la réserve du livre II, comme la référence de la ligne", () => {
    for (const id of GOUVERNEES) {
      expect(obligationParId(id)!.referencesLegales[0].reference).toMatch(
        /livre II(?!I)/,
      );
    }
    expect(AIDE_GROUPE_ELECTROGENE).toMatch(/livre II(?!I)/);
  });
});
