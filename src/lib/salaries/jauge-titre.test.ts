import { describe, expect, it } from "vitest";
import { jaugeDuTitre } from "./jauge-titre";

const j = (iso: string) => new Date(`${iso}T12:00:00Z`);
const NOW = j("2026-10-24");

describe("la jauge d'un titre", () => {
  it("dit le temps restant en années et mois, et se remplit à proportion", () => {
    const g = jaugeDuTitre({ delivreLe: j("2024-05-06"), echeance: j("2029-05-06") }, NOW);
    expect(g.phrase).toBe("Encore 2 ans et 6 mois");
    expect(g.ecoule!).toBeGreaterThan(0.45);
    expect(g.ecoule!).toBeLessThan(0.55);
  });

  it("passe aux jours sous un mois", () => {
    expect(jaugeDuTitre({ delivreLe: j("2021-11-10"), echeance: j("2026-11-10") }, NOW).phrase).toBe(
      "Encore 17 jours",
    );
  });

  it("dit le dépassement en jours, jauge pleine", () => {
    const g = jaugeDuTitre({ delivreLe: j("2021-10-12"), echeance: j("2026-09-05") }, NOW);
    expect(g).toEqual({ ecoule: 1, phrase: "Dépassée depuis 49 jours" });
  });

  it("le jour de l'échéance n'est pas un retard (ADR-011)", () => {
    expect(jaugeDuTitre({ delivreLe: j("2021-10-24"), echeance: j("2026-10-24") }, NOW).phrase).toBe(
      "Échéance aujourd'hui",
    );
  });

  it("sans échéance, pas de jauge à remplir", () => {
    expect(jaugeDuTitre({ delivreLe: j("2025-02-10"), echeance: null }, NOW)).toEqual({
      ecoule: null,
      phrase: "Sans échéance",
    });
  });

  it("accorde au singulier", () => {
    expect(jaugeDuTitre({ delivreLe: j("2024-01-01"), echeance: j("2027-10-24") }, NOW).phrase).toBe(
      "Encore 1 an",
    );
  });
});
