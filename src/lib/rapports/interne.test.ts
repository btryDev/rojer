import { describe, expect, it } from "vitest";
import { obligationParId } from "@/lib/referentiels/conformite";
import { libelleRealisePar, modeParDefaut } from "./interne";

const realisateurs = (id: string) => {
  const o = obligationParId(id);
  if (!o) throw new Error(`obligation absente : ${id}`);
  return o.realisateurs;
};

describe("modeParDefaut — qui peut enregistrer une vérification sans rapport de prestataire", () => {
  it("l'exploitant la fait : ouvre sur « En interne » (alarme hebdomadaire, éclairage mensuel)", () => {
    expect(modeParDefaut(realisateurs("incendie-erp-alarme-verification-hebdomadaire"))).toBe("interne");
    expect(modeParDefaut(realisateurs("incendie-travail-eclairage-securite-essai-mensuel"))).toBe("interne");
  });

  it("une personne qualifiée seulement : ouvre sur « Prestataire », l'interne reste possible", () => {
    expect(modeParDefaut(["personne_qualifiee"])).toBe("prestataire");
    expect(modeParDefaut(["organisme_accredite", "personne_qualifiee"])).toBe("prestataire");
    expect(modeParDefaut(["personne_competente"])).toBe("prestataire");
  });

  it("un tiers seul : pas de choix, le rapport est exigé", () => {
    expect(modeParDefaut(["organisme_agree"])).toBeNull();
    expect(modeParDefaut(["organisme_accredite"])).toBeNull();
    expect(modeParDefaut(["bureau_controle"])).toBeNull();
    expect(modeParDefaut(["fabricant"])).toBeNull();
    expect(modeParDefaut(["medecin_travail"])).toBeNull();
  });
});

describe("libelleRealisePar", () => {
  it("dit « En interne », avec le nom s'il est donné", () => {
    expect(libelleRealisePar({ realiseEnInterne: true, organismeVerif: null })).toBe("En interne");
    expect(libelleRealisePar({ realiseEnInterne: true, organismeVerif: "Marie" })).toBe("En interne (Marie)");
  });

  it("par un prestataire, l'organisme tel quel", () => {
    expect(libelleRealisePar({ realiseEnInterne: false, organismeVerif: "Apave" })).toBe("Apave");
    expect(libelleRealisePar({ realiseEnInterne: false, organismeVerif: null })).toBeNull();
  });
});
