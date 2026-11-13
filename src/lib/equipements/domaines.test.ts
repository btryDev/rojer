import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { FAMILLE_DE_CATEGORIE, RANGEES_HORS_DE_LEURS_OBLIGATIONS, comparerDomaines } from "./domaines";

describe("la famille d'une catégorie d'équipement", () => {
  it("est l'un des domaines de ses obligations, sauf exception déclarée — et une exception ne l'est jamais", () => {
    const ecarts: string[] = [];
    for (const [categorie, famille] of Object.entries(FAMILLE_DE_CATEGORIE)) {
      const domaines = new Set<string>(
        obligationsConformite
          .filter((o) => (o.categoriesEquipement ?? []).includes(categorie as never))
          .map((o) => o.domaine),
      );
      if (domaines.size === 0) continue;
      const dedans = famille !== null && domaines.has(famille);
      if (dedans === RANGEES_HORS_DE_LEURS_OBLIGATIONS.has(categorie as never)) {
        ecarts.push(`${categorie} → ${famille} ; domaines {${[...domaines].join(", ")}}`);
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
