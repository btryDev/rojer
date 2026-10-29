/**
 * Le décalage mémorisé par heure UTC (plan performance, 2026-10-28) rend
 * EXACTEMENT ce que rend `Intl` : composantes civiles et instants
 * reconstruits.
 *
 * La référence est écrite ici, indépendante du module : un `formatToParts`
 * Europe/Paris, comme le faisait `dates/index.ts` avant ce lot.
 *
 * Les points difficiles sont les changements de décalage. Ils ne sont pas
 * recopiés d'une règle : chacun, de 1900 à 2300, est retrouvé dans les
 * données de fuseau (semaine par semaine, puis par dichotomie), y compris
 * les anciens qui ne tombent pas sur une heure pleine — ceux-là passent par
 * la lecture `Intl` du module, et c'est ce que le test éprouve aussi.
 */
import { describe, expect, it } from "vitest";

import { composantesCiviles, instantCivil, type ComposantesCiviles } from "./index";

const SECONDE = 1_000;
const MINUTE = 60 * SECONDE;
const HEURE = 60 * MINUTE;
const SEMAINE = 7 * 24 * HEURE;

const FORMATEUR = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function reference(d: Date): ComposantesCiviles {
  const parts = FORMATEUR.formatToParts(d);
  const lire = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    annee: lire("year"),
    mois: lire("month"),
    jour: lire("day"),
    heure: lire("hour"),
    minute: lire("minute"),
    seconde: lire("second"),
    milliseconde: d.getUTCMilliseconds(),
  };
}

function decalageReference(t: number): number {
  const d = new Date(t);
  const c = reference(d);
  return (
    Date.UTC(c.annee, c.mois - 1, c.jour, c.heure, c.minute, c.seconde) -
    (t - d.getUTCMilliseconds())
  );
}

/** L'instant civil reconstruit par la seule référence — l'algorithme
 *  d'`instantCivil`, sur le décalage d'`Intl`. */
function instantCivilReference(a: number, mo: number, j: number, h = 0, mi = 0, s = 0, ms = 0) {
  const naif = Date.UTC(a, mo - 1, j, h, mi, s, ms);
  const d1 = decalageReference(naif);
  const candidat = naif - d1;
  const d2 = decalageReference(candidat);
  return d2 === d1 ? candidat : naif - d2;
}

/** L'instant exact (à la milliseconde) où le décalage change entre `a` et
 *  `b`, sachant qu'il y change. */
function changementEntre(a: number, b: number): number {
  const avant = decalageReference(a);
  while (b - a > 1) {
    const m = Math.floor((a + b) / 2);
    if (decalageReference(m) === avant) a = m;
    else b = m;
  }
  return b;
}

/** Tous les changements de décalage de Paris de 1900 à 2300. */
const CHANGEMENTS = (() => {
  const trouves: number[] = [];
  let t = Date.UTC(1900, 0, 1);
  let avant = decalageReference(t);
  for (const fin = Date.UTC(2300, 0, 1); t < fin; t += SEMAINE) {
    const apres = decalageReference(t + SEMAINE);
    if (apres !== avant) trouves.push(changementEntre(t, t + SEMAINE));
    avant = apres;
  }
  return trouves;
})();

function ecarts(instants: Iterable<number>) {
  const fautes: string[] = [];
  for (const t of instants) {
    const d = new Date(t);
    if (JSON.stringify(composantesCiviles(d)) !== JSON.stringify(reference(d))) {
      fautes.push(d.toISOString());
    }
  }
  return fautes;
}

/** Autour d'un changement : tous les quarts d'heure sur ± 2 h, et au plus
 *  près — la seconde, la milliseconde de part et d'autre. */
function autour(t: number): number[] {
  const points: number[] = [];
  for (let x = t - 2 * HEURE; x <= t + 2 * HEURE; x += 15 * MINUTE) points.push(x);
  for (const e of [-MINUTE, -SECONDE, -1, 0, 1, SECONDE, MINUTE]) points.push(t + e);
  return points;
}

describe("composantes civiles mémorisées par heure", () => {
  it("retrouve les changements d'heure, dont d'anciens hors des heures pleines", () => {
    // Deux par an depuis 1976 jusqu'à 2300 au moins, et la période 1900-1975
    // en compte d'autres : la recherche ne passe pas à vide.
    expect(CHANGEMENTS.length).toBeGreaterThan(2 * (2300 - 1976));
    // Au moins un changement hors d'une heure pleine (1911 : passage du
    // temps moyen de Paris au temps de Greenwich) : le chemin `Intl` du
    // module est bien éprouvé.
    expect(CHANGEMENTS.some((t) => t % HEURE !== 0)).toBe(true);
  });

  it("autour de chaque changement, le calcul est celui d'Intl", () => {
    expect(CHANGEMENTS.flatMap((t) => ecarts(autour(t)))).toEqual([]);
  });

  it("sur 20 000 instants distincts, millisecondes comprises, de l'an 900 à 10 100", () => {
    // mulberry32 : entiers 32 bits par `Math.imul`, sans dépassement de la
    // précision des flottants. La plage déborde celle que le module mémorise
    // (1000-9999) : de part et d'autre, la lecture `Intl` est comparée aussi.
    let graine = 42;
    const hasard = () => {
      graine = (graine + 0x6d2b79f5) | 0;
      let x = Math.imul(graine ^ (graine >>> 15), 1 | graine);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 2 ** 32;
    };
    const debut = Date.UTC(900, 0, 1);
    const fin = Date.UTC(10_100, 0, 1);
    const instants = new Set<number>();
    while (instants.size < 20_000) instants.add(Math.floor(debut + hasard() * (fin - debut)));
    expect(ecarts(instants)).toEqual([]);
  });

  it("reconstruit les mêmes instants qu'Intl, heures inexistantes et doublées comprises", () => {
    const fautes: string[] = [];
    for (const t of CHANGEMENTS) {
      const c = reference(new Date(t));
      for (let h = 0; h < 24; h++) {
        for (const mi of [0, 30, 59]) {
          const rapide = instantCivil(c.annee, c.mois, c.jour, h, mi, 7, 250).getTime();
          if (rapide !== instantCivilReference(c.annee, c.mois, c.jour, h, mi, 7, 250)) {
            fautes.push(`${c.annee}-${c.mois}-${c.jour} ${h}:${mi}`);
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
