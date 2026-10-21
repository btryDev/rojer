// Les questions de la fiche « Ce qui doit être en place » (2026-10-20) : une par
// ligne de l'écran, et aucune pour une obligation disparue.

import { describe, expect, it } from "vitest";
import { obligationParId, obligationsConformite } from "@/lib/referentiels/conformite";
import { figureSurLEcranEnPlace } from "./regle";
import { QUESTION_PAR_OBLIGATION, questionDe } from "./questions";

const SUR_L_ECRAN = obligationsConformite.filter(figureSurLEcranEnPlace);

describe("les questions de la fiche", () => {
  it("chaque ligne de l'écran a sa question", () => {
    expect(SUR_L_ECRAN.length).toBeGreaterThanOrEqual(45);
    expect(SUR_L_ECRAN.filter((o) => !QUESTION_PAR_OBLIGATION[o.id]).map((o) => o.id)).toEqual([]);
  });

  it("aucune question pour une obligation qui n'existe plus", () => {
    expect(Object.keys(QUESTION_PAR_OBLIGATION).filter((id) => !obligationParId(id))).toEqual([]);
  });

  it("chaque question est une question, et ne dit jamais « conforme »", () => {
    for (const [id, q] of Object.entries(QUESTION_PAR_OBLIGATION)) {
      expect(q.endsWith("?"), id).toBe(true);
      expect(q.toLowerCase(), id).not.toContain("conforme");
    }
  });

  it("sans question écrite, la fiche montre le libellé", () => {
    expect(questionDe("inconnue", "Le libellé")).toBe("Le libellé");
  });
});
