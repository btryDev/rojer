import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { DOMAINE_DE_CATEGORIE, comparerDomaines } from "./domaines";

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

describe("l'ordre des domaines, commun à la page Équipements et au calendrier", () => {
  it("dépassées d'abord, puis sous 30 jours, puis l'alphabet ; sans domaine en dernier", () => {
    const d = (libelle: string | null, enRetard: number, proche: number) => ({ libelle, enRetard, proche });
    const tries = [d(null, 9, 9), d("Froid", 0, 1), d("Incendie", 3, 0), d("Électricité", 5, 0), d("Portes", 0, 1)]
      .sort(comparerDomaines)
      .map((x) => x.libelle);
    expect(tries).toEqual(["Électricité", "Incendie", "Froid", "Portes", null]);
  });
});
