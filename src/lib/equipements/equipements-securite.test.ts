import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "@/lib/matching";
import type { EtablissementMatching, ObligationApplicable } from "@/lib/matching/types";
import { obligationParId } from "@/lib/referentiels/conformite";
import { porteurDe } from "@/lib/referentiels/conformite/types";
import { estEtatADeclarer } from "@/lib/etats-permanents/regle";
import { fondementDe } from "@/lib/etats-permanents/fondement";
import { ancreEtatPermanent } from "@/lib/etats-permanents/ancre";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import { LABEL_CATEGORIE_EQUIPEMENT } from "./labels";
import {
  EQUIPEMENTS_DE_SECURITE,
  hrefActionSecurite,
  libelleEquipementSecurite,
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
  return lignesEquipementsSecurite(determineObligationsApplicables(etab, moteur), parc, {
    typeErp: etab.typeErp,
    categorieErp: etab.categorieErp,
  });
}

describe("la table des équipements de sécurité", () => {
  it("chaque ligne vise une obligation qui existe, portée par l'établissement", () => {
    for (const e of EQUIPEMENTS_DE_SECURITE) {
      const o = obligationParId(e.obligationId);
      expect(o, e.obligationId).toBeDefined();
      expect(porteurDe(o!), e.obligationId).toBe("etablissement");
    }
  });

  it("chaque entrée renvoyée à « Ce qui doit être en place » s'y déclare vraiment", () => {
    for (const e of EQUIPEMENTS_DE_SECURITE) {
      if (e.cible.kind === "etat_permanent") {
        expect(estEtatADeclarer(obligationParId(e.obligationId)!), e.obligationId).toBe(true);
      }
    }
  });

  it("le défibrillateur et les extincteurs prennent le libellé de leur catégorie, l'alarme le sien", () => {
    const libelle = (id: string) =>
      libelleEquipementSecurite(EQUIPEMENTS_DE_SECURITE.find((e) => e.obligationId === id)!);
    expect(libelle("dae-erp-detention")).toBe(LABEL_CATEGORIE_EQUIPEMENT.DEFIBRILLATEUR);
    expect(libelle("incendie-travail-extincteurs-dotation")).toBe(LABEL_CATEGORIE_EQUIPEMENT.EXTINCTEUR);
    expect(libelle("incendie-travail-alarme-sonore")).toBe("Système d'alarme sonore");
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
    // La lecture de l'écran « Ce qui doit être en place », pas une seconde.
    expect(l?.fondement).toEqual(fondementDe(obligationParId("dae-erp-detention")!, {
      typeErp: "N",
      categorieErp: "N3",
    }));
    expect(l?.fondement?.reference).toContain("R. 157-1");
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

describe("« à confirmer » : la règle entière de `phrasesAConfirmer`", () => {
  // Une ligne retenue seulement parce qu'un seuil est franchi par l'effectif de
  // l'ENTREPRISE (C37) — sans question restée muette — est « à confirmer »
  // comme celle qu'un silence retient.
  const applicable = (extra: Partial<ObligationApplicable>): ObligationApplicable => ({
    obligation: obligationParId("incendie-travail-extincteurs-dotation")!,
    equipementsConcernes: [],
    porteur: "etablissement",
    raisons: ["fixture"],
    ...extra,
  });
  const contexte = { typeErp: null, categorieErp: null };

  it("un seuil compté sur l'entreprise rend la ligne « à confirmer »", () => {
    const [l] = lignesEquipementsSecurite(
      [applicable({ effectifAConfirmer: { entreprise: 60, site: 8 } })],
      [],
      contexte,
    );
    expect(l.aConfirmer).toBe(true);
  });

  it("sans marque, la ligne n'est pas « à confirmer »", () => {
    const [l] = lignesEquipementsSecurite([applicable({})], [], contexte);
    expect(l.aConfirmer).toBe(false);
  });
});

describe("le geste de chaque ligne", () => {
  const liens = { base: "/etablissements/e", hrefNouveau: (c: string) => `/nouveau?categorie=${c}` };

  it("pas encore déclaré : le formulaire ouvert sur la catégorie", () => {
    const l = section(RESTAURANT_N3, []).find((x) => x.obligationId === "dae-erp-detention")!;
    expect(hrefActionSecurite(l, liens)).toBe("/nouveau?categorie=DEFIBRILLATEUR");
  });

  it("déclaré : aucun geste", () => {
    const l = section(RESTAURANT_N3, [dae]).find((x) => x.obligationId === "dae-erp-detention")!;
    expect(hrefActionSecurite(l, liens)).toBeNull();
  });

  it("ailleurs : la ligne de l'obligation sur « Ce qui doit être en place », par l'ancre que LigneEtat pose", () => {
    const l = section(RESTAURANT_N3, []).find((x) => x.obligationId === "secours-etablissement-materiel")!;
    expect(hrefActionSecurite(l, liens)).toBe(
      `/etablissements/e/etats-permanents#${ancreEtatPermanent("secours-etablissement-materiel")}`,
    );
  });
});

describe("« Déclarer » suit l'écran, pas le référentiel seul (revue c6, 2026-10-16)", () => {
  // Une obligation dont le rythme effectif n'est plus « autre » quitte « Ce qui
  // doit être en place » pour le calendrier (`modeDeclarationApplique`). La
  // section ne doit alors plus promettre de l'y déclarer. La fixture change ce
  // que la règle lit — le rythme de l'obligation applicable —, sans toucher au
  // référentiel.
  const materiel = obligationParId("secours-etablissement-materiel")!;
  const applicable = (o: ObligationApplicable["obligation"]): ObligationApplicable => ({
    obligation: o,
    equipementsConcernes: [],
    porteur: "etablissement",
    raisons: ["fixture"],
  });
  const contexte = { typeErp: null, categorieErp: null };

  it("tel que le référentiel le porte, la ligne se déclare ailleurs", () => {
    const [l] = lignesEquipementsSecurite([applicable(materiel)], [], contexte);
    expect(l?.etat).toBe("ailleurs");
  });

  it("au rythme annuel, l'écran ne la montre pas : la section ne pose pas la ligne", () => {
    const annuelle = { ...materiel, periodicite: "annuelle" } as ObligationApplicable["obligation"];
    expect(lignesEquipementsSecurite([applicable(annuelle)], [], contexte)).toEqual([]);
  });
});
