import { describe, expect, it } from "vitest";
import {
  cleJourCivil,
  depuisCleJourCivil,
  depuisSaisieDateHeure,
  estJourCivilReel,
  estSaisieDateHeureReelle,
} from "./index";

/**
 * ASVS 5.0.0 V2.2.1 — une date saisie n'est valide que si le jour existe.
 *
 * Le motif « AAAA-MM-JJ » ne le garantit pas : `depuisCleJourCivil` reconstruit
 * « 2026-13-45 » en 2027-02-14 sans rien dire, et l'enregistre. Ces deux
 * prédicats sont la règle partagée par tous les schémas de saisie
 * (`validation-entrees.test.ts` en vérifie l'emploi).
 */
describe("estJourCivilReel", () => {
  it("refuse un jour qui n'existe pas, que le motif laisse passer", () => {
    for (const cle of ["2026-13-45", "2026-02-30", "2026-02-29", "2026-04-31", "2026-00-10", "2026-01-00"]) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(cle), cle).toBe(true);
      expect(estJourCivilReel(cle), cle).toBe(false);
    }
  });

  it("refuse ce qui n'a pas la forme AAAA-MM-JJ", () => {
    for (const cle of ["", "2026-1-01", "01/02/2026", "2026-01-01T10:00", " 2026-01-01", "2026-01-01\n"]) {
      expect(estJourCivilReel(cle), JSON.stringify(cle)).toBe(false);
    }
  });

  it("accepte tout jour réel, dont le 29 février d'une année bissextile", () => {
    for (const cle of ["2026-01-01", "2026-12-31", "2028-02-29", "2000-02-29", "2026-04-30"]) {
      expect(estJourCivilReel(cle), cle).toBe(true);
      // Et un jour accepté se relit à l'identique : pas de report silencieux.
      expect(cleJourCivil(depuisCleJourCivil(cle))).toBe(cle);
    }
  });

  it("1900 n'est pas bissextile, 2100 non plus", () => {
    expect(estJourCivilReel("1900-02-29")).toBe(false);
    expect(estJourCivilReel("2100-02-29")).toBe(false);
  });
});

describe("estSaisieDateHeureReelle", () => {
  it("refuse un jour, une heure ou une minute qui n'existent pas", () => {
    for (const v of ["2026-02-30T10:00", "2026-13-01T10:00", "2026-01-01T24:00", "2026-01-01T10:60", "2026-01-01T99:99"]) {
      expect(estSaisieDateHeureReelle(v), v).toBe(false);
    }
  });

  it("refuse la forme à secondes, que `depuisSaisieDateHeure` ne lit pas", () => {
    // Le motif des schémas l'acceptait, puis la transformation levait : une
    // erreur 500 au lieu d'un refus de saisie.
    expect(() => depuisSaisieDateHeure("2026-01-01T10:00:00")).toThrow();
    expect(estSaisieDateHeureReelle("2026-01-01T10:00:00")).toBe(false);
  });

  it("accepte une saisie `datetime-local` réelle", () => {
    for (const v of ["2026-01-01T00:00", "2026-12-31T23:59", "2028-02-29T12:30"]) {
      expect(estSaisieDateHeureReelle(v), v).toBe(true);
    }
  });
});
