import { describe, expect, it } from "vitest";
import { cleJourCivil, depuisCleJourCivil } from "@/lib/dates";
import { lireDateDeclaree } from "./date-declaree";

const NOW = depuisCleJourCivil("2026-09-27");

describe("une date déclarée (C45)", () => {
  it("le champ vide efface la trace, et ne vaut jamais une date", () => {
    for (const vide of ["", "  ", null, undefined]) {
      expect(lireDateDeclaree(vide, NOW), String(vide)).toEqual({
        ok: true,
        date: null,
      });
    }
  });

  it("accepte aujourd'hui et le passé, au jour civil près", () => {
    const r = lireDateDeclaree("2026-09-27", NOW);
    expect(r.ok && r.date && cleJourCivil(r.date)).toBe("2026-09-27");
    const p = lireDateDeclaree("2024-02-29", NOW);
    expect(p.ok && p.date && cleJourCivil(p.date)).toBe("2024-02-29");
  });

  it("refuse demain : l'acte est un fait accompli", () => {
    expect(lireDateDeclaree("2026-09-28", NOW)).toEqual({
      ok: false,
      message: "La date ne peut pas être dans le futur",
    });
  });

  it("refuse une date qui n'existe pas, et un format étranger", () => {
    expect(lireDateDeclaree("2026-02-30", NOW).ok).toBe(false);
    expect(lireDateDeclaree("27/09/2026", NOW).ok).toBe(false);
    expect(lireDateDeclaree(42, NOW).ok).toBe(false);
  });
});
