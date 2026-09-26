import { describe, expect, it } from "vitest";
import { OUTILS_MCP } from "@/lib/mcp/tools";
import { DETAIL_OUTIL_PRODUIT } from "./outils-produit";

describe("page Connecter — les outils décrits sont ceux que le serveur sert", () => {
  const servis = OUTILS_MCP.map((o) => o.nom);

  it("chaque outil servi a sa description produit", () => {
    const sansDescription = servis.filter((nom) => !DETAIL_OUTIL_PRODUIT[nom]);
    expect(sansDescription).toEqual([]);
  });

  it("aucune description ne décrit un outil que le serveur ne sert pas", () => {
    const fantomes = Object.keys(DETAIL_OUTIL_PRODUIT).filter(
      (nom) => !servis.includes(nom),
    );
    expect(fantomes).toEqual([]);
  });
});
