import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ligneInspectionZip } from "./annonces-zip";

const fmt = (d: Date) => d.toISOString().slice(0, 10);

describe("inspection commune dans le ZIP : Rojer ne sait pas ≠ pas fait", () => {
  it("une date saisie s'imprime", () => {
    expect(ligneInspectionZip(new Date("2026-09-01T00:00:00Z"), fmt)).toBe(
      "  Inspection commune : 2026-09-01",
    );
  });

  it("sans date, la ligne dit ce qui manque — la saisie — et n'affirme rien de l'inspection", () => {
    const l = ligneInspectionZip(null, fmt);
    expect(l).toBe("  Inspection commune : date non renseignée");
    expect(l.toLowerCase()).not.toMatch(/réalis|faite|effectu/);
  });

  it("la route imprime cette ligne, et aucune autre formulation", () => {
    const route = readFileSync(
      "src/app/api/etablissements/[id]/controle-zip/route.ts",
      "utf8",
    );
    expect(route).toContain("ligneInspectionZip(p.inspectionDate, formaterDateFr)");
    expect(route).not.toMatch(/Inspection commune :/);
  });
});
