import { describe, expect, it } from "vitest";
import { deNom } from "./elision";

describe("deNom", () => {
  it("élide devant une voyelle, accentuée ou non, majuscule ou non", () => {
    expect(deNom("Entretien Test A-Z")).toBe("d'Entretien Test A-Z");
    expect(deNom("Électricité Martin")).toBe("d'Électricité Martin");
    expect(deNom("acme")).toBe("d'acme");
  });
  it("garde « de » devant une consonne et devant un h", () => {
    expect(deNom("Nettoyage Pro SARL")).toBe("de Nettoyage Pro SARL");
    expect(deNom("Hôtel du Parc")).toBe("de Hôtel du Parc");
  });
});
