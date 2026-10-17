import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { DESCRIPTION_GN_10 } from "@/lib/referentiels/conformite/texte-gn10";
import { CORPUS } from "@/lib/referentiels/corpus";
import { manquesAnnoncesDuDossier } from "@/lib/perimetre/manques-annonces";

/**
 * Sous-lot C du plan « mise à jour du référentiel » (2026-10-17) : les états
 * permanents du livre II, titre Ier, servis aux ERP des catégories 1 à 4.
 *
 * Ce que ces tests tiennent : qui reçoit chaque ligne (catégorie, matériel
 * déclaré, réponse à la question du SSI de catégorie A ou B), et la phrase
 * GN 10 là où la décision Q7 de c6 la veut — et seulement là.
 */

const PLAN = "incendie-erp-plan-intervention-entrees";
const APPEL = "incendie-erp-modalites-appel-pompiers-affichees";
const PRESENCE_QUALIFIEE = "incendie-erp-personnel-qualifie-detection";
const CONTRAT_SSI = "incendie-erp-ssi-contrat-entretien";
const NOTICE_BAES = "incendie-erp-eclairage-securite-notice-registre";
const CONTRAT_PORTES = "porte-auto-erp-contrat-entretien";
const AVIS = "incendie-erp-avis-controle-affiche";
const AVIS_5_SOMMEIL = "incendie-erp-5-sommeil-avis-controle-affiche";
const ARRET_URGENCE = "cuisson-erp-consignes-arret-urgence";
const EXPLOITANT = "incendie-erp-exploitant-present-public";

const DIX = [
  PLAN,
  APPEL,
  PRESENCE_QUALIFIEE,
  CONTRAT_SSI,
  NOTICE_BAES,
  CONTRAT_PORTES,
  AVIS,
  AVIS_5_SOMMEIL,
  ARRET_URGENCE,
  EXPLOITANT,
];

function erp(
  categorieErp: EtablissementMatching["categorieErp"],
  autres: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab",
    effectifSurSite: 8,
    effectifEntreprise: 8,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "N",
    typesErpAutres: [],
    categorieErp,
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
    ...autres,
  };
}

function appareil(categorie: EquipementMatching["categorie"]): EquipementMatching {
  return { id: `eq-${categorie}`, libelle: categorie, categorie, caracteristiques: null };
}

function servies(etab: EtablissementMatching, eqs: EquipementMatching[] = []): string[] {
  return determineObligationsApplicables(etab, eqs)
    .map((a) => a.obligation.id)
    .filter((id) => DIX.includes(id));
}

describe("sous-lot C — les dix lignes existent, et une seule fois", () => {
  it("chaque identifiant est au référentiel, état permanent, porteur établissement", () => {
    for (const id of DIX) {
      const o = obligationsConformite.find((x) => x.id === id);
      expect(o, id).toBeDefined();
      expect(o?.nature, id).toBe("etat_permanent");
      expect(o?.porteur, id).toBe("etablissement");
      expect(o?.usageEcran, id).not.toBeNull();
    }
  });
});

describe("restaurant de 3ᵉ catégorie sans matériel déclaré", () => {
  it("reçoit le plan, l'appel des pompiers, l'avis et la présence de l'exploitant — rien de ce qui naît d'un matériel", () => {
    expect(servies(erp("N3")).sort()).toEqual([APPEL, AVIS, EXPLOITANT, PLAN].sort());
  });
});

describe("5ᵉ catégorie : le livre II ne s'applique pas, sauf renvoi exprès", () => {
  const tout = [
    appareil("ALARME_INCENDIE"),
    appareil("BAES"),
    appareil("PORTE_AUTO"),
    appareil("APPAREIL_CUISSON_ERP"),
  ];
  it("sans locaux à sommeil : aucune des dix, même tout déclaré et SSI A ou B", () => {
    expect(
      servies(
        erp("N5", { typeErp: "O", comporteLocauxSommeilPublic: false, ssiCategorieAouB: true }),
        tout,
      ),
    ).toEqual([]);
  });
  it("hôtel avec locaux à sommeil pour le public : l'avis de GE 5, par PE 37, et lui seul (le moteur ne lit le sommeil que pour les types où il est plausible)", () => {
    expect(
      servies(
        erp("N5", { typeErp: "O", comporteLocauxSommeilPublic: true, ssiCategorieAouB: true }),
        tout,
      ),
    ).toEqual([AVIS_5_SOMMEIL]);
  });
  it("en 4ᵉ catégorie avec locaux à sommeil : l'avis N1–N4, pas celui de PE 37", () => {
    const res = servies(erp("N4", { typeErp: "O", comporteLocauxSommeilPublic: true }));
    expect(res).toContain(AVIS);
    expect(res).not.toContain(AVIS_5_SOMMEIL);
  });
});

describe("la présence qualifiée et le contrat du SSI : alarme déclarée ET SSI de catégorie A ou B", () => {
  const alarme = [appareil("ALARME_INCENDIE")];
  it("« oui » : les deux sont servies", () => {
    const res = servies(erp("N3", { ssiCategorieAouB: true }), alarme);
    expect(res).toContain(PRESENCE_QUALIFIEE);
    expect(res).toContain(CONTRAT_SSI);
  });
  it("pas répondu : les deux sont retenues, à confirmer (règle du non-renseigné)", () => {
    const applicables = determineObligationsApplicables(erp("N3"), alarme);
    for (const id of [PRESENCE_QUALIFIEE, CONTRAT_SSI]) {
      const a = applicables.find((x) => x.obligation.id === id);
      expect(a, id).toBeDefined();
      expect(JSON.stringify(a), id).toMatch(/ssi/i);
    }
  });
  it("« non » : les deux sont retirées", () => {
    const res = servies(erp("N3", { ssiCategorieAouB: false }), alarme);
    expect(res).not.toContain(PRESENCE_QUALIFIEE);
    expect(res).not.toContain(CONTRAT_SSI);
  });
  it("« oui » sans alarme déclarée : aucune des deux", () => {
    const res = servies(erp("N3", { ssiCategorieAouB: true }));
    expect(res).not.toContain(PRESENCE_QUALIFIEE);
    expect(res).not.toContain(CONTRAT_SSI);
  });
});

describe("les lignes qui naissent d'un matériel déclaré", () => {
  it("BAES → la notice de l'éclairage de sécurité", () => {
    expect(servies(erp("N3"), [appareil("BAES")])).toContain(NOTICE_BAES);
  });
  it("porte automatique → le contrat ; un portail automatique seul, non (CO 48 vise les portes)", () => {
    expect(servies(erp("N3"), [appareil("PORTE_AUTO")])).toContain(CONTRAT_PORTES);
    expect(servies(erp("N3"), [appareil("PORTAIL_AUTO")])).not.toContain(CONTRAT_PORTES);
  });
  it("appareil de cuisson ERP → les consignes de l'arrêt d'urgence", () => {
    expect(servies(erp("N3"), [appareil("APPAREIL_CUISSON_ERP")])).toContain(ARRET_URGENCE);
  });
});

describe("GN 10 (décision Q7 de c6) : cité là où la disposition n'est ni administrative, ni un contrôle, ni de l'entretien", () => {
  const AVEC = [PLAN, APPEL, PRESENCE_QUALIFIEE, ARRET_URGENCE, EXPLOITANT];
  const SANS = [CONTRAT_SSI, NOTICE_BAES, CONTRAT_PORTES, AVIS, AVIS_5_SOMMEIL];
  const description = (id: string) =>
    obligationsConformite.find((o) => o.id === id)?.description ?? "";
  it("les cinq qui le portent le citent entier", () => {
    expect(AVEC.filter((id) => !description(id).includes(DESCRIPTION_GN_10))).toEqual([]);
  });
  it("les cinq autres ne le citent pas : il ne s'y applique pas", () => {
    expect(SANS.filter((id) => description(id).includes("GN 10"))).toEqual([]);
  });
  it("les deux listes font les dix, sans recouvrement", () => {
    expect([...AVEC, ...SANS].sort()).toEqual([...DIX].sort());
  });
});

describe("rubrique « Règlement de sécurité, catégories 1 à 4 »", () => {
  const faits = (categorieErp: string | null) => ({
    travail: true,
    habitation: false,
    categorieErp,
    epiPresents: null,
    operationsElectriques: null,
  });
  const rubrique = (categorieErp: string | null) =>
    manquesAnnoncesDuDossier(CORPUS, faits(categorieErp) as never).find(
      (d) => d.cle === "reglement_erp_1_4",
    );
  it("servie à un ERP des catégories 1 à 4, avec CO 10 et les annonces du sous-lot C", () => {
    const refs = rubrique("N3")?.articles.map((a) => a.ref) ?? [];
    expect(refs).toContain("CO 10");
    expect(refs).toContain("MS 46 § 3 — convention avec un organisateur, annexée au registre");
    expect(refs).toContain("EL 23 § 2 — vérification des installations électriques semi-permanentes");
    expect(refs).toContain("CH 52");
  });
  it("absente en 5ᵉ catégorie et hors ERP", () => {
    expect(rubrique("N5")).toBeUndefined();
    expect(rubrique(null)).toBeUndefined();
  });
});
