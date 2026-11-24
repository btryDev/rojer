import { describe, expect, it } from "vitest";
import {
  CATEGORIES_ASSISTANCE,
  LABEL_CATEGORIE_ASSISTANCE,
  exigeLaFormulePro,
  groupesDeSujets,
  sujetInitial,
} from "./libelles";

const sujets = (pro: boolean, initial?: Parameters<typeof groupesDeSujets>[1]) =>
  groupesDeSujets(pro, initial).flatMap((g) => g.sujets);

describe("les sujets de l'assistance selon la formule (2026-11-24)", () => {
  it("la prévention est réservée à la formule Pro, l'application ouverte à tous", () => {
    for (const c of ["rapport", "commission_securite", "duerp", "prestataire", "hors_couverture"] as const) {
      expect(exigeLaFormulePro(c)).toBe(true);
    }
    for (const c of ["diagnostic", "ecran", "connexion", "abonnement", "autre"] as const) {
      expect(exigeLaFormulePro(c)).toBe(false);
    }
  });

  it("en Pro, tout est proposé ; sinon, l'application seule", () => {
    expect([...sujets(true)].sort()).toEqual([...CATEGORIES_ASSISTANCE].sort());
    expect(sujets(false)).toEqual(["ecran", "connexion", "abonnement", "autre"]);
    expect(sujets(false).some(exigeLaFormulePro)).toBe(false);
  });

  it("sans Pro, la visite sur devis n'apparaît que si un encart l'a proposée", () => {
    expect(sujets(false, "diagnostic")).toContain("diagnostic");
    expect(sujets(false, "rapport")).not.toContain("rapport");
  });

  it("le sujet coché à l'ouverture est celui de l'encart, s'il est proposé", () => {
    expect(sujetInitial(true, "duerp")).toBe("duerp");
    expect(sujetInitial(true)).toBe("rapport");
    expect(sujetInitial(false)).toBe("ecran");
    expect(sujetInitial(false, "rapport")).toBe("ecran");
    expect(sujetInitial(false, "diagnostic")).toBe("diagnostic");
  });

  it("chaque sujet a son libellé, sans nommer l'expert ni BTRY", () => {
    for (const c of CATEGORIES_ASSISTANCE) {
      expect(LABEL_CATEGORIE_ASSISTANCE[c]).toBeTruthy();
      expect(LABEL_CATEGORIE_ASSISTANCE[c]).not.toMatch(/expert|btry/i);
    }
  });
});
