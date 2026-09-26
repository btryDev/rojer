import { describe, expect, it } from "vitest";
import { instantCivil } from "@/lib/dates";
import { ageEnMois, EFFECTIF_MAJ_ANNUELLE, evaluerEtatDuerp } from "./duerp";

// 10 août 2026, 08:00 heure de Paris — le matin, moment où les anciennes
// règles basculaient à tort en « en retard ».
const NOW = instantCivil(2026, 8, 10, 8);

const etat = (
  dateDerniereVersion: Date | null,
  effectif: number,
  ouvert = true,
) => evaluerEtatDuerp(
    {
      ouvert,
      dateDerniereVersion,
      effectifs: { entreprise: effectif, site: effectif },
    },
    NOW,
  );

describe("evaluerEtatDuerp — pas de DUERP", () => {
  it("ne reproche rien à un dossier qui n'a pas commencé", () => {
    const e = etat(null, 20, false);
    expect(e.ouvert).toBe(false);
    expect(e.jamaisValide).toBe(false);
    expect(e.majEchue).toBe(false);
    expect(e.estAJour).toBe(false);
    expect(e.ageJours).toBeNull();
  });
});

describe("evaluerEtatDuerp — aucune version validée", () => {
  it("distingue « jamais validé » de « trop ancien »", () => {
    const e = etat(null, 20);
    expect(e.jamaisValide).toBe(true);
    // Le point clé : on ne prétend pas connaître un âge.
    expect(e.majEchue).toBe(false);
    expect(e.ageJours).toBeNull();
    expect(e.dateLimiteMaj).toBeNull();
    expect(e.estAJour).toBe(false);
  });

  it("reste « jamais validé » quel que soit l'effectif", () => {
    expect(etat(null, 3).jamaisValide).toBe(true);
    expect(etat(null, 3).estAJour).toBe(false);
  });
});

describe("evaluerEtatDuerp — condition d'effectif (art. R. 4121-2)", () => {
  it("ne reproche aucun âge sous onze salariés", () => {
    const vieille = instantCivil(2025, 1, 5); // ~19 mois
    const e = etat(vieille, EFFECTIF_MAJ_ANNUELLE - 1);
    expect(e.soumisMajAnnuelle).toBe(false);
    expect(e.majEchue).toBe(false);
    expect(e.dateLimiteMaj).toBeNull();
    // Aucune échéance dépassée…
    expect(e.estAJour).toBe(true);
    // … mais la version n'est pas récente pour autant : le brief ne doit
    // pas annoncer « votre DUERP est à jour » sur cette base.
    expect(e.versionRecente).toBe(false);
  });

  it("reproche le même âge à partir de onze salariés", () => {
    const vieille = instantCivil(2025, 1, 5);
    const e = etat(vieille, EFFECTIF_MAJ_ANNUELLE);
    expect(e.soumisMajAnnuelle).toBe(true);
    expect(e.majEchue).toBe(true);
    expect(e.estAJour).toBe(false);
  });
});

describe("evaluerEtatDuerp — arithmétique calendaire", () => {
  it("laisse un an entier, jour pour jour", () => {
    // Version du 10 août 2025 : l'échéance tombe le 10 août 2026, qui est
    // aujourd'hui — donc pas encore dépassée (le retard commence demain).
    const e = etat(instantCivil(2025, 8, 10), 20);
    expect(e.dateLimiteMaj).toEqual(instantCivil(2026, 8, 10));
    expect(e.majEchue).toBe(false);
    expect(e.versionRecente).toBe(true);
    expect(e.estAJour).toBe(true);
  });

  it("bascule le lendemain de l'anniversaire", () => {
    const e = etat(instantCivil(2025, 8, 9), 20);
    expect(e.majEchue).toBe(true);
  });

  it("ne dérive pas d'un jour à cause d'un 29 février", () => {
    // 2028 est bissextile : « + 365 jours » à partir du 1er mars 2027
    // tomberait le 29 février 2028, un jour trop tôt.
    const e = evaluerEtatDuerp(
      { ouvert: true, dateDerniereVersion: instantCivil(2027, 3, 1), effectifs: { entreprise: 20, site: 20 } },
      instantCivil(2028, 2, 29, 12),
    );
    expect(e.dateLimiteMaj).toEqual(instantCivil(2028, 3, 1));
    expect(e.majEchue).toBe(false);
  });

  it("compte l'âge en jours civils", () => {
    const e = etat(instantCivil(2026, 7, 11), 20); // 30 jours
    expect(e.ageJours).toBe(30);
  });
});

describe("evaluerEtatDuerp — prévenance", () => {
  it("prévient dans les trente jours qui précèdent l'échéance", () => {
    // Version du 20 août 2025 → échéance le 20 août 2026, dans dix jours.
    const e = etat(instantCivil(2025, 8, 20), 20);
    expect(e.rappelMajProche).toBe(true);
    expect(e.majEchue).toBe(false);
    expect(e.estAJour).toBe(true);
  });

  it("se tait tant que l'échéance est lointaine", () => {
    const e = etat(instantCivil(2026, 5, 1), 20);
    expect(e.rappelMajProche).toBe(false);
  });

  it("ne prévient jamais une entreprise non soumise", () => {
    const e = etat(instantCivil(2025, 8, 20), 4);
    expect(e.rappelMajProche).toBe(false);
  });
});

describe("ageEnMois", () => {
  it("arrondit au mois le plus proche", () => {
    expect(ageEnMois(400)).toBe(13);
    expect(ageEnMois(30)).toBe(1);
  });
});
