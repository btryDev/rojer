// Une variable nettoyée de ce qu'ajoute un copier-coller.

import { describe, expect, it } from "vitest";
import { nettoyer } from "./nettoyer";


describe("nettoyer", () => {
  it.each([
    ["  abc  ", "abc"],
    ["abc\n", "abc"],
    ["\r\nabc\r\n", "abc"],
    ['"abc"', "abc"],
    ["'abc'", "abc"],
    ["“abc”", "abc"],
    ['  "abc"\n', "abc"],
    ['"\'abc\'"', "abc"],
  ])("%j → %j", (entree, sortie) => {
    expect(nettoyer(entree)).toBe(sortie);
  });
  it("ne touche pas l'intérieur", () => {
    expect(nettoyer("a b")).toBe("a b");
    expect(nettoyer(undefined)).toBe("");
  });
});
