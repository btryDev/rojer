import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CONDITIONS, VERSION_CONDITIONS } from "./conditions";
import { empreinteConditions } from "./conditions-empreinte";

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

describe("conditions.ts reste importable par un écran client", () => {
  it("n'importe rien de serveur", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./conditions.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/from "(node:|server-only|@\/lib\/signatures)/);
  });
});
