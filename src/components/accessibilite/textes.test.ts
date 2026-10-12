// Ce que l'écran du registre dit de son contenu, confronté au verbatim de
// l'arrêté du 19 avril 2017 au corpus (2026-10-12, audit des modules).

import { describe, expect, it } from "vitest";
import {
  ARRETE_2017_04_19_REGISTRE_ACCESSIBILITE,
  CCH_REGISTRE_ACCESSIBILITE,
} from "@/lib/referentiels/corpus/accessibilite-handicap";
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

// Relecture indépendante du 2026-10-12 : l'écran résumait R. 164-6 en
// retirant « complète » et « et leurs justificatifs ».
describe("les trois contenus de R. 164-6, dits mot pour mot", () => {
  const r164_6 = CCH_REGISTRE_ACCESSIBILITE.articles.find((a) => a.ref === "CCH R. 164-6")!;
  const verbatim = r164_6.citationCle ?? "";
  // Les trois points du texte, relevés dans le verbatim, entre « 1° » et
  // la phrase des modalités — pas recopiés ici.
  const points = verbatim
    .split("Le registre contient : ")[1]
    .split(" Les modalités")[0]
    .split(/ ?\d° /)
    .filter(Boolean)
    .map((p) => p.replace(/ ;$|\.$/, ""));

  it("le verbatim porte trois points", () => {
    expect(points).toHaveLength(3);
  });

  it.each([0, 1, 2])("le point %i est à l'écran, entier", (i) => {
    const p = points[i];
    expect(CONTENU_REGISTRE).toContain(p.charAt(0).toLowerCase() + p.slice(1));
  });
});
