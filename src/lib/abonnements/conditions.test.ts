import { describe, expect, it } from "vitest";
import { CONDITIONS, VERSION_CONDITIONS, empreinteConditions } from "./conditions";

describe("conditions générales", () => {
  it("une empreinte stable pour une version, qui change si le texte change", () => {
    const e = empreinteConditions();
    expect(e).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinteConditions()).toBe(e);
    const modifie = structuredClone(CONDITIONS);
    modifie[1].paragraphes[0] += " ";
    expect(empreinteConditions(modifie)).not.toBe(e);
    expect(empreinteConditions(CONDITIONS, "autre")).not.toBe(e);
  });

  it("la version provisoire le dit en tête", () => {
    expect(VERSION_CONDITIONS).toMatch(/provisoire/);
    expect(CONDITIONS[0].titre).toBe("Version provisoire");
  });
});
