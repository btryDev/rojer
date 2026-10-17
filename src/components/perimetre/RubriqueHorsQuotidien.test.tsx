// @vitest-environment jsdom
//
// La rubrique « Obligations légales que Rojer ne suit pas au quotidien » de la
// page « Ce que Rojer ne couvre pas » (2026-10-18). Chaîne entière : le calcul
// du dossier (`obligationsNiveauAuditDuDossier`), puis le rendu des cartes.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import {
  GESTE_HORS_QUOTIDIEN,
  obligationsNiveauAuditDuDossier,
} from "@/lib/perimetre/niveau-audit";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import type { EtablissementMatching } from "@/lib/matching/types";
import { RubriqueHorsQuotidien, TITRE_HORS_QUOTIDIEN } from "./RubriqueHorsQuotidien";

afterEach(cleanup);

const etab = {
  id: "etab-1",
  effectifSurSite: 4,
  effectifEntreprise: 4,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  typesErpAutres: [],
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
} as unknown as EtablissementMatching;

// Deux appareils de la même catégorie, déclarés sous des noms à eux : la carte
// doit nommer la catégorie, une fois.
const equipements = [
  { id: "eq-1", libelle: "Masque atelier", categorie: "EPI_RESPIRATOIRE" as const, caracteristiques: null },
  { id: "eq-2", libelle: "Masque réserve", categorie: "EPI_RESPIRATOIRE" as const, caracteristiques: null },
];

const lignes = obligationsNiveauAuditDuDossier(etab, equipements);
const EPI = "epi-verification-generale-periodique-respiratoire";

function rendu() {
  return render(<RubriqueHorsQuotidien lignes={lignes} />).container;
}

// Frontières Unicode, comme `sans-qualification.test.ts` : `\b` est ASCII.
const MOT_AUDIT = /(?<![\p{L}\p{N}_])audit(?![\p{L}\p{N}_])/iu;

describe("rubrique « hors du quotidien » — ce que la carte dit", () => {
  it("le dossier porte bien une ligne d'équipement et une d'établissement — sinon rien ne serait prouvé", () => {
    expect(lignes.map((l) => l.id)).toContain(EPI);
    expect(lignes.some((l) => l.porteePar === null)).toBe(true);
  });

  it("chaque carte dit le geste", () => {
    const c = rendu();
    const cartes = [...c.querySelectorAll("li")];
    expect(cartes).toHaveLength(lignes.length);
    for (const carte of cartes) {
      expect(carte.textContent, `carte sans geste : ${carte.textContent}`).toContain(
        GESTE_HORS_QUOTIDIEN,
      );
    }
  });

  it("« Vise l'établissement lui-même » n'est plus répété", () => {
    expect(rendu().textContent).not.toContain("Vise l'établissement lui-même");
  });

  it("l'équipement est nommé par le libellé de sa catégorie, une fois", () => {
    const carte = [...rendu().querySelectorAll("li")].find((li) =>
      li.textContent?.includes(lignes.find((l) => l.id === EPI)!.libelle),
    )!;
    expect(carte.textContent).toContain(
      `Vise les équipements déclarés : ${LABEL_CATEGORIE_EQUIPEMENT.EPI_RESPIRATOIRE}.`,
    );
  });

  it("aucun code brut de catégorie n'apparaît", () => {
    // Les codes d'un seul mot (« EPI », « VMC », « RIA ») sont aussi des mots
    // des libellés et des labels : ils se cherchent dans la phrase de portée,
    // seule à nommer un équipement. Les codes composés, partout.
    const c = rendu();
    const texte = c.textContent ?? "";
    const portees = [...c.querySelectorAll("li p")]
      .map((p) => p.textContent ?? "")
      .filter((t) => t.startsWith("Vise "));
    expect(portees.length).toBeGreaterThan(0);
    for (const code of CATEGORIES_EQUIPEMENT) {
      if (code.includes("_")) {
        expect(texte, `code brut affiché : ${code}`).not.toContain(code);
      }
      const mot = new RegExp(`(?<![\\p{L}\\p{N}_])${code}(?![\\p{L}\\p{N}_])`, "u");
      for (const p of portees) {
        expect(p, `code brut dans la portée : ${code}`).not.toMatch(mot);
      }
    }
  });

  it("le mot « audit » n'apparaît pas (décision de la propriétaire, 2026-10-18)", () => {
    const c = rendu();
    expect(c.textContent).toContain(TITRE_HORS_QUOTIDIEN);
    // Nœud par nœud, pas sur `textContent` : celui-ci colle le sur-titre au
    // titre (« …auditObligations… ») et la frontière de mot ne se voit plus —
    // la première version de ce test passait avec « § Niveau audit » affiché.
    const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    const noeuds: string[] = [];
    while (walker.nextNode()) noeuds.push(walker.currentNode.textContent ?? "");
    const fautif = noeuds.find((t) => MOT_AUDIT.test(t));
    expect(fautif, `« audit » affiché : ${fautif}`).toBeUndefined();
  });

  it("la référence en chasse fixe passe à la ligne au lieu de déborder", () => {
    const refs = [...rendu().querySelectorAll("[data-reference]")];
    expect(refs).toHaveLength(lignes.length);
    for (const r of refs) expect(r.className).toMatch(/(?:^|\s)wrap-anywhere(?:\s|$)/);
  });
});

describe("page « Ce que Rojer ne couvre pas » — le mot « audit » hors du texte affiché", () => {
  // La page est un composant serveur qui lit la base : on lit sa source, sans
  // commentaires ni imports. Les identifiants (`niveauAudit`) ne tombent pas :
  // une lettre précède le mot.
  it("aucune occurrence dans ce qui s'affiche", () => {
    const ici = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(ici, "..", "..", "app", "etablissements", "[id]", "perimetre", "page.tsx"),
      "utf8",
    );
    const affiche = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !/^\s*(?:\/\/|import\b|\}\s*from\b)/.test(l))
      .join("\n");
    const ligne = affiche.split("\n").find((l) => MOT_AUDIT.test(l));
    expect(ligne, `« audit » affiché : ${ligne}`).toBeUndefined();
  });
});
