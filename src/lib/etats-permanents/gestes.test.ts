// La découpe par geste de « Ce qui doit être en place » (2026-10-20) : chaque
// ligne de l'écran a son geste, et la table ne vise que des obligations vivantes.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { obligationParId, obligationsConformite } from "@/lib/referentiels/conformite";
import { figureSurLEcranEnPlace } from "./regle";
import { DESSIN_GESTE, GESTE_PAR_OBLIGATION, ORDRE_GESTES } from "./gestes";

const SUR_L_ECRAN = obligationsConformite.filter(figureSurLEcranEnPlace);

describe("la découpe par geste", () => {
  it("chaque ligne de l'écran a un geste", () => {
    expect(SUR_L_ECRAN.length).toBeGreaterThanOrEqual(45);
    expect(SUR_L_ECRAN.filter((o) => !GESTE_PAR_OBLIGATION[o.id]).map((o) => o.id)).toEqual([]);
  });

  it("aucun geste n'est attaché à une obligation qui n'existe plus", () => {
    expect(Object.keys(GESTE_PAR_OBLIGATION).filter((id) => !obligationParId(id))).toEqual([]);
  });

  it("chaque geste a son dessin déposé", () => {
    for (const g of ORDRE_GESTES) {
      expect(existsSync(join(process.cwd(), "public", DESSIN_GESTE[g])), g).toBe(true);
    }
  });
});
