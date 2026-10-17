import { describe, expect, it } from "vitest";
import { determineObligationsApplicables, type EtablissementMatching } from "./index";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { CategorieErp, TypeErp } from "@/lib/referentiels/types-communs";

/**
 * Sous-lot D du plan « mise à jour du référentiel » (2026-10-17), mesuré en
 * appelant le moteur sur le référentiel réel : P, S, Y reçoivent le personnel
 * désigné ; T, X l'interdiction de fumer des locaux à risques ; la
 * signalisation du code de la santé publique va à tout établissement de
 * travail et à tout ERP. Chaque garantie dans les deux sens : le visé reçoit,
 * le voisin non.
 */

const PERSONNEL = "incendie-erp-personnel-designe-moyens-secours";
const FUMER_ERP = "incendie-erp-interdiction-fumer-affichee";
const FUMER_CSP = "signalisation-interdiction-fumer-csp";
const SUIVIES = [PERSONNEL, FUMER_ERP, FUMER_CSP];

function etab(
  typeErp: TypeErp | null,
  categorieErp: CategorieErp | null,
  autres: TypeErp[] = [],
  travail = true,
): EtablissementMatching {
  return {
    id: `etab-${typeErp}-${categorieErp}`,
    effectifSurSite: travail ? 8 : 0,
    effectifEntreprise: travail ? 8 : 0,
    estEtablissementTravail: travail,
    estERP: typeErp !== null,
    estIGH: false,
    estHabitation: false,
    typeErp,
    typesErpAutres: autres,
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
  };
}

const recues = (e: EtablissementMatching) => {
  const ids = new Set(determineObligationsApplicables(e, []).map((a) => a.obligation.id));
  return SUIVIES.filter((id) => ids.has(id));
};

describe("sous-lot D — les types visés reçoivent leurs lignes, en catégories 1 à 4", () => {
  it.each([
    ["salle de danse P 3ᵉ", "P", [PERSONNEL, FUMER_CSP]],
    ["bibliothèque S 3ᵉ", "S", [PERSONNEL, FUMER_CSP]],
    ["musée Y 3ᵉ", "Y", [PERSONNEL, FUMER_CSP]],
    ["salle d'exposition T 3ᵉ", "T", [FUMER_ERP, FUMER_CSP]],
    ["établissement sportif couvert X 3ᵉ", "X", [FUMER_ERP, FUMER_CSP]],
  ] as const)("%s", (_nom, type, attendues) => {
    expect(recues(etab(type, "N3"))).toEqual([...attendues]);
  });
});

describe("sous-lot D — les voisins ne les reçoivent pas", () => {
  it("en 5ᵉ catégorie, ni personnel désigné ni interdiction du titre II (PX 1 non étendu à X 25)", () => {
    for (const t of ["P", "S", "Y", "T", "X"] as const) {
      expect(recues(etab(t, "N5")), t).toEqual([FUMER_CSP]);
    }
  });

  it("un type non lu en 3ᵉ (V, culte) ne reçoit que la signalisation du code de la santé publique", () => {
    expect(recues(etab("V", "N3"))).toEqual([FUMER_CSP]);
  });
});

describe("sous-lot D — plusieurs types (ADR-045)", () => {
  it("T déclaré en autre type d'un magasin N3 : l'interdiction ERP une fois, pas deux", () => {
    const ids = determineObligationsApplicables(etab("M", "N3", ["T"]), []).map((a) => a.obligation.id);
    expect(ids.filter((id) => id === FUMER_ERP)).toHaveLength(1);
  });

  it("S en autre type d'un restaurant N3 : le personnel désigné une fois", () => {
    const ids = determineObligationsApplicables(etab("N", "N3", ["S"]), []).map((a) => a.obligation.id);
    expect(ids.filter((id) => id === PERSONNEL)).toHaveLength(1);
  });

  it("X en autre type d'un restaurant N3 (qui n'a pas de ligne de fumer ERP) : la ligne entre", () => {
    expect(recues(etab("N", "N3", ["X"]))).toEqual([PERSONNEL, FUMER_ERP, FUMER_CSP]);
  });
});

describe("signalisation du code de la santé publique — tout établissement, et à part de la ligne ERP", () => {
  it("un employeur hors ERP la reçoit ; un ERP sans salarié aussi", () => {
    expect(recues(etab(null, null))).toEqual([FUMER_CSP]);
    expect(recues(etab("N", "N5", [], false))).toEqual([FUMER_CSP]);
  });

  it("un magasin N3 reçoit les deux lignes, rangées et libellées sans confusion possible", () => {
    expect(recues(etab("M", "N3"))).toEqual([PERSONNEL, FUMER_ERP, FUMER_CSP]);
    const erp = obligationParId(FUMER_ERP)!;
    const csp = obligationParId(FUMER_CSP)!;
    expect(erp.usageEcran).not.toEqual(csp.usageEcran);
    expect(erp.libelle).not.toBe(csp.libelle);
    expect(csp.libelle).toMatch(/locaux fermés et couverts/);
    expect(erp.libelle).toMatch(/ERP des quatre premières catégories/);
  });
});

describe("sous-lot D, revue indépendante — ce que les descriptions disent", () => {
  it("la signalisation CSP nomme l'arrêté du modèle et son format", () => {
    const d = obligationParId(FUMER_CSP)!.description ?? "";
    expect(d).toContain("arrêté du 21 juillet 2025");
    expect(d).toContain("A5 (15 × 21 cm)");
  });

  it("le personnel désigné dit la sur-application de P 21 § 2 et Y 19 § 2, et cite chacun par sa lettre", () => {
    const d = obligationParId(PERSONNEL)!.description ?? "";
    expect(d).toContain("Rojer ne sait pas si vous en avez un");
    expect(d).toContain("« des employés spécialement désignés doivent être entraînés à la mise en oeuvre des moyens de secours dans les établissements ne possédant pas de service de sécurité incendie » (P 21 § 2)");
    expect(d).toContain("« des employés, spécialement désignés, doivent être entraînés à la mise en oeuvre de moyens de secours dans les établissements ne possédant pas de service de sécurité incendie » (Y 19 § 2)");
  });
});
