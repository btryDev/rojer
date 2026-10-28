/**
 * Le décalage mémorisé par heure UTC (plan performance, 2026-10-28) rend
 * EXACTEMENT ce que rendait `Intl` : composantes civiles et instants
 * reconstruits, autour des changements d'heure, aux bornes de la plage
 * mémorisée, et sur des instants tirés au hasard.
 */
import { describe, expect, it } from "vitest";

import { composantesCiviles, composantesCivilesIntl, instantCivil } from "./index";

const MINUTE = 60_000;

/** L'instant civil reconstruit par la seule lecture d'`Intl` — l'algorithme
 *  d'avant, recopié comme référence. */
function instantCivilReference(a: number, mo: number, j: number, h = 0, mi = 0, s = 0, ms = 0) {
  const decalage = (d: Date) => {
    const c = composantesCivilesIntl(d);
    return (
      Date.UTC(c.annee, c.mois - 1, c.jour, c.heure, c.minute, c.seconde) -
      (d.getTime() - d.getUTCMilliseconds())
    );
  };
  const naif = Date.UTC(a, mo - 1, j, h, mi, s, ms);
  const d1 = decalage(new Date(naif));
  const candidat = naif - d1;
  const d2 = decalage(new Date(candidat));
  return new Date(d2 === d1 ? candidat : naif - d2).getTime();
}

function balayer(debut: number, fin: number, pas: number) {
  const fautes: string[] = [];
  for (let t = debut; t < fin; t += pas) {
    const d = new Date(t);
    if (JSON.stringify(composantesCiviles(d)) !== JSON.stringify(composantesCivilesIntl(d))) {
      fautes.push(d.toISOString());
    }
  }
  return fautes;
}

describe("composantes civiles mémorisées par heure", () => {
  it.each([
    ["passage à l'heure d'été 2026", Date.UTC(2026, 2, 28), Date.UTC(2026, 2, 31)],
    ["passage à l'heure d'hiver 2026", Date.UTC(2026, 9, 24), Date.UTC(2026, 9, 27)],
    ["passage à l'heure d'été 1981", Date.UTC(1981, 2, 28), Date.UTC(1981, 2, 31)],
    ["passage à l'heure d'hiver 2199", Date.UTC(2199, 9, 25), Date.UTC(2199, 9, 28)],
  ])("%s, minute par minute", (_nom, debut, fin) => {
    expect(balayer(debut, fin, MINUTE)).toEqual([]);
  });

  it("aux bornes de la plage mémorisée, de part et d'autre", () => {
    expect(balayer(Date.UTC(1980, 11, 31, 20), Date.UTC(1981, 0, 1, 4), 7 * MINUTE + 13_457)).toEqual([]);
    expect(balayer(Date.UTC(2199, 11, 31, 20), Date.UTC(2200, 0, 1, 4), 7 * MINUTE + 13_457)).toEqual([]);
  });

  it("sur des instants quelconques, millisecondes comprises", () => {
    let graine = 42;
    const hasard = () => ((graine = (graine * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);
    const debut = Date.UTC(1975, 0, 1);
    const fin = Date.UTC(2205, 0, 1);
    const fautes: string[] = [];
    for (let i = 0; i < 20_000; i++) {
      const d = new Date(Math.floor(debut + hasard() * (fin - debut)));
      if (JSON.stringify(composantesCiviles(d)) !== JSON.stringify(composantesCivilesIntl(d))) {
        fautes.push(d.toISOString());
      }
    }
    expect(fautes).toEqual([]);
  });

  it("reconstruit les mêmes instants qu'avant, heures inexistantes et doublées comprises", () => {
    const fautes: string[] = [];
    for (const [a, mo, j] of [
      [2026, 3, 29],
      [2026, 10, 25],
      [2026, 6, 15],
      [1981, 3, 29],
      [2199, 10, 27],
    ]) {
      for (let h = 0; h < 24; h++) {
        for (const mi of [0, 30, 59]) {
          const rapide = instantCivil(a, mo, j, h, mi, 7, 250).getTime();
          if (rapide !== instantCivilReference(a, mo, j, h, mi, 7, 250)) {
            fautes.push(`${a}-${mo}-${j} ${h}:${mi}`);
          }
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it("une date invalide lève la même erreur qu'avant", () => {
    expect(() => composantesCiviles(new Date(Number.NaN))).toThrow(RangeError);
  });
});
