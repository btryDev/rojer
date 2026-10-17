import { describe, expect, it } from "vitest";
import {
  autresApresChangementDuPremier,
  libelleRegimeErp,
  libelleTypesErp,
  typesErpDe,
} from "./types-erp-affiches";

// L'affichage des types d'ERP (ADR-045) : une seule écriture pour le PDF, le
// MCP, le registre, le widget et l'illustration. Éprouvé en ne gardant que
// `typeErp` : rouge.
describe("types d'ERP affichés", () => {
  it("le premier déclaré, puis les autres, sans doublon", () => {
    expect(typesErpDe({ typeErp: "O", typesErpAutres: ["N", "O", "L"] })).toEqual(["O", "N", "L"]);
    expect(typesErpDe({ typeErp: null, typesErpAutres: [] })).toEqual([]);
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

describe("changer le premier type — sur l'état courant (relecture du lot 3)", () => {
  const ORDRE = ["M", "N", "O", "L"];
  const change = (autres: string[], ancien: string, nouveau: string) =>
    autresApresChangementDuPremier(autres, ancien, nouveau, ORDRE);
  it("N + O, puis O : O + N", () => {
    expect(change(["O"], "N", "O")).toEqual(["N"]);
  });
  it("N + O, puis O, puis N : N + O — l'aller-retour ne perd rien", () => {
    expect(change(change(["O"], "N", "O"), "O", "N")).toEqual(["O"]);
  });
  it("N + O, puis M (une correction), puis O : O + M", () => {
    const apresM = change(["O"], "N", "M");
    expect(apresM).toEqual(["O"]);
    expect(change(apresM, "M", "O")).toEqual(["M"]);
  });
  it("un premier type vide ne revient pas parmi les autres", () => {
    expect(change(["O"], "", "O")).toEqual([]);
  });
});
