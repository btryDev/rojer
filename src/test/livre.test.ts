import { describe, expect, it } from "vitest";
import { seulementSousUnLivreFerme } from "./livre";

// La garde des pages rendues en HTML statique : un texte « seulement sous un
// livre fermé » ne doit ni être dans le `<summary>`, toujours visible, ni être
// pris pour caché parce qu'une classe contient le mot « open » (revue 2026-10-28).
describe("seulementSousUnLivreFerme", () => {
  it("vrai : le texte est dans le panneau d'un livre fermé", () => {
    expect(seulementSousUnLivreFerme("<details><summary>Texte</summary><p>citation</p></details>", "citation")).toBe(true);
  });

  it("faux : le livre est ouvert", () => {
    expect(seulementSousUnLivreFerme('<details open=""><summary>Texte</summary><p>citation</p></details>', "citation")).toBe(false);
  });

  it("faux : le texte est dans le summary, visible livre fermé", () => {
    expect(seulementSousUnLivreFerme("<details><summary>citation</summary><p>x</p></details>", "citation")).toBe(false);
  });

  it("une classe « opener » ne passe pas pour l'attribut open", () => {
    expect(seulementSousUnLivreFerme('<details class="x opener"><summary>T</summary><p>citation</p></details>', "citation")).toBe(true);
  });

  it("faux : le texte est hors de tout livre", () => {
    expect(seulementSousUnLivreFerme("<p>citation</p>", "citation")).toBe(false);
  });
});
