import { describe, expect, it } from "vitest";
import { dureeHhMm } from "./duree";

describe("la durée de surveillance, comme la fiche l'écrit", () => {
  it("90 minutes font « 1h30 », pas « 2h » — le défaut du ZIP", () => {
    expect(dureeHhMm(90)).toBe("1h30");
    expect(dureeHhMm(120)).toBe("2h");
    expect(dureeHhMm(60)).toBe("1h");
  });
});
