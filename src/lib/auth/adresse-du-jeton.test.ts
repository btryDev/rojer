import { describe, expect, it } from "vitest";
import { adresseDuJeton } from "./adresse-du-jeton";

const jeton = (charge: unknown) => `e30.${Buffer.from(JSON.stringify(charge)).toString("base64url")}.signature`;

describe("adresseDuJeton", () => {
  it("lit l'adresse de la charge, en minuscules", () => {
    expect(adresseDuJeton(jeton({ email: "Paul@Exemple.fr" }))).toBe("paul@exemple.fr");
  });

  it("illisible, sans adresse ou absent : null", () => {
    for (const j of [null, undefined, "", "abc", "a.!!!.c", jeton({ autre: 1 }), jeton({ email: 42 }), jeton({ email: "pas-une-adresse" })]) {
      expect(adresseDuJeton(j)).toBeNull();
    }
  });
});
