import { describe, expect, it } from "vitest";
import {
  aPlusDe24h,
  creneauxParJour,
  dateLongue,
  enumeration,
  grilleDuMois,
  heureCourte,
  jourSansAnnee,
  jusquAQuand,
  lesEtablissementsYPassent,
  premierJourEntier,
  plageHoraire,
  quandLeRendezVous,
} from "./rendez-vous-libelles";

// Le rendez-vous annuel (ADR-063) : le délai de 24 h, les dates dites comme la
// maquette les écrit, la grille du mois. Le fichier d'agenda : `agenda.test.ts`.

const d = (iso: string) => new Date(iso);

describe("aPlusDe24h", () => {
  it("strictement plus de 24 h avant le début", () => {
    const maintenant = d("2026-11-24T08:00:00Z");
    expect(aPlusDe24h(d("2026-11-25T08:00:01Z"), maintenant)).toBe(true);
    expect(aPlusDe24h(d("2026-11-25T08:00:00Z"), maintenant)).toBe(false);
  });
});

describe("les dates dites, à l'heure de Paris", () => {
  it("l'heure sans minutes quand elle est pile, et la plage", () => {
    expect(heureCourte(d("2026-12-03T09:00:00Z"))).toBe("10 h");
    expect(heureCourte(d("2026-12-03T09:30:00Z"))).toBe("10 h 30");
    expect(plageHoraire(d("2026-12-03T09:00:00Z"), d("2026-12-03T10:00:00Z"))).toBe("10 h – 11 h");
  });

  it("le jour, « 1er » pour le premier du mois", () => {
    expect(jourSansAnnee(d("2026-12-03T09:00:00Z"))).toBe("jeudi 3 décembre");
    expect(jourSansAnnee(d("2026-12-01T09:00:00Z"))).toBe("mardi 1er décembre");
    expect(dateLongue(d("2027-03-01T09:00:00Z"))).toBe("1er mars 2027");
    expect(dateLongue(d("2027-03-13T09:00:00Z"))).toBe("13 mars 2027");
  });

  it("le rendez-vous, et jusqu'à quand il se déplace", () => {
    expect(quandLeRendezVous(d("2026-12-03T09:00:00Z"), d("2026-12-03T10:00:00Z"))).toBe(
      "jeudi 3 décembre 2026, 10 h – 11 h",
    );
    expect(jusquAQuand(d("2026-12-03T09:00:00Z"))).toBe("mercredi 2 décembre à 10 h");
  });
});

describe("les mots de la carte", () => {
  it("un, deux, plusieurs établissements", () => {
    expect(lesEtablissementsYPassent(1)).toBe("votre établissement y passe");
    expect(lesEtablissementsYPassent(2)).toBe("vos deux établissements y passent");
    expect(lesEtablissementsYPassent(12)).toBe("vos 12 établissements y passent");
    expect(enumeration(["Lyon 3e"])).toBe("Lyon 3e");
    expect(enumeration(["Lyon 3e", "Villeurbanne"])).toBe("Lyon 3e et Villeurbanne");
    expect(enumeration(["A", "B", "C"])).toBe("A, B et C");
  });
});

describe("la grille du mois", () => {
  it("lundi en tête : décembre 2026 commence un mardi", () => {
    const g = grilleDuMois("2026-12");
    expect(g.slice(0, 3)).toEqual([null, 1, 2]);
    expect(g.at(-1)).toBe(31);
    expect(g).toHaveLength(32);
  });

});

describe("premierJourEntier", () => {
  it("le jour même à minuit (Paris), sinon le lendemain", () => {
    // Minuit à Paris en hiver : 23 h UTC la veille.
    expect(premierJourEntier(new Date("2027-03-14T23:00:00Z"))).toEqual(new Date("2027-03-14T23:00:00Z"));
    // L'année bascule à 15 h 23 : le premier jour entier est le lendemain.
    expect(dateLongue(premierJourEntier(new Date("2027-03-15T14:23:00Z")))).toBe("16 mars 2027");
    expect(dateLongue(premierJourEntier(new Date("2027-03-14T23:00:00Z")))).toBe("15 mars 2027");
  });
});

describe("creneauxParJour", () => {
  it("range par jour civil de Paris, dans l'ordre", () => {
    const jours = creneauxParJour([
      { debut: "2026-12-02T08:00:00.000Z" },
      { debut: "2026-12-02T13:00:00.000Z" },
      // 23 h 30 à Paris : encore le 3 décembre, quoi qu'en dise l'UTC.
      { debut: "2026-12-03T22:30:00.000Z" },
    ]);
    expect(jours.map((j) => [j.jour, j.creneaux.length])).toEqual([
      ["2026-12-02", 2],
      ["2026-12-03", 1],
    ]);
  });
});
