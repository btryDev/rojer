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

  it("retire un domaine nu et une adresse e-mail, que les messageries rendent cliquables", () => {
    expect(nomPourEmail("Connectez-vous sur evil.fr/connexion")).toBe("Connectez-vous sur [lien retiré]");
    expect(nomPourEmail("écrire à support@evil.fr")).toBe("écrire à [lien retiré]");
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
