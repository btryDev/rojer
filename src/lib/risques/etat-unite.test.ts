import { describe, expect, it } from "vitest";
import { etatUnite } from "./etat-unite";

const r = (id: string, cotationSaisie: boolean, nbMesures: number, activiteId: string | null = null) => ({
  id,
  libelle: id,
  cotationSaisie,
  mesures: Array.from({ length: nbMesures }),
  activiteId,
});

describe("etatUnite", () => {
  it("sans risque ni déclaration : rien n'est fait", () => {
    const e = etatUnite({ risques: [], aucunRisqueJustif: null });
    expect(e).toMatchObject({ inventoriee: false, cotee: false, terminee: false });
  });

  it("déclarée sans risque : terminée", () => {
    const e = etatUnite({ risques: [], aucunRisqueJustif: "Bureau seul" });
    expect(e).toMatchObject({ declareeSansRisque: true, inventoriee: true, terminee: true });
  });

  it("sépare les risques à coter de ceux sans mesure", () => {
    const e = etatUnite({
      risques: [r("a", false, 0), r("b", true, 0), r("c", true, 2)],
      aucunRisqueJustif: null,
    });
    expect(e.aCoter.map((x) => x.id)).toEqual(["a"]);
    expect(e.sansMesure.map((x) => x.id)).toEqual(["b"]);
    expect(e).toMatchObject({ inventoriee: true, cotee: false, mesuree: false, terminee: false });
  });

  it("tout coté et mesuré : terminée", () => {
    const e = etatUnite({ risques: [r("a", true, 1)], aucunRisqueJustif: null });
    expect(e).toMatchObject({ cotee: true, mesuree: true, terminee: true });
  });

  it("une justification ancienne ne compte plus dès qu'un risque est retenu", () => {
    const e = etatUnite({ risques: [r("a", false, 0)], aucunRisqueJustif: "ancienne" });
    expect(e.declareeSansRisque).toBe(false);
  });

  it("des risques ajoutés par Rojer seuls ne mettent pas l'unité en cours", () => {
    const e = etatUnite({
      risques: [r("a", false, 0, "resto-repas-hors-site"), r("b", false, 0, "resto-repas-hors-site")],
      aucunRisqueJustif: null,
    });
    expect(e).toMatchObject({ nbRisques: 2, touchee: false, inventoriee: false });
  });

  it("coter un risque ajouté par Rojer compte comme un geste", () => {
    const e = etatUnite({ risques: [r("a", true, 0, "resto-repas-hors-site")], aucunRisqueJustif: null });
    expect(e.touchee).toBe(true);
  });
});
