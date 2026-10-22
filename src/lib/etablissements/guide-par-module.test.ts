import { describe, expect, it } from "vitest";
import { FAITS_ACTIVITE } from "./faits-activite";
import { enumerer, FOYER_DE_LA_QUESTION, precisionsManquantes } from "./guide-par-module";

describe("guide par module", () => {
  it("renvoie chaque fait d'activité au DUERP, qui les pose tous", () => {
    // Les cinq faits du registre ont une question dans l'étape transverse :
    // s'il en naît un sixième sans foyer DUERP, ce test le dit.
    const duerp = precisionsManquantes(
      "duerp",
      ["manutention_manuelle", "travail_ecran", "operations_electriques", "conduite_engins", "exposition_cmr"],
      true,
    );
    expect(duerp).toHaveLength(FAITS_ACTIVITE.length);
  });

  it("ne range aucune question de la fiche sous le DUERP", () => {
    expect(
      precisionsManquantes("duerp", ["matieres_r4227_22", "personnes_presentes", "ssi_categorie_ab"], false),
    ).toEqual([]);
  });

  it("range les questions de la fiche sous la fiche", () => {
    expect(
      precisionsManquantes("fiche", ["matieres_r4227_22", "manutention_manuelle"], true),
    ).toEqual(["matières inflammables"]);
  });

  it("relance la présence d'EPI tant qu'elle n'a pas de réponse, même non marquée", () => {
    expect(precisionsManquantes("fiche", [], false)).toEqual(["équipements de protection"]);
    expect(precisionsManquantes("fiche", [], true)).toEqual([]);
  });

  it("donne un nom court à chaque question", () => {
    for (const { nomCourt } of Object.values(FOYER_DE_LA_QUESTION)) {
      expect(nomCourt.length).toBeGreaterThan(0);
    }
  });

  it("énumère en français", () => {
    expect(enumerer([])).toBe("");
    expect(enumerer(["a"])).toBe("a");
    expect(enumerer(["a", "b"])).toBe("a et b");
    expect(enumerer(["a", "b", "c"])).toBe("a, b et c");
  });
});
