// Les deux phrases du carnet sanitaire, confrontées au verbatim du corpus
// (2026-10-12, audit des modules). Les mots attendus sont lus dans le
// texte de l'arrêté, pas recopiés d'ici : la phrase d'écran doit les
// retrouver.

import { describe, expect, it } from "vitest";
import { ARRETE_2010_02_01_LEGIONELLES } from "@/lib/referentiels/corpus/arrete-2010-02-01-legionelles";
import { ENJEU_CARNET, quiEstVise } from "./textes";

const article = (ref: string) => {
  const a = ARRETE_2010_02_01_LEGIONELLES.articles.find((x) => x.ref === ref);
  if (!a?.citationCle) throw new Error(`${ref} absent du corpus`);
  return a.citationCle;
};

describe("ce que le carnet dit de lui-même (art. 3)", () => {
  it("ne se donne plus pour le « fichier sanitaire des installations »", () => {
    expect(ENJEU_CARNET).not.toMatch(/c'est le « fichier sanitaire/);
  });

  it("nomme ce que l'article 3 met dans le fichier et que le carnet ne porte pas", () => {
    const art3 = article("Arrêté 01-02-2010 art. 3");
    for (const element of ["modalités", "descriptifs des réseaux", "maintenance"]) {
      expect(art3, element).toContain(element);
    }
    expect(ENJEU_CARNET).toContain("modalités de la surveillance");
    expect(ENJEU_CARNET).toContain("description des réseaux");
    expect(ENJEU_CARNET).toContain("maintenance");
    expect(ENJEU_CARNET).toContain("ne se saisissent pas ici");
    // Et qu'une analyse n'est rattachée à aucun point.
    expect(ENJEU_CARNET).toContain("ne s'y rattache à aucun point");
  });
});

describe("à qui l'arrêté s'adresse (art. 1er)", () => {
  it("à un ERP, Rojer dit qu'il ne sait pas ; hors ERP, il ne le dit plus", () => {
    expect(quiEstVise(true)).toContain("Rojer ne sait pas si c'est votre cas");
    expect(quiEstVise(false)).not.toContain("ne sait pas");
    expect(quiEstVise(false)).toContain("n'est pas déclaré recevant du public");
  });

  it("hors ERP, nomme les établissements que l'article 1er vise en plus des ERP", () => {
    const art1 = article("Arrêté 01-02-2010 art. 1").toLowerCase();
    const phrase = quiEstVise(false).toLowerCase();
    for (const famille of ["santé", "médico-soci", "pénitentiaire", "hôtel", "résidence", "camping"]) {
      expect(art1, `corpus : ${famille}`).toContain(famille);
      expect(phrase, `écran : ${famille}`).toContain(famille);
    }
  });
});
