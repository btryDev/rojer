import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { releveDeLaPage } from "./lignes";
import { EN_CLAIR } from "./en-clair";

describe("« Quand ça arrive » en clair", () => {
  const dePage = obligationsConformite.filter((o) => releveDeLaPage(o));

  it("chaque obligation de la page a sa phrase en clair", () => {
    const manquantes = dePage
      .map((o) => o.id)
      .filter((id) => EN_CLAIR[id] == null);
    expect(manquantes).toEqual([]);
  });

  it("aucune entrée orpheline : un id retiré de la page sort d'ici", () => {
    const ids = new Set(dePage.map((o) => o.id));
    expect(Object.keys(EN_CLAIR).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("des phrases courtes, sans référence d'article", () => {
    for (const [id, { quand, quoi }] of Object.entries(EN_CLAIR)) {
      for (const phrase of [quand, quoi]) {
        expect(phrase.length, id).toBeLessThanOrEqual(200);
        expect(phrase, id).not.toMatch(/\b[LRD]\.\s?\d{3,4}/);
      }
    }
  });
});
