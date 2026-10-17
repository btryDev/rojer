import { describe, expect, it } from "vitest";
import {
  compterRestes,
  construireMatrice,
  type EntreeMatrice,
  type ModulesMatrice,
} from "./obligations";

const VIERGE: EntreeMatrice = {
  etablissementId: "etab_1",
  duerp: { existe: false, estAJour: false, duerpId: null },
  nbRapports: 0,
  nbVerifs: 0,
  jourDernierRapport: null,
  compteurs: {
    verifsEnRetard: 0,
    verifsAPlanifier: 0,
    actionsOuvertes: 0,
    actionsEnCours: 0,
    actionsEnRetard: 0,
    actionsLeveesRecemment: 0,
  },
};

// Aucun module actif : la matrice doit rester identique au socle.
const MODULES_NEUTRES: ModulesMatrice = {
  estERP: false,
  accessibilite: { existe: false, publie: false },
  permisFeu: { total: 0, echusNonClos: 0 },
  plansPrevention: { total: 0, sansInspection: 0, echusNonClos: 0 },
  carnetSanitaire: {
    existe: false,
    nbPoints: 0,
    nbPointsJamaisReleves: 0,
    nbPointsReleveAncien: 0,
    jourDerniereAnalyse: null,
    suiviParLeCalendrier: false,
  },
  prestataires: { total: 0, enAlerte: 0 },
};

const avecModules = (m: Partial<ModulesMatrice>): EntreeMatrice => ({
  ...VIERGE,
  modules: { ...MODULES_NEUTRES, ...m },
});

const ligne = (e: EntreeMatrice, id: string) =>
  construireMatrice(e).find((l) => l.id === id)!;

describe("construireMatrice", () => {
  it("rend les quatre lignes dans l'ordre du design", () => {
    expect(construireMatrice(VIERGE).map((l) => l.id)).toEqual([
      "duerp",
      "registre",
      "verifications",
      "actions",
    ]);
  });

  it("ne coche rien sur un établissement vierge", () => {
    const etats = construireMatrice(VIERGE).flatMap((l) => l.cellules);
    expect(etats).not.toContain("ok");
  });

  it("ne marque jamais une colonne sans objet comme à faire", () => {
    // Les `na` sont structurels : ils ne doivent pas dépendre des données.
    const plein: EntreeMatrice = {
      ...VIERGE,
      duerp: { existe: true, estAJour: true, duerpId: "d1" },
      nbRapports: 5,
      nbVerifs: 20,
      jourDernierRapport: 10,
      compteurs: { ...VIERGE.compteurs, actionsOuvertes: 3 },
    };
    expect(ligne(plein, "duerp").cellules[2]).toBe("na");
    expect(ligne(VIERGE, "duerp").cellules[2]).toBe("na");
    expect(ligne(plein, "actions").cellules[1]).toBe("na");
  });
});

describe("construireMatrice — DUERP", () => {
  it("pointe vers le DUERP existant quand il y en a un", () => {
    const l = ligne(
      { ...VIERGE, duerp: { existe: true, estAJour: true, duerpId: "d1" } },
      "duerp",
    );
    expect(l.href).toBe("/duerp/d1");
    expect(l.cellules[0]).toBe("ok");
    expect(l.cellules[1]).toBe("ok");
  });

  it("retombe sur la page DUERP de l'établissement sinon", () => {
    expect(ligne(VIERGE, "duerp").href).toBe("/etablissements/etab_1/duerp");
  });

  it("distingue « existe » de « à jour »", () => {
    const l = ligne(
      { ...VIERGE, duerp: { existe: true, estAJour: false, duerpId: "d1" } },
      "duerp",
    );
    expect(l.cellules[0]).toBe("ok");
    expect(l.cellules[1]).toBe("todo");
  });
});

describe("construireMatrice — registre", () => {
  it("considère à jour un registre alimenté dans l'année", () => {
    const l = ligne(
      { ...VIERGE, nbRapports: 3, jourDernierRapport: 200 },
      "registre",
    );
    expect(l.cellules).toEqual(["ok", "ok", "na"]);
  });

  it("marque à faire un registre dormant depuis plus d'un an", () => {
    const l = ligne(
      { ...VIERGE, nbRapports: 3, jourDernierRapport: 400 },
      "registre",
    );
    expect(l.cellules[1]).toBe("todo");
  });
});

describe("construireMatrice — vérifications", () => {
  it("coche les trois colonnes quand le calendrier est sain", () => {
    const l = ligne({ ...VIERGE, nbVerifs: 20 }, "verifications");
    expect(l.cellules).toEqual(["ok", "ok", "ok"]);
  });

  it("ne coche pas « à jour » s'il reste des vérifs à programmer", () => {
    const l = ligne(
      {
        ...VIERGE,
        nbVerifs: 20,
        compteurs: { ...VIERGE.compteurs, verifsAPlanifier: 4 },
      },
      "verifications",
    );
    expect(l.cellules[1]).toBe("todo");
    expect(l.cellules[2]).toBe("ok");
  });

  it("ne coche pas « sans retard » s'il y a des vérifs dépassées", () => {
    const l = ligne(
      {
        ...VIERGE,
        nbVerifs: 20,
        compteurs: { ...VIERGE.compteurs, verifsEnRetard: 2 },
      },
      "verifications",
    );
    expect(l.cellules[2]).toBe("todo");
  });

  it("ne coche rien quand aucune vérification n'existe", () => {
    // Un calendrier vide n'est pas « sans retard » : il est absent.
    expect(ligne(VIERGE, "verifications").cellules).toEqual([
      "todo",
      "todo",
      "todo",
    ]);
  });
});

describe("construireMatrice — plan d'actions", () => {
  it("compte les actions levées dans l'existence du plan", () => {
    const l = ligne(
      {
        ...VIERGE,
        compteurs: { ...VIERGE.compteurs, actionsLeveesRecemment: 2 },
      },
      "actions",
    );
    expect(l.cellules[0]).toBe("ok");
    expect(l.cellules[2]).toBe("ok");
  });

  it("compte un plan intégralement clôturé depuis longtemps", () => {
    // Vingt actions levées il y a trois mois : la somme partielle
    // (ouvertes + en cours + levées sur trente jours) valait zéro et le
    // tableau annonçait « Plan d'actions : rien en place » à un
    // établissement exemplaire. La donnée existait, elle ne remontait pas.
    const l = ligne(
      { ...VIERGE, compteurs: { ...VIERGE.compteurs, actionsTotal: 20 } },
      "actions",
    );
    expect(l.cellules[0]).toBe("ok");
    expect(l.cellules[2]).toBe("ok");
  });

  it("retombe sur la somme partielle quand le total n'est pas transmis", () => {
    const l = ligne(
      {
        ...VIERGE,
        compteurs: { ...VIERGE.compteurs, actionsOuvertes: 2 },
      },
      "actions",
    );
    expect(l.cellules[0]).toBe("ok");
  });

  it("signale les actions en retard", () => {
    const l = ligne(
      {
        ...VIERGE,
        compteurs: {
          ...VIERGE.compteurs,
          actionsOuvertes: 5,
          actionsEnRetard: 2,
        },
      },
      "actions",
    );
    expect(l.cellules[2]).toBe("todo");
  });
});

describe("compterRestes", () => {
  it("compte aussi les faits des lignes modules", () => {
    // Socle vierge : 9 — plus accessibilité ERP non créée : 2.
    expect(compterRestes(construireMatrice(avecModules({ estERP: true })))).toBe(
      11,
    );
  });

  it("compte les faits restant à établir, sans les « sans objet »", () => {
    // 2 (DUERP) + 2 (registre) + 3 (vérifications) + 2 (actions) ; les
    // trois cellules « sans objet » ne comptent pas.
    expect(compterRestes(construireMatrice(VIERGE))).toBe(9);
  });

  it("tombe à zéro sur un dossier complet", () => {
    const complet: EntreeMatrice = {
      ...VIERGE,
      duerp: { existe: true, estAJour: true, duerpId: "d1" },
      nbRapports: 4,
      nbVerifs: 12,
      jourDernierRapport: 30,
      compteurs: { ...VIERGE.compteurs, actionsOuvertes: 1 },
    };
    expect(compterRestes(construireMatrice(complet))).toBe(0);
  });
});

describe("construireMatrice — lignes modules", () => {
  it("reste identique au socle sans modules ni activité", () => {
    expect(construireMatrice(VIERGE)).toHaveLength(4);
    expect(construireMatrice(avecModules({}))).toHaveLength(4);
  });

  it("ordonne les lignes modules après le socle", () => {
    const ids = construireMatrice(
      avecModules({
        estERP: true,
        permisFeu: { total: 1, echusNonClos: 0 },
        plansPrevention: { total: 1, sansInspection: 0, echusNonClos: 0 },
        carnetSanitaire: { ...MODULES_NEUTRES.carnetSanitaire, existe: true },
        prestataires: { total: 1, enAlerte: 0 },
      }),
    ).map((l) => l.id);
    expect(ids).toEqual([
      "duerp",
      "registre",
      "verifications",
      "actions",
      "accessibilite",
      "permis-feu",
      "plans-prevention",
      "carnet-sanitaire",
      "prestataires",
    ]);
  });
});

describe("construireMatrice — accessibilité", () => {
  it("apparaît pour tout ERP, même sans registre créé", () => {
    const l = ligne(avecModules({ estERP: true }), "accessibilite");
    expect(l.cellules).toEqual(["todo", "todo", "na"]);
    expect(l.href).toBe("/etablissements/etab_1/accessibilite");
  });

  it("distingue créé de publié", () => {
    const l = ligne(
      avecModules({
        estERP: true,
        accessibilite: { existe: true, publie: false },
      }),
      "accessibilite",
    );
    expect(l.cellules).toEqual(["ok", "todo", "na"]);
  });

  it("coche les deux faits une fois publié", () => {
    const l = ligne(
      avecModules({
        estERP: true,
        accessibilite: { existe: true, publie: true },
      }),
      "accessibilite",
    );
    expect(l.cellules).toEqual(["ok", "ok", "na"]);
  });

  it("reste visible si le registre existe alors que le régime ERP a été décoché", () => {
    const m = avecModules({
      estERP: false,
      accessibilite: { existe: true, publie: true },
    });
    expect(ligne(m, "accessibilite")).toBeDefined();
  });

  it("hors ERP, ses cellules sont « non applicable », comme l'entrée de la barre latérale (2026-10-12)", () => {
    const m = avecModules({
      estERP: false,
      accessibilite: { existe: true, publie: true },
    });
    expect(ligne(m, "accessibilite").cellules).toEqual(["na", "na", "na"]);
  });
});

describe("construireMatrice — permis de feu", () => {
  it("n'apparaît pas sans permis tracé", () => {
    expect(
      construireMatrice(avecModules({})).find((l) => l.id === "permis-feu"),
    ).toBeUndefined();
  });

  it("signale un permis échu non clôturé", () => {
    const l = ligne(
      avecModules({ permisFeu: { total: 3, echusNonClos: 1 } }),
      "permis-feu",
    );
    expect(l.cellules).toEqual(["ok", "na", "todo"]);
  });

  it("est sain quand tous les permis échus sont clos", () => {
    const l = ligne(
      avecModules({ permisFeu: { total: 3, echusNonClos: 0 } }),
      "permis-feu",
    );
    expect(l.cellules).toEqual(["ok", "na", "ok"]);
  });
});

describe("construireMatrice — plans de prévention", () => {
  it("exige l'inspection commune sur les plans actifs", () => {
    const l = ligne(
      avecModules({
        plansPrevention: { total: 2, sansInspection: 1, echusNonClos: 0 },
      }),
      "plans-prevention",
    );
    expect(l.cellules).toEqual(["ok", "todo", "ok"]);
  });

  it("signale un plan échu non clos", () => {
    const l = ligne(
      avecModules({
        plansPrevention: { total: 2, sansInspection: 0, echusNonClos: 1 },
      }),
      "plans-prevention",
    );
    expect(l.cellules).toEqual(["ok", "ok", "todo"]);
  });
});

describe("construireMatrice — carnet sanitaire", () => {
  const carnet = (
    c: Partial<ModulesMatrice["carnetSanitaire"]>,
  ): EntreeMatrice =>
    avecModules({
      carnetSanitaire: {
        ...MODULES_NEUTRES.carnetSanitaire,
        existe: true,
        ...c,
      },
    });

  it("suit la création du carnet, pas le régime", () => {
    expect(
      construireMatrice(avecModules({})).find(
        (l) => l.id === "carnet-sanitaire",
      ),
    ).toBeUndefined();
    expect(ligne(carnet({}), "carnet-sanitaire")).toBeDefined();
  });

  it("attend des points de relevé pour « en place »", () => {
    expect(ligne(carnet({}), "carnet-sanitaire").cellules[0]).toBe("todo");
    expect(ligne(carnet({ nbPoints: 2 }), "carnet-sanitaire").cellules[0]).toBe(
      "ok",
    );
  });

  it("considère à jour un carnet dont aucun point n'a de relevé de plus d'un mois", () => {
    // 2026-10-13 : le rythme écrit (un mois), plus les 7 jours retirés —
    // l'âge lui-même est jugé par `releveAncien`, testé dans `etat-releve`.
    expect(
      ligne(carnet({ nbPoints: 4, nbPointsReleveAncien: 0 }), "carnet-sanitaire")
        .cellules[1],
    ).toBe("ok");
    expect(
      ligne(carnet({ nbPoints: 4, nbPointsReleveAncien: 1 }), "carnet-sanitaire")
        .cellules[1],
    ).toBe("todo");
    expect(
      ligne(carnet({ nbPoints: 4, nbPointsJamaisReleves: 4 }), "carnet-sanitaire")
        .cellules[1],
    ).toBe("todo");
  });

  it("se juge sur le point le plus en retard, pas sur le plus récent", () => {
    // Onze points, un relevé avant-hier, dix muets depuis un an : la mesure
    // portait sur le dernier relevé toutes sondes confondues et passait au
    // vert. La pastille n'établissait pas le fait qu'elle prétendait
    // établir (doctrine en tête de `obligations.ts`).
    const l = ligne(
      carnet({ nbPoints: 11, nbPointsReleveAncien: 10 }),
      "carnet-sanitaire",
    );
    expect(l.cellules[1]).toBe("todo");
  });

  it("un seul point jamais relevé suffit à empêcher la pastille", () => {
    const l = ligne(
      carnet({
        nbPoints: 5,
        nbPointsJamaisReleves: 1,
        nbPointsReleveAncien: 0,
      }),
      "carnet-sanitaire",
    );
    expect(l.cellules[1]).toBe("todo");
  });

  it("attend une analyse légionelles de moins d'un an", () => {
    expect(
      ligne(carnet({ jourDerniereAnalyse: 100 }), "carnet-sanitaire")
        .cellules[2],
    ).toBe("ok");
    expect(
      ligne(carnet({ jourDerniereAnalyse: 400 }), "carnet-sanitaire")
        .cellules[2],
    ).toBe("todo");
  });

  // 2026-10-17, sous-lot F : installation déclarée → le calendrier porte la
  // température mensuelle et l'analyse annuelle ; la ligne ne les rappelle pas.
  it("se tait sur les rappels quand l'installation est déclarée au parc", () => {
    const enRetard = { nbPoints: 3, nbPointsReleveAncien: 3, jourDerniereAnalyse: 400 };
    expect(ligne(carnet(enRetard), "carnet-sanitaire").cellules).toEqual(["ok", "todo", "todo"]);
    expect(
      ligne(carnet({ ...enRetard, suiviParLeCalendrier: true }), "carnet-sanitaire").cellules,
    ).toEqual(["ok", "na", "na"]);
  });
});

describe("construireMatrice — prestataires", () => {
  it("n'apparaît pas sans prestataire déclaré", () => {
    expect(
      construireMatrice(avecModules({})).find((l) => l.id === "prestataires"),
    ).toBeUndefined();
  });

  it("signale les alertes de vigilance ouvertes", () => {
    const l = ligne(
      avecModules({ prestataires: { total: 2, enAlerte: 1 } }),
      "prestataires",
    );
    expect(l.cellules).toEqual(["ok", "na", "todo"]);
  });

  it("est sain quand toutes les pièces sont à jour", () => {
    const l = ligne(
      avecModules({ prestataires: { total: 2, enAlerte: 0 } }),
      "prestataires",
    );
    expect(l.cellules).toEqual(["ok", "na", "ok"]);
  });
});
