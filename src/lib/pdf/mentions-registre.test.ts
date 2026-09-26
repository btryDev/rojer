import { describe, expect, it } from "vitest";
import {
  destinatairesDossier,
  destinatairesRegistre,
  mentionReglementErp,
  phraseRegistreIgh,
  referencesRegistreDossier,
  referencesRegistreTenue,
} from "./mentions-registre";

const AUCUN = { estERP: false, estIGH: false };
const ERP = { estERP: true, estIGH: false };
const IGH = { estERP: false, estIGH: true };
const ERP_EN_IGH = { estERP: true, estIGH: true };

describe("les articles du registre, selon le régime", () => {
  it("n'imprime ni R. 143-44 ni R. 146-35 à qui n'est ni ERP ni IGH", () => {
    // Le défaut d'origine : le dossier de conformité citait les deux à tous.
    for (const texte of [
      referencesRegistreDossier(AUCUN),
      referencesRegistreTenue(AUCUN),
    ]) {
      expect(texte).not.toContain("143-44");
      expect(texte).not.toContain("146-35");
    }
    expect(phraseRegistreIgh(AUCUN)).toBeNull();
  });

  it("cite R. 143-44 à l'ERP, et pas R. 146-35", () => {
    expect(referencesRegistreDossier(ERP)).toContain("R. 143-44 CCH");
    expect(referencesRegistreTenue(ERP)).toContain("R. 143-44 CCH");
    expect(referencesRegistreDossier(ERP)).not.toContain("146-35");
    expect(phraseRegistreIgh(ERP)).toBeNull();
  });

  it("cite R. 146-35 à l'IGH avec son débiteur, le propriétaire", () => {
    // « Il doit être tenu, par le propriétaire, un registre de sécurité »
    // (R. 146-35 CCH, relu le 2026-09-26). Le citer sans le débiteur ferait
    // croire au dirigeant occupant que ce registre-ci en tient lieu.
    expect(referencesRegistreDossier(IGH)).toMatch(/R\. 146-35 CCH.*propriétaire/);
    expect(phraseRegistreIgh(IGH)).toMatch(/R\. 146-35 CCH.*propriétaire/);
    expect(referencesRegistreDossier(IGH)).not.toContain("143-44");
  });

  it("ne met pas R. 146-35 dans le titre du registre, même en IGH", () => {
    // Ce document n'est pas le registre de l'immeuble : le titre ne cite que
    // ce qu'il met en œuvre.
    expect(referencesRegistreTenue(ERP_EN_IGH)).not.toContain("146-35");
  });

  it("cite les deux articles du Code du travail à tous", () => {
    for (const r of [AUCUN, ERP, IGH, ERP_EN_IGH]) {
      expect(referencesRegistreDossier(r)).toContain("R. 4323-25 et R. 4323-26 CT");
      expect(referencesRegistreTenue(r)).toContain("R. 4323-25 et R. 4323-26 CT");
    }
  });
});

describe("ce qui ne vaut qu'en ERP ou en IGH n'est imprimé qu'à eux (relecture du 2026-09-26)", () => {
  const bureau = { estERP: false, estIGH: false };
  const erp = { estERP: true, estIGH: false };
  const igh = { estERP: false, estIGH: true };

  it("un bureau ni ERP ni IGH ne lit ni le règlement ERP ni la commission de sécurité — le défaut d'origine", () => {
    expect(mentionReglementErp(bureau)).toBe("");
    expect(destinatairesDossier(bureau)).not.toContain("commission de sécurité");
    expect(destinatairesRegistre(bureau)).not.toContain("commission de sécurité");
  });

  it("un ERP les lit ; un IGH lit la commission, pas le règlement ERP", () => {
    expect(mentionReglementErp(erp)).toContain("25 juin 1980");
    expect(destinatairesDossier(erp)).toContain("commission de sécurité");
    expect(destinatairesRegistre(igh)).toContain("commission de sécurité");
    expect(mentionReglementErp(igh)).toBe("");
  });
});
