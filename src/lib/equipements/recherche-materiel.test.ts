import { describe, expect, it } from "vitest";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import { MATERIELS_NON_COUVERTS } from "./materiels-non-couverts";
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

  it("rideau métallique et barrière levante → portail automatique (décision de c6, 2026-10-17)", () => {
    expect(cats("rideau métallique")).toContain("PORTAIL_AUTO");
    expect(cats("barrière levante")).toContain("PORTAIL_AUTO");
    expect(cats("rideau métallique")).not.toContain("PORTE_AUTO");
  });

  it("cassure : sans son synonyme, le rideau métallique ne trouve plus le portail", () => {
    // La vraie recherche, sur une table privée du synonyme (revue du 2026-10-17 :
    // la première écriture recopiait la logique, et ne prouvait rien d'elle).
    const sans = (retire: string) => ({
      synonymes: { ...SYNONYMES_CATEGORIE, PORTAIL_AUTO: SYNONYMES_CATEGORIE.PORTAIL_AUTO.filter((t) => t !== retire) },
      materiels: MATERIELS_NON_COUVERTS,
    });
    expect(rechercherMateriel("rideau métallique", sans("rideau métallique")).categories).not.toContain("PORTAIL_AUTO");
    expect(rechercherMateriel("barrière levante", sans("barrière levante")).categories).not.toContain("PORTAIL_AUTO");
  });

  it("les synonymes du sous-lot B (inventaire validé le 2026-10-17)", () => {
    expect(cats("climatisation")).toEqual(expect.arrayContaining(["INSTALLATION_FRIGORIFIQUE", "CTA"]));
    expect(cats("pompe à chaleur")).toContain("INSTALLATION_FRIGORIFIQUE");
    expect(cats("réservoir d'air comprimé")).toContain("EQUIPEMENT_SOUS_PRESSION");
    expect(cats("PEMP")).toContain("EQUIPEMENT_LEVAGE");
    expect(cats("pont élévateur")).toContain("EQUIPEMENT_LEVAGE");
    expect(cats("table élévatrice")).toContain("EQUIPEMENT_LEVAGE");
    expect(cats("borne de recharge")).toContain("INSTALLATION_ELECTRIQUE");
    expect(cats("panneaux photovoltaïques")).toContain("INSTALLATION_ELECTRIQUE");
  });

  it("solarium, jacuzzi, spa, tapis de course trouvent leur matériel non suivi (plan, § 3)", () => {
    expect(cles("solarium")).toEqual(["cabine_uv"]);
    expect(cles("jacuzzi")).toEqual(["bain_a_remous"]);
    expect(cles("spa")).toContain("bain_a_remous");
    expect(cles("tapis de course")).toEqual(["materiel_fitness"]);
    expect(cles("transpalette")).toEqual(["transpalette"]);
    expect(cles("cuve de fioul")).toEqual(["cuve_fioul"]);
    expect(cles("aire de jeux")).toEqual(["aire_de_jeux"]);
    expect(cles("adoucisseur")).toEqual(["reservoir_eau"]);
  });

  it("cassure : sans son synonyme, « solarium » ne trouve plus la cabine UV", () => {
    const materiels = MATERIELS_NON_COUVERTS.map((m) =>
      m.cle === "cabine_uv" ? { ...m, synonymes: m.synonymes.filter((t) => t !== "solarium") } : m,
    );
    expect(rechercherMateriel("solarium", { synonymes: SYNONYMES_CATEGORIE, materiels }).materiels).toEqual([]);
  });

  it("la ponctuation d'un libellé ne colle pas au mot : « motorisé » trouve le compacteur (relecture de B)", () => {
    expect(cats("motorisé")).toContain("COMPACTEUR_PRESSE_DECHETS_MOTORISE");
    expect(normaliser("(Motorisé)")).toBe("motorise");
  });

  it("un mot de la saisie commence un mot du terme, jamais son milieu (revue du 2026-10-17)", () => {
    expect(cles("spa")).not.toContain("transpalette");
    expect(cles("spa")).toContain("bain_a_remous");
    // La frappe en cours garde sa réponse.
    expect(cats("chaud")).toContain("INSTALLATION_GAZ");
    expect(cles("escab")).toEqual(["echelle"]);
    // Les synonymes rattachés depuis l'entrée « Piscine ».
    expect(cles("agrès")).toEqual(["materiel_fitness"]);
    expect(cles("équipement sportif")).toEqual(["materiel_fitness"]);
    expect(cles("équipement sportif")).not.toContain("piscine_equipement_sportif");
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

describe("la recherche — l'eau chaude collective (2026-10-17, sous-lot F)", () => {
  const ECS = "EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC";

  it("ses synonymes la trouvent, par début de mot", () => {
    for (const q of ["douche", "ECS", "ballon", "eau chaude", "légionelles", "bain à remous", "jacuzzi", "spa", "chauffe-eau collectif", "production d'eau chaude"]) {
      expect(cats(q), q).toContain(ECS);
    }
  });

  it("« spa » ne remonte que la catégorie et le bain à remous, qui y oriente", () => {
    expect(cats("spa")).toEqual([ECS]);
    expect(cles("spa")).toEqual(["bain_a_remous"]);
  });

  it("« chauffe-eau collectif » trouve l'eau chaude collective seule ; « chauffe-eau » garde le gaz", () => {
    expect(cats("chauffe-eau collectif")).toEqual([ECS]);
    // « chauffe-eau » n'est pas un synonyme de la catégorie (décision de c6 :
    // il reste au gaz). Mais la recherche lit le DÉBUT des mots : « chauffe »
    // et « eau » commencent « chauffe-eau collectif », donc la catégorie
    // sort aussi, après le gaz. Les deux sont proposées, le dirigeant choisit.
    expect(cats("chauffe-eau")).toEqual(["INSTALLATION_GAZ", ECS]);
  });
});
