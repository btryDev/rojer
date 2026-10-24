import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cataloguerTitres } from "./catalogue";
import { DESSIN_PAR_TITRE, dessinDuTitre } from "./illustration-titre";

describe("le dessin de chaque titre", () => {
  it("chaque titre du catalogue a le sien", () => {
    const sans = cataloguerTitres()
      .map((o) => o.id)
      .filter((id) => !(id in DESSIN_PAR_TITRE));
    expect(sans).toEqual([]);
  });

  it("chaque dessin annoncé a son fichier", () => {
    for (const id of Object.keys(DESSIN_PAR_TITRE)) {
      const { src } = dessinDuTitre(id);
      expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
    }
  });

  it("la table ne garde pas un titre sorti du catalogue", () => {
    const ids = new Set(cataloguerTitres().map((o) => o.id));
    expect(Object.keys(DESSIN_PAR_TITRE).filter((id) => !ids.has(id))).toEqual([]);
  });
});
