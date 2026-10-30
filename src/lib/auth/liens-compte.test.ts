import { afterEach, describe, expect, it, vi } from "vitest";
import { lienReinitialisation, lienVerification } from "./liens-compte";

/**
 * Les liens de compte partent par e-mail au nom de Rojer : leur adresse vient
 * du serveur (`PUBLIC_APP_URL`), jamais de la requête (audit du 2026-10-13, C3).
 */
afterEach(() => vi.unstubAllEnvs());

describe("liens de compte envoyés par e-mail", () => {
  it("pointent nos pages, sur l'adresse publique, « / » final retiré", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr/");
    expect(lienVerification("a.b")).toBe("https://app.rojer.fr/auth/verification?token=a.b");
    expect(lienReinitialisation("xyz")).toBe("https://app.rojer.fr/auth/reinitialisation?token=xyz");
  });

  it("encodent le jeton", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    expect(lienReinitialisation("a&b=c")).toBe(
      "https://app.rojer.fr/auth/reinitialisation?token=a%26b%3Dc",
    );
  });

  it("refusent de produire un lien sans adresse publique en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "");
    expect(() => lienVerification("t")).toThrow(/PUBLIC_APP_URL/);
  });
});
