import { describe, expect, it } from "vitest";
import { avecValidation, lireEtapesValidees } from "./etapes-validees";

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

describe("avecValidation", () => {
  it("ajoute une validation sans toucher aux autres, et la retire", () => {
    const quand = new Date("2026-11-11T10:00:00.000Z");
    const v = avecValidation({ unites: "2026-11-10T10:00:00.000Z" }, "activite", quand);
    expect(v).toEqual({
      unites: "2026-11-10T10:00:00.000Z",
      activite: "2026-11-11T10:00:00.000Z",
    });
    expect(avecValidation(v, "activite", null)).toEqual({
      unites: "2026-11-10T10:00:00.000Z",
    });
  });
});
