// Les constantes de `texte-r4121-2.ts` sont lues par huit surfaces. Si l'une
// s'écarte du texte, les huit s'en écartent ensemble : ce test les confronte
// au verbatim que le corpus consigne pour l'article.

import { describe, expect, it } from "vitest";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import { obligationParId } from "@/lib/referentiels/conformite";
import {
  EXTRAIT_R4121_2,
  MAJ_DUERP_AMENAGEMENT_IMPORTANT,
  MAJ_DUERP_ANNUELLE,
  MAJ_DUERP_CHAPEAU,
  MAJ_DUERP_INFORMATION_NOUVELLE,
  enMinuscule,
} from "./texte-r4121-2";

const verbatim = indexArticlesParRef().get("R. 4121-2")?.article.citationCle ?? "";

describe("R. 4121-2 écrit une fois, et dans ses mots", () => {
  it("le corpus consigne bien un verbatim de l'article", () => {
    expect(verbatim.length).toBeGreaterThan(200);
  });

  it.each([
    ["chapeau", MAJ_DUERP_CHAPEAU],
    ["1°", MAJ_DUERP_ANNUELLE],
    ["2°", MAJ_DUERP_AMENAGEMENT_IMPORTANT],
    ["3°", MAJ_DUERP_INFORMATION_NOUVELLE],
  ])("%s : mot pour mot dans le verbatim", (_rang, texte) => {
    expect(verbatim).toContain(texte);
  });

  // L'obligation vit dans un fichier de DONNÉES du référentiel, qui ne peut
  // pas importer de valeur (le sceau du moteur ne verrait pas la constante
  // changer). Elle écrit donc le texte en littéral — et ce test l'oblige à
  // rester égal aux constantes.
  it("l'obligation « Quand ça arrive » écrit exactement les constantes", () => {
    const o = obligationParId("prevention-etablissement-mise-a-jour-duerp-sur-fait")!;
    expect(o.faitGenerateur).toBe(
      `${MAJ_DUERP_AMENAGEMENT_IMPORTANT}, et ${enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)}`,
    );
    expect((o.description ?? "").startsWith(
      `${MAJ_DUERP_CHAPEAU} : ${enMinuscule(MAJ_DUERP_AMENAGEMENT_IMPORTANT)} ; ${enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)}.`,
    )).toBe(true);
    expect(o.description).toContain(`« ${enMinuscule(MAJ_DUERP_ANNUELLE)} »`);
  });

  it("l'extrait affiché entre guillemets est le début exact de l'article", () => {
    expect(verbatim.startsWith(EXTRAIT_R4121_2.replace(/\.$/, ""))).toBe(true);
  });
});
