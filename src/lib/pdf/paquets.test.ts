import { describe, expect, it } from "vitest";
import { enPaquets, feuillesParAnnee, lignesDuRapport } from "./paquets";

describe("enPaquets", () => {
  it("ne perd ni ne réordonne aucune ligne", () => {
    const items = Array.from({ length: 23 }, (_, i) => i);
    const paquets = enPaquets(items, 10);
    expect(paquets.map((p) => p.length)).toEqual([10, 10, 3]);
    expect(paquets.flat()).toEqual(items);
  });

  it("une liste vide donne zéro paquet", () => {
    expect(enPaquets([], 10)).toEqual([]);
  });

  it("refuse une taille qui ne découpe rien", () => {
    expect(() => enPaquets([1], 0)).toThrow();
    expect(() => enPaquets([1], 1.5)).toThrow();
  });
});

describe("feuillesParAnnee", () => {
  /** `n` lignes datées de l'année `annee`, à midi UTC. */
  const de = (annee: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({ annee, i, d: new Date(Date.UTC(annee, 5, 1, 12)) }));
  const resume = (f: ReturnType<typeof feuillesParAnnee<{ d: Date }>>) =>
    f.map((feuille) =>
      feuille.map((s) => `${s.annee}${s.suite ? "+" : ""}:${s.lignes.length}/${s.total}`),
    );

  it("met plusieurs années courtes sur la même feuille", () => {
    const items = [...de(2026, 3), ...de(2025, 2), ...de(2024, 1)];
    expect(resume(feuillesParAnnee(items, (x) => x.d, 10))).toEqual([
      ["2026:3/3", "2025:2/2", "2024:1/1"],
    ]);
  });

  it("étend une année longue sur plusieurs feuilles, et dit la suite", () => {
    const items = [...de(2026, 25), ...de(2025, 3)];
    expect(resume(feuillesParAnnee(items, (x) => x.d, 10))).toEqual([
      ["2026:10/25"],
      ["2026+:10/25"],
      ["2026+:5/25", "2025:3/3"],
    ]);
  });

  it("ne perd ni ne réordonne aucune ligne, même si l'entrée n'est pas triée", () => {
    const items = [...de(2026, 2), ...de(2025, 2), ...de(2026, 1)];
    const feuilles = feuillesParAnnee(items, (x) => x.d, 10);
    expect(feuilles.flat().flatMap((s) => s.lignes)).toEqual(items);
    expect(resume(feuilles)).toEqual([["2026:2/2", "2025:2/2", "2026:1/1"]]);
  });

  it("lit l'année en heure de Paris, pas en UTC", () => {
    // 31 décembre 23:30 UTC = 1er janvier 00:30 à Paris.
    const [[s]] = feuillesParAnnee([{ d: new Date("2025-12-31T23:30:00Z") }], (x) => x.d);
    expect(s.annee).toBe(2026);
  });

  it("aucune ligne, aucune feuille", () => {
    expect(feuillesParAnnee([], (x: { d: Date }) => x.d)).toEqual([]);
  });
});

describe("feuillesParAnnee — au poids des lignes (revue finale de la PR #286)", () => {
  const de = (n: number, poids: number) =>
    Array.from({ length: n }, (_, i) => ({ i, poids, d: new Date(Date.UTC(2026, 5, 1, 12)) }));

  it("une feuille ne dépasse jamais la taille en lignes pesées", () => {
    const feuilles = feuillesParAnnee(de(100, 5), (x) => x.d, 100, (x) => x.poids);
    const poidsParFeuille = feuilles.map((f) => f.flatMap((s) => s.lignes).reduce((n, x) => n + x.poids, 0));
    expect(Math.max(...poidsParFeuille)).toBeLessThanOrEqual(100);
    expect(poidsParFeuille).toEqual([100, 100, 100, 100, 100]);
  });

  it("un élément n'est jamais coupé ; plus lourd que la taille, il a sa feuille", () => {
    const items = [{ i: 0, poids: 30 }, { i: 1, poids: 150 }, { i: 2, poids: 30 }].map((x) => ({
      ...x,
      d: new Date(Date.UTC(2026, 5, 1, 12)),
    }));
    const feuilles = feuillesParAnnee(items, (x) => x.d, 100, (x) => x.poids);
    expect(feuilles.map((f) => f.flatMap((s) => s.lignes).map((x) => x.i))).toEqual([[0], [1], [2]]);
    expect(feuilles.flat().flatMap((s) => s.lignes)).toEqual(items);
  });

  it("le poids d'un rapport : sa ligne, ses points, la mention de R. 4226-19 en électricité", () => {
    expect(lignesDuRapport({ points: [], domaine: "electricite" })).toBe(1);
    expect(lignesDuRapport({ points: [1, 2, 3, 4], domaine: "incendie" })).toBe(5);
    expect(lignesDuRapport({ points: [1, 2, 3, 4, 5, 6], domaine: "electricite" })).toBe(8);
  });
});
