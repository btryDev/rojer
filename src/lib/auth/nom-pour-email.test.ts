import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
const { nomPourEmail } = await import("./better-auth");

describe("nomPourEmail (invitation, ADR-054 § 5)", () => {
  it("retire les liens et les retours à la ligne d'un nom saisi", () => {
    expect(nomPourEmail("Alice\nCliquez https://evil.tld/x maintenant www.evil.fr ok")).toBe(
      "Alice Cliquez [lien retiré] maintenant [lien retiré] ok",
    );
  });

  it("ne laisse aucun domaine, adresse ou IP, quelle que soit l'écriture", () => {
    expect(nomPourEmail("Connectez-vous sur evil.fr/connexion")).toBe("Connectez-vous sur evil fr/connexion");
    expect(nomPourEmail("écrire à support@evil.fr")).toBe("écrire à support evil fr");
    expect(nomPourEmail("evil\u3002fr")).toBe("evil fr");
    expect(nomPourEmail("evil\u200b.\u200bfr")).toBe("evil fr");
    expect(nomPourEmail("ｅｖｉｌ．ｆｒ")).toBe("evil fr");
    expect(nomPourEmail("192.168.0.1")).toBe("192 168 0 1");
    expect(nomPourEmail("M. Dupont, St. Malo")).toBe("M. Dupont, St. Malo");
  });

  it("borne la longueur", () => {
    const n = nomPourEmail("a".repeat(200));
    expect(n.length).toBe(80);
    expect(n.endsWith("…")).toBe(true);
  });

  it("laisse un nom ordinaire tel quel", () => {
    expect(nomPourEmail("  Café du Port  ")).toBe("Café du Port");
  });
});
