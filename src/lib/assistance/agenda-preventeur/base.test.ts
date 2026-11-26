import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { titreReserve } = await import("./base");

describe("le titre d'un créneau réservé dans l'agenda", () => {
  it("la raison sociale sur une ligne, puis le mode", () => {
    expect(titreReserve("Boulangerie\nL'Épi  & Fils", "visio")).toBe("Réservé — Boulangerie L'Épi & Fils — visio");
  });

  it("borne la raison sociale à quarante caractères", () => {
    expect(titreReserve("A".repeat(100), "telephone")).toBe(`Réservé — ${"A".repeat(40)} — téléphone`);
  });

  it("sans raison sociale, le mode seul", () => {
    expect(titreReserve(null, "telephone")).toBe("Réservé — téléphone");
    expect(titreReserve("   ", "visio")).toBe("Réservé — visio");
  });
});
