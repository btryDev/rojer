import { describe, expect, it } from "vitest";
import { pluriel } from "./pluriel";

describe("pluriel", () => {
  it("accorde au-delà de un, pas à un ni à zéro", () => {
    expect(pluriel(0, "fiche")).toBe("0 fiche");
    expect(pluriel(1, "fiche")).toBe("1 fiche");
    expect(pluriel(2, "fiche")).toBe("2 fiches");
  });

  it("prend un pluriel irrégulier", () => {
    expect(pluriel(3, "mois", "mois")).toBe("3 mois");
  });
});
