import { describe, expect, it } from "vitest";
import { ligneExportPdf, niveauExportPdf, type ExportPdf } from "./export-pdf";

const base: ExportPdf = {
  document: "registre",
  total: 100,
  plusGrosBloc: 50,
  seuilTotal: 1_000,
  seuilBloc: 400,
  dureeMs: 1234.6,
  issue: "ok",
};

describe("niveauExportPdf", () => {
  it("info sous la moitié des deux seuils", () => {
    expect(niveauExportPdf(base)).toBe("info");
    expect(niveauExportPdf({ ...base, total: 499, plusGrosBloc: 199 })).toBe("info");
  });

  it("warn dès la moitié d'un seuil, l'un ou l'autre", () => {
    expect(niveauExportPdf({ ...base, total: 500 })).toBe("warn");
    expect(niveauExportPdf({ ...base, plusGrosBloc: 200 })).toBe("warn");
  });

  it("warn pour un refus, error pour un échec", () => {
    expect(niveauExportPdf({ ...base, issue: "trop_volumineux" })).toBe("warn");
    expect(niveauExportPdf({ ...base, issue: "echec" })).toBe("error");
  });
});

describe("ligneExportPdf", () => {
  it("rend une ligne JSON, durée arrondie, sans autre champ", () => {
    const ligne = ligneExportPdf(base);
    expect(ligne).not.toContain("\n");
    expect(JSON.parse(ligne)).toEqual({
      niveau: "info",
      evenement: "export_pdf",
      document: "registre",
      total: 100,
      plusGrosBloc: 50,
      seuilTotal: 1_000,
      seuilBloc: 400,
      dureeMs: 1235,
      issue: "ok",
    });
  });
});
