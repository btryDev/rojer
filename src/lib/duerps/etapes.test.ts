import { describe, expect, it } from "vitest";
import { construireEtapes, type EtapeId } from "./etapes";

const progression = {
  secteurOk: true,
  unitesOk: true,
  risquesOk: true,
  transverses: { faite: true, sansReponse: [] },
  activitesPosees: false,
};

function ids(etapes: ReturnType<typeof construireEtapes>): EtapeId[] {
  return etapes.map((e) => e.id as EtapeId);
}

/**
 * L'étape « Périmètre du référentiel » (ADR-020) n'existe que si le secteur
 * retenu a des questions à poser. Un écran de questions vide, ou une étape
 * cochée sans rien derrière, se lirait « le référentiel couvre tout » — c'est
 * précisément l'affirmation que le module refuse de produire.
 */
describe("construireEtapes — étape périmètre", () => {
  it("reste masquée quand le secteur ne déclare aucune activité", () => {
    expect(ids(construireEtapes("d1", "unites", progression))).not.toContain(
      "activites",
    );
  });

  it("apparaît avant les unités quand le secteur en déclare", () => {
    const liste = ids(
      construireEtapes("d1", "unites", {
        ...progression,
        activitesPosees: true,
      }),
    );
    expect(liste.indexOf("activites")).toBeGreaterThanOrEqual(0);
    expect(liste.indexOf("activites")).toBeLessThan(liste.indexOf("unites"));
  });

  it("reste visible si on s'y trouve, même sans question déclarée", () => {
    // Sinon le fil d'étapes afficherait une progression dont l'étape courante
    // ne fait pas partie — l'utilisateur se verrait nulle part.
    expect(ids(construireEtapes("d1", "activites", progression))).toContain(
      "activites",
    );
  });

  it("n'est jamais bloquante : elle ne conditionne aucune étape suivante", () => {
    const etapes = construireEtapes("d1", "synthese", {
      secteurOk: true,
      unitesOk: true,
      risquesOk: true,
      transverses: { faite: true, sansReponse: [] },
      activitesPosees: true,
    });
    expect(etapes.find((e) => e.id === "unites")?.atteinte).toBe(true);
    expect(etapes.find((e) => e.id === "synthese")?.atteinte).toBe(true);
  });
});
