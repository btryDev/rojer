/**
 * Le décalage mémorisé par heure UTC (plan performance, 2026-10-28) rend
 * EXACTEMENT ce que rend `Intl` : composantes civiles et instants
 * reconstruits.
 *
 * La référence est écrite ici, indépendante du module : un `formatToParts`
 * Europe/Paris, comme le faisait `dates/index.ts` avant ce lot.
 *
 * L'hypothèse qui porte tout — de 1981 à 2199, chaque changement d'heure
 * tombe sur une heure UTC pleine — est vérifiée pour CHACUN des changements
 * de la plage (trouvés par dichotomie, pas recopiés d'une règle), puis le
 * calcul est comparé à la référence autour de chacun.
 */
import { describe, expect, it } from "vitest";

import { composantesCiviles, instantCivil, type ComposantesCiviles } from "./index";

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;

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
 *  `b`, sachant qu'il change une fois et une seule. */
function changementEntre(a: number, b: number): number {
  const avant = decalageReference(a);
  while (b - a > 1) {
    const m = Math.floor((a + b) / 2);
    if (decalageReference(m) === avant) a = m;
    else b = m;
  }
  return b;
}

/** Les deux changements d'heure de chaque année, 1981 à 2199. */
const CHANGEMENTS = (() => {
  const t: number[] = [];
  for (let annee = 1981; annee < 2200; annee++) {
    const janvier = Date.UTC(annee, 0, 1);
    const juillet = Date.UTC(annee, 6, 1);
    const decembre = Date.UTC(annee, 11, 31);
    if (decalageReference(juillet) === decalageReference(janvier)) {
      throw new Error(`${annee} : pas d'heure d'été, la recherche ne s'applique pas`);
    }
    t.push(changementEntre(janvier, juillet), changementEntre(juillet, decembre));
  }
  return t;
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

function* pas(debut: number, fin: number, ecart: number) {
  for (let t = debut; t < fin; t += ecart) yield t;
}

describe("composantes civiles mémorisées par heure", () => {
  it("trouve les deux changements d'heure de chacune des 219 années", () => {
    expect(CHANGEMENTS).toHaveLength(2 * 219);
  });

  it("chaque changement de 1981 à 2199 tombe sur une heure UTC pleine", () => {
    const horsHeure = CHANGEMENTS.filter((t) => t % HEURE !== 0).map((t) =>
      new Date(t).toISOString(),
    );
    expect(horsHeure).toEqual([]);
  });

  it("autour de chaque changement, minute par minute sur ± 2 h, le calcul est celui d'Intl", () => {
    const fautes = CHANGEMENTS.flatMap((t) => ecarts(pas(t - 2 * HEURE, t + 2 * HEURE, MINUTE)));
    expect(fautes).toEqual([]);
  });

  it("aux bornes de la plage mémorisée, de part et d'autre", () => {
    const pasIrregulier = 7 * MINUTE + 13_457;
    expect(ecarts(pas(Date.UTC(1980, 11, 31, 20), Date.UTC(1981, 0, 1, 4), pasIrregulier))).toEqual([]);
    expect(ecarts(pas(Date.UTC(2199, 11, 31, 20), Date.UTC(2200, 0, 1, 4), pasIrregulier))).toEqual([]);
  });

  it("sur 20 000 instants distincts, millisecondes comprises", () => {
    // mulberry32 : entiers 32 bits par `Math.imul`, sans dépassement de la
    // précision des flottants.
    let graine = 42;
    const hasard = () => {
      graine = (graine + 0x6d2b79f5) | 0;
      let x = Math.imul(graine ^ (graine >>> 15), 1 | graine);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 2 ** 32;
    };
    const debut = Date.UTC(1975, 0, 1);
    const fin = Date.UTC(2205, 0, 1);
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
