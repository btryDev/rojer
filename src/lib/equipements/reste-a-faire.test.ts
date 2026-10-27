import { describe, expect, it } from "vitest";
import { GESTE_DATE, GESTE_USAGE, gestesDeLAppareil, resteAFaireDuParc } from "./reste-a-faire";

describe("resteAFaireDuParc — une ligne par geste, jamais par appareil", () => {
  it("compte les équipements concernés par geste", () => {
    expect(resteAFaireDuParc({ nbAPreciser: 2, nbADater: 5, nbEquipements: 7, nbSuggestions: 3 })).toEqual([
      { cle: "usage", texte: "Préciser l'usage de 2 équipements" },
      {
        cle: "dates",
        texte: "Renseigner la date du dernier contrôle (ou de mise en service) de 5 équipements",
      },
    ]);
  });

  it("accorde au singulier", () => {
    expect(resteAFaireDuParc({ nbAPreciser: 1, nbADater: 0, nbEquipements: 1, nbSuggestions: 0 })).toEqual([
      { cle: "usage", texte: "Préciser l'usage de 1 équipement" },
    ]);
  });

  it("propose les suggestions tant qu'aucun équipement n'est déclaré", () => {
    expect(resteAFaireDuParc({ nbAPreciser: 0, nbADater: 0, nbEquipements: 0, nbSuggestions: 3 })).toEqual([
      { cle: "suggestions", texte: "Déclarer vos équipements" },
    ]);
  });

  // Le défaut relevé le 2026-10-27 : une suggestion écartée restait à vie.
  it("ne garde plus les suggestions dès le premier équipement déclaré", () => {
    expect(resteAFaireDuParc({ nbAPreciser: 0, nbADater: 0, nbEquipements: 1, nbSuggestions: 3 })).toEqual([]);
  });
});

describe("gestesDeLAppareil", () => {
  it("l'usage d'abord, puis la date ; rien quand tout est rempli", () => {
    expect(gestesDeLAppareil({ questionsSansReponse: 2, controlesSansDate: 1 })).toEqual([GESTE_USAGE, GESTE_DATE]);
    expect(gestesDeLAppareil({ questionsSansReponse: 0, controlesSansDate: 3 })).toEqual([GESTE_DATE]);
    expect(gestesDeLAppareil({ questionsSansReponse: 0, controlesSansDate: 0 })).toEqual([]);
  });
});
