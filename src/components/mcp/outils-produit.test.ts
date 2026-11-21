import { describe, expect, it, vi } from "vitest";
import { DETAIL_OUTIL_PRODUIT } from "./outils-produit";

// Les outils servis au porteur OAuth (ADR-062) : la liste seule, sans base.
vi.mock("@/lib/auth/compte-hors-session", () => ({ clientDuPorteurMcp: () => ({}) }));
const { OUTILS_COMPTE } = await import("@/lib/mcp/outils-compte");

describe("page Connecter — les outils décrits sont ceux que le serveur sert", () => {
  const servis = OUTILS_COMPTE.map((o) => o.nom);

  it("chaque outil servi a sa description produit", () => {
    const sansDescription = servis.filter((nom) => !DETAIL_OUTIL_PRODUIT[nom]);
    expect(sansDescription).toEqual([]);
  });

  it("aucune description ne décrit un outil que le serveur ne sert pas", () => {
    const fantomes = Object.keys(DETAIL_OUTIL_PRODUIT).filter((nom) => !servis.includes(nom));
    expect(fantomes).toEqual([]);
  });
});
