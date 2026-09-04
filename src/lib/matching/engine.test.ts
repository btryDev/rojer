import { describe, expect, it } from "vitest";
import {
  obligationsConformite,
  obligationsElectricite,
  obligationsIncendie,
} from "@/lib/referentiels/conformite";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import { FAMILLES_ESP } from "@/lib/equipements/esp";
import {
  determineObligationsApplicables,
  evaluerObligation,
  type EquipementMatching,
  type EtablissementMatching,
} from "./index";

// ============================================================================
// Fixtures d'établissements
// ============================================================================

function etabBureau(over: Partial<EtablissementMatching> = {}): EtablissementMatching {
  return {
    id: "etab-bureau",
    effectifSurSite: 12,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    ...over,
  };
}

function etabRestoErpCat5(
  over: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab-resto",
    effectifSurSite: 8,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "N",
    categorieErp: "N5",
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    ...over,
  };
}

function etabErpCat3(): EtablissementMatching {
  return {
    id: "etab-centre-comm",
    effectifSurSite: 45,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "M",
    categorieErp: "N3",
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
  };
}

function etabIgh(): EtablissementMatching {
  return {
    id: "etab-igh",
    effectifSurSite: 600,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: true,
    estHabitation: false,
    typeErp: "W",
    categorieErp: "N1",
    classeIgh: "GHW1",
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
  };
}

function etabHabitationPure(): EtablissementMatching {
  return {
    id: "etab-hab",
    effectifSurSite: 0,
    estEtablissementTravail: false,
    estERP: false,
    estIGH: false,
    estHabitation: true,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
  };
}

// ============================================================================
// Fixtures d'équipements
// ============================================================================

function elec(over: Partial<EquipementMatching> = {}): EquipementMatching {
  return {
    id: "eq-elec",
    libelle: "TGBT",
    categorie: "INSTALLATION_ELECTRIQUE",
    caracteristiques: null,
    ...over,
  };
}

function extincteur(): EquipementMatching {
  return {
    id: "eq-ext",
    libelle: "Extincteurs",
    categorie: "EXTINCTEUR",
    caracteristiques: { nombre: 4 },
  };
}

function baes(): EquipementMatching {
  return {
    id: "eq-baes",
    libelle: "BAES",
    categorie: "BAES",
    caracteristiques: { nombre: 6 },
  };
}

function vmc(over: Partial<EquipementMatching> = {}): EquipementMatching {
  return {
    id: "eq-vmc",
    libelle: "VMC simple flux",
    categorie: "VMC",
    caracteristiques: null,
    ...over,
  };
}

function hotte(): EquipementMatching {
  return {
    id: "eq-hotte",
    libelle: "Hotte cuisine",
    categorie: "HOTTE_PRO",
    caracteristiques: null,
  };
}

function cuissonErp(): EquipementMatching {
  return {
    id: "eq-cuisson",
    libelle: "Friteuse pro",
    categorie: "APPAREIL_CUISSON_ERP",
    caracteristiques: null,
  };
}

function alarme(): EquipementMatching {
  return {
    id: "eq-alarme",
    libelle: "SSI",
    categorie: "ALARME_INCENDIE",
    caracteristiques: null,
  };
}

function desenfumage(): EquipementMatching {
  return {
    id: "eq-dsf",
    libelle: "Désenfumage mécanique",
    categorie: "DESENFUMAGE",
    caracteristiques: null,
  };
}

function idsObligations(list: ReturnType<typeof determineObligationsApplicables>): string[] {
  return list.map((a) => a.obligation.id).sort();
}

// ============================================================================
// TESTS — typologie
// ============================================================================

describe("moteur matching — typologie Travail seule", () => {
  it("bureau tertiaire avec élec + extincteur + VMC → obligations travail attendues", () => {
    const res = determineObligationsApplicables(etabBureau(), [
      elec(),
      extincteur(),
      vmc(),
    ]);
    const ids = idsObligations(res);
    expect(ids).toContain("elec-travail-periodique-annuelle");
    expect(ids).toContain("elec-travail-mise-en-service");
    expect(ids).toContain("incendie-travail-moyens-lutte");
    expect(ids).toContain("aeration-controle-installations-r4222-20");
    // Pas d'obligations ERP
    expect(ids).not.toContain("elec-erp-cat1-4-annuelle");
    expect(ids).not.toContain("incendie-erp-pe4-entretien-installations-techniques");
  });

  it("bureau sans équipement → aucune obligation d'ÉQUIPEMENT déclenchée", () => {
    const res = determineObligationsApplicables(etabBureau(), []);
    const parEquipement = res.filter((r) => r.porteur === "equipement");
    expect(parEquipement).toHaveLength(0);
  });

  it("bureau sans équipement → les obligations d'établissement s'appliquent quand même", () => {
    // Le faux négatif que l'ADR-022 supprime, et que ce test asseyait
    // jusqu'au 2026-08-27 : un employeur sans aucun appareil déclaré ne
    // voyait rien, alors que R. 4222-20 lui impose d'entretenir et de
    // contrôler l'ensemble de ses installations d'aération. Rendre zéro
    // n'était pas « rien à faire », c'était « on ne sait pas le dire ».
    const res = determineObligationsApplicables(etabBureau(), []);
    const parEtablissement = res.filter((r) => r.porteur === "etablissement");

    expect(idsObligations(res)).toContain(
      "aeration-controle-installations-r4222-20",
    );
    // Une ligne, pas N : le porteur établissement ne se démultiplie pas.
    for (const oa of parEtablissement) {
      expect(oa.equipementsConcernes).toHaveLength(0);
    }
  });

  it("une obligation d'établissement explique pourquoi elle s'applique", () => {
    // Le mode explain doit savoir parler quand ce n'est pas un équipement qui
    // déclenche : sans raison, la ligne apparaît sans que rien ne la motive.
    const res = determineObligationsApplicables(etabBureau(), []);
    const oa = res.find(
      (r) => r.obligation.id === "aeration-controle-installations-r4222-20",
    );
    expect(oa).toBeDefined();
    expect(oa!.raisons.join(" ")).toContain("porte sur l'établissement");
  });

  it("registre de sécurité (periodicite=autre) apparaît quand travail+ERP+équipements de lutte", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [
      extincteur(),
      alarme(),
    ]);
    expect(idsObligations(res)).toContain("incendie-registre-securite");
  });
});

describe("moteur matching — éclairage de sécurité (BAES)", () => {
  const MENSUEL = "incendie-travail-eclairage-securite-essai-mensuel";
  const SEMESTRIEL = "incendie-travail-eclairage-securite-autonomie-semestrielle";
  const ERP_ANNUEL = "incendie-erp-baes-annuelle";

  it("un employeur non-ERP qui déclare un BAES obtient bien des échéances", () => {
    // Régression du silence : le pré-remplissage suggère un BAES à tout
    // bureau tertiaire, et la seule obligation visant la catégorie portait
    // `erp: true`. Le dirigeant lisait « Aucune échéance calculée » sur le
    // premier équipement que l'outil lui avait conseillé de déclarer.
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [baes()]),
    );
    expect(ids).toContain(MENSUEL);
    expect(ids).toContain(SEMESTRIEL);
    expect(ids).not.toContain(ERP_ANNUEL);
  });

  it("un établissement à double régime ne reçoit qu'une série d'échéances sur ses BAES", () => {
    // Le règlement ERP gouverne l'éclairage de sécurité des locaux
    // accessibles au public (arrêté du 14 décembre 2011, art. 1er) : les
    // obligations « travail » s'effacent plutôt que de doubler les
    // occurrences sur un seul et même parc de blocs.
    const ids = idsObligations(
      determineObligationsApplicables(etabRestoErpCat5(), [baes()]),
    );
    expect(ids).toContain(ERP_ANNUEL);
    expect(ids).not.toContain(MENSUEL);
    expect(ids).not.toContain(SEMESTRIEL);
  });

  it("sans BAES déclaré, aucune obligation d'éclairage de sécurité", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [elec()]),
    );
    expect(ids).not.toContain(MENSUEL);
    expect(ids).not.toContain(SEMESTRIEL);
  });
});

describe("moteur matching — typologie ERP", () => {
  it("restaurant ERP cat 5 → déclenche la règle quinquennale PE 4, pas l'annuelle cat 1-4", () => {
    const res = determineObligationsApplicables(etabRestoErpCat5(), [elec()]);
    const ids = idsObligations(res);
    expect(ids).toContain("incendie-erp-pe4-entretien-installations-techniques");
    expect(ids).not.toContain("elec-erp-cat1-4-annuelle");
  });

  it("centre commercial ERP cat 3 → déclenche l'annuelle EL 19, pas la quinquennale PE 4", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [elec()]);
    const ids = idsObligations(res);
    expect(ids).toContain("elec-erp-cat1-4-annuelle");
    expect(ids).not.toContain("incendie-erp-pe4-entretien-installations-techniques");
  });

  it("ERP sans équipement électrique déclaré → pas d'obligation élec ERP", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [extincteur()]);
    const ids = idsObligations(res);
    expect(ids).not.toContain("elec-erp-cat1-4-annuelle");
    expect(ids).not.toContain("incendie-erp-pe4-entretien-installations-techniques");
  });

  it("ERP cat 5 → visite commission PE locaux à sommeil (typologie cat N5)", () => {
    const res = determineObligationsApplicables(etabRestoErpCat5(), [alarme()]);
    expect(idsObligations(res)).toContain("incendie-erp-5-visite-commission");
  });

  it("ERP cat 3 → PAS de visite PE (limitée aux cat N5)", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [alarme()]);
    expect(idsObligations(res)).not.toContain("incendie-erp-5-visite-commission");
  });

  it("ERP cat 3 → SSI triennale (limitée aux cat N1-N4)", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [alarme()]);
    expect(idsObligations(res)).toContain("incendie-erp-ssi-triennale");
  });

  it("ERP cat 5 → PAS de SSI triennale (limitée aux cat N1-N4)", () => {
    const res = determineObligationsApplicables(etabRestoErpCat5(), [alarme()]);
    expect(idsObligations(res)).not.toContain("incendie-erp-ssi-triennale");
  });
});

describe("moteur matching — typologie IGH", () => {
  it("IGH avec élec → déclenche GH 50 annuelle", () => {
    const res = determineObligationsApplicables(etabIgh(), [elec()]);
    expect(idsObligations(res)).toContain("elec-igh-annuelle");
  });

  it("IGH avec alarme + extincteur + désenfumage → moyens de secours annuels GH 60 s.", () => {
    const res = determineObligationsApplicables(etabIgh(), [
      alarme(),
      extincteur(),
      desenfumage(),
    ]);
    expect(idsObligations(res)).toContain("incendie-igh-moyens-secours-annuelle");
  });

  it("bureau non-IGH → pas de GH 50", () => {
    const res = determineObligationsApplicables(etabBureau(), [elec()]);
    expect(idsObligations(res)).not.toContain("elec-igh-annuelle");
  });
});

describe("moteur matching — disjonction des régimes (ascenseurs)", () => {
  const ASCENSEURS = [
    "ascenseur-entretien-contrat",
    "ascenseur-examen-semestriel-secours",
    "ascenseur-examen-annuel-securite",
    "ascenseur-controle-technique-quinquennal",
    "ascenseur-carnet-entretien",
    "ascenseur-telealarme-liaison",
  ];

  function ascenseur(): EquipementMatching {
    return {
      id: "eq-asc",
      libelle: "Ascenseur principal",
      categorie: "ASCENSEUR",
      caracteristiques: null,
    };
  }

  it("ERP pur (non-travail, non-IGH) avec ascenseur → les 6 obligations ascenseur", () => {
    const erpPur = etabErpCat3();
    erpPur.estEtablissementTravail = false;
    const ids = idsObligations(
      determineObligationsApplicables(erpPur, [ascenseur()]),
    );
    for (const id of ASCENSEURS) expect(ids).toContain(id);
  });

  it("IGH pur (non-travail, non-ERP) avec ascenseur → les 6 obligations ascenseur", () => {
    const ighPur = etabIgh();
    ighPur.estEtablissementTravail = false;
    ighPur.estERP = false;
    ighPur.typeErp = null;
    ighPur.categorieErp = null;
    const ids = idsObligations(
      determineObligationsApplicables(ighPur, [ascenseur()]),
    );
    for (const id of ASCENSEURS) expect(ids).toContain(id);
  });

  it("établissement de travail seul (bureau) avec ascenseur → les 6 obligations ascenseur", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [ascenseur()]),
    );
    for (const id of ASCENSEURS) expect(ids).toContain(id);
  });

  it("cumul travail + ERP → chaque obligation ascenseur une seule fois, raisons = régimes matchés", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [ascenseur()]);
    const occurrences = res.filter((a) =>
      ASCENSEURS.includes(a.obligation.id),
    );
    expect(occurrences).toHaveLength(ASCENSEURS.length);
    const contrat = occurrences.find(
      (a) => a.obligation.id === "ascenseur-entretien-contrat",
    );
    expect(contrat?.raisons).toContain("établissement de travail (salariés)");
    expect(contrat?.raisons).toContain("ERP");
    // IGH non matché → absent des raisons.
    expect(contrat?.raisons).not.toContain("IGH");
  });

  it("habitation pure avec ascenseur → applicable (régime habitation déclaré)", () => {
    // Les six obligations ascenseurs déclaraient `{ travail, erp, igh }` sans
    // `habitation` : un immeuble d'habitation sans salarié, non-ERP, non-IGH
    // ne recevait aucune obligation ascenseur. C'était une limite assumée
    // faute d'avoir relu le texte ; la relecture (L. 134-1, L. 134-3,
    // R. 134-11, cités en tête d'ascenseurs.ts) montre que l'obligation
    // s'attache à l'ascenseur et à son propriétaire, sans distinction de
    // destination du bâtiment. Le régime `habitation` a donc été ajouté.
    const res = determineObligationsApplicables(etabHabitationPure(), [
      ascenseur(),
    ]);
    const ids = idsObligations(res);
    for (const id of ASCENSEURS) expect(ids, id).toContain(id);
    // …et la raison affichée à l'utilisateur nomme bien le régime qui matche.
    const raisons = res.flatMap((r) => r.raisons).join(" ");
    expect(raisons).toContain("immeuble d'habitation");
  });

  it("le ET typologie × effectif est préservé (travail matché mais effectif hors plage → rejet)", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-effectif-min",
      typologies: { travail: true, effectifMin: 50 },
    };
    const res = determineObligationsApplicables(etabBureau(), [elec()], {
      obligations: [synthetique],
    });
    expect(res).toHaveLength(0);
  });

  it("les exclusions restent en ET (erp: false rejette un établissement travail+ERP)", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-exclusion-erp",
      typologies: { travail: true, erp: false },
    };
    const res = determineObligationsApplicables(etabErpCat3(), [elec()], {
      obligations: [synthetique],
    });
    expect(res).toHaveLength(0);
    // …mais accepte le même établissement sans régime ERP.
    const resBureau = determineObligationsApplicables(etabBureau(), [elec()], {
      obligations: [synthetique],
    });
    expect(resBureau).toHaveLength(1);
  });

  it("typologie vide → toujours rejetée (garde-fou)", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-typologie-vide",
      typologies: {},
    };
    const res = determineObligationsApplicables(etabBureau(), [elec()], {
      obligations: [synthetique],
    });
    expect(res).toHaveLength(0);
  });
});

describe("moteur matching — typologie habitation", () => {
  it("habitation avec VMC-Gaz → arrêté 25 avril 1985 applicable", () => {
    const res = determineObligationsApplicables(etabHabitationPure(), [vmc()]);
    expect(idsObligations(res)).toContain("aeration-habitation-vmc-gaz-annuelle");
  });

  it("habitation sans VMC → pas d'obligation VMC-Gaz", () => {
    const res = determineObligationsApplicables(etabHabitationPure(), []);
    expect(idsObligations(res)).not.toContain(
      "aeration-habitation-vmc-gaz-annuelle",
    );
  });

  it("bureau non-habitation → pas de VMC-Gaz habitation même avec VMC", () => {
    const res = determineObligationsApplicables(etabBureau(), [vmc()]);
    expect(idsObligations(res)).not.toContain(
      "aeration-habitation-vmc-gaz-annuelle",
    );
  });
});

// ============================================================================
// TESTS — conditions d'équipement
// ============================================================================

describe("moteur matching — conditions booléennes (groupe électrogène)", () => {
  it("ERP avec groupe électrogène déclaré → EL 20 applicable", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [
      elec({
        caracteristiques: { aGroupeElectrogene: true },
      }),
    ]);
    expect(idsObligations(res)).toContain("elec-erp-groupe-electrogene-annuel");
  });

  it("ERP SANS groupe électrogène → EL 20 NON applicable", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [
      elec({ caracteristiques: { aGroupeElectrogene: false } }),
    ]);
    expect(idsObligations(res)).not.toContain(
      "elec-erp-groupe-electrogene-annuel",
    );
  });

  it("ERP avec caracs absentes → EL 20 NON applicable (condition par défaut = non remplie)", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [elec()]);
    expect(idsObligations(res)).not.toContain(
      "elec-erp-groupe-electrogene-annuel",
    );
  });
});

describe("moteur matching — conditions booléennes (local pollution spécifique)", () => {
  it("travail avec VMC pollution spécifique → contrôle annuel applicable", () => {
    const res = determineObligationsApplicables(etabBureau(), [
      vmc({ caracteristiques: { estLocalPollutionSpecifique: true } }),
    ]);
    expect(idsObligations(res)).toContain(
      "aeration-travail-locaux-pollution-specifique",
    );
  });

  it("travail avec VMC SANS pollution spécifique → contrôle annuel non applicable", () => {
    const res = determineObligationsApplicables(etabBureau(), [vmc()]);
    expect(idsObligations(res)).not.toContain(
      "aeration-travail-locaux-pollution-specifique",
    );
  });

  // ── Le semestriel des gaines de recyclage (arrêté 08-10-1987, art. 4 b) ──
  //
  // Deux conditions cumulées sur la même catégorie, donc quatre cas à couvrir.
  // Le cas qui compte est le troisième : le recyclage seul ne suffit pas, parce
  // que l'article 4 ne régit que les locaux à pollution SPÉCIFIQUE — l'article 3
  // traite les autres, et autrement.

  it("pollution spécifique + recyclage → le semestriel s'ajoute à l'annuel", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [
        vmc({
          caracteristiques: {
            estLocalPollutionSpecifique: true,
            aSystemeDeRecyclage: true,
          },
        }),
      ]),
    );
    expect(ids).toContain("aeration-travail-recyclage-semestriel");
    // L'annuel reste dû : le b) AJOUTE un contrôle, il n'en remplace aucun.
    expect(ids).toContain("aeration-travail-locaux-pollution-specifique");
  });

  it("pollution spécifique sans recyclage → l'annuel seul", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [
        vmc({ caracteristiques: { estLocalPollutionSpecifique: true } }),
      ]),
    );
    expect(ids).toContain("aeration-travail-locaux-pollution-specifique");
    expect(ids).not.toContain("aeration-travail-recyclage-semestriel");
  });

  it("recyclage sans pollution spécifique → ni l'un ni l'autre", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [
        vmc({ caracteristiques: { aSystemeDeRecyclage: true } }),
      ]),
    );
    expect(ids).not.toContain("aeration-travail-recyclage-semestriel");
    expect(ids).not.toContain("aeration-travail-locaux-pollution-specifique");
  });

  it("silence sur le recyclage → l'annuel reste dû, le semestriel n'apparaît pas", () => {
    // La forme opt-in choisie ici ne peut RIEN éteindre : c'est ce qui la rend
    // acceptable sur une obligation de criticité 4 (cf. la liste blanche).
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [
        vmc({ caracteristiques: { estLocalPollutionSpecifique: true } }),
      ]),
    );
    expect(ids).toContain("aeration-travail-locaux-pollution-specifique");
  });

  it("travail avec hotte pollution spécifique → contrôle annuel applicable (VMC/CTA/HOTTE_PRO)", () => {
    const res = determineObligationsApplicables(etabBureau(), [
      { ...hotte(), caracteristiques: { estLocalPollutionSpecifique: true } },
    ]);
    expect(idsObligations(res)).toContain(
      "aeration-travail-locaux-pollution-specifique",
    );
  });
});

describe("moteur matching — conditions numériques (parking couvert)", () => {
  it("parking ≤ 250 véhicules → règle biennale PS 32", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [
      vmc({ caracteristiques: { nbVehiculesParkingCouvert: 180 } }),
    ]);
    const ids = idsObligations(res);
    expect(ids).toContain("aeration-erp-ps-surveillance-qualite-air-inf-250");
    expect(ids).not.toContain("aeration-erp-ps-surveillance-qualite-air-sup-250");
  });

  it("parking > 250 véhicules → règle annuelle PS 32", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [
      vmc({ caracteristiques: { nbVehiculesParkingCouvert: 420 } }),
    ]);
    const ids = idsObligations(res);
    expect(ids).toContain("aeration-erp-ps-surveillance-qualite-air-sup-250");
    expect(ids).not.toContain("aeration-erp-ps-surveillance-qualite-air-inf-250");
  });

  it("parking exactement 250 → biennale (≤ 250)", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [
      vmc({ caracteristiques: { nbVehiculesParkingCouvert: 250 } }),
    ]);
    const ids = idsObligations(res);
    expect(ids).toContain("aeration-erp-ps-surveillance-qualite-air-inf-250");
    expect(ids).not.toContain("aeration-erp-ps-surveillance-qualite-air-sup-250");
  });

  it("VMC sans info parking → aucune des deux règles PS 32", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [vmc()]);
    const ids = idsObligations(res);
    expect(ids).not.toContain("aeration-erp-ps-surveillance-qualite-air-inf-250");
    expect(ids).not.toContain("aeration-erp-ps-surveillance-qualite-air-sup-250");
  });
});

// ============================================================================
// TESTS — parcours métier complets
// ============================================================================

describe("moteur matching — scénarios intégrés", () => {
  it("restaurant complet (NAF 56 ERP cat 5 travail) avec parc équipement pré-rempli", () => {
    const res = determineObligationsApplicables(etabRestoErpCat5(), [
      elec(),
      extincteur(),
      baes(),
      alarme(),
      vmc(),
      hotte(),
      cuissonErp(),
    ]);
    const ids = idsObligations(res);
    // Élec — cat 5 : quinquennale + mise en service + travail annuelle + initiale + reg sécurité élec
    expect(ids).toContain("elec-travail-periodique-annuelle");
    expect(ids).toContain("elec-travail-mise-en-service");
    expect(ids).toContain("incendie-erp-pe4-entretien-installations-techniques");
    expect(ids).toContain("elec-erp-mise-en-service");
    expect(ids).toContain("elec-travail-consignation-registre");
    // Incendie
    expect(ids).toContain("incendie-travail-moyens-lutte");
    expect(ids).toContain("incendie-erp-extincteurs-annuelle");
    expect(ids).toContain("incendie-erp-ssi-annuelle");
    expect(ids).toContain("incendie-erp-baes-annuelle");
    expect(ids).toContain("incendie-registre-securite");
    // Aération
    expect(ids).toContain("aeration-controle-installations-r4222-20");
    expect(ids).toContain("aeration-erp-chauffage-ventilation-annuelle");
    // Ramonage annuel des circuits d'extraction (GC 20) : une seule entrée
    // depuis la fusion du doublon `aeration-hotte-pro-annuelle`.
    expect(ids).toContain("cuisson-erp-circuits-extraction-nettoyage");
    expect(
      ids.filter((i) => i === "cuisson-erp-circuits-extraction-nettoyage"),
    ).toHaveLength(1);
  });

  it("bureau minimaliste (travail uniquement) — pas d'obligations ERP ni IGH", () => {
    const res = determineObligationsApplicables(etabBureau(), [
      elec(),
      extincteur(),
      baes(),
      vmc(),
    ]);
    for (const o of res) {
      // Aucune obligation exclusivement ERP ne doit apparaître
      const t = o.obligation.typologies;
      const erpStrict =
        (t.erp === true || typeof t.erp === "object") &&
        t.travail === undefined &&
        !t.habitation &&
        !t.igh;
      expect(erpStrict).toBe(false);
    }
  });

  it("IGH + ERP cat 1 — cumul des deux régimes (élec)", () => {
    const res = determineObligationsApplicables(etabIgh(), [elec()]);
    const ids = idsObligations(res);
    expect(ids).toContain("elec-igh-annuelle");
    expect(ids).toContain("elec-erp-cat1-4-annuelle");
    expect(ids).toContain("elec-travail-periodique-annuelle");
  });
});

// ============================================================================
// TESTS — API et mode explain
// ============================================================================

describe("moteur matching — API et mode explain", () => {
  it("renvoie des raisons pour chaque obligation retenue", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [elec()]);
    for (const o of res) {
      expect(Array.isArray(o.raisons)).toBe(true);
      expect(o.raisons.length).toBeGreaterThan(0);
    }
  });

  it("mode explain cite l'ERP pour une obligation ERP", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [elec()]);
    const annuelle = res.find(
      (o) => o.obligation.id === "elec-erp-cat1-4-annuelle",
    );
    expect(annuelle).toBeDefined();
    expect(annuelle?.raisons.some((r) => r.includes("ERP"))).toBe(true);
  });

  it("mode explain cite la catégorie ERP pour une obligation cat-restreinte", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [alarme()]);
    const tri = res.find((o) => o.obligation.id === "incendie-erp-ssi-triennale");
    expect(tri).toBeDefined();
    expect(tri?.raisons.some((r) => r.includes("catégorie"))).toBe(true);
  });

  it("renvoie les équipements déclencheurs pour chaque obligation", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [
      elec(),
      extincteur(),
    ]);
    const elecObligation = res.find(
      (o) => o.obligation.id === "elec-erp-cat1-4-annuelle",
    );
    expect(elecObligation?.equipementsConcernes.map((e) => e.id)).toEqual([
      "eq-elec",
    ]);
  });

  it("injection d'un référentiel custom (tests)", () => {
    // Nommée, pas prise au rang 0 : le test supposait en aveugle que la
    // première obligation du fichier s'applique à un bureau. L'ajout d'une
    // obligation propre aux hôtels de 5ᵉ catégorie l'a fait tomber le
    // 2026-08-26, alors que le moteur n'avait pas changé.
    const cible = obligationsElectricite.find(
      (o) => o.id === "elec-travail-periodique-annuelle",
    )!;
    expect(cible, "obligation témoin disparue du référentiel").toBeDefined();
    const oneOff: Obligation[] = [cible];
    const res = determineObligationsApplicables(etabBureau(), [elec()], {
      obligations: oneOff,
    });
    expect(res.length).toBe(1);
    expect(res[0].obligation.id).toBe(cible.id);
  });
});

// ============================================================================
// TESTS — cohérence globale avec le référentiel complet
// ============================================================================

describe("moteur matching — cohérence avec le référentiel", () => {
  it("chaque obligation du référentiel peut être matchée sur au moins un scénario type", () => {
    // Scénario "grand complet" qui cumule tous les régimes + équipements clés.
    const etabComplet: EtablissementMatching = {
      id: "etab-complet",
      effectifSurSite: 800,
      estEtablissementTravail: true,
      estERP: true,
      estIGH: true,
      estHabitation: true,
      typeErp: "M",
      categorieErp: "N1",
      classeIgh: "GHZ",
      familleHabitation: null,
      personnesPresentesHabituellement: null,
      manipuleMatieresR422722: null,
      comporteLocauxSommeilPublic: null,
    };
    const eqComplet: EquipementMatching[] = [
      elec({ caracteristiques: { aGroupeElectrogene: true } }),
      extincteur(),
      baes(),
      alarme(),
      desenfumage(),
      vmc({
        caracteristiques: {
          estLocalPollutionSpecifique: true,
          nbVehiculesParkingCouvert: 300,
        },
      }),
      hotte(),
      cuissonErp(),
    ];
    // On ne teste pas tous les ids : certains dépendent de cat 5 ou ≤ 250, qui
    // sont exclusifs. Le test vérifie surtout qu'aucune erreur n'est levée et
    // qu'on récupère plus de 15 obligations.
    const res = determineObligationsApplicables(etabComplet, eqComplet);
    expect(res.length).toBeGreaterThan(15);
  });

  it("aucun doublon d'id dans le résultat (les obligations sont uniques)", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [
      elec(),
      extincteur(),
      alarme(),
      baes(),
    ]);
    const ids = res.map((r) => r.obligation.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("le résultat conserve les références d'obligations du référentiel", () => {
    const res = determineObligationsApplicables(etabBureau(), [elec()]);
    for (const r of res) {
      expect(obligationsConformite).toContain(r.obligation);
    }
  });

  it("les 3 domaines P1 sont joignables via le moteur", () => {
    const etab = etabErpCat3();
    const eq = [elec(), extincteur(), alarme(), vmc()];
    const res = determineObligationsApplicables(etab, eq);
    const domaines = new Set(res.map((r) => r.obligation.domaine));
    expect(domaines.has("electricite")).toBe(true);
    expect(domaines.has("incendie")).toBe(true);
    expect(domaines.has("aeration")).toBe(true);
  });

  it("evaluerObligation en direct renvoie null si typologie incompatible", () => {
    const res = evaluerObligation(
      obligationsElectricite.find((o) => o.id === "elec-igh-annuelle")!,
      etabBureau(),
      [elec()],
    );
    expect(res).toBeNull();
  });

  it("evaluerObligation renvoie null si aucun équipement compatible", () => {
    const res = evaluerObligation(
      obligationsIncendie.find((o) => o.id === "incendie-erp-baes-annuelle")!,
      etabErpCat3(),
      [elec()], // pas de BAES
    );
    expect(res).toBeNull();
  });

  it("evaluerObligation : ramonage de hotte ne déclenche pas sans ERP", () => {
    const hotteObli = obligationsConformite.find(
      (o) => o.id === "cuisson-erp-circuits-extraction-nettoyage",
    )!;
    expect(evaluerObligation(hotteObli, etabBureau(), [hotte()])).toBeNull();
  });

  it("evaluerObligation : ramonage de hotte déclenche dans un ERP cat 5 avec hotte", () => {
    const hotteObli = obligationsConformite.find(
      (o) => o.id === "cuisson-erp-circuits-extraction-nettoyage",
    )!;
    const res = evaluerObligation(hotteObli, etabRestoErpCat5(), [hotte()]);
    expect(res).not.toBeNull();
    expect(res?.equipementsConcernes.map((e) => e.id)).toEqual(["eq-hotte"]);
  });

  it("le ramonage de hotte s'applique aussi à un ERP dont la catégorie est inconnue", () => {
    // Régression de la normalisation `erp: true` : la forme
    // `erp: { categories: ["N1"…"N5"] }` exigeait en plus une catégorie
    // renseignée et perdait donc l'obligation sur un ERP mal qualifié.
    const erpSansCategorie = etabRestoErpCat5({ categorieErp: null });
    const ids = idsObligations(
      determineObligationsApplicables(erpSansCategorie, [hotte()]),
    );
    expect(ids).toContain("cuisson-erp-circuits-extraction-nettoyage");
  });
});

// ============================================================================
// TESTS — amendements 2026-08 : conditions « non infirmées », restrictions de
// catégorie conjonctives, seuils d'effectif
// ============================================================================

describe("moteur matching — condition « non infirmée » (opt-out)", () => {
  const OBLIGATION_VMC_GAZ = "aeration-habitation-vmc-gaz-annuelle";

  // L'exemple portait sur les RIA tant que la catégorie n'existait pas et que
  // l'obligation était rattachée aux extincteurs. La reprise du 2026-08-25 a
  // créé la catégorie, réaffecté les lignes et retiré la branche transitoire :
  // c'est désormais la VMC-Gaz qui illustre l'opérateur, sur le même schéma.

  it("propriété non renseignée → obligation MAINTENUE", () => {
    // C'est tout l'objet de l'opérateur : un immeuble déjà en base, dont la
    // VMC n'a jamais porté la propriété `estVmcGaz`, ne doit pas perdre
    // l'obligation en silence.
    const res = determineObligationsApplicables(etabHabitationPure(), [vmc()]);
    expect(idsObligations(res)).toContain(OBLIGATION_VMC_GAZ);
  });

  it("réponse « oui » explicite → obligation maintenue", () => {
    const res = determineObligationsApplicables(etabHabitationPure(), [
      { ...vmc(), caracteristiques: { estVmcGaz: true } },
    ]);
    expect(idsObligations(res)).toContain(OBLIGATION_VMC_GAZ);
  });

  it("réponse « non » explicite → obligation retirée", () => {
    const res = determineObligationsApplicables(etabHabitationPure(), [
      { ...vmc(), caracteristiques: { estVmcGaz: false } },
    ]);
    expect(idsObligations(res)).not.toContain(OBLIGATION_VMC_GAZ);
  });

  it("valeur d'un type inattendu → traitée comme « pas de réponse »", () => {
    const res = determineObligationsApplicables(etabHabitationPure(), [
      { ...vmc(), caracteristiques: { estVmcGaz: "non" } },
    ]);
    expect(idsObligations(res)).toContain(OBLIGATION_VMC_GAZ);
  });

  it("un RIA déclaré rend l'obligation annuelle, sans condition à satisfaire", () => {
    // Contre-épreuve de la reprise : la catégorie propre suffit désormais,
    // il n'y a plus de propriété d'extincteur à interroger.
    const res = determineObligationsApplicables(etabErpCat3(), [
      { id: "eq-ria", libelle: "RIA du hall", categorie: "RIA" as const, caracteristiques: null },
    ]);
    expect(idsObligations(res)).toContain("incendie-erp-ria-annuelle");
  });

  it("un extincteur seul ne rend plus l'obligation RIA", () => {
    const res = determineObligationsApplicables(etabErpCat3(), [extincteur()]);
    expect(idsObligations(res)).not.toContain("incendie-erp-ria-annuelle");
    // …sans emporter la vérification annuelle des extincteurs eux-mêmes.
    expect(idsObligations(res)).toContain("incendie-erp-extincteurs-annuelle");
  });
});

describe("moteur matching — faux positifs structurels corrigés", () => {
  function levage(caracteristiques: Record<string, unknown> | null = null) {
    return {
      id: "eq-transpalette",
      libelle: "Transpalette électrique",
      categorie: "EQUIPEMENT_LEVAGE" as const,
      caracteristiques,
    };
  }

  it("un transpalette dont on a répondu « non » perd la VGP semestrielle « personnes »", () => {
    const res = determineObligationsApplicables(etabBureau(), [
      levage({ sertAuLevageDePersonnes: false, aAccessoiresDeLevage: false }),
    ]);
    const ids = idsObligations(res);
    expect(ids).not.toContain("levage-vgp-semestrielle-personnes");
    expect(ids).not.toContain("levage-vgp-accessoires-annuelle");
    // La VGP annuelle de levage de charges, elle, reste due.
    expect(ids).toContain("levage-vgp-annuelle-charges");
  });

  it("une nacelle déclarée comme telle conserve la VGP semestrielle", () => {
    const res = determineObligationsApplicables(etabBureau(), [
      levage({ sertAuLevageDePersonnes: true }),
    ]);
    expect(idsObligations(res)).toContain("levage-vgp-semestrielle-personnes");
  });

  // Arrêté du 1er mars 2004 : douze mois par principe (art. 23), six mois pour
  // les chariots élévateurs et gerbeurs (art. 20-II). Les deux périodicités
  // s'excluent — un appareil ne doit jamais en recevoir deux, ni aucune.
  it("un gerbeur déclaré passe à la VGP semestrielle et perd l'annuelle", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [
        levage({ estChariotOuGerbeur: true }),
      ]),
    );
    expect(ids).toContain("levage-vgp-semestrielle-chariot-gerbeur");
    expect(ids).not.toContain("levage-vgp-annuelle-charges");
  });

  it("un appareil déclaré « non » garde la VGP annuelle et n'a pas la semestrielle", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [
        levage({ estChariotOuGerbeur: false }),
      ]),
    );
    expect(ids).toContain("levage-vgp-annuelle-charges");
    expect(ids).not.toContain("levage-vgp-semestrielle-chariot-gerbeur");
  });

  it("sans réponse, la VGP annuelle reste due — le silence n'éteint aucune échéance", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [levage(null)]),
    );
    expect(ids).toContain("levage-vgp-annuelle-charges");
    expect(ids).not.toContain("levage-vgp-semestrielle-chariot-gerbeur");
  });

  it("un compresseur hors champ de l'arrêté du 20 novembre 2017 perd la requalification décennale", () => {
    const res = determineObligationsApplicables(etabBureau(), [
      {
        id: "eq-compresseur",
        libelle: "Compresseur d'atelier",
        categorie: "EQUIPEMENT_SOUS_PRESSION",
        caracteristiques: { estSoumisSuiviEnService: false },
      },
    ]);
    const ids = idsObligations(res);
    expect(ids).not.toContain("esp-requalification-decennale");
    expect(ids).not.toContain("esp-inspection-periodique");
    // La formation des opérateurs relève du Code du travail : elle demeure.
    expect(ids).toContain("esp-personnel-formation");
  });

  it("une VMC d'habitation non raccordée au gaz perd l'obligation VMC-Gaz", () => {
    const res = determineObligationsApplicables(etabHabitationPure(), [
      vmc({ caracteristiques: { estVmcGaz: false } }),
    ]);
    expect(idsObligations(res)).not.toContain(
      "aeration-habitation-vmc-gaz-annuelle",
    );
  });

  it("une cuisine sans extinction automatique perd la vérification correspondante", () => {
    const res = determineObligationsApplicables(etabRestoErpCat5(), [
      { ...cuissonErp(), caracteristiques: { aExtinctionAutomatique: false } },
    ]);
    const ids = idsObligations(res);
    expect(ids).not.toContain("cuisson-erp-extinction-automatique-annuelle");
    expect(ids).toContain("cuisson-erp-appareils-annuelle");
  });
});

describe("moteur matching — cartographie des catégories sans obligation", () => {
  /**
   * Le trou que ce test ferme : le test « parc complet » ci-dessous fait
   * tourner un établissement **tous régimes** (travail + ERP + IGH +
   * habitation). Il ne peut donc pas voir qu'une catégorie déclarable ne rend
   * rien chez un employeur ordinaire ou chez un petit ERP — tous les régimes
   * matchent à la fois, et le trou se referme tout seul.
   *
   * Or c'est exactement ce que produit une typologie mal posée : la catégorie
   * reste déclarable, l'écran l'accepte, et l'appareil se retrouve « aucune
   * échéance calculée » sans que personne n'ait décidé qu'il devait l'être.
   *
   * Ce test ne dit pas ce qui *devrait* s'appliquer : il fige la carte de ce
   * qui ne s'applique pas aujourd'hui, typologie par typologie. Élargir un
   * trou fait échouer la suite ; le combler aussi — et on retire alors la
   * ligne, en connaissance de cause.
   */
  const TYPOLOGIES: { nom: string; etab: EtablissementMatching; vides: string[] }[] = [
    {
      nom: "bureau (employeur non-ERP)",
      etab: etabBureau(),
      vides: [
        // Soupape de saisie : aucune obligation ne la cite, par construction.
        "AUTRE",
        // EPI, ajoutée le 2026-09-04 : déclarable et volontairement sans
        // obligation. Le dirigeant pouvait DIRE qu'il fournit des équipements
        // de protection — la question `epiPresents` de la fiche
        // établissement — et n'en déclarer aucun. Il le peut désormais ; ce
        // qu'aucune lecture n'autorise encore, c'est d'en tirer une échéance.
        // R. 4323-95 à R. 4323-99 et l'arrêté qui fixe la liste des EPI
        // soumis à vérification ne sont pas dépouillés, et ce dépôt n'encode
        // pas sur un texte que personne n'a ouvert.
        //
        // La ligne ne sortira PAS de cette liste par un simple rattachement :
        // « EPI » est une famille et non un régime. Un harnais antichute se
        // vérifie, un casque non — viser la catégorie entière réclamerait un
        // rendez-vous annuel à qui a déclaré des gants, le défaut même que la
        // catégorie du compacteur a été écrite pour éviter. La lecture de
        // l'arrêté décidera peut-être de la scinder en deux.
        "EPI",
        // Réglementations ERP pures : rien ne les vise chez un employeur seul.
        "DESENFUMAGE",
        "APPAREIL_CUISSON_ERP",
        "HOTTE_PRO",
        // RIA A QUITTÉ CETTE LISTE LE 2026-09-02, et le trou qu'elle notait
        // est comblé, pas contourné. La note disait : « la seule obligation
        // qui vise la catégorie est `incendie-erp-ria-annuelle`, fondée sur
        // MS 73 — donc `erp: true` [...] aucun texte du référentiel ne pose de
        // périodicité propre aux RIA hors ERP ». C'est toujours vrai des
        // PÉRIODICITÉS, et ce n'est plus vrai de la couverture : l'article 10
        // de l'arrêté du 4 novembre 1993 impose d'identifier les équipements
        // de lutte contre l'incendie par une coloration rouge et un panneau de
        // localisation, sans condition de régime — `signalisation-incendie-
        // moyens-lutte` la porte sur `EXTINCTEUR` et `RIA`, en `travail:
        // true`. Un employeur non-ERP qui déclare un RIA obtient donc un état
        // permanent à constituer, pas une échéance datée. La ligne sort de la
        // liste parce que le test compte les obligations déclenchées par
        // l'appareil, quelle que soit leur nature.
        // ALARME_INCENDIE, ajoutée le 2026-08-31 (lot « faux négatifs
        // d'ancrage »). Les trois obligations qui la citaient en DÉCLENCHEUR
        // chez un employeur non-ERP — consigne affichée, exercices
        // semestriels, tenue du registre — sont passées au porteur
        // établissement : R. 4227-34 dispose que les établissements de son
        // champ « sont équipés d'un système d'alarme sonore », de sorte que
        // l'alarme y est le contenu d'une obligation et jamais la condition
        // d'une autre.
        //
        // Ce n'est donc PAS un trou de couverture qui s'ouvre — les trois
        // obligations s'appliquent désormais PLUS largement, y compris à qui
        // n'a rien déclaré. C'est la conséquence d'écran : un employeur
        // non-ERP qui déclare son alarme voit un appareil « aucune échéance
        // calculée », alors que ses échéances existent, ailleurs, portées par
        // l'établissement. La catégorie reste citée par les trois obligations
        // en `equipementsEnContexte`, à titre indicatif.
        "ALARME_INCENDIE",
        // BAES : question ouverte. Les deux obligations de l'arrêté du
        // 14 décembre 2011 (essai mensuel, autonomie semestrielle) portent
        // `erp: false` et ne visent donc pas non plus l'ERP. Chez un
        // employeur non-ERP, elles s'appliquent — la ligne n'est donc pas
        // ici. Cf. la note de `incendie.ts` sur EC 14.
      ],
    },
    {
      nom: "restaurant ERP type N catégorie 5",
      etab: etabRestoErpCat5(),
      vides: [
        "AUTRE",
        // EPI, ajoutée le 2026-09-04 : déclarable et volontairement sans
        // obligation. Le dirigeant pouvait DIRE qu'il fournit des équipements
        // de protection — la question `epiPresents` de la fiche
        // établissement — et n'en déclarer aucun. Il le peut désormais ; ce
        // qu'aucune lecture n'autorise encore, c'est d'en tirer une échéance.
        // R. 4323-95 à R. 4323-99 et l'arrêté qui fixe la liste des EPI
        // soumis à vérification ne sont pas dépouillés, et ce dépôt n'encode
        // pas sur un texte que personne n'a ouvert.
        //
        // La ligne ne sortira PAS de cette liste par un simple rattachement :
        // « EPI » est une famille et non un régime. Un harnais antichute se
        // vérifie, un casque non — viser la catégorie entière réclamerait un
        // rendez-vous annuel à qui a déclaré des gants, le défaut même que la
        // catégorie du compacteur a été écrite pour éviter. La lecture de
        // l'arrêté décidera peut-être de la scinder en deux.
        "EPI",
      ],
    },
  ];

  for (const { nom, etab, vides } of TYPOLOGIES) {
    it(`${nom} : seules les catégories déclarées vides ne rendent rien`, () => {
      const sansObligation = CATEGORIES_EQUIPEMENT.filter((categorie) => {
        const res = determineObligationsApplicables(etab, [
          { id: `eq-${categorie}`, libelle: categorie, categorie, caracteristiques: null },
        ]);
        // Ne comptent que les obligations que CET APPAREIL déclenche. Depuis
        // l'ADR-022, les obligations portées par l'établissement s'appliquent
        // quoi qu'on déclare : les compter ici ferait passer toute catégorie
        // pour couverte, et ce test — dont l'objet est justement de figer les
        // trous de couverture par équipement — cesserait de rien vérifier.
        const parEquipement = res.filter(
          (r) => r.porteur === "equipement" && r.equipementsConcernes.length > 0,
        );
        return parEquipement.length === 0;
      });

      expect(
        [...sansObligation].sort(),
        "Une catégorie déclarable qui ne rend aucune obligation donne un " +
          "appareil « aucune échéance calculée ». Si c'est voulu, ajoutez-la " +
          "à la liste `vides` avec la raison ; sinon, c'est une typologie à " +
          "corriger dans le référentiel.",
      ).toEqual([...vides].sort());
    });
  }
});

describe("moteur matching — aucun établissement existant ne perd une obligation criticité ≥ 4", () => {
  /**
   * Verrou central de l'amendement 2026-08. Un établissement « existant » est
   * un établissement dont les équipements n'ont AUCUNE caractéristique
   * renseignée — situation de tous ceux qui sont en base avant l'ajout des
   * nouvelles questions. Le test reconstitue ce cas et vérifie que le parc
   * d'obligations de criticité ≥ 4 est identique à celui qu'on obtiendrait
   * sans aucune condition, c'est-à-dire avant l'amendement.
   */
  const etabTousRegimes: EtablissementMatching = {
    id: "etab-legacy",
    effectifSurSite: 80,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: true,
    estHabitation: true,
    typeErp: "N",
    categorieErp: "N2",
    classeIgh: "GHZ",
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
  };

  /** Un équipement sans caractéristiques pour chacune des catégories. */
  const parcSansCaracteristiques: EquipementMatching[] =
    CATEGORIES_EQUIPEMENT.map((categorie) => ({
      id: `eq-${categorie}`,
      libelle: categorie,
      categorie,
      caracteristiques: null,
    }));

  it("le résultat inclut toutes les obligations criticité ≥ 4 conditionnées en « non infirmée »", () => {
    const ids = new Set(
      idsObligations(
        determineObligationsApplicables(
          etabTousRegimes,
          parcSansCaracteristiques,
        ),
      ),
    );

    const perdues = obligationsConformite
      .filter((o) => o.criticite >= 4)
      .filter((o) =>
        (o.conditions ?? []).every(
          (c) => c.type === "equipement_propriete_non_infirmee",
        ),
      )
      // Restrictions de typologie / d'effectif hors sujet ici : on ne garde
      // que les obligations que cet établissement « tous régimes » satisfait
      // par ailleurs, en les réévaluant sans leurs conditions.
      .filter(
        (o) =>
          evaluerObligation(
            { ...o, conditions: undefined },
            etabTousRegimes,
            parcSansCaracteristiques,
          ) !== null,
      )
      .map((o) => o.id)
      .filter((id) => !ids.has(id));

    expect(perdues).toEqual([]);
  });

  it("aucune condition stricte n'a été ajoutée sur une obligation criticité ≥ 4 hors allowlist", () => {
    // Doublon volontaire de l'invariant du référentiel : si quelqu'un
    // contourne la règle côté référentiel, le moteur le signale aussi.
    // Ce qui compte n'est pas la forme retenue mais son comportement au
    // silence : `non_infirmee` et `infirmee` restent toutes deux satisfaites
    // quand la propriété est absente, donc aucune obligation ne s'éteint
    // faute de réponse.
    const formesSures = new Set([
      "equipement_propriete_non_infirmee",
      "equipement_propriete_infirmee",
      // `enum_differente` rejoint les deux autres le 2026-09-01, pour la même
      // raison et pas parce qu'elle gênait : elle est SATISFAITE quand la
      // propriété est absente. C'est elle qui garde `esp-inspection-periodique`
      // sur un équipement dont `familleEsp` n'a jamais été saisie.
      "equipement_propriete_enum_differente",
    ]);
    const strictes = obligationsConformite
      .filter((o) => o.criticite >= 4)
      .filter((o) =>
        (o.conditions ?? []).some((c) => !formesSures.has(c.type)),
      )
      .map((o) => o.id)
      .sort();
    expect(strictes).toEqual([
      "aeration-erp-ps-surveillance-qualite-air-sup-250",
      "aeration-travail-locaux-pollution-specifique",
      // Obligation neuve du 2026-09-01 : le semestriel des gaines de recyclage
      // S'AJOUTE à cet annuel, qui reste dû tant que la question n'a pas reçu
      // « oui ». Aucun équipement en base ne peut donc rien perdre.
      "aeration-travail-recyclage-semestriel",
      "elec-erp-groupe-electrogene-annuel",
      // Obligation neuve du 2026-09-01 (arrêté du 20 novembre 2017, art. 15 :
      // deux ans pour les générateurs de vapeur). Elle porte l'égalité
      // `familleEsp = generateur_vapeur`, qui est stricte ; sa jumelle
      // `esp-inspection-periodique` porte la différence, satisfaite au silence,
      // et couvre donc l'équipement tant que la famille n'est pas saisie.
      "esp-inspection-periodique-generateur-vapeur",
      // Cinq paliers non nominaux du contrôle d'étanchéité : obligations
      // neuves, et `froid-controle-etancheite-annuel` couvre l'installation
      // tant qu'aucune question n'a reçu « oui ».
      "froid-controle-etancheite-annuel-50t-detection",
      "froid-controle-etancheite-biennal-detection",
      "froid-controle-etancheite-semestriel-500t-detection",
      "froid-controle-etancheite-semestriel-50t",
      "froid-controle-etancheite-trimestriel-500t",
      // Obligation neuve : personne ne peut la perdre, et la VGP annuelle
      // couvre l'appareil tant que la question n'a pas reçu « oui ».
      "levage-vgp-semestrielle-chariot-gerbeur",
      // Obligation neuve créée le 2026-08-26 (art. 23 b) : personne ne peut la
      // perdre, et `levage-vgp-semestrielle-personnes` couvre l'appareil tant
      // que la question sur la force humaine n'a pas reçu « oui » — elle porte
      // pour cela une condition `infirmee` sur la même propriété.
      "levage-vgp-trimestrielle-force-humaine",
    ]);
  });
});

describe("moteur matching — contrôle d'étanchéité des installations frigorifiques", () => {
  // Règlement (UE) 2024/573, art. 5 : trois paliers de charge, chacun dédoublé
  // par la présence d'un système fixe de détection des fuites. Six cas, six
  // obligations qui s'excluent — et une contrainte de plus que le levage : le
  // dirigeant ne connaît pas sa charge en tonnes équivalent CO2, ce chiffre ne
  // se lisant pas sur la porte d'une chambre froide. Le modèle doit donc
  // produire une échéance même quand il ne répond à rien.
  const PERIODIQUES = [
    "froid-controle-etancheite-annuel",
    "froid-controle-etancheite-biennal-detection",
    "froid-controle-etancheite-semestriel-50t",
    "froid-controle-etancheite-annuel-50t-detection",
    "froid-controle-etancheite-trimestriel-500t",
    "froid-controle-etancheite-semestriel-500t-detection",
  ] as const;

  function froid(caracteristiques: Record<string, unknown> | null = null) {
    return {
      id: "eq-chambre-froide",
      libelle: "Chambre froide positive",
      categorie: "INSTALLATION_FRIGORIFIQUE" as const,
      caracteristiques,
    };
  }

  /** Les obligations périodiques retenues pour un jeu de réponses donné. */
  function periodiquesPour(caracteristiques: Record<string, unknown> | null) {
    const ids = idsObligations(
      determineObligationsApplicables(etabRestoErpCat5(), [
        froid(caracteristiques),
      ]),
    );
    return PERIODIQUES.filter((id) => ids.includes(id));
  }

  it("le dirigeant qui ne sait rien a quand même une échéance : le contrôle annuel", () => {
    // Le cas central. Une chambre froide déclarée sans aucune réponse ne doit
    // pas rester muette : c'est le palier le plus courant en TPE/PME qui
    // s'applique, quitte à être resserré ensuite par une réponse.
    expect(periodiquesPour(null)).toEqual(["froid-controle-etancheite-annuel"]);
  });

  it("les six paliers de l'article 5 se lisent chacun sur ses réponses", () => {
    const cas: [Record<string, unknown>, string][] = [
      [
        { estChargeSuperieure50TCo2: false, aDetectionDeFuites: false },
        "froid-controle-etancheite-annuel",
      ],
      [
        { estChargeSuperieure50TCo2: false, aDetectionDeFuites: true },
        "froid-controle-etancheite-biennal-detection",
      ],
      [
        { estChargeSuperieure50TCo2: true, aDetectionDeFuites: false },
        "froid-controle-etancheite-semestriel-50t",
      ],
      [
        { estChargeSuperieure50TCo2: true, aDetectionDeFuites: true },
        "froid-controle-etancheite-annuel-50t-detection",
      ],
      [
        {
          estChargeSuperieure50TCo2: true,
          estChargeSuperieure500TCo2: true,
          aDetectionDeFuites: false,
        },
        "froid-controle-etancheite-trimestriel-500t",
      ],
      [
        {
          estChargeSuperieure50TCo2: true,
          estChargeSuperieure500TCo2: true,
          aDetectionDeFuites: true,
        },
        "froid-controle-etancheite-semestriel-500t-detection",
      ],
    ];
    for (const [caracteristiques, attendu] of cas) {
      expect(periodiquesPour(caracteristiques), JSON.stringify(caracteristiques)).toEqual([
        attendu,
      ]);
    }
  });

  it("quel que soit l'état des trois réponses, il tombe exactement une échéance périodique", () => {
    // Vingt-sept combinaisons : trois questions à trois états. Le découpage
    // doit être une partition — jamais zéro (un parc sans échéance sur une
    // obligation de criticité 4), jamais deux (deux occurrences à planifier
    // pour un seul acte de contrôle).
    const etats = [undefined, true, false];
    for (const c50 of etats) {
      for (const c500 of etats) {
        for (const detection of etats) {
          const caracteristiques: Record<string, unknown> = {};
          if (c50 !== undefined) caracteristiques.estChargeSuperieure50TCo2 = c50;
          if (c500 !== undefined)
            caracteristiques.estChargeSuperieure500TCo2 = c500;
          if (detection !== undefined)
            caracteristiques.aDetectionDeFuites = detection;
          expect(
            periodiquesPour(caracteristiques),
            JSON.stringify({ c50, c500, detection }),
          ).toHaveLength(1);
        }
      }
    }
  });

  it("sous le seuil de déclenchement, le froid disparaît entièrement", () => {
    // La question qui décide de l'existence du contrôle, et non de sa
    // fréquence. Sans elle, une vitrine réfrigérée de quelques centaines de
    // grammes héritait d'un contrôle d'étanchéité annuel de criticité 4 par
    // opérateur certifié — une intervention payante, récurrente, sur un
    // appareil qu'aucun des deux textes ne vise.
    const ids = idsObligations(
      determineObligationsApplicables(etabRestoErpCat5(), [
        froid({ estChargeSousSeuilControle: true }),
      ]),
    );
    expect(ids.filter((id) => id.startsWith("froid-"))).toEqual([]);
  });

  it("le seuil ne retire rien sur un « non » ni sur un silence", () => {
    // Même protocole que la dispense : seul un « oui » explicite éteint. Un
    // formulaire traversé sans répondre ne doit pas faire disparaître une
    // obligation de criticité 4.
    for (const reponse of [{ estChargeSousSeuilControle: false }, {}]) {
      const ids = idsObligations(
        determineObligationsApplicables(etabRestoErpCat5(), [froid(reponse)]),
      );
      expect(ids, JSON.stringify(reponse)).toContain(
        "froid-controle-etancheite-annuel",
      );
      expect(ids, JSON.stringify(reponse)).toContain(
        "froid-controle-etancheite-mise-en-service",
      );
    }
  });

  it("le seuil l'emporte sur les paliers de charge, quels qu'ils soient", () => {
    // Un « oui » au seuil et un « oui » à un palier haut se contredisent — le
    // dirigeant s'est trompé quelque part. Le référentiel ne tranche pas la
    // contradiction, il applique la règle la plus simple : hors champ, rien
    // n'est dû. Le vérifier évite qu'un palier ressuscite une échéance que le
    // seuil vient d'éteindre.
    const ids = idsObligations(
      determineObligationsApplicables(etabRestoErpCat5(), [
        froid({
          estChargeSousSeuilControle: true,
          estChargeSuperieure50TCo2: true,
          estChargeSuperieure500TCo2: true,
          aDetectionDeFuites: true,
        }),
      ]),
    );
    expect(ids.filter((id) => id.startsWith("froid-"))).toEqual([]);
  });

  it("la dispense l'emporte sur les vingt-sept combinaisons de charge", () => {
    // Le test précédent laisse `estHermetiquementScelleSousSeuil` indéfini sur
    // les 27 cas : la seule réponse qui *retire* des échéances n'était donc
    // jamais éprouvée en présence des trois autres. Un « oui » à la dispense
    // doit vider le froid quoi qu'aient répondu les paliers de charge — sans
    // quoi un appareil dispensé hérite quand même d'un contrôle trimestriel.
    const etats = [undefined, true, false];
    for (const c50 of etats) {
      for (const c500 of etats) {
        for (const detection of etats) {
          const caracteristiques: Record<string, unknown> = {
            estHermetiquementScelleSousSeuil: true,
          };
          if (c50 !== undefined) caracteristiques.estChargeSuperieure50TCo2 = c50;
          if (c500 !== undefined)
            caracteristiques.estChargeSuperieure500TCo2 = c500;
          if (detection !== undefined)
            caracteristiques.aDetectionDeFuites = detection;
          const ids = idsObligations(
            determineObligationsApplicables(etabRestoErpCat5(), [
              froid(caracteristiques),
            ]),
          );
          expect(
            ids.filter((id) => id.startsWith("froid-")),
            JSON.stringify({ c50, c500, detection }),
          ).toEqual([]);
        }
      }
    }
  });

  it("un appareil hermétiquement scellé sous le seuil de dispense sort du contrôle d'étanchéité", () => {
    // La seule réponse qui retire des échéances, et elle demande un « oui »
    // explicite : le règlement dispense les équipements hermétiquement scellés
    // étiquetés comme tels, sous 10 t CO2e ou 2 kg selon l'annexe du fluide.
    const ids = idsObligations(
      determineObligationsApplicables(etabRestoErpCat5(), [
        froid({ estHermetiquementScelleSousSeuil: true }),
      ]),
    );
    expect(ids.filter((id) => id.startsWith("froid-"))).toEqual([]);
  });

  it("la dispense non tranchée laisse toutes les échéances du froid en place", () => {
    const ids = idsObligations(
      determineObligationsApplicables(etabRestoErpCat5(), [
        froid({ estHermetiquementScelleSousSeuil: false }),
      ]),
    );
    expect(ids).toContain("froid-controle-etancheite-annuel");
    expect(ids).toContain("froid-controle-etancheite-mise-en-service");
    expect(ids).toContain("froid-controle-etancheite-apres-modification");
  });

  it("un commerce non employeur reste couvert par le régime ERP", () => {
    // R. 543-79 vise le détenteur de l'équipement, sans considération de
    // régime : la typologie déclare travail ET ERP, en disjonction.
    const commerceSansSalarie = etabRestoErpCat5({
      effectifSurSite: 0,
      estEtablissementTravail: false,
    });
    expect(
      idsObligations(
        determineObligationsApplicables(commerceSansSalarie, [froid(null)]),
      ),
    ).toContain("froid-controle-etancheite-annuel");
  });
});

describe("moteur matching — restriction de catégorie ERP en ET avec les autres régimes", () => {
  it("un ERP hors catégories ne contourne PAS la restriction via travail: true", () => {
    // Piège latent identifié à l'audit : les régimes positifs sont en OU. Une
    // obligation qui restreint la catégorie ERP tout en acceptant le régime
    // travail serait matchée par un ERP employeur hors catégories, via la
    // seule branche « travail ». La restriction doit primer.
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-categorie-et",
      typologies: { travail: true, erp: { categories: ["N1", "N2"] } },
    };
    const erpCat5Employeur = etabRestoErpCat5(); // travail + ERP N5
    expect(
      determineObligationsApplicables(erpCat5Employeur, [elec()], {
        obligations: [synthetique],
      }),
    ).toHaveLength(0);

    // …et l'ERP dans la liste, lui, matche bien.
    expect(
      determineObligationsApplicables(etabErpCat3(), [elec()], {
        obligations: [
          {
            ...synthetique,
            typologies: { travail: true, erp: { categories: ["N3"] } },
          },
        ],
      }),
    ).toHaveLength(1);
  });

  it("un établissement NON-ERP n'est pas concerné par la restriction de catégorie", () => {
    // La restriction ne s'applique qu'aux établissements du régime restreint :
    // un bureau non-ERP reste éligible par la branche « travail ».
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-categorie-non-erp",
      typologies: { travail: true, erp: { categories: ["N1", "N2"] } },
    };
    expect(
      determineObligationsApplicables(etabBureau(), [elec()], {
        obligations: [synthetique],
      }),
    ).toHaveLength(1);
  });

  it("même règle pour les classes IGH", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-classe-igh-et",
      typologies: { travail: true, igh: { classes: ["GHA"] } },
    };
    // etabIgh() est un GHW1 employeur : la restriction GHA doit rejeter.
    expect(
      determineObligationsApplicables(etabIgh(), [elec()], {
        obligations: [synthetique],
      }),
    ).toHaveLength(0);
  });

  it("mais la classe NON RENSEIGNÉE ne rejette pas — et c'est le cas normal", () => {
    // CE QUE CE TEST EMPÊCHE, ET POURQUOI IL EST DEVENU NÉCESSAIRE LE
    // 2026-09-03. La question de la classe d'IGH a été retirée du produit ce
    // jour-là : plus aucune surface ne l'écrit, donc TOUT dossier neuf porte
    // `classeIgh: null`. Jusque-là, `null` faisait mismatch sur une règle
    // bornée par `classes` — ce qui était déjà contraire à la règle du
    // non-renseigné de l'ADR-022, et devenait, la question retirée, la
    // garantie qu'une obligation ainsi bornée disparaîtrait de tous les
    // dossiers sans que personne ne le voie.
    //
    // La capacité `igh: { classes }` est conservée volontairement : retirer la
    // question n'est pas retirer la capacité. Elle doit donc rester
    // utilisable sans piège, et le comportement est désormais celui de la
    // famille d'habitation — retenu, et dit.
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-classe-igh-non-renseignee",
      typologies: { travail: true, igh: { classes: ["GHA"] } },
    };
    const sansClasse = etabIgh();
    sansClasse.classeIgh = null;
    const res = determineObligationsApplicables(sansClasse, [elec()], {
      obligations: [synthetique],
    });
    expect(res).toHaveLength(1);
    // Retenue, mais pas en silence : l'écran doit pouvoir dire sur quoi il
    // sert large.
    expect(res[0].raisons.join(" ")).toContain("classe non renseignée");
  });

  it("un ERP dont la catégorie est inconnue est rejeté par une restriction de catégorie", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-categorie-inconnue",
      typologies: { erp: { categories: ["N1", "N2"] } },
    };
    const erpSansCategorie = etabErpCat3();
    erpSansCategorie.categorieErp = null;
    expect(
      determineObligationsApplicables(erpSansCategorie, [elec()], {
        obligations: [synthetique],
      }),
    ).toHaveLength(0);
  });
});

describe("moteur matching — seuil d'effectif de l'exercice semestriel d'évacuation", () => {
  const EXERCICE = "incendie-travail-exercice-semestriel";

  it("un salon de coiffure de 2 personnes ne reçoit plus l'exercice semestriel", () => {
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 2 }),
      [alarme()],
    );
    expect(idsObligations(res)).not.toContain(EXERCICE);
  });

  it("50 personnes exactement : sous le seuil (« plus de cinquante »)", () => {
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 50 }),
      [alarme()],
    );
    expect(idsObligations(res)).not.toContain(EXERCICE);
  });

  it("51 personnes : l'obligation s'applique", () => {
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 51 }),
      [alarme()],
    );
    expect(idsObligations(res)).toContain(EXERCICE);
  });
});

describe("moteur matching — restriction de type d'exploitation ERP en ET", () => {
  // Le type d'ERP (M, N, O, W…) était collecté à l'inscription, stocké en base,
  // transmis au moteur — et jamais lu. Toute obligation propre à un type
  // d'exploitation était donc impossible à exprimer : c'était un plafond, pas
  // seulement un champ mort. La restriction se lit désormais comme celle de
  // catégorie : en ET, avant la disjonction des régimes.

  it("un ERP hors des types visés ne contourne PAS la restriction via travail: true", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-type-et",
      typologies: { travail: true, erp: { types: ["O"] } },
    };
    // etabRestoErpCat5() est un type N employeur : la restriction O rejette.
    expect(
      determineObligationsApplicables(etabRestoErpCat5(), [elec()], {
        obligations: [synthetique],
      }),
    ).toHaveLength(0);
  });

  it("un ERP du type visé matche, avec la raison en clair", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-type-match",
      typologies: { erp: { types: ["N", "O"] } },
    };
    const res = determineObligationsApplicables(
      etabRestoErpCat5(),
      [elec()],
      { obligations: [synthetique] },
    );
    expect(res).toHaveLength(1);
    expect(res[0].raisons.join(" ")).toContain("type N");
  });

  it("un ERP dont le type est inconnu est rejeté par une restriction de type", () => {
    // Même sémantique que la catégorie inconnue : une restriction qu'on ne
    // peut pas vérifier ne doit pas être silencieusement ignorée.
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-type-inconnu",
      typologies: { erp: { types: ["N"] } },
    };
    expect(
      determineObligationsApplicables(
        etabRestoErpCat5({ typeErp: null }),
        [elec()],
        { obligations: [synthetique] },
      ),
    ).toHaveLength(0);
  });

  it("un établissement NON-ERP n'est pas concerné par la restriction de type", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-type-non-erp",
      typologies: { travail: true, erp: { types: ["O"] } },
    };
    expect(
      determineObligationsApplicables(etabBureau(), [elec()], {
        obligations: [synthetique],
      }),
    ).toHaveLength(1);
  });

  it("type et catégorie se cumulent en ET", () => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-restriction-type-et-categorie",
      typologies: { erp: { categories: ["N5"], types: ["N"] } },
    };
    // Le bon type ET la bonne catégorie : match.
    expect(
      determineObligationsApplicables(etabRestoErpCat5(), [elec()], {
        obligations: [synthetique],
      }),
    ).toHaveLength(1);
    // Bonne catégorie, mauvais type : rejet.
    expect(
      determineObligationsApplicables(
        etabRestoErpCat5({ typeErp: "M" }),
        [elec()],
        { obligations: [synthetique] },
      ),
    ).toHaveLength(0);
  });
});

describe("moteur matching — visite de commission ERP 5ᵉ bornée aux locaux à sommeil", () => {
  const VISITE = "incendie-erp-5-visite-commission";

  // HISTOIRE DE CE BLOC, parce qu'il a changé de sujet deux fois. La
  // restriction « locaux à sommeil » figurait au libellé et à la description
  // de l'obligation sans être encodée nulle part : tout ERP de 5ᵉ catégorie
  // déclarant une alarme recevait l'échéance, restaurants et commerces
  // compris. Elle a d'abord été bornée par une caractéristique d'ÉQUIPEMENT
  // (`dessertLocauxSommeil` sur l'ALARME_INCENDIE), faute d'attribut
  // d'établissement. Depuis le 2026-09-01 elle l'est par l'établissement
  // lui-même, et l'équipement n'entre plus dans l'équation — ce que les deux
  // premiers tests vérifient en ne déclarant AUCUN équipement.

  it("s'applique à un hôtel qui n'a déclaré aucun équipement", () => {
    // Le faux négatif que l'ancrage sur l'alarme produisait : PE 37 vise
    // l'établissement, pas son SSI.
    const res = determineObligationsApplicables(
      etabRestoErpCat5({ comporteLocauxSommeilPublic: true }),
      [],
    );
    expect(idsObligations(res)).toContain(VISITE);
  });

  it("ne s'applique plus quand le dirigeant répond « non », même avec une alarme déclarée", () => {
    const res = determineObligationsApplicables(
      etabRestoErpCat5({ comporteLocauxSommeilPublic: false }),
      [alarme()],
    );
    expect(idsObligations(res)).not.toContain(VISITE);
  });

  it("reste affichée tant que personne n'a répondu (opt-out)", () => {
    // Criticité 4 sur une obligation déjà publiée : aucun établissement
    // existant ne doit perdre la ligne en silence à la régénération.
    const res = determineObligationsApplicables(etabRestoErpCat5(), []);
    expect(idsObligations(res)).toContain(VISITE);
  });

  it("ne s'applique pas à un ERP de 2ᵉ catégorie, même avec des locaux à sommeil", () => {
    // GE 4 gouverne les quatre premières catégories, et relève du Livre II
    // que PE 1 § 1 écarte. La restriction de catégorie reste en ET.
    const res = determineObligationsApplicables(
      etabRestoErpCat5({
        categorieErp: "N2",
        comporteLocauxSommeilPublic: true,
      }),
      [],
    );
    expect(idsObligations(res)).not.toContain(VISITE);
  });
});

describe("moteur matching — les trois autres lignes du chapitre III (locaux à sommeil)", () => {
  // PE 4 § 1, PE 33 § 2 et PE 35, encodées le 2026-09-01. Elles partagent la
  // typologie de la visite de commission ; ce qui est vérifié ici est
  // qu'elles la partagent VRAIMENT — une seule d'entre elles écrite avec un
  // `erp: true` au lieu de `{ categories: ["N5"] }`, ou sans la condition de
  // sommeil, tomberait chez tous les restaurants sans que rien ne le dise.
  const LIGNES = [
    "incendie-erp-5-sommeil-contrat-entretien-sdi",
    "incendie-erp-5-sommeil-consigne-chambres",
    "incendie-erp-5-sommeil-plans-affiches",
  ];

  it("sont servies à l'hôtel qui a répondu « oui », sans aucun équipement déclaré", () => {
    const ids = idsObligations(
      determineObligationsApplicables(
        etabRestoErpCat5({ comporteLocauxSommeilPublic: true }),
        [],
      ),
    );
    for (const id of LIGNES) expect(ids, id).toContain(id);
  });

  it("disparaissent toutes les trois quand le dirigeant répond « non »", () => {
    const ids = idsObligations(
      determineObligationsApplicables(
        etabRestoErpCat5({ comporteLocauxSommeilPublic: false }),
        [alarme()],
      ),
    );
    for (const id of LIGNES) expect(ids, id).not.toContain(id);
  });

  it("sont servies « à confirmer » tant que personne n'a répondu", () => {
    const res = determineObligationsApplicables(etabRestoErpCat5(), []);
    for (const id of LIGNES) {
      const ligne = res.find((o) => o.obligation.id === id);
      expect(ligne, id).toBeDefined();
      // La raison est lue par un dirigeant : elle doit dire que la ligne est
      // servie faute de savoir, pas la présenter comme établie.
      expect(ligne!.raisons.join(" "), id).toContain("à confirmer");
    }
  });

  it("produisent UNE ligne chacune, quel que soit le parc déclaré", () => {
    // Porteur établissement (ADR-022) : une alarme de plus ne dédouble pas
    // le contrat d'entretien.
    const res = determineObligationsApplicables(
      etabRestoErpCat5({ comporteLocauxSommeilPublic: true }),
      [alarme(), { ...alarme(), id: "eq-alarme-2" }],
    );
    for (const id of LIGNES) {
      const ligne = res.find((o) => o.obligation.id === id);
      expect(ligne, id).toBeDefined();
      expect(ligne!.porteur, id).toBe("etablissement");
      expect(ligne!.equipementsConcernes, id).toHaveLength(0);
    }
  });
});

describe("moteur matching — champ disjonctif de R. 4227-34 (personnes présentes OU matières R. 4227-22)", () => {
  // R. 4227-39 renvoie à la consigne (R. 4227-37), qui renvoie aux
  // établissements de R. 4227-34 : « plus de cinquante personnes occupées ou
  // réunies habituellement », public compris, « ainsi que ceux, quelle que
  // soit leur importance, où sont manipulées et mises en œuvre des matières
  // inflammables mentionnées à l'article R. 4227-22 ».
  const EXERCICE = "incendie-travail-exercice-semestriel";
  const CONSIGNE = "incendie-travail-consigne-affichee";

  it("10 salariés mais 60 personnes habituellement présentes (public) → applicable", () => {
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 10, personnesPresentesHabituellement: 60 }),
      [alarme()],
    );
    expect(idsObligations(res)).toContain(EXERCICE);
    const raison = res.find((r) => r.obligation.id === EXERCICE)!.raisons.join(" ");
    expect(raison).toContain("60 personnes habituellement présentes");
  });

  it("personnes présentes non déclarées, effectif salarié au seuil → applicable, et la raison dit par quoi le seuil est franchi", () => {
    // L'effectif salarié reste une BORNE BASSE du total de R. 4227-34, et une
    // borne basse conclut dans ce sens-là : 51 salariés font au moins 51
    // personnes présentes, quel que soit le public. Ce que la raison ne dit
    // plus, c'est « faute de déclaration » — le chiffre manquant n'a pas été
    // remplacé par un autre, il n'a simplement pas eu besoin de l'être.
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 51, personnesPresentesHabituellement: null }),
      [alarme()],
    );
    expect(idsObligations(res)).toContain(EXERCICE);
    const raison = res.find((r) => r.obligation.id === EXERCICE)!.raisons.join(" ");
    expect(raison).toContain("51 salariés sur site");
    expect(raison).toContain("franchi par l'effectif seul");
  });

  it("2 salariés, aucun public, matières R. 4227-22 déclarées → applicable quel que soit l'effectif", () => {
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 2, manipuleMatieresR422722: true }),
      [alarme()],
    );
    expect(idsObligations(res)).toContain(EXERCICE);
    const raison = res.find((r) => r.obligation.id === EXERCICE)!.raisons.join(" ");
    expect(raison).toContain("R. 4227-22");
  });

  it("2 salariés, matières non renseignées (null) → non applicable (opt-in : la branche n'ajoute que des cas)", () => {
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 2, manipuleMatieresR422722: null }),
      [alarme()],
    );
    expect(idsObligations(res)).not.toContain(EXERCICE);
  });

  it("la consigne affichée suit le même champ : 2 salariés sans matières → simples instructions, pas de consigne", () => {
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 2 }),
      [alarme(), extincteur()],
    );
    expect(idsObligations(res)).not.toContain(CONSIGNE);
    const res2 = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 2, manipuleMatieresR422722: true }),
      [alarme(), extincteur()],
    );
    expect(idsObligations(res2)).toContain(CONSIGNE);
  });

  it("non-régression : tout établissement matché avant (≥ 51 salariés) reste matché", () => {
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite: 51 }),
      [alarme()],
    );
    expect(idsObligations(res)).toContain(EXERCICE);
  });
});

describe("R. 4227-34 — ce que la catégorie d'ERP déduit, et ce qu'elle ne déduit pas", () => {
  // La question « personnes habituellement présentes » a été retirée du
  // parcours ; le moteur en déduit donc ce qu'il peut. Ce qu'il peut n'est
  // jamais qu'une BORNE BASSE du total, et une borne basse conclut dans un
  // seul sens : « au-dessus du seuil », jamais « en dessous ».
  //
  // Les quatre cas de ce bloc sont les quatre réponses possibles, et ils sont
  // écrits séparément exprès : borne franchie par le public, indétermination,
  // total connu et inférieur, absence de public. Un test unique qui les
  // parcourrait ensemble se réparerait en recopiant le comportement observé.
  const EXERCICE = "incendie-travail-exercice-semestriel";
  const CONSIGNE = "incendie-travail-consigne-affichee";
  const LES_DEUX = [CONSIGNE, EXERCICE];

  it("ERP de 3ᵉ catégorie sans le chiffre : le public seul franchit le seuil, rien à demander", () => {
    // ADR-004 : la 3ᵉ catégorie commence à 301 personnes de public. Le seuil
    // de R. 4227-34 est à 51 — il est franchi par le public seul, et
    // l'établissement ne déclare que 45 salariés.
    const res = determineObligationsApplicables(etabErpCat3(), []);
    for (const id of LES_DEUX) expect(idsObligations(res), id).toContain(id);
    const raison = res
      .find((r) => r.obligation.id === EXERCICE)!
      .raisons.join(" ");
    expect(raison).toContain("3ᵉ catégorie");
    expect(raison).toContain("le public admis");
    // Une certitude, pas une prudence : la déduction tient, il n'y a rien à
    // confirmer.
    expect(raison).not.toContain("à confirmer");
  });

  it("ERP de 4ᵉ catégorie sans le chiffre : retenu « à confirmer », jamais retiré", () => {
    // La 4ᵉ va du seuil du type jusqu'à 300 : elle ne borne rien par le bas.
    // Le silence ne peut pas valoir « moins de 51 » chez un établissement qui
    // reçoit du public par définition.
    const res = determineObligationsApplicables(
      etabRestoErpCat5({
        categorieErp: "N4",
        effectifSurSite: 8,
        personnesPresentesHabituellement: null,
      }),
      [],
    );
    for (const id of LES_DEUX) expect(idsObligations(res), id).toContain(id);
    const raison = res
      .find((r) => r.obligation.id === EXERCICE)!
      .raisons.join(" ");
    expect(raison).toContain("à confirmer");
    expect(raison).toContain("reçoit du public");
  });

  it("ERP de 4ᵉ catégorie AVEC le chiffre à 200 : le total est connu, les deux lignes s'appliquent", () => {
    const res = determineObligationsApplicables(
      etabRestoErpCat5({
        categorieErp: "N4",
        effectifSurSite: 8,
        personnesPresentesHabituellement: 200,
      }),
      [],
    );
    for (const id of LES_DEUX) expect(idsObligations(res), id).toContain(id);
    const raison = res
      .find((r) => r.obligation.id === EXERCICE)!
      .raisons.join(" ");
    expect(raison).toContain("200 personnes habituellement présentes");
    expect(raison).not.toContain("à confirmer");
  });

  it("le chiffre déclaré SOUS le seuil retire les deux lignes, même à un ERP", () => {
    // La borne basse ne sert qu'à conclure vers le haut ; le chiffre déclaré,
    // lui, est le total et tranche dans les deux sens. Sans ce cas, « à
    // confirmer » ne serait plus une prudence mais une sur-application
    // permanente à tout ERP.
    const res = determineObligationsApplicables(
      etabRestoErpCat5({
        categorieErp: "N4",
        effectifSurSite: 8,
        personnesPresentesHabituellement: 20,
      }),
      [],
    );
    for (const id of LES_DEUX) expect(idsObligations(res), id).not.toContain(id);
  });

  it("établissement de travail seul, 8 salariés : pas de public, l'effectif EST le total", () => {
    // Le cas que la correction ne devait pas casser. Sans public, le repli sur
    // l'effectif salarié n'est pas une sous-estimation : c'est la mesure
    // exacte, et les deux lignes tombent pour de bon.
    const res = determineObligationsApplicables(
      etabBureau({
        effectifSurSite: 8,
        personnesPresentesHabituellement: null,
      }),
      [alarme(), extincteur()],
    );
    for (const id of LES_DEUX) expect(idsObligations(res), id).not.toContain(id);
  });

  it("ERP de 1ʳᵉ et de 2ᵉ catégorie déduisent comme la 3ᵉ ; la 5ᵉ ne déduit rien", () => {
    // Les bornes voisines, sans liste exhaustive des cinq : ce qui est
    // éprouvé ici est la FRONTIÈRE entre ce qui déduit et ce qui ne déduit
    // pas, et elle passe entre la 3ᵉ et la 4ᵉ.
    for (const cat of ["N1", "N2", "N3"] as const) {
      const res = determineObligationsApplicables(
        etabRestoErpCat5({ categorieErp: cat, effectifSurSite: 8 }),
        [],
      );
      const raison = res
        .find((r) => r.obligation.id === EXERCICE)!
        .raisons.join(" ");
      expect(raison, cat).toContain("le public admis");
    }
    const cinq = determineObligationsApplicables(
      etabRestoErpCat5({ categorieErp: "N5", effectifSurSite: 8 }),
      [],
    );
    const raisonCinq = cinq
      .find((r) => r.obligation.id === EXERCICE)!
      .raisons.join(" ");
    expect(raisonCinq).toContain("à confirmer");
  });

  it("ERP dont la catégorie n'est pas renseignée : « à confirmer » aussi, jamais retiré", () => {
    const res = determineObligationsApplicables(
      etabRestoErpCat5({ categorieErp: null, effectifSurSite: 8 }),
      [],
    );
    for (const id of LES_DEUX) expect(idsObligations(res), id).toContain(id);
  });
});

describe("les raisons se lisent, elles ne se décodent pas", () => {
  // Ces raisons sont AFFICHÉES AU DIRIGEANT, sous « pourquoi chez vous » dans
  // le guide « Comprendre ». L'effectif s'y écrivait en notation d'intervalle
  // — « effectif sur site 6 dans la plage [— ; 49] » —, avec un tiret cadratin
  // pour dire « pas de borne ». Personne hors de ce dépôt ne lit ça.
  const raisonsPour = (
    typologies: Obligation["typologies"],
    effectifSurSite: number,
  ) => {
    const synthetique: Obligation = {
      ...obligationsElectricite[0],
      id: "test-raison-effectif",
      typologies,
    };
    const res = determineObligationsApplicables(
      etabBureau({ effectifSurSite }),
      [elec()],
      { obligations: [synthetique] },
    );
    expect(res, "l'obligation synthétique ne matche plus").toHaveLength(1);
    return res.flatMap((r) => r.raisons).join(" | ");
  };

  it("n'écrit plus de notation d'intervalle", () => {
    const r = raisonsPour({ travail: true, effectifMax: 49 }, 6);
    expect(r).not.toContain("plage");
    expect(r).not.toContain("[");
    expect(r).toContain("jusqu'à 49 salariés");
  });

  it("nomme le seuil bas quand c'est lui qui déclenche", () => {
    expect(raisonsPour({ travail: true, effectifMin: 11 }, 12)).toContain(
      "à partir de 11 salariés",
    );
  });

  it("nomme les deux bornes quand les deux sont déclarées", () => {
    // Contre-épreuve des deux précédents : une implémentation qui n'écrirait
    // qu'une seule des deux bornes les passerait tous les deux.
    expect(
      raisonsPour({ travail: true, effectifMin: 11, effectifMax: 49 }, 20),
    ).toContain("de 11 à 49 salariés");
  });
});

// -----------------------------------------------------------------------------
// Arrêté du 20 novembre 2017, art. 15 — l'inspection périodique se scinde en
// deux régimes selon la famille de l'équipement (2026-09-01).
//
// C'est le premier couple d'obligations bâti sur une valeur d'ÉNUMÉRATION et
// non sur un booléen. La contrainte est la même que pour le levage et le froid,
// et elle se vérifie dans les deux sens : pour toute valeur de `familleEsp` —
// y compris aucune — il doit s'appliquer EXACTEMENT une des deux lignes, jamais
// zéro (faux négatif muet) et jamais deux (deux inspections pour un seul acte).
// -----------------------------------------------------------------------------
describe("moteur matching — inspection périodique ESP : le couple d'énumération", () => {
  const GENERALE = "esp-inspection-periodique";
  const BIENNALE = "esp-inspection-periodique-generateur-vapeur";

  function esp(caracteristiques: Record<string, unknown> | null) {
    return {
      id: "eq-esp",
      libelle: "Appareil sous pression",
      categorie: "EQUIPEMENT_SOUS_PRESSION" as const,
      caracteristiques,
    };
  }

  /** Les deux lignes du couple qui s'appliquent, dans l'ordre. */
  function couple(caracteristiques: Record<string, unknown> | null): string[] {
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [esp(caracteristiques)]),
    );
    return [GENERALE, BIENNALE].filter((id) => ids.includes(id));
  }

  it("un générateur de vapeur déclaré reçoit la biennale et PERD la générale", () => {
    // Le défaut corrigé : sans cette ligne, il héritait de la seule générale —
    // `triennale` ici, `quadriennale` après le merge d'à côté — alors que
    // l'article lui fixe deux ans. Sous-application invisible, criticité 5.
    expect(couple({ familleEsp: "generateur_vapeur" })).toEqual([BIENNALE]);
  });

  it("un compresseur d'atelier garde la générale et n'a pas la biennale", () => {
    // La couche voisine : une autre valeur de l'énumération ne doit rien
    // attraper de la ligne spécifique.
    expect(couple({ familleEsp: "recipient_gaz_groupe2" })).toEqual([GENERALE]);
  });

  it("sans famille renseignée, la générale reste due — le silence n'éteint rien", () => {
    // La garantie qui a décidé de la FORME retenue. Si la ligne générale
    // portait une égalité niée plutôt qu'une différence satisfaite au silence,
    // un équipement dont personne n'a saisi la plaque tomberait hors des deux
    // et perdrait toute inspection sans qu'aucun écran ne le signale.
    expect(couple(null)).toEqual([GENERALE]);
    expect(couple({})).toEqual([GENERALE]);
    expect(couple({ estSoumisSuiviEnService: true })).toEqual([GENERALE]);
  });

  it("une famille vide, nulle ou d'un type inattendu laisse la générale en place", () => {
    // Ces trois valeurs arrivent d'une reprise de données ou d'un `<select>`
    // non touché. Aucune n'est un membre de l'énumération, et le régime général
    // est la bonne réponse pour toutes — c'est la borne à tenir. Elles
    // convergent ici avec le cas de l'absence, et c'est pour cela qu'aucune
    // normalisation particulière ne les traite : voir `lireProprieteEnum`.
    expect(couple({ familleEsp: "" })).toEqual([GENERALE]);
    expect(couple({ familleEsp: 42 })).toEqual([GENERALE]);
    expect(couple({ familleEsp: null })).toEqual([GENERALE]);
  });

  it("chaque valeur de l'énumération reçoit exactement une des deux lignes", () => {
    // La partition, énoncée sur la borne basse (jamais zéro) et la borne haute
    // (jamais deux) plutôt qu'en recopiant le résultat attendu valeur par
    // valeur — une liste qui se répare en la recopiant cesse de vérifier.
    for (const famille of FAMILLES_ESP) {
      expect(couple({ familleEsp: famille }), famille).toHaveLength(1);
    }
    expect(couple(null)).toHaveLength(1);
  });

  it("la réponse « non » au suivi en service éteint les DEUX lignes", () => {
    // Le garde-fou de périmètre prime sur la scission : un équipement hors
    // champ de l'arrêté ne doit recevoir aucune des deux inspections.
    expect(couple({ familleEsp: "generateur_vapeur", estSoumisSuiviEnService: false })).toEqual([]);
    expect(couple({ familleEsp: "recipient_gaz_groupe2", estSoumisSuiviEnService: false })).toEqual([]);
  });

  it("la biennale ne déborde pas sur une autre catégorie d'équipement", () => {
    // `familleEsp` n'est contraint à aucune catégorie côté schéma : rien
    // n'empêche d'écrire la clé sur une hotte. C'est la `categorie` portée par
    // la condition qui doit l'empêcher de mordre, pas la discipline de saisie.
    const ids = idsObligations(
      determineObligationsApplicables(etabBureau(), [
        {
          id: "eq-hotte",
          libelle: "Hotte de cuisson",
          categorie: "HOTTE_PRO" as const,
          caracteristiques: { familleEsp: "generateur_vapeur" },
        },
      ]),
    );
    expect(ids).not.toContain(BIENNALE);
    expect(ids).not.toContain(GENERALE);
  });
});

// -----------------------------------------------------------------------------
// GE 4 § 1 — la visite périodique de commission des 1ʳᵉ à 4ᵉ catégories
// (2026-09-01). Le référentiel n'en portait aucune pour ces établissements.
//
// Ce qui se vérifie ici est surtout la FRONTIÈRE avec la ligne de 5ᵉ catégorie :
// GE 4 relève du Livre II, écarté en 5ᵉ par PE 1 § 1, et PE 37 ne vise que la
// 5ᵉ. Aucun établissement ne doit recevoir les deux, ni — parmi les cinq
// catégories — se retrouver sans aucune.
// -----------------------------------------------------------------------------
describe("moteur matching — visite de commission : GE 4 en 1ʳᵉ–4ᵉ, PE 37 en 5ᵉ", () => {
  // Le tableau de GE 4 § 1 est encodé en SIX lignes depuis le 2026-09-02 (une
  // par bloc catégorie × périodicité). Le détail case par case est éprouvé
  // dans `conformite.test.ts` ; ce qui se vérifie ici est la FRONTIÈRE avec la
  // ligne de 5ᵉ catégorie — GE 4 relève du Livre II, écarté en 5ᵉ par PE 1
  // § 1, et PE 37 ne vise que la 5ᵉ. Aucun établissement ne doit recevoir les
  // deux, ni — parmi les cinq catégories — se retrouver sans aucune.
  const CAT14 = [
    "incendie-erp-visite-commission-cat1-2-triennale",
    "incendie-erp-visite-commission-cat1-2-quinquennale",
    "incendie-erp-visite-commission-cat3-triennale",
    "incendie-erp-visite-commission-cat3-quinquennale",
    "incendie-erp-visite-commission-cat4-triennale",
    "incendie-erp-visite-commission-cat4-quinquennale",
  ];
  const CAT5 = "incendie-erp-5-visite-commission";

  function erp(categorieErp: EtablissementMatching["categorieErp"]): EtablissementMatching {
    return { ...etabErpCat3(), categorieErp };
  }

  it("un ERP de 3ᵉ catégorie reçoit la visite de GE 4, sans aucun équipement déclaré", () => {
    // Le § 1 ne conditionne la visite à aucun équipement : la ligne existe même
    // sur un dossier vide. C'est ce qui justifie le porteur `etablissement`.
    const ids = idsObligations(determineObligationsApplicables(erp("N3"), []));
    expect(ids.filter((id) => CAT14.includes(id))).toHaveLength(1);
  });

  it("la ligne de GE 4 ne produit qu'UNE échéance, quel que soit le parc déclaré", () => {
    const res = determineObligationsApplicables(erp("N2"), [
      { id: "eq-a", libelle: "Alarme", categorie: "ALARME_INCENDIE" as const, caracteristiques: null },
      { id: "eq-b", libelle: "Extincteur", categorie: "EXTINCTEUR" as const, caracteristiques: null },
    ]);
    const lignes = res.filter((r) => CAT14.includes(r.obligation.id));
    expect(lignes).toHaveLength(1);
    expect(lignes[0].porteur).toBe("etablissement");
    // ADR-022 : une obligation d'établissement n'a pas d'équipement déclencheur,
    // et une liste vide n'y signifie pas « aucune ligne ».
    expect(lignes[0].equipementsConcernes).toEqual([]);
  });

  it("un ERP de 5ᵉ catégorie ne reçoit PAS la ligne de GE 4", () => {
    // GE 4 relève du Livre II, écarté en 5ᵉ catégorie par PE 1 § 1.
    const ids = idsObligations(determineObligationsApplicables(erp("N5"), []));
    expect(ids.filter((id) => CAT14.includes(id))).toEqual([]);
  });

  it("les deux visites de commission ne se recouvrent jamais", () => {
    // Borne haute : jamais deux lignes de visite pour un même établissement.
    // Le cas dangereux est la 5ᵉ catégorie AVEC alarme, où la ligne PE 37
    // s'applique — GE 4 ne doit pas s'y ajouter. Depuis le découpage du
    // tableau en six lignes, le second cas dangereux est en 1ʳᵉ à 4ᵉ : deux
    // lignes de GE 4 qui se recouvriraient donneraient deux dates au même
    // établissement pour la même visite.
    for (const cat of ["N1", "N2", "N3", "N4", "N5"] as const) {
      const ids = idsObligations(
        determineObligationsApplicables(erp(cat), [
          { id: "eq-a", libelle: "Alarme", categorie: "ALARME_INCENDIE" as const, caracteristiques: null },
        ]),
      );
      const visites = [...CAT14, CAT5].filter((id) => ids.includes(id));
      expect(visites, cat).toHaveLength(1);
    }
  });

  it("un ERP dont le type n'est pas renseigné garde sa visite, et une seule", () => {
    // LE FAUX NÉGATIF QUE `typesExclus` EXISTE POUR ÉVITER. Les lignes
    // triennales sont écrites en COMPLÉMENT des types portés à cinq ans, et
    // non en énumération : une énumération aurait exigé un `typeErp` renseigné
    // (`docs/regles-matching.md`) et privé de toute visite l'établissement qui
    // n'a pas précisé son activité. Il retombe sur trois ans, le rythme court.
    for (const cat of ["N1", "N2", "N3", "N4"] as const) {
      const res = determineObligationsApplicables(
        { ...erp(cat), typeErp: null },
        [],
      );
      const lignes = res.filter((r) => CAT14.includes(r.obligation.id));
      expect(lignes.map((l) => l.obligation.id), cat).toHaveLength(1);
      expect(lignes[0].obligation.periodicite, cat).toBe("triennale");
    }
  });

  it("un établissement de travail non-ERP n'a aucune visite de commission", () => {
    // Borne basse de la typologie : la commission de sécurité ne visite que des
    // ERP. Un bureau non-ERP ne doit rien recevoir de ces deux lignes.
    const ids = idsObligations(determineObligationsApplicables(etabBureau(), []));
    for (const id of CAT14) expect(ids).not.toContain(id);
    expect(ids).not.toContain(CAT5);
  });
});
