import { describe, expect, it } from "vitest";
import { basculerFamille, estVierge, ligneVide, type LigneState } from "./lignes-risque";

/** Cocher et décocher une famille de RiskBoard (2026-11-21, relecture de #353). */

let n = 0;
const cle = () => `c${++n}`;

describe("cocher une famille", () => {
  it("ajoute sa ligne, risque prérempli, à la place de la ligne libre vierge", () => {
    const r = basculerFamille([ligneVide("libre")], "CHUTES_HAUTEUR", cle);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ famille: "CHUTES_HAUTEUR", risque: "Chutes en hauteur" });
  });

  it("garde une ligne libre remplie, et une ligne de famille non encore remplie", () => {
    const libre: LigneState = { ...ligneVide("libre"), risque: "Bruit" };
    const amiante = ligneVide("a", "AMIANTE", "Amiante");
    const r = basculerFamille([libre, amiante], "RADON", cle);
    expect(r.map((l) => l.famille)).toEqual(["", "AMIANTE", "RADON"]);
  });
});

describe("décocher une famille", () => {
  it("retire sa ligne quand elle est vierge — risque prérempli, rien d'autre", () => {
    const r = basculerFamille(
      [ligneVide("a", "AMIANTE", "Amiante"), { ...ligneVide("b"), risque: "Bruit" }],
      "AMIANTE",
      cle,
    );
    expect(r.map((l) => l.risque)).toEqual(["Bruit"]);
  });

  it("garde une ligne remplie, détachée de sa famille : rien de ce qui est écrit ne se perd", () => {
    const remplie: LigneState = { ...ligneVide("a", "AMIANTE", "Amiante"), lieu: "Faux plafond" };
    const r = basculerFamille([remplie], "AMIANTE", cle);
    expect(r).toEqual([{ ...remplie, famille: "" }]);
  });

  it("garde une ligne dont le risque a été réécrit", () => {
    const r = basculerFamille([ligneVide("a", "AMIANTE", "Amiante des dalles de sol")], "AMIANTE", cle);
    expect(r[0]).toMatchObject({ famille: "", risque: "Amiante des dalles de sol" });
  });

  it("la dernière ligne retirée laisse une ligne libre vierge", () => {
    const r = basculerFamille([ligneVide("a", "RADON", "Radon")], "RADON", cle);
    expect(r).toHaveLength(1);
    expect(estVierge(r[0])).toBe(true);
    expect(r[0].famille).toBe("");
  });
});
