import { describe, expect, it } from "vitest";
import { friseDesTitres } from "./frise-titres";

const j = (iso: string) => new Date(`${iso}T00:00:00Z`);
const NOW = j("2026-10-24");

describe("la frise des titres", () => {
  it("couvre l'entrée, chaque délivrance et chaque échéance, et deux ans devant aujourd'hui", () => {
    const f = friseDesTitres({
      entreLe: j("2021-09-01"),
      titres: [
        { cle: "vip", delivreLe: j("2021-10-12"), echeance: j("2026-09-05") },
        { cle: "cse", delivreLe: j("2024-03-04"), echeance: j("2028-03-04") },
      ],
      now: NOW,
    });
    expect(f.debut).toEqual(j("2021-01-01"));
    expect(f.fin).toEqual(j("2029-01-01"));
    for (const c of Object.values(f.couloirs)) {
      expect(c.debut).toBeGreaterThanOrEqual(0);
      expect(c.fin!).toBeLessThanOrEqual(1);
    }
    expect(f.entree!).toBeLessThan(f.couloirs.vip.debut);
  });

  it("une VIP échue finit avant aujourd'hui, un titre valide après", () => {
    const f = friseDesTitres({
      entreLe: null,
      titres: [
        { cle: "vip", delivreLe: j("2021-10-12"), echeance: j("2026-09-05") },
        { cle: "cse", delivreLe: j("2024-03-04"), echeance: j("2028-03-04") },
      ],
      now: NOW,
    });
    expect(f.couloirs.vip.fin!).toBeLessThan(f.aujourdhui);
    expect(f.couloirs.cse.fin!).toBeGreaterThan(f.aujourdhui);
  });

  it("un titre sans échéance reste ouvert : la frise ne lui invente pas de fin", () => {
    const f = friseDesTitres({
      entreLe: null,
      titres: [{ cle: "sst", delivreLe: j("2025-01-10"), echeance: null }],
      now: NOW,
    });
    expect(f.couloirs.sst.fin).toBeNull();
  });

  it("une échéance saisie avant la délivrance ne dessine pas de barre à l'envers", () => {
    const f = friseDesTitres({
      entreLe: null,
      titres: [{ cle: "x", delivreLe: j("2025-06-01"), echeance: j("2025-01-01") }],
      now: NOW,
    });
    expect(f.couloirs.x.fin).toBe(f.couloirs.x.debut);
  });

  it("espace les graduations quand l'axe s'allonge", () => {
    const court = friseDesTitres({ entreLe: j("2024-01-01"), titres: [], now: NOW });
    const long = friseDesTitres({ entreLe: j("2004-01-01"), titres: [], now: NOW });
    expect(court.graduations.map((g) => g.annee)).toEqual([2024, 2025, 2026, 2027, 2028]);
    expect(long.graduations[1].annee - long.graduations[0].annee).toBe(5);
  });
});
