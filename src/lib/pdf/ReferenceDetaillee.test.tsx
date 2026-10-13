import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { elementsDansLOrdre, texteDirect } from "./arbre-rendu.test-utils";
import { ReferenceDetaillee } from "./ReferenceDetaillee";
import { pourHelvetica, releveDe, texteProvenance } from "./textes-grille-relecture";

function textes(r: Parameters<typeof ReferenceDetaillee>[0]["r"]): string[] {
  return elementsDansLOrdre(ReferenceDetaillee({ r }))
    .map(texteDirect)
    .filter((x) => x !== "");
}

describe("ReferenceDetaillee — une référence du dossier de relecture (revue, R2)", () => {
  const refs = obligationsConformite.flatMap((o) => o.referencesLegales);

  it("imprime la provenance juste sous la ligne de la référence, avant le relevé", () => {
    const r = refs.find((x) => x.article === "R. 4227-37");
    expect(r).toBeDefined();
    const lignes = textes(r!);
    expect(lignes[0]).toContain("R. 4227-37");
    expect(lignes[1]).toBe(pourHelvetica(texteProvenance(releveDe(r!)!, r!)));
    expect(lignes[1]).toMatch(/^corpus\u00a0: retenu · lecture\u00a0: /);
  });

  // Toutes les références du référentiel ont un relevé aujourd'hui : le cas se
  // tient sur une référence sans clé d'article.
  it("sans relevé au corpus, pas de provenance : l'absence est dite", () => {
    const r = { ...refs[0], article: undefined };
    expect(releveDe(r)).toBeUndefined();
    const lignes = textes(r);
    expect(lignes.some((l) => l.startsWith("corpus :"))).toBe(false);
    expect(lignes).toContain("Absent du corpus — jamais dépouillé.");
  });
});
