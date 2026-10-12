// La table du plan d'actions vide, sous une synthèse qui compte des levées.
//
// Audit du 2026-10-12 : avec zéro action en cours et trois levées, le PDF
// imprimait « Levées (30 j) : 3 » puis « Aucune action enregistrée. » — deux
// phrases du même document qui se contredisaient. La table ne porte que les
// actions ouvertes et en cours ; sa phrase vide doit le dire.

import { describe, expect, it } from "vitest";
import { elementsDansLOrdre, texteDirect } from "./arbre-rendu.test-utils";
import { PlanActionsDocument, type PlanActionsData } from "./PlanActionsDocument";

const data: PlanActionsData = {
  entreprise: "Btry",
  etablissement: "Le Comptoir",
  adresse: "1 rue des Lilas",
  genereLe: new Date("2026-10-12T10:00:00Z"),
  totalOuvertes: 0,
  totalEnCours: 0,
  totalLevees: 3,
  actions: [],
};

function textes(): string[] {
  return elementsDansLOrdre(PlanActionsDocument({ data })).map(texteDirect);
}

describe("PlanActionsDocument — table vide", () => {
  it("ne dit pas « aucune action » quand la synthèse compte des levées", () => {
    const t = textes();
    expect(t.some((x) => /Levées \(30 j\) : 3/.test(x))).toBe(true);
    expect(t.some((x) => /^Aucune action enregistrée/.test(x))).toBe(false);
  });

  it("dit que rien n'est ouvert ni en cours à la date d'édition", () => {
    expect(
      textes().some((x) => /aucune action ouverte ou en cours/i.test(x)),
    ).toBe(true);
  });
});
