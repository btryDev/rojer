import { describe, expect, it } from "vitest";
import { libelleTypesErp, typesErpAffiches } from "./types-erp-affiches";

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
