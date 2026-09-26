import { describe, expect, it } from "vitest";
import { SEUIL_LEGIONELLE_UFC_PAR_L, resultatAnalyse } from "./schema";

describe("le résultat d'une analyse de légionelles se lit sur sa valeur", () => {
  it("une analyse SANS valeur n'est pas « sous la limite » — le défaut du 2026-09-26", () => {
    // `actions.ts` écrivait `conforme: valeur === undefined || valeur < seuil`,
    // et le ZIP imprimait « sous la limite de qualité » pour une valeur que
    // personne n'avait saisie.
    expect(resultatAnalyse(undefined)).toBe("sans_valeur");
    expect(resultatAnalyse(null)).toBe("sans_valeur");
  });

  it("l'article 4 : « inférieurs à la limite de qualité fixée à 1 000 » — la limite elle-même est atteinte", () => {
    expect(resultatAnalyse(SEUIL_LEGIONELLE_UFC_PAR_L - 1)).toBe("sous_limite");
    expect(resultatAnalyse(SEUIL_LEGIONELLE_UFC_PAR_L)).toBe("limite_atteinte");
    expect(resultatAnalyse(0)).toBe("sous_limite");
  });
});
