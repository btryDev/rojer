import { describe, expect, it } from "vitest";
import { determineObligationsApplicables, type EtablissementMatching } from "./index";
import type { CategorieErp, TypeErp } from "@/lib/referentiels/types-communs";

/**
 * Livre II, titre II (types M, N, O, W) et livret de CH 39 — décision de la
 * propriétaire du 2026-10-14, mesurée en appelant le moteur sur le référentiel
 * réel.
 *
 * Chaque garantie est éprouvée dans les deux sens : l'établissement visé
 * reçoit la ligne, ses voisins — même type en 5ᵉ, autre type en 3ᵉ — non. Un
 * test qui n'affirmerait que le premier se réparerait en retirant la borne.
 */

const PERSONNEL = "incendie-erp-personnel-designe-moyens-secours";
const FUMER = "incendie-erp-interdiction-fumer-affichee";
const SCHEMA = "incendie-erp-schema-organisation-securite";
const CONSIGNE_CHAMBRES = "incendie-erp-hotel-consigne-chambres";
const PLANS_NIVEAUX = "incendie-erp-hotel-plans-evacuation-niveaux";
const LIVRET = "aeration-erp-filtres-livret-entretien";
const TITRE_2 = [PERSONNEL, FUMER, SCHEMA, CONSIGNE_CHAMBRES, PLANS_NIVEAUX];

function etab(typeErp: TypeErp, categorieErp: CategorieErp): EtablissementMatching {
  return {
    id: `etab-${typeErp}-${categorieErp}`,
    effectifSurSite: 8,
    effectifEntreprise: 8,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp,
    typesErpAutres: [],
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: typeErp === "O" ? true : null,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
  };
}

const CTA = [{ id: "cta-1", libelle: "CTA", categorie: "CTA" as const, caracteristiques: null }];

function recues(e: EtablissementMatching, equipements = CTA): string[] {
  const ids = new Set(determineObligationsApplicables(e, equipements).map((a) => a.obligation.id));
  return [...TITRE_2, LIVRET].filter((id) => ids.has(id));
}

describe("les établissements visés reçoivent leurs lignes", () => {
  it.each([
    ["restaurant N 3ᵉ", "N", "N3", [PERSONNEL, LIVRET]],
    ["magasin M 4ᵉ", "M", "N4", [PERSONNEL, FUMER, SCHEMA, LIVRET]],
    ["bureau W 3ᵉ", "W", "N3", [PERSONNEL, FUMER, LIVRET]],
    ["hôtel O 4ᵉ", "O", "N4", [PERSONNEL, FUMER, CONSIGNE_CHAMBRES, PLANS_NIVEAUX, LIVRET]],
  ] as const)("%s", (_nom, type, categorie, attendues) => {
    expect(recues(etab(type, categorie))).toEqual([...attendues]);
  });
});

describe("leurs voisins ne les reçoivent pas", () => {
  it("un restaurant N 5ᵉ ne reçoit aucune ligne du titre II, ni le livret", () => {
    expect(recues(etab("N", "N5"))).toEqual([]);
  });

  it("une salle de type L en 3ᵉ ne reçoit aucune ligne du titre II — seul le livret, disposition générale de tous les types", () => {
    // CH 39 est au titre Ier : il vaut pour tous les types des quatre
    // premières catégories, comme sa sœur la visite trimestrielle.
    expect(recues(etab("L", "N3"))).toEqual([LIVRET]);
  });

  it("sans ventilation de confort déclarée, pas de livret", () => {
    expect(recues(etab("N", "N3"), [])).toEqual([PERSONNEL]);
  });
});

describe("la consigne du Code du travail porte N 20 en contexte", () => {
  it("un restaurant N 3ᵉ employeur reçoit la ligne qui le cite", () => {
    const app = determineObligationsApplicables(etab("N", "N3"), []);
    const consigne = app.find((a) => a.obligation.id === "incendie-travail-consigne-affichee");
    expect(consigne).toBeDefined();
    expect(consigne!.obligation.referencesLegales.map((r) => r.article)).toContain("N 20");
    expect(consigne!.obligation.description).toContain("(type N) des quatre premières catégories");
  });
});
