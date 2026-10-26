import { describe, expect, it } from "vitest";
import { entrepriseRattachee, type EntrepriseConnue } from "./rattachement";

const INSEE: EntrepriseConnue = {
  siren: "120027016",
  raisonSociale: "INSEE",
  effectif: 13,
};
const AUTRE: EntrepriseConnue = {
  siren: "356000000",
  raisonSociale: "La Poste",
  effectif: 40,
};

describe("entrepriseRattachee", () => {
  it("rattache un SIRET valide à l'entreprise du même SIREN", () => {
    expect(entrepriseRattachee("120 027 016 00357", [AUTRE, INSEE])).toBe(INSEE);
  });

  it("ne rattache rien quand le SIREN est inconnu du compte", () => {
    expect(entrepriseRattachee("12002701600357", [AUTRE])).toBeNull();
  });

  it("ne rattache rien sur un SIRET invalide ou incomplet, même au bon SIREN", () => {
    // Clé fausse : les neuf premiers chiffres sont ceux de l'INSEE.
    expect(entrepriseRattachee("12002701600358", [INSEE])).toBeNull();
    expect(entrepriseRattachee("120027016", [INSEE])).toBeNull();
    expect(entrepriseRattachee("", [INSEE])).toBeNull();
  });
});
