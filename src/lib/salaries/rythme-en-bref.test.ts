import { describe, expect, it } from "vitest";
import { cataloguerTitres, titreParId } from "./catalogue";
import { rythmeEnBref } from "./rythme-en-bref";

describe("le rythme d'un titre en bref", () => {
  it("dit la durée du texte en clair", () => {
    expect(rythmeEnBref(titreParId("sante-travail-salarie-vip")!)).toBe("Tous les 5 ans");
  });

  it("dit qu'un rythme vient d'une norme quand le texte n'en écrit pas", () => {
    const h = rythmeEnBref(titreParId("elec-salarie-habilitation")!);
    expect(h).toMatch(/^Tous les 3 ans — /);
    expect(h).toContain("NF C 18-510");
  });

  it("n'écrit jamais l'identifiant technique d'une périodicité", () => {
    for (const o of cataloguerTitres()) {
      expect(rythmeEnBref(o), o.id).not.toMatch(/quinquennale|quadriennale|biennale|triennale|^autre/);
    }
  });
});
