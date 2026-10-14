import { describe, expect, it } from "vitest";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import { normaliser, rechercherMateriel, SYNONYMES_CATEGORIE } from "./recherche-materiel";

const cles = (s: string) => rechercherMateriel(s).materiels.map((m) => m.cle);
const cats = (s: string) => rechercherMateriel(s).categories;

describe("la recherche de matériel (2026-10-14)", () => {
  it("saisie vide : toutes les catégories, dans l'ordre du référentiel, aucun matériel non suivi", () => {
    expect(rechercherMateriel("")).toEqual({ categories: [...CATEGORIES_EQUIPEMENT], materiels: [] });
    expect(rechercherMateriel("   ").materiels).toEqual([]);
  });

  it("les synonymes décidés par la propriétaire", () => {
    expect(cats("chaudière")).toContain("INSTALLATION_GAZ");
    expect(cats("chauffage gaz")).toContain("INSTALLATION_GAZ");
    expect(cats("chambre froide")).toContain("INSTALLATION_FRIGORIFIQUE");
  });

  it("le monte-charge n'est orienté nulle part (revue du 2026-10-14, décision D10 ouverte)", () => {
    // L'arrêté du 1er mars 2004 exclut les monte-charges installés à demeure
    // du levage ; leur texte (arrêté du 29 décembre 2010) n'est pas au corpus.
    // Ni catégorie, ni matériel non couvert : la recherche ne trouve rien.
    expect(rechercherMateriel("monte-charge")).toEqual({ categories: [], materiels: [] });
    expect(rechercherMateriel("monte charge")).toEqual({ categories: [], materiels: [] });
  });

  it("ni accents, ni casse, ni trait d'union ne comptent", () => {
    expect(cats("CHAUDIERE")).toEqual(cats("chaudière"));
    expect(cats("chambre-froide")).toEqual(cats("chambre froide"));
    expect(normaliser("Échelle d’Été")).toBe("echelle d ete");
  });

  it("trouve les matériels non suivis, et la chaudière des deux côtés", () => {
    expect(cles("chaudière")).toContain("chaudiere");
    expect(cles("escabeau")).toEqual(["echelle"]);
    expect(cles("escalator")).toEqual(["escalier_mecanique"]);
    expect(cles("clapet")).toEqual(["reservoir_eau"]);
    // Une catégorie suivie qu'on cherche ne fait pas surgir de matériel.
    expect(cles("extincteur")).toEqual([]);
  });

  it("le libellé d'une catégorie suffit à la trouver, sans synonyme", () => {
    for (const c of CATEGORIES_EQUIPEMENT) {
      expect(SYNONYMES_CATEGORIE[c], c).toBeDefined();
    }
    expect(cats("ascenseur")).toEqual(["ASCENSEUR"]);
  });

  it("déterministe : la même saisie rend la même liste", () => {
    expect(rechercherMateriel("gaz")).toEqual(rechercherMateriel("gaz"));
  });

  it("une saisie qui ne désigne rien ne rend rien", () => {
    expect(rechercherMateriel("zzz")).toEqual({ categories: [], materiels: [] });
  });
});
