import { describe, expect, it } from "vitest";
import {
  autresApresChangementDuPremier,
  libelleRegimeErp,
  libelleTypesErp,
  typesErpAffiches,
} from "./types-erp-affiches";

// L'affichage des types d'ERP (ADR-045) : une seule écriture pour le PDF, le
// MCP, le registre, le widget et l'illustration. Éprouvé en ne gardant que
// `typeErp` : rouge.
describe("types d'ERP affichés", () => {
  it("le premier déclaré, puis les autres, sans doublon", () => {
    expect(typesErpAffiches({ typeErp: "O", typesErpAutres: ["N", "O", "L"] })).toEqual(["O", "N", "L"]);
    expect(typesErpAffiches({ typeErp: null, typesErpAutres: [] })).toEqual([]);
  });

  it("le libellé dit « type » au singulier et « types » au pluriel", () => {
    expect(libelleTypesErp({ typeErp: "N", typesErpAutres: [] })).toBe("type N");
    expect(libelleTypesErp({ typeErp: "O", typesErpAutres: ["N", "L"] })).toBe("types O, N, L");
    expect(libelleTypesErp({ typeErp: null, typesErpAutres: [] })).toBeNull();
  });
});

describe("le régime ERP en une ligne, au widget (revue du lot 3, R2)", () => {
  it("ERP · types N, O · cat. 3", () => {
    expect(libelleRegimeErp({ typeErp: "N", typesErpAutres: ["O"], categorieErp: "N3" })).toBe(
      "ERP · types N, O · cat. 3",
    );
    expect(libelleRegimeErp({ typeErp: "N", typesErpAutres: [], categorieErp: "N5" })).toBe(
      "ERP · type N · cat. 5",
    );
    expect(libelleRegimeErp({ typeErp: null, typesErpAutres: [], categorieErp: null })).toBe("ERP");
  });
});

describe("changer le premier type — raisonné sur la référence (revue du lot 3, C3)", () => {
  const ORDRE = ["M", "N", "O", "L"];
  const REF = { premier: "N", autres: ["O"] };
  it("un échange rend aux autres le premier type de la référence", () => {
    expect(autresApresChangementDuPremier(["O"], REF, "O", ORDRE)).toEqual(["N"]);
  });
  it("une correction ne rend rien", () => {
    expect(autresApresChangementDuPremier(["O"], REF, "M", ORDRE)).toEqual(["O"]);
  });
  it("N + O, puis M, puis O : O + N — M, type de passage, n'est jamais coché", () => {
    const apresM = autresApresChangementDuPremier(["O"], REF, "M", ORDRE);
    expect(autresApresChangementDuPremier(apresM, REF, "O", ORDRE)).toEqual(["N"]);
  });
  it("N + O, puis vide, puis O : O + N", () => {
    const apresVide = autresApresChangementDuPremier(["O"], REF, "", ORDRE);
    expect(autresApresChangementDuPremier(apresVide, REF, "O", ORDRE)).toEqual(["N"]);
  });
});
