import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const adaptateur = vi.hoisted(() => ({ deleteMany: vi.fn(async () => 0) }));
vi.mock("./better-auth", () => ({ auth: { $context: Promise.resolve({ adapter: adaptateur }) } }));

const { codeSaisi, oublierAppareilsDeConfiance, PREFIXE_APPAREIL_DE_CONFIANCE } = await import(
  "./double-authentification"
);

describe("codeSaisi", () => {
  it("six chiffres : un code de l'application, espaces et tirets ignorés", () => {
    expect(codeSaisi("123456")).toEqual({ genre: "application", valeur: "123456" });
    expect(codeSaisi(" 123 456 ")).toEqual({ genre: "application", valeur: "123456" });
    expect(codeSaisi("123-456")).toEqual({ genre: "application", valeur: "123456" });
  });

  it("dix lettres et chiffres : un code de secours, sous la forme gardée par Better Auth, casse comprise", () => {
    expect(codeSaisi("AbCdE-12345")).toEqual({ genre: "secours", valeur: "AbCdE-12345" });
    expect(codeSaisi("AbCdE12345")).toEqual({ genre: "secours", valeur: "AbCdE-12345" });
    expect(codeSaisi("0123456789")).toEqual({ genre: "secours", valeur: "01234-56789" });
  });

  it("rien d'autre", () => {
    for (const brut of ["", "12345", "1234567", "abcdef", "AbCdE-1234", "AbCdE-123456", "12345é7890", "<script>"]) {
      expect(codeSaisi(brut), brut).toBeNull();
    }
  });
});

describe("appareils de confiance", () => {
  // Le préfixe est écrit en dur par Better Auth, non exporté : une montée de
  // version qui le changerait laisserait `confirmerDoubleAuthAction` effacer
  // des lignes qui n'existent plus, sans erreur.
  it("efface toutes celles du compte, et seulement elles", async () => {
    await oublierAppareilsDeConfiance("u-1");
    expect(adaptateur.deleteMany).toHaveBeenCalledWith({
      model: "verification",
      where: [
        { field: "value", value: "u-1" },
        { field: "identifier", operator: "starts_with", value: "trust-device-" },
      ],
    });
  });

  it("le préfixe est celui qu'écrit le plugin installé", () => {
    const racine = dirname(createRequire(import.meta.url).resolve("better-auth/plugins/two-factor"));
    const source = readFileSync(join(racine, "verify-two-factor.mjs"), "utf8");
    expect(source).toContain(`\`${PREFIXE_APPAREIL_DE_CONFIANCE}\${`);
  });
});
