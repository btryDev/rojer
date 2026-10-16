import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "@/lib/matching";
import type { EtablissementMatching } from "@/lib/matching/types";
import { obligationParId } from "@/lib/referentiels/conformite";
import { porteurDe } from "@/lib/referentiels/conformite/types";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import {
  EQUIPEMENTS_DE_SECURITE,
  lignesEquipementsSecurite,
  type AppareilDuParc,
} from "./equipements-securite";

// La section « Équipements de sécurité » (décision du 2026-10-15). Trois
// couches : la table (ses identifiants existent, portés par l'établissement,
// ses catégories sont déclarables), la bascule déclaré / pas encore déclaré
// sur un dossier réel du moteur, et la borne — une obligation non applicable
// ne fait pas de ligne. Chaque garde a été éprouvée en la cassant (commit).

const RESTAURANT_N3: EtablissementMatching = {
  id: "etab",
  effectifSurSite: 8,
  effectifEntreprise: 8,
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: "N",
  categorieErp: "N3",
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

const BUREAU: EtablissementMatching = {
  ...RESTAURANT_N3,
  estERP: false,
  typeErp: null,
  categorieErp: null,
};

const dae: AppareilDuParc = { id: "d1", libelle: "DAE de l'entrée", categorie: "DEFIBRILLATEUR" };

function section(etab: EtablissementMatching, parc: AppareilDuParc[]) {
  const moteur = parc.map((p) => ({ ...p, caracteristiques: null }));
  return lignesEquipementsSecurite(determineObligationsApplicables(etab, moteur), parc);
}

describe("la table des équipements de sécurité", () => {
  it("chaque ligne vise une obligation qui existe, portée par l'établissement", () => {
    for (const e of EQUIPEMENTS_DE_SECURITE) {
      const o = obligationParId(e.obligationId);
      expect(o, e.obligationId).toBeDefined();
      expect(porteurDe(o!), e.obligationId).toBe("etablissement");
    }
  });

  it("chaque catégorie citée est déclarable", () => {
    for (const e of EQUIPEMENTS_DE_SECURITE) {
      if (e.cible.kind === "categorie") {
        expect(CATEGORIES_EQUIPEMENT).toContain(e.cible.categorie);
      }
    }
  });
});

describe("la bascule déclaré / pas encore déclaré", () => {
  it("un restaurant de 3ᵉ catégorie sans DAE : « pas encore déclaré », l'article cité", () => {
    const l = section(RESTAURANT_N3, []).find((x) => x.obligationId === "dae-erp-detention");
    expect(l?.etat).toBe("pas_encore_declare");
    expect(l?.appareils).toEqual([]);
    expect(l?.article).toBe("art. R. 157-1, Code de la construction et de l'habitation");
  });

  it("le même restaurant qui déclare un DAE : « déclaré », avec l'appareil", () => {
    const l = section(RESTAURANT_N3, [dae]).find((x) => x.obligationId === "dae-erp-detention");
    expect(l?.etat).toBe("declare");
    expect(l?.appareils.map((a) => a.id)).toEqual(["d1"]);
  });

  it("un appareil d'une autre catégorie ne déclare pas le DAE", () => {
    const extincteur: AppareilDuParc = { id: "e1", libelle: "Extincteur", categorie: "EXTINCTEUR" };
    const lignes = section(RESTAURANT_N3, [extincteur]);
    expect(lignes.find((x) => x.obligationId === "dae-erp-detention")?.etat).toBe("pas_encore_declare");
    expect(lignes.find((x) => x.obligationId === "incendie-travail-extincteurs-dotation")?.etat).toBe("declare");
  });

  it("le matériel de premiers secours se déclare ailleurs, jamais « déclaré » par le parc", () => {
    const l = section(RESTAURANT_N3, [dae]).find((x) => x.obligationId === "secours-etablissement-materiel");
    expect(l?.etat).toBe("ailleurs");
  });
});

describe("la borne : seules les obligations applicables font une ligne", () => {
  it("un bureau non-ERP n'a pas de ligne défibrillateur, même s'il en déclare un", () => {
    const ids = section(BUREAU, [dae]).map((x) => x.obligationId);
    expect(ids).not.toContain("dae-erp-detention");
    expect(ids).toContain("incendie-travail-extincteurs-dotation");
  });
});
