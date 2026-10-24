import { describe, expect, it } from "vitest";
import {
  PHRASE_REFUS_ENFANTS,
  PHRASE_REFUS_J,
  PHRASE_REFUS_SPECIAUX,
  PHRASE_REFUS_U,
  TYPES_ERP_REFUSES,
  phraseRefusTypes,
  questionEnfantsPosee,
  refusDuFiltre,
  typesRefusesDe,
} from "./types-refuses";

// Le filtre à l'accueil (2026-10-17) : décisions de la propriétaire.

describe("les types refusés", () => {
  it("J, U et les établissements spéciaux PA, CTS, SG, OA, REF, GA, EF — PS reste accepté", () => {
    expect([...TYPES_ERP_REFUSES].sort()).toEqual(["CTS", "EF", "GA", "J", "OA", "PA", "REF", "SG", "U"]);
    expect(typesRefusesDe("PS", [])).toEqual([]);
  });

  it.each(TYPES_ERP_REFUSES)("%s est refusé en type principal comme en autre type", (t) => {
    expect(typesRefusesDe(t, [])).toEqual([t]);
    expect(typesRefusesDe("N", [t])).toEqual([t]);
    expect(refusDuFiltre({ estERP: true, typeErp: t }).map((r) => r.champ)).toEqual(["typeErp"]);
    expect(refusDuFiltre({ estERP: true, typeErp: "N", typesErpAutres: [t] }).map((r) => r.champ)).toEqual(["typesErpAutres"]);
  });

  it("les types servis passent : M, N, O, W, L, P, S, T, V, X, Y, PS", () => {
    for (const t of ["M", "N", "O", "W", "L", "P", "S", "T", "V", "X", "Y", "PS"]) {
      expect(refusDuFiltre({ estERP: true, typeErp: t }), t).toEqual([]);
    }
  });

  it("hors ERP, rien n'est refusé — un type resté en mémoire ne compte pas", () => {
    expect(refusDuFiltre({ estERP: false, typeErp: "J" })).toEqual([]);
  });

  it("une phrase par famille, dans l'ordre J, U, spéciaux", () => {
    expect(phraseRefusTypes(["J"])).toBe(PHRASE_REFUS_J);
    expect(phraseRefusTypes(["CTS", "U", "SG"])).toBe(`${PHRASE_REFUS_U} ${PHRASE_REFUS_SPECIAUX}`);
    expect(phraseRefusTypes([])).toBeNull();
  });

  it("aucune phrase ne qualifie", () => {
    for (const p of [PHRASE_REFUS_J, PHRASE_REFUS_U, PHRASE_REFUS_SPECIAUX, PHRASE_REFUS_ENFANTS]) {
      expect(p.toLowerCase()).not.toMatch(/conforme|en infraction|en règle|illégal|vous devez/);
      expect(p).toMatch(/^Rojer ne prend pas en charge /);
    }
  });
});

describe("le type R et l'accueil d'enfants", () => {
  it("la question n'est posée que si R est déclaré, principal ou autre", () => {
    expect(questionEnfantsPosee({ estERP: true, typeErp: "R" })).toBe(true);
    expect(questionEnfantsPosee({ estERP: true, typeErp: "N", typesErpAutres: ["R"] })).toBe(true);
    expect(questionEnfantsPosee({ estERP: true, typeErp: "N" })).toBe(false);
    expect(questionEnfantsPosee({ estERP: false, typeErp: "R" })).toBe(false);
  });

  it("oui refuse, non passe, sans réponse se réclame", () => {
    expect(refusDuFiltre({ estERP: true, typeErp: "R", accueilEnfants: true })).toEqual([
      { champ: "accueilEnfants", message: PHRASE_REFUS_ENFANTS, perimetre: true },
    ]);
    expect(refusDuFiltre({ estERP: true, typeErp: "R", accueilEnfants: false })).toEqual([]);
    // Sans réponse : une question à poser, pas un refus de périmètre.
    expect(refusDuFiltre({ estERP: true, typeErp: "R" })).toMatchObject([{ champ: "accueilEnfants", perimetre: false }]);
  });
});

describe("à la transition (fiche)", () => {
  it("un type refusé déjà en base ne déclenche rien ; un nouveau, si", () => {
    const avant = { typeErp: "J", typesErpAutres: [] };
    expect(refusDuFiltre({ estERP: true, typeErp: "J" }, avant)).toEqual([]);
    expect(refusDuFiltre({ estERP: true, typeErp: "J", typesErpAutres: ["U"] }, avant).map((r) => r.champ)).toEqual(["typesErpAutres"]);
  });

  it("R déjà en base n'est pas réinterrogé", () => {
    expect(refusDuFiltre({ estERP: true, typeErp: "R" }, { typeErp: "R", typesErpAutres: [] })).toEqual([]);
  });
});
