import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { DOMAINE_DE_CATEGORIE } from "./domaines";

describe("le domaine d'une catégorie d'équipement", () => {
  it("est l'un des domaines de ses obligations, quand elle en porte", () => {
    const ecarts: string[] = [];
    for (const [categorie, domaine] of Object.entries(DOMAINE_DE_CATEGORIE)) {
      const domaines = new Set(
        obligationsConformite
          .filter((o) => (o.categoriesEquipement ?? []).includes(categorie as never))
          .map((o) => o.domaine),
      );
      if (domaines.size > 0 && (domaine === null || !domaines.has(domaine))) {
        ecarts.push(`${categorie} → ${domaine} ∉ {${[...domaines].join(", ")}}`);
      }
    }
    expect(ecarts).toEqual([]);
  });
});
