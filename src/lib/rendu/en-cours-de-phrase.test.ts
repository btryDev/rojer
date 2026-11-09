import { describe, expect, it } from "vitest";
import { enCoursDePhrase } from "./en-cours-de-phrase";

describe("enCoursDePhrase — un libellé repris en cours de phrase", () => {
  it("met l'initiale en minuscule et garde les sigles du reste", () => {
    expect(enCoursDePhrase("Ventilation (VMC, CTA)")).toBe("ventilation (VMC, CTA)");
    expect(enCoursDePhrase("Éclairage de sécurité (BAES)")).toBe("éclairage de sécurité (BAES)");
  });
  it("laisse intact un libellé qui commence par un sigle", () => {
    for (const l of ["SSI et équipement d'alarme incendie", "SSI/alarme", "ERP"]) {
      expect(enCoursDePhrase(l)).toBe(l);
    }
  });
});
