// Ce que l'écran du registre dit de son contenu, confronté au verbatim de
// l'arrêté du 19 avril 2017 au corpus (2026-10-12, audit des modules).

import { describe, expect, it } from "vitest";
import { ARRETE_2017_04_19_REGISTRE_ACCESSIBILITE } from "@/lib/referentiels/corpus/accessibilite-handicap";
import { CONTENU_REGISTRE, libelleProgression } from "./textes";

const art1 = ARRETE_2017_04_19_REGISTRE_ACCESSIBILITE.articles.find(
  (a) => a.ref === "Arrêté 2017-04-19 art. 1er",
)!;

describe("le contenu du registre, dit au regard de l'art. 1er", () => {
  it("le nombre de pièces annoncé est celui que l'article énumère", () => {
    // Les points numérotés du I, comptés dans le verbatim.
    const points = art1.citationCle?.split(" II. -")[0].match(/\d° /g) ?? [];
    expect(points.length).toBe(9);
    expect(CONTENU_REGISTRE).toContain("neuf");
    expect(CONTENU_REGISTRE).not.toMatch(/4 rubriques obligatoires/);
  });

  it("dit que les pièces ne se déposent pas dans Rojer", () => {
    expect(CONTENU_REGISTRE).toContain("ne s'y déposent pas");
  });

  it("à 100 %, ne dit plus que l'arrêté est entièrement renseigné", () => {
    const l = libelleProgression(100);
    expect(l.titre).not.toBe("Registre complet");
    expect(l.phrase).not.toContain("Toutes les rubriques de l'arrêté");
    expect(l.phrase).toContain("hors de Rojer");
  });

  it("le corpus ne dit plus l'article « porté par le module » sans réserve", () => {
    const motif = "motif" in art1 ? String(art1.motif) : "";
    expect(motif.startsWith("~~Porté par le module")).toBe(true);
    expect(motif).toContain("2026-10-12");
  });
});
