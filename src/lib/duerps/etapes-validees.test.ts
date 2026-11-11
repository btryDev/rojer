import { describe, expect, it } from "vitest";
import { avecValidations, etapeSuivante, lireEtapesValidees } from "./etapes-validees";

describe("lireEtapesValidees", () => {
  it("rien, ou autre chose qu'un objet : aucune étape validée", () => {
    for (const brut of [null, undefined, "x", 3, ["activite"]]) {
      expect(lireEtapesValidees(brut)).toEqual({});
    }
  });

  it("ne garde que les étapes connues portant une date", () => {
    expect(
      lireEtapesValidees({
        unites: "2026-11-11T10:00:00.000Z",
        risques: true,
        transverses: "pas une date",
        synthese: "2026-11-11T10:00:00.000Z",
      }),
    ).toEqual({ unites: "2026-11-11T10:00:00.000Z" });
  });
});

describe("avecValidations", () => {
  it("ajoute une validation sans toucher aux autres, et la retire", () => {
    const quand = new Date("2026-11-11T10:00:00.000Z");
    const v = avecValidations({ unites: "2026-11-10T10:00:00.000Z" }, { activite: quand });
    expect(v).toEqual({
      unites: "2026-11-10T10:00:00.000Z",
      activite: "2026-11-11T10:00:00.000Z",
    });
    expect(avecValidations(v, { activite: null, unites: null })).toEqual({});
  });
});

describe("etapeSuivante", () => {
  it("suit l'ordre du fil, jusqu'à la synthèse", () => {
    expect(etapeSuivante("activite")).toBe("unites");
    expect(etapeSuivante("transverses")).toBe("synthese");
  });
});
