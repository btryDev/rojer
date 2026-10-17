import { describe, expect, it } from "vitest";
import { regimesTexte } from "./builders";

// La ligne « Régimes » du dossier de conformité (PDF). ADR-045 : tous les
// types déclarés, dans la forme d'avant, au pluriel s'il y en a plusieurs —
// sans « · », la ligne est une liste à virgules (revue du lot 3). Éprouvé en
// remettant libelleRegimeErp : rouge.
const base = {
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  classeIgh: null,
};

describe("regimesTexte", () => {
  it("un type : la forme de main", () => {
    expect(regimesTexte({ ...base, typeErp: "N", typesErpAutres: [], categorieErp: "N5" })).toBe(
      "Établissement de travail, ERP type N cat. 5",
    );
  });

  it("plusieurs types : au pluriel, sans « · »", () => {
    expect(regimesTexte({ ...base, typeErp: "N", typesErpAutres: ["O"], categorieErp: "N3" })).toBe(
      "Établissement de travail, ERP types N, O cat. 3",
    );
  });
});
