import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * La borne de `parserFichierDuerp` doit être passée à SheetJS lui-même : un
 * refus posé après une lecture complète laisserait un classeur très compressé
 * déplier toutes ses cellules en mémoire avant d'être refusé (audit OWASP du
 * 2026-10-13, S5). On observe les options reçues par `XLSX.read`, sans rien
 * changer à ce qu'il rend.
 */
const lectures = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock("xlsx", async (importOriginal) => {
  const vrai = await importOriginal<typeof import("xlsx")>();
  return {
    ...vrai,
    read: (data: unknown, opts?: Record<string, unknown>) => {
      lectures.push({ ...(opts ?? {}) });
      return vrai.read(data as never, opts as never);
    },
  };
});

import * as XLSX from "xlsx";
import { LIGNES_MAX_IMPORT, parserFichierDuerp } from "./parser";

describe("parserFichierDuerp — lecture bornée par SheetJS", () => {
  beforeEach(() => {
    lectures.length = 0;
  });

  it("un CSV est lu avec sheetRows = en-tête + borne + sentinelle", () => {
    parserFichierDuerp(Buffer.from("Unité de travail;Risque\nA;B", "utf8"));
    expect(lectures).toHaveLength(1);
    expect(lectures[0].sheetRows).toBe(LIGNES_MAX_IMPORT + 2);
  });

  it("un .xlsx est lu avec la même borne", () => {
    const ws = XLSX.utils.aoa_to_sheet([["Unité de travail", "Risque"], ["A", "B"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DUERP");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    lectures.length = 0; // `write` n'appelle pas `read`, mais on part de zéro
    parserFichierDuerp(buf);
    expect(lectures).toHaveLength(1);
    expect(lectures[0].sheetRows).toBe(LIGNES_MAX_IMPORT + 2);
  });
});
