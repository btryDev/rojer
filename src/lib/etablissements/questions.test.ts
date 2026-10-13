import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { CATEGORIES_ERP_QUESTION_SSI, questionRepondue } from "./questions";

describe("questions de paramétrage — ce que « répondue » veut dire", () => {
  it("« oui » est une réponse", () => {
    expect(questionRepondue(true)).toBe(true);
  });

  it("« non » AUSSI est une réponse", () => {
    // Le cœur du test. `=== true` passerait les deux autres cas et échouerait
    // ici seulement — et c'est le cas majoritaire : la plupart des dossiers
    // n'ont ni EPI ni demande d'assureur. La checklist ne s'effacerait jamais
    // pour eux.
    expect(questionRepondue(false)).toBe(true);
  });

  it("l'absence de réponse n'en est pas une", () => {
    expect(questionRepondue(null)).toBe(false);
    expect(questionRepondue(undefined)).toBe(false);
  });
});

describe("la question du SSI A/B n'est posée que là où une obligation la lit (2026-10-12)", () => {
  // La liste des catégories où la fiche la pose est écrite à la main (le
  // formulaire est un composant client, il n'importe pas le référentiel) :
  // elle se confronte ici aux obligations qui portent le critère, dans les
  // deux sens.
  const lectrices = obligationsConformite.filter((o) => o.typologies.ssiCategorieAouB === true);

  it("au moins une obligation lit le champ", () => {
    expect(lectrices.length).toBeGreaterThan(0);
  });

  it("les catégories posées sont exactement celles où une lectrice s'applique", () => {
    const servies = new Set<string>();
    for (const o of lectrices) {
      const erp = o.typologies.erp;
      expect(typeof erp === "object" && erp.categories, o.id).toBeTruthy();
      if (typeof erp === "object" && erp.categories) erp.categories.forEach((c) => servies.add(c));
    }
    expect([...CATEGORIES_ERP_QUESTION_SSI].sort()).toEqual([...servies].sort());
  });
});
