import { describe, expect, it } from "vitest";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { enCoursDePhrase } from "./en-cours-de-phrase";

describe("enCoursDePhrase — un libellé repris en cours de phrase", () => {
  it("met l'initiale en minuscule et garde les sigles", () => {
    expect(enCoursDePhrase("Ventilation (VMC, CTA)")).toBe("ventilation (VMC, CTA)");
    expect(enCoursDePhrase("Appareil de cuisson ERP")).toBe("appareil de cuisson ERP");
    expect(enCoursDePhrase("Éclairage de sécurité (BAES)")).toBe("éclairage de sécurité (BAES)");
  });
  it("laisse intact un libellé qui commence par un sigle, quel que soit le séparateur", () => {
    for (const l of ["SSI et équipement d'alarme incendie", "SSI/alarme", "BAES-blocs", "DAE, défibrillateur", "ERP"]) {
      expect(enCoursDePhrase(l)).toBe(l);
    }
  });
  it("aucun libellé de catégorie ne perd un sigle", () => {
    for (const libelle of Object.values(LABEL_CATEGORIE_EQUIPEMENT)) {
      for (const sigle of libelle.match(/\b[A-Z]{2,}\b/g) ?? []) {
        expect(enCoursDePhrase(libelle), libelle).toContain(sigle);
      }
    }
  });
});
