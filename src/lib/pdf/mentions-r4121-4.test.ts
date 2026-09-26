import { describe, expect, it } from "vitest";
import { TEXTE_R4121_4 } from "./mentions-r4121-4";

describe("R. 4121-4 imprimé au PDF du document unique", () => {
  it("est l'article entier : le chapeau, les sept destinataires, les deux alinéas", () => {
    // Borne basse, sans recopier le texte : ce qui manquait à la paraphrase.
    expect(TEXTE_R4121_4).toMatch(/^Le document unique d'évaluation des risques professionnels/);
    expect(TEXTE_R4121_4).toContain("pendant une durée de 40 ans à compter de leur élaboration");
    expect(TEXTE_R4121_4).toContain("anciens travailleurs");
    for (const n of ["1°", "2°", "3°", "4°", "5°", "6°", "7°"]) expect(TEXTE_R4121_4).toContain(n);
    expect(TEXTE_R4121_4).toContain("l'employeur conserve les versions successives");
    expect(TEXTE_R4121_4).toContain("Un avis indiquant les modalités d'accès");
  });

  it("ne porte plus la paraphrase", () => {
    expect(TEXTE_R4121_4).not.toMatch(/Carsat|médecin du travail/);
  });
});
