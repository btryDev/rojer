import { describe, expect, it } from "vitest";
import { enPaquets, parAnneeCivile } from "./paquets";

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

describe("parAnneeCivile", () => {
  const le = (iso: string) => ({ d: new Date(iso) });

  it("regroupe par année dans l'ordre d'entrée, et compte chaque année", () => {
    const items = [le("2026-03-01T10:00:00Z"), le("2026-01-02T10:00:00Z"), le("2025-12-01T10:00:00Z")];
    const tranches = parAnneeCivile(items, (x) => x.d, 10);
    expect(tranches.map((t) => [t.annee, t.total])).toEqual([[2026, 2], [2025, 1]]);
    expect(tranches.flatMap((t) => t.paquets.flat())).toEqual(items);
  });

  it("lit l'année en heure de Paris, pas en UTC", () => {
    // 31 décembre 23:30 UTC = 1er janvier 00:30 à Paris.
    const [t] = parAnneeCivile([le("2025-12-31T23:30:00Z")], (x) => x.d);
    expect(t.annee).toBe(2026);
  });

  it("coupe une grosse année en paquets sans rien perdre", () => {
    const items = Array.from({ length: 250 }, (_, i) => ({ d: new Date(Date.UTC(2025, 5, 1)), i }));
    const [t] = parAnneeCivile(items, (x) => x.d, 100);
    expect(t.total).toBe(250);
    expect(t.paquets.map((p) => p.length)).toEqual([100, 100, 50]);
  });
});
