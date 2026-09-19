import { describe, expect, it } from "vitest";
import { cleJourCivil, debutDuJour, depuisCleJourCivil } from "@/lib/dates";
import { estVerificationEnRetard } from "@/lib/dates/retard";
import type { ObligationApplicable } from "@/lib/matching";
import {
  porteurDe,
  type Obligation,
  type ObligationPorteeParEquipement,
  type ObligationPorteeParEtablissement,
  type ObligationPorteeParSalarie,
} from "@/lib/referentiels/conformite/types";
import type { EquipementMatching } from "@/lib/matching/types";
import {
  cleDeLigne,
  genererProchainesVerifications,
  genererVerificationsDepuisTitres,
  reconcilierCalendrier,
  type OccurrenceExistante,
  type VerificationGenere,
  type TitreDeclare,
  cleApplicabilite,
  clesApplicabilite,
  periodicitesEffectives,
} from "./generateur";
import { estVerificationAPlanifier } from "@/lib/dates/retard";

// ============================================================================
// Fixtures
// ============================================================================

type ObligationEq = ObligationPorteeParEquipement;

function fakeObligation(
  over: Partial<ObligationEq> & Pick<ObligationEq, "id" | "periodicite">,
): ObligationEq {
  return {
    domaine: "electricite",
    libelle: `Obligation ${over.id}`,
    referencesLegales: [
      { source: "CODE_TRAVAIL", reference: "R. test" },
    ] as ObligationEq["referencesLegales"],
    realisateurs: ["personne_qualifiee"] as ObligationEq["realisateurs"],
    criticite: 3,
    transmet: [],
    nature: "echeance_recurrente",
    pieceAttendue: null,
    typologies: { travail: true },
    categoriesEquipement: [
      "INSTALLATION_ELECTRIQUE",
    ] as ObligationEq["categoriesEquipement"],
    ...over,
  };
}

/** Obligation portée par un salarié : nominative, aucun déclencheur. */
function fakeObligationSalarie(
  over: Partial<ObligationPorteeParSalarie> &
    Pick<ObligationPorteeParSalarie, "id" | "periodicite">,
): ObligationPorteeParSalarie {
  return {
    domaine: "electricite",
    libelle: `Obligation ${over.id}`,
    referencesLegales: [
      { source: "CODE_TRAVAIL", reference: "R. test" },
    ] as ObligationPorteeParSalarie["referencesLegales"],
    realisateurs: [
      "exploitant",
    ] as ObligationPorteeParSalarie["realisateurs"],
    criticite: 4,
    transmet: [],
    exclut: [],
    nature: "echeance_recurrente",
    pieceAttendue: null,
    typologies: { travail: true },
    pieceMedicale: false,
    ...over,
    porteur: "salarie",
  };
}

/** Obligation portée par l'établissement : aucun déclencheur d'équipement. */
function fakeObligationEtablissement(
  over: Partial<ObligationPorteeParEtablissement> &
    Pick<ObligationPorteeParEtablissement, "id" | "periodicite">,
): ObligationPorteeParEtablissement {
  return {
    domaine: "incendie",
    libelle: `Obligation ${over.id}`,
    referencesLegales: [
      { source: "ARRETE", reference: "PE 4 § 2" },
    ] as ObligationPorteeParEtablissement["referencesLegales"],
    realisateurs: [
      "personne_qualifiee",
    ] as ObligationPorteeParEtablissement["realisateurs"],
    criticite: 3,
    transmet: [],
    nature: "echeance_recurrente",
    pieceAttendue: null,
    typologies: { erp: true },
    ...over,
    porteur: "etablissement",
  };
}

function fakeEquipement(id = "eq-1"): EquipementMatching {
  return {
    id,
    libelle: `Équipement ${id}`,
    categorie: "INSTALLATION_ELECTRIQUE",
    caracteristiques: null,
  };
}

function applique(o: Obligation, eqs: EquipementMatching[]): ObligationApplicable {
  return {
    obligation: o,
    equipementsConcernes: eqs,
    porteur: porteurDe(o),
    raisons: ["test"],
  };
}

// ============================================================================
// TESTS
//
// LE TRI DE LA BASCULE (ADR-036, lot 4 — 2026-09-19). Le générateur ne date
// plus : il décrit les lignes et leurs SOURCES. Les ~80 tests de ce fichier
// ont été triés en trois paquets :
//  · les PROTECTIONS (adoption, archivage, suppression, NB4, porteurs,
//    identifiants stables) restent telles quelles ; leurs fixtures portent
//    `suiviDepuis` quand la date compte ;
//  · les RÈGLES DE DATE du générateur deviennent des tests de CÂBLAGE : la
//    source traverse le générateur, puis le réconciliateur la remet à
//    `echeanceDeLigne`, dont la table de vérité (`echeance-de-ligne.test.ts`)
//    tient la règle elle-même ;
//  · les tests qui figeaient « la date en base fait foi » gardent leur scénario
//    et leur assertion en exprimant le retard par un FAIT (origine, mise en
//    service, rapport). Ceux dont la date n'était justifiable par aucun fait
//    encodaient le défaut : ils sont INVERSÉS, marqués comme tels, et nommés
//    dans l'ADR-036 § 5.
// ============================================================================

/** Ce que le réconciliateur fait naître d'un calendrier vide, à `now`. */
function creees(aGenerer: VerificationGenere[], now: Date) {
  return reconcilierCalendrier([], aGenerer, { now }).aCreer;
}

describe("générateur calendrier — il décrit, il ne date plus (ADR-036)", () => {
  it("décrit une ligne par couple, avec ses sources et sans date", () => {
    const o = fakeObligation({ id: "o-annuelle", periodicite: "annuelle" });
    const res = genererProchainesVerifications([applique(o, [fakeEquipement()])]);

    expect(res).toHaveLength(1);
    expect(res[0].cleUnique).toBe("o-annuelle::eq-1");
    expect(res[0].sources).toEqual({
      premierPas: "annuelle",
      miseEnService: null,
      dateDuTitre: null,
    });
    // Ni date ni statut : c'est le temps 2 qui les calcule.
    expect(res[0]).not.toHaveProperty("datePrevue");
    expect(res[0]).not.toHaveProperty("statut");
  });

  it("sans source, la ligne NAÎT « à planifier », datée du début du jour de son origine", () => {
    // ~~Datée de `now`, l'instant~~ : c'était la date qui glissait à chaque
    // régénération. La règle 5 date l'origine, au jour civil de Paris.
    const o = fakeObligation({ id: "o-annuelle", periodicite: "annuelle" });
    const now = new Date("2026-01-15T09:30:00Z");
    const [ligne] = creees(genererProchainesVerifications([applique(o, [fakeEquipement()])]), now);

    expect(ligne.statut).toBe("a_planifier");
    expect(ligne.datePrevue).toEqual(debutDuJour(now));
  });

  it("obligation avec 2 équipements → 2 occurrences (clés distinctes)", () => {
    const o = fakeObligation({ id: "o-a", periodicite: "semestrielle" });
    const e1 = fakeEquipement("eq-1");
    const e2 = fakeEquipement("eq-2");

    const res = genererProchainesVerifications([applique(o, [e1, e2])]);
    expect(res.map((r) => r.cleUnique).sort()).toEqual([
      "o-a::eq-1",
      "o-a::eq-2",
    ]);
  });

  it("périodicité 'autre' → aucune occurrence générée", () => {
    const o = fakeObligation({ id: "registre", periodicite: "autre" });
    const res = genererProchainesVerifications([
      applique(o, [fakeEquipement()]),
    ]);
    expect(res).toHaveLength(0);
  });

  // ~~« refuse un historique : le générateur n'en est pas nourri »~~ — le
  // deuxième argument mort est retiré au lot 5 (2026-09-19) : c'est le type
  // qui le refuse désormais. Le one-shot consommé est tenu par le
  // réconciliateur (« une obligation one-shot déjà réalisée n'est ni archivée
  // ni replanifiée », plus bas).
});

describe("câblage — la mise en service traverse le générateur jusqu'à la fonction", () => {
  const o = () => fakeObligation({ id: "o-annuelle", periodicite: "annuelle" });
  const NOW = new Date("2026-01-15T00:00:00Z");
  const avecMiseEnService = (miseEnService: Date) =>
    genererProchainesVerifications([applique(o(), [fakeEquipement()])], {
      misesEnService: new Map([["eq-1", miseEnService]]),
    });

  it("date le premier cycle d'un équipement neuf, planifié (règle 4)", () => {
    // Un extincteur posé le 1er décembre se vérifie le 1er décembre suivant :
    // l'outil sait le déduire, il n'a pas à réclamer la date.
    const g = avecMiseEnService(new Date("2025-12-01T00:00:00Z"));
    expect(g[0].sources.miseEnService).toEqual(new Date("2025-12-01T00:00:00Z"));
    const [ligne] = creees(g, NOW);
    expect(ligne.statut).toBe("planifiee");
    expect(ligne.datePrevue).toEqual(new Date("2026-12-01T00:00:00Z"));
  });

  it("ne conclut rien quand le premier cycle est écoulé AVANT l'origine (règle 4 bis)", () => {
    // Mise en service en 2018 et aucune vérification connue : l'équipement a
    // vécu sans que le dossier le sache. Afficher « en retard depuis 2019 »
    // serait inventer un passé — on dit « à planifier », à l'origine.
    const [ligne] = creees(avecMiseEnService(new Date("2018-03-01T00:00:00Z")), NOW);
    expect(ligne.statut).toBe("a_planifier");
    expect(ligne.datePrevue).toEqual(debutDuJour(NOW));
  });

  it("laisse la vérification connue primer sur la mise en service (règle 3 avant 4)", () => {
    // Exprimé par un FAIT : la ligne en base porte un rapport du 2025-06-10.
    // 2025-06-10 + 1 an, et non 2025-12-01 + 1 an : un contrôle réalisé est
    // une preuve, une mise en service n'est qu'un point de départ par défaut.
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o-annuelle",
          equipementId: "eq-1",
          suiviDepuis: new Date("2025-01-01T00:00:00Z"),
          derniereRealisation: new Date("2025-06-10T00:00:00Z"),
          dernierResultat: "conforme",
          porteUnePreuve: true,
        }),
      ],
      avecMiseEnService(new Date("2025-12-01T00:00:00Z")),
      { now: NOW },
    );
    expect(plan.aMettreAJour[0].datePrevue).toEqual(new Date("2026-06-10T00:00:00Z"));
    expect(plan.aMettreAJour[0].source).toBe("rapport");
  });

  it("retombe sur « à planifier » sans mise en service connue", () => {
    const [ligne] = creees(
      genererProchainesVerifications([applique(o(), [fakeEquipement()])], {
        misesEnService: new Map(),
      }),
      NOW,
    );
    expect(ligne.statut).toBe("a_planifier");
  });
});

describe("câblage — le dernier rapport réalisé, lu par le réconciliateur (règle 3)", () => {
  // ~~Ces trois tests passaient la date du dernier contrôle au GÉNÉRATEUR
  // (`verificationsPrecedentes`).~~ Le générateur n'est plus nourri de
  // l'historique : la réalisation est un FAIT de la ligne en base, lu sur ses
  // rapports.
  const plan = (periodicite: "annuelle" | "quinquennale", derniere: Date, now: Date) => {
    const o = fakeObligation({ id: "o", periodicite });
    return reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o",
          equipementId: "eq-1",
          periodicite,
          suiviDepuis: new Date("2020-01-01T00:00:00Z"),
          derniereRealisation: derniere,
          dernierResultat: "conforme",
          porteUnePreuve: true,
        }),
      ],
      genererProchainesVerifications([applique(o, [fakeEquipement()])]),
      { now },
    );
  };

  it("annuelle : dernier contrôle + un an, planifiée", () => {
    const p = plan("annuelle", new Date("2026-01-10T00:00:00Z"), new Date("2026-03-01T00:00:00Z"));
    expect(p.aMettreAJour[0].datePrevue).toEqual(new Date("2027-01-10T00:00:00Z"));
    expect(p.aMettreAJour[0].statut).toBe("planifiee");
  });

  it("dernier contrôle ancien → date arrêtée, passée, donc en retard", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    const p = plan("annuelle", new Date("2024-01-01T00:00:00Z"), now);
    // Plus de statut « dépassée » (phase A) : la date calculée depuis le
    // contrôle réel est arrêtée, et c'est elle qui dit le retard.
    expect(p.aMettreAJour[0].statut).toBe("planifiee");
    expect(estVerificationEnRetard({ ...p.aMettreAJour[0], archiveLe: null }, now)).toBe(true);
  });

  it("quinquennale → prochaine date le même jour, cinq ans plus tard", () => {
    const p = plan("quinquennale", new Date("2024-06-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"));
    // Cinq ans après le 1er juin, c'est le 1er juin — 2028 est bissextile, et
    // le texte compte en années (« + 1825 jours » aurait donné le 31 mai 2029).
    expect(cleJourCivil(p.aMettreAJour[0].datePrevue)).toBe("2029-06-01");
  });
});

describe("câblage — mise en service uniquement (règle 2)", () => {
  const o = () =>
    fakeObligation({ id: "mes", periodicite: "mise_en_service_uniquement" });
  const NOW_MES = new Date("2026-08-11T09:00:00Z");

  it("aucune mise en service connue → à planifier", () => {
    const [ligne] = creees(genererProchainesVerifications([applique(o(), [fakeEquipement()])]), NOW_MES);
    expect(ligne.statut).toBe("a_planifier");
    // Il n'y a pas d'échéance à dépasser : l'événement a eu lieu ou non. Ce
    // qui manque est une pièce au dossier, pas un rendez-vous.
  });

  it("mise en service passée → la ligne est datée de l'événement, pas d'aujourd'hui", () => {
    // Datée de `now`, l'occurrence se redatait à chaque régénération : une
    // chambre froide de 2015 était réputée due aujourd'hui, dix ans plus tard.
    const miseEnService = new Date("2015-03-01T00:00:00Z");
    const [ligne] = creees(
      genererProchainesVerifications([applique(o(), [fakeEquipement()])], {
        misesEnService: new Map([["eq-1", miseEnService]]),
      }),
      NOW_MES,
    );
    expect(ligne.datePrevue.getTime()).toBe(miseEnService.getTime());
    expect(ligne.statut).toBe("a_planifier");
  });

  it("mise en service à venir → planifiée à cette date", () => {
    const miseEnService = new Date(NOW_MES.getTime() + 30 * 86_400_000);
    const [ligne] = creees(
      genererProchainesVerifications([applique(o(), [fakeEquipement()])], {
        misesEnService: new Map([["eq-1", miseEnService]]),
      }),
      NOW_MES,
    );
    expect(ligne.statut).toBe("planifiee");
    expect(ligne.datePrevue.getTime()).toBe(miseEnService.getTime());
  });
});

describe("générateur calendrier — performance", () => {
  it("génère 100 occurrences en moins de 500 ms", () => {
    // 100 obligations avec 1 équipement chacune
    const input: ObligationApplicable[] = Array.from({ length: 100 }, (_, i) => {
      const o = fakeObligation({ id: `o-${i}`, periodicite: "annuelle" });
      const eq = fakeEquipement(`eq-${i}`);
      return applique(o, [eq]);
    });
    const t0 = performance.now();
    const res = genererProchainesVerifications(input);
    const dt = performance.now() - t0;
    expect(res.length).toBe(100);
    expect(dt).toBeLessThan(500);
  });
});

describe("générateur calendrier — déterminisme", () => {
  it("deux appels identiques donnent le même résultat, quelle que soit l'horloge", () => {
    // L'horloge n'entre plus au générateur : deux `now` différents rendent la
    // même description.
    const o = fakeObligation({ id: "o", periodicite: "annuelle" });
    const eq = fakeEquipement();
    const a = genererProchainesVerifications([applique(o, [eq])], {
      now: new Date("2026-01-01T00:00:00Z"),
    });
    const b = genererProchainesVerifications([applique(o, [eq])], {
      now: new Date("2031-07-14T00:00:00Z"),
    });
    expect(a).toEqual(b);
  });
});

// ============================================================================
// Réconciliation idempotente — ADR-012
//
// Ces tests décrivent les pertes de données silencieuses que le motif
// « delete puis create » provoquait, et qui ne doivent plus jamais se produire.
// ============================================================================

const NOW = new Date("2026-08-11T09:00:00Z");

/** Une ligne de suivi en base, avec des valeurs déjà alignées sur le
 *  référentiel — de sorte qu'une régénération n'ait rien à changer. */
function ligneExistante(
  over: Partial<OccurrenceExistante> &
    Pick<OccurrenceExistante, "id" | "obligationId" | "equipementId">,
): OccurrenceExistante {
  return {
    libelleObligation: `Obligation ${over.obligationId}`,
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: new Date("2026-12-01T00:00:00Z"),
    statut: "a_planifier",
    porteUnePreuve: false,
    ...over,
  };
}

describe("générateur calendrier — porteur établissement (ADR-022)", () => {
  const applicableEtablissement = (o: ObligationPorteeParEtablissement) => ({
    obligation: o as Obligation,
    equipementsConcernes: [],
    porteur: "etablissement" as const,
    raisons: ["test"],
  });

  it("produit une ligne sans équipement, alors qu'aucun n'est déclaré", () => {
    // Le faux négatif que l'ADR-022 supprime, pris à la racine : jusqu'ici la
    // boucle du générateur itérait sur `equipementsConcernes`, donc une
    // obligation d'établissement — dont la liste est vide par construction —
    // ne produisait AUCUNE ligne.
    const o = fakeObligationEtablissement({
      id: "pe4",
      periodicite: "triennale",
    });

    const res = genererProchainesVerifications(
      [applicableEtablissement(o)],
      { now: NOW },
    );

    expect(res).toHaveLength(1);
    expect(res[0].equipementId).toBeNull();
    expect(res[0].obligationId).toBe("pe4");
  });

  it("produit UNE ligne, pas une par équipement déclaré", () => {
    // L'argument décisif de l'ADR : décomposer par installation produirait
    // zéro ligne chez qui n'a rien déclaré, et N lignes chez les autres pour
    // une obligation que le texte pose comme un tout.
    const o = fakeObligationEtablissement({
      id: "pe4",
      periodicite: "triennale",
    });

    const res = genererProchainesVerifications(
      [applicableEtablissement(o)],
      { now: NOW },
    );

    expect(res).toHaveLength(1);
  });

  it("la clé distingue deux porteurs, là où l'interpolation les confondait", () => {
    // Le second obstacle du chantier, invisible en base : `parCle` range les
    // lignes en MÉMOIRE avant que Postgres n'entre en jeu. Avec une clé
    // construite par interpolation, `null` devenait la chaîne "null" et
    // pouvait entrer en collision avec un identifiant d'équipement.
    expect(cleDeLigne("obl", { equipementId: null, salarieId: null })).not.toBe(cleDeLigne("obl", { equipementId: "null", salarieId: null }));
    expect(cleDeLigne("obl", { equipementId: null, salarieId: null })).not.toBe(cleDeLigne("obl", { equipementId: "eq-1", salarieId: null }));
    expect(cleDeLigne("obl", { equipementId: null, salarieId: null })).toBe(cleDeLigne("obl", { equipementId: null, salarieId: null }));
  });

  it("se réconcilie sans rien créer ni supprimer quand la ligne existe déjà", () => {
    // L'idempotence, sur le cas neuf. Si la clé de la ligne générée et celle
    // de la ligne existante divergeaient — c'est exactement ce que deux
    // constructions séparées produisent — la réconciliation prendrait la
    // ligne existante pour une ligne disparue et, faute de preuve attachée,
    // la SUPPRIMERAIT tout en recréant sa jumelle.
    const o = fakeObligationEtablissement({
      id: "pe4",
      periodicite: "triennale",
    });
    const aGenerer = genererProchainesVerifications(
      [applicableEtablissement(o)],
      { now: NOW },
    );

    // La ligne telle que la passe précédente l'a écrite : « à planifier »,
    // datée du début du jour de son origine (règle 5).
    const origine = new Date("2026-06-15T08:00:00Z");
    const existante = ligneExistante({
      id: "v-pe4",
      obligationId: "pe4",
      equipementId: null,
      libelleObligation: "Obligation pe4",
      periodicite: "triennale",
      datePrevue: debutDuJour(origine),
      statut: "a_planifier",
      suiviDepuis: origine,
    });

    const plan = reconcilierCalendrier([existante], aGenerer, { now: NOW });

    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aCreer).toEqual([]);
    expect(plan.aArchiver).toEqual([]);
    expect(plan.inchangees).toBe(1);
  });

  it("n'écrase pas la ligne d'équipement de la même obligation", () => {
    // Deux porteurs, une seule obligation. Sans le porteur dans la clé, les
    // deux lignes se rangeraient sous "obl::…" identiques et l'une des deux
    // disparaîtrait du plan.
    const oEtab = fakeObligationEtablissement({
      id: "mixte",
      periodicite: "annuelle",
    });
    const oEquip = fakeObligation({ id: "mixte", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-1");

    const aGenerer = [
      ...genererProchainesVerifications([applicableEtablissement(oEtab)], {
        now: NOW,
      }),
      ...genererProchainesVerifications([applique(oEquip, [eq])], {
        now: NOW,
      }),
    ];

    expect(aGenerer).toHaveLength(2);
    expect(new Set(aGenerer.map((v) => v.cleUnique)).size).toBe(2);

    const plan = reconcilierCalendrier([], aGenerer, { now: NOW });
    expect(plan.aCreer).toHaveLength(2);
  });

  it("une obligation d'établissement retirée du référentiel et sans preuve est supprimée", () => {
    // Le pendant : la réconciliation traite la ligne d'établissement comme
    // les autres. Rien de spécial, et c'est ce qu'on veut vérifier — un
    // porteur neuf qui échapperait aux règles communes serait une dette.
    const existante = ligneExistante({
      id: "v-pe4",
      obligationId: "pe4",
      equipementId: null,
      libelleObligation: "Obligation pe4",
      porteUnePreuve: false,
    });

    const plan = reconcilierCalendrier([existante], [], { now: NOW });
    expect(plan.aSupprimer).toEqual(["v-pe4"]);
  });

  it("une obligation d'établissement porteuse d'une preuve est archivée, pas supprimée", () => {
    const existante = ligneExistante({
      id: "v-pe4",
      obligationId: "pe4",
      equipementId: null,
      libelleObligation: "Obligation pe4",
      porteUnePreuve: true,
    });

    const plan = reconcilierCalendrier([existante], [], { now: NOW });
    expect(plan.aSupprimer).toEqual([]);
    // L'archivage est une DATE que l'exécutant pose (ADR-034, N3) : le plan ne
    // porte plus qu'un identifiant, et la ligne garde son libellé de référentiel.
    expect(plan.aArchiver).toEqual([{ id: "v-pe4" }]);
  });
});

describe("porteur salarié — du titre déclaré à la ligne (ADR-023)", () => {
  const OBLIGATION_SALARIE = fakeObligationSalarie({
    id: "attestation-medicale",
    periodicite: "quinquennale",
  });
  const CATALOGUE = (id: string) =>
    id === OBLIGATION_SALARIE.id ? (OBLIGATION_SALARIE as Obligation) : undefined;

  const titres = (liste: TitreDeclare[]) =>
    new Map<string, TitreDeclare[]>([[OBLIGATION_SALARIE.id, liste]]);

  it("un titre déclaré produit une ligne portée par la personne", () => {
    // Le chemin que rien n'exerçait : la relecture a relevé qu'aucun test ne
    // pouvait l'attraper, faute d'écran de saisie et faute de test pur.
    const res = genererVerificationsDepuisTitres(
      titres([
        {
          salarieId: "sal-1",
          libelle: "Jean Martin",
          delivreLe: new Date("2026-01-15T00:00:00Z"),
          echeanceLe: new Date("2031-01-15T00:00:00Z"),
        },
      ]),
      CATALOGUE,
    );

    expect(res).toHaveLength(1);
    expect(res[0].salarieId).toBe("sal-1");
    expect(res[0].equipementId).toBeNull();
    // La date du titre est une SOURCE ; la ligne née d'elle est « planifiée »
    // à cette date (règle 1).
    expect(res[0].sources.dateDuTitre).toEqual(new Date("2031-01-15T00:00:00Z"));
    const [ligne] = creees(res, NOW);
    expect(ligne.datePrevue).toEqual(new Date("2031-01-15T00:00:00Z"));
    expect(ligne.statut).toBe("planifiee");
  });

  it("deux salariés porteurs de la même obligation ne s'écrasent pas", () => {
    // La collision que l'ADR-022 avait prédite mot pour mot sans la traiter :
    // une clé à deux composantes rangeait les deux sous « obl::null », et la
    // réconciliation prenait l'un des deux pour disparu.
    const res = genererVerificationsDepuisTitres(
      titres([
        {
          salarieId: "sal-1",
          libelle: "Jean Martin",
          delivreLe: new Date("2026-01-15T00:00:00Z"),
          echeanceLe: new Date("2031-01-15T00:00:00Z"),
        },
        {
          salarieId: "sal-2",
          libelle: "Alice Dubois",
          delivreLe: new Date("2026-03-01T00:00:00Z"),
          echeanceLe: new Date("2031-03-01T00:00:00Z"),
        },
      ]),
      CATALOGUE,
    );

    expect(res).toHaveLength(2);
    expect(new Set(res.map((v) => v.cleUnique)).size).toBe(2);

    const plan = reconcilierCalendrier([], res, { now: NOW });
    expect(plan.aCreer).toHaveLength(2);
  });

  it("la date déclarée prime sur tout calcul", () => {
    // Cas de la transition R. 4544-10 : une attestation du régime antérieur
    // court jusqu'au 2030-10-01, pas cinq ans après sa délivrance. Calculer à
    // partir de `delivreLe` donnerait une échéance fausse de plusieurs années.
    const res = genererVerificationsDepuisTitres(
      titres([
        {
          salarieId: "sal-1",
          libelle: "Jean Martin",
          delivreLe: new Date("2019-06-01T00:00:00Z"),
          echeanceLe: new Date("2030-10-01T00:00:00Z"),
        },
      ]),
      CATALOGUE,
    );

    expect(res[0].sources.dateDuTitre).toEqual(new Date("2030-10-01T00:00:00Z"));
    expect(creees(res, NOW)[0].datePrevue).toEqual(new Date("2030-10-01T00:00:00Z"));
  });

  it("un titre déclaré sur une obligation d'équipement ne produit rien", () => {
    // `TitreSalarie.obligationId` n'a pas de clé étrangère — le référentiel
    // vit en TypeScript. Rien n'empêche donc de déclarer un titre sur une
    // obligation qui n'est pas nominative, et le CHECK `porteur_xor` ne dirait
    // rien : il interdit deux porteurs, pas le mauvais.
    const equipementale = fakeObligation({
      id: "obl-equipement",
      periodicite: "annuelle",
    });
    const res = genererVerificationsDepuisTitres(
      new Map([
        [
          "obl-equipement",
          [
            {
              salarieId: "sal-1",
              libelle: "Jean Martin",
              delivreLe: new Date("2026-01-15T00:00:00Z"),
              echeanceLe: null,
            },
          ],
        ],
      ]),
      (id) => (id === "obl-equipement" ? (equipementale as Obligation) : undefined),
    );

    expect(res).toEqual([]);
  });

  it("un titre sur une obligation disparue du référentiel ne produit rien", () => {
    const res = genererVerificationsDepuisTitres(
      titres([
        {
          salarieId: "sal-1",
          libelle: "Jean Martin",
          delivreLe: new Date("2026-01-15T00:00:00Z"),
          echeanceLe: null,
        },
      ]),
      () => undefined,
    );

    expect(res).toEqual([]);
  });
});

describe("réconciliation — permanent n'est pas retiré (ADR-023)", () => {
  // Le défaut que ce test ferme : une obligation passée en `periodicite:
  // "autre"` (état permanent) disparaît de `aGenerer` exactement comme une
  // obligation RETIRÉE. La réconciliation les confondait, et barrait d'un
  // « Ne s'applique plus » une obligation qui s'applique parfaitement.
  const ligne = (over: Partial<OccurrenceExistante> = {}) =>
    ligneExistante({
      id: "v-1",
      obligationId: "obl-permanente",
      equipementId: "eq-1",
      libelleObligation: "Habilitation électrique",
      ...over,
    });

  it("ne barre pas une obligation qui s'applique toujours", () => {
    const plan = reconcilierCalendrier([ligne({ porteUnePreuve: true })], [], {
      now: NOW,
      // Par clé obligation × porteur : la ligne est portée par `eq-1`.
      obligationsEncoreApplicables: new Set([
        cleApplicabilite("obl-permanente", "eq-1"),
      ]),
    });

    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.inchangees).toBe(1);
  });

  it("supprime en revanche la ligne sans preuve : elle n'aurait jamais dû être datée", () => {
    const plan = reconcilierCalendrier([ligne({ porteUnePreuve: false })], [], {
      now: NOW,
      // Par clé obligation × porteur : la ligne est portée par `eq-1`.
      obligationsEncoreApplicables: new Set([
        cleApplicabilite("obl-permanente", "eq-1"),
      ]),
    });

    expect(plan.aSupprimer).toEqual(["v-1"]);
    expect(plan.aArchiver).toEqual([]);
  });

  it("barre bien une obligation RÉELLEMENT retirée", () => {
    // Le comportement d'origine, qu'il ne s'agissait pas de perdre.
    const plan = reconcilierCalendrier([ligne({ porteUnePreuve: true })], [], {
      now: NOW,
      obligationsEncoreApplicables: new Set(["une-autre"]),
    });

    expect(plan.aArchiver).toEqual([{ id: "v-1" }]);
  });
});

describe("réconciliation — survie des actions correctives", () => {
  // Scénario du chantier : le dirigeant crée une action corrective sur sa
  // vérification électrique dépassée (responsable, échéance), puis déclare un
  // extincteur le lendemain. La déclaration régénère le calendrier.
  it("ne supprime pas une vérification dépassée porteuse d'une action", () => {
    const o = fakeObligation({ id: "elec", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-elec");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      { now: NOW },
    );

    // Le retard est un FAIT : suivie depuis le 1er février, jamais contrôlée,
    // la ligne est « à planifier » à cette origine — en retard par sa date.
    const origine = depuisCleJourCivil("2026-02-01");
    const existante = ligneExistante({
      id: "v-elec",
      obligationId: "elec",
      equipementId: "eq-elec",
      libelleObligation: "Obligation elec",
      datePrevue: origine,
      suiviDepuis: origine,
      statut: "a_planifier",
      porteUnePreuve: true, // une action corrective y est rattachée
    });

    const plan = reconcilierCalendrier([existante], aGenerer, { now: NOW });

    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aCreer).toEqual([]);
    expect(plan.aArchiver).toEqual([]);
    // La ligne est reconnue applicable et strictement inchangée : même id,
    // donc l'action rattachée survit.
    expect(plan.inchangees).toBe(1);
  });

  it("une ligne « à planifier » qui porte un contrôle réel devient « planifiée », une fois", () => {
    // Relecture du lot C (2026-09-14). Héritée d'avant la phase A — un « non
    // vérifiable » requalifiait la ligne —, elle s'affichait « aucune
    // vérification enregistrée » au-dessus d'un rapport conforme, sa vraie
    // échéance masquée. Un contrôle réel derrière la ligne, c'est une échéance
    // connue. La date ne bouge pas ; la passe suivante n'écrit plus rien.
    const o = fakeObligation({ id: "elec", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-elec");
    const aGenerer = genererProchainesVerifications([applique(o, [eq])], {
      now: NOW,
    });
    const datePrevue = new Date("2026-02-01T00:00:00Z");
    const ligne = (statut: "a_planifier" | "planifiee") =>
      ligneExistante({
        id: "v-elec",
        obligationId: "elec",
        equipementId: "eq-elec",
        datePrevue,
        statut,
        derniereRealisation: new Date("2025-02-01T00:00:00Z"),
        porteUnePreuve: true,
      });

    const premiere = reconcilierCalendrier([ligne("a_planifier")], aGenerer, { now: NOW });
    expect(premiere.aMettreAJour).toHaveLength(1);
    expect(premiere.aMettreAJour[0].statut).toBe("planifiee");
    expect(premiere.aMettreAJour[0].datePrevue).toEqual(datePrevue);

    const seconde = reconcilierCalendrier([ligne("planifiee")], aGenerer, { now: NOW });
    expect(seconde.aMettreAJour).toEqual([]);
  });

  it("ne repousse jamais l'échéance d'un cycle encore ouvert", () => {
    const o = fakeObligation({ id: "elec", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-elec");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      { now: NOW },
    );
    // Le retard, exprimé par un FAIT : l'origine du suivi, le 1er février.
    const datePrevue = depuisCleJourCivil("2026-02-01");

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-elec",
          obligationId: "elec",
          equipementId: "eq-elec",
          datePrevue,
          suiviDepuis: datePrevue,
          statut: "a_planifier", // la date est passée
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    // Rien à requalifier depuis le retrait de `depassee` : la ligne est
    // INCHANGÉE — même date, même statut —, et elle est en retard par sa date.
    // Avant, la régénération la réécrivait le jour où sa date passait.
    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.inchangees).toBe(1);
    expect(
      estVerificationEnRetard(
        {
          statut: "a_planifier",
          datePrevue,
          periodicite: "annuelle",
          archiveLe: null,
          libelleObligation: "Obligation elec",
        },
        NOW,
      ),
    ).toBe(true);
  });


});

describe("réconciliation — idempotence et stabilité des identifiants", () => {
  it("deux régénérations successives produisent le même état", () => {
    const o1 = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const o2 = fakeObligation({ id: "o2", periodicite: "trimestrielle" });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o1, [eq]), applique(o2, [eq])],
      { now: NOW },
    );

    // 1er passage : calendrier vide → deux créations.
    const plan1 = reconcilierCalendrier([], aGenerer, { now: NOW });
    expect(plan1.aCreer).toHaveLength(2);
    expect(plan1.aMettreAJour).toEqual([]);
    expect(plan1.aSupprimer).toEqual([]);

    // Les créations sont matérialisées avec des identifiants stables.
    const enBase: OccurrenceExistante[] = plan1.aCreer.map((v, i) => ({
      id: `v-${i}`,
      obligationId: v.obligationId,
      equipementId: v.equipementId,
      libelleObligation: v.libelleObligation,
      periodicite: v.periodicite,
      realisateurRequis: v.realisateurRequis,
      datePrevue: v.datePrevue,
      statut: v.statut,
      porteUnePreuve: false,
      // Ce que `actions.ts` écrit à la création : l'horloge de la passe.
      suiviDepuis: NOW,
    }));

    // 2e passage, à horloge identique : plus rien à faire.
    const plan2 = reconcilierCalendrier(enBase, aGenerer, { now: NOW });
    expect(plan2.aCreer).toEqual([]);
    expect(plan2.aMettreAJour).toEqual([]);
    expect(plan2.aSupprimer).toEqual([]);
    expect(plan2.aArchiver).toEqual([]);
    expect(plan2.inchangees).toBe(2);

    // 3e passage : toujours rien — l'idempotence n'est pas un coup de chance.
    const plan3 = reconcilierCalendrier(enBase, aGenerer, { now: NOW });
    expect(plan3).toEqual(plan2);
  });

  it("une mise à jour ne change jamais l'identifiant de la ligne", () => {
    const o = fakeObligation({
      id: "o1",
      periodicite: "biennale",
      libelle: "Libellé corrigé au référentiel",
    });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      { now: NOW },
    );

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-stable",
          obligationId: "o1",
          equipementId: "eq-1",
          libelleObligation: "Ancien libellé",
          periodicite: "annuelle",
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aMettreAJour).toHaveLength(1);
    expect(plan.aMettreAJour[0].id).toBe("v-stable");
    expect(plan.aMettreAJour[0].libelleObligation).toBe(
      "Libellé corrigé au référentiel",
    );
    expect(plan.aMettreAJour[0].periodicite).toBe("biennale");
  });
});

describe("réconciliation — un placeholder cède devant une vraie date", () => {
  // La ligne générée porte la mise en service de l'appareil dans ses SOURCES ;
  // c'est `echeanceDeLigne` qui en tire la première échéance (règle 4).
  const genere = (miseEnService: Date | null): VerificationGenere => ({
    cleUnique: "o-1::eq-1",
    obligationId: "o-1",
    salarieId: null,
    libelleObligation: "Obligation o-1",
    equipementId: "eq-1",
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    criticiteObligation: 3,
    raisons: ["test"],
    prescriptionId: null,
    sources: { premierPas: "annuelle", miseEnService, dateDuTitre: null },
  });

  it("pose la date calculée sur une ligne qui n'avait jamais de rendez-vous", () => {
    // « À planifier » n'est pas un rendez-vous, c'est son absence : la
    // remplacer par une date déduite de la mise en service n'efface rien.
    const existante = ligneExistante({
      id: "v-1",
      obligationId: "o-1",
      equipementId: "eq-1",
      statut: "a_planifier",
      datePrevue: NOW,
      suiviDepuis: NOW,
    });
    const plan = reconcilierCalendrier(
      [existante],
      [genere(new Date("2026-03-01T00:00:00Z"))],
      { now: NOW },
    );

    expect(plan.aMettreAJour[0].datePrevue).toEqual(
      new Date("2027-03-01T00:00:00Z"),
    );
    expect(plan.aMettreAJour[0].statut).toBe("planifiee");
  });

  it("INVERSÉ (ADR-036 § 5) — une mise en service déclarée après coup remplace une date de génération passée", () => {
    // ~~« n'efface pas un retard déjà constaté »~~ : ce test exigeait qu'une
    // ligne « à planifier » au 2026-02-01 garde sa date passée quand la mise
    // en service du 2026-03-01 donne le 2027-03-01, et reste en retard. Sa
    // date n'était justifiable par AUCUN fait — c'est S5 : cet appareil doit
    // son premier contrôle le 2027-03-01 et n'a manqué aucun rendez-vous. La
    // garde « date pas passée » existait parce qu'on ne savait pas distinguer
    // une date de génération d'un rendez-vous manqué ; l'origine du suivi, un
    // fait stocké, le sait.
    const origine = depuisCleJourCivil("2026-02-01");
    const existante = ligneExistante({
      id: "v-1",
      obligationId: "o-1",
      equipementId: "eq-1",
      statut: "a_planifier",
      datePrevue: origine,
      suiviDepuis: origine,
    });
    const plan = reconcilierCalendrier(
      [existante],
      [genere(depuisCleJourCivil("2026-03-01"))],
      { now: NOW },
    );

    expect(plan.aMettreAJour).toHaveLength(1);
    expect(plan.aMettreAJour[0].datePrevue).toEqual(depuisCleJourCivil("2027-03-01"));
    expect(plan.aMettreAJour[0].statut).toBe("planifiee");
  });

  it("… et un VRAI retard, exprimé par un fait, n'est jamais effacé", () => {
    // Le scénario que le test inversé voulait protéger, écrit avec ses faits :
    // mise en service le 2025-01-15, suivie depuis le 2025-01-20 — la première
    // échéance, 2026-01-15, est née PENDANT le suivi. Elle est réelle, passée,
    // et reste en retard (S2).
    const existante = ligneExistante({
      id: "v-1",
      obligationId: "o-1",
      equipementId: "eq-1",
      statut: "planifiee",
      datePrevue: depuisCleJourCivil("2026-01-15"),
      suiviDepuis: depuisCleJourCivil("2025-01-20"),
    });
    const plan = reconcilierCalendrier(
      [existante],
      [genere(depuisCleJourCivil("2025-01-15"))],
      { now: NOW },
    );
    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.inchangees).toBe(1);
    expect(estVerificationEnRetard({ ...existante, archiveLe: null }, NOW)).toBe(true);
  });
});

describe("réconciliation — cycles de vérification", () => {
  it("une périodicité qui change ré-ancre l'échéance ouverte sur la réalisation", () => {
    // Prescription d'assureur qui ramène l'annuelle au semestre : la ligne,
    // roulée par un dépôt du 2026-03-01 au 2027-03-01, doit passer au
    // 2026-09-01. Sans cette branche, l'échéance ouverte ne bougerait pas et
    // la prescription n'aurait d'effet qu'au prochain dépôt.
    const o = fakeObligation({ id: "o1", periodicite: "semestrielle" });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      { now: NOW },
    );

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o1",
          equipementId: "eq-1",
          periodicite: "annuelle",
          derniereRealisation: new Date("2026-03-01T00:00:00Z"),
          datePrevue: new Date("2027-03-01T00:00:00Z"),
          statut: "planifiee",
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    const maj = plan.aMettreAJour[0];
    expect(maj?.periodicite).toBe("semestrielle");
    // En jour civil : l'heure de Paris est conservée à travers le changement
    // d'heure (ADR-011), donc l'instant UTC bouge d'une heure.
    expect(cleJourCivil(maj!.datePrevue)).toBe("2026-09-01");
    // Au 2026-08-11, le 1er septembre est à venir.
    expect(maj?.statut).toBe("planifiee");
  });

  it("un « non vérifiable » déposé après un contrôle ne renvoie pas la ligne à sa mise en service", () => {
    // RÉGRESSION DE N2, trouvée en relecture. Le rapport « non vérifiable »
    // repasse la ligne en « à planifier » sans toucher sa date — l'échéance
    // qui courait court toujours. La branche du placeholder prenait alors la
    // main et réécrivait « mise en service + une période », oubliant le
    // contrôle réel que la ligne prouve.
    const o = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-1");
    // La mise en service passe par les OPTIONS : passée en second argument,
    // elle serait lue comme une « vérification précédente » indexée par clé de
    // ligne, ne matcherait rien, et la ligne générée sortirait « à planifier »
    // — le placeholder ne se déclencherait jamais, et ce test ne garderait
    // rien. Il l'a fait pendant une heure, jusqu'à ce que la mutation reste
    // verte et le dise.
    const aGenerer = genererProchainesVerifications([applique(o, [eq])], {
      now: NOW,
      misesEnService: new Map([["eq-1", new Date("2026-06-12T00:00:00Z")]]),
    });

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o1",
          equipementId: "eq-1",
          datePrevue: new Date("2027-08-01T00:00:00Z"),
          derniereRealisation: new Date("2026-08-01T00:00:00Z"),
          statut: "a_planifier",
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    const maj = plan.aMettreAJour[0];
    expect(maj?.datePrevue ?? new Date("2027-08-01T00:00:00Z")).toEqual(
      new Date("2027-08-01T00:00:00Z"),
    );
  });

  it("une périodicité devenue PONCTUELLE solde une ligne roulée au lieu de la laisser courir", () => {
    // RÉGRESSION DE N2. Le référentiel corrige le rythme, ou une prescription
    // est levée : l'obligation n'a plus de rendez-vous suivant. La ligne,
    // roulée par son dépôt, porte « planifiée » — elle échappait donc à la
    // branche du one-shot et gardait une échéance que plus rien n'attend.
    // Elle serait passée « en retard » au cycle suivant, sur un contrôle fait.
    const o = fakeObligation({
      id: "o1",
      periodicite: "mise_en_service_uniquement",
    });
    const aGenerer = genererProchainesVerifications(
      [applique(o, [fakeEquipement("eq-1")])],
      { now: NOW },
    );

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o1",
          equipementId: "eq-1",
          periodicite: "annuelle",
          datePrevue: new Date("2027-03-01T00:00:00Z"),
          suiviDepuis: depuisCleJourCivil("2025-02-10"),
          derniereRealisation: new Date("2026-03-01T00:00:00Z"),
          dernierResultat: "observations_mineures",
          statut: "planifiee",
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    const maj = plan.aMettreAJour[0];
    expect(maj?.statut).toBe("realisee_observations");
    // INVERSÉ SUR LA DATE (ADR-036 § 5) — le statut reste. ~~La ligne gardait
    // l'échéance roulée du 2027-03-01~~, qu'aucun rendez-vous n'attend plus.
    // Un ponctuel soldé est daté de sa mise en service, à défaut de l'origine
    // de son suivi (règle 2) — ici l'origine, faute de mise en service.
    expect(maj?.datePrevue).toEqual(depuisCleJourCivil("2025-02-10"));
    expect(maj?.source).toBe("ponctuel_solde");
  });

  it("rouvre une ligne archivée dont l'obligation n'engendre plus de rendez-vous", () => {
    // LE CAS QUE `identique` NE VOIT PAS, et le second chemin de désarchivage.
    // Une habilitation qui passe de triennale à `autre` n'engendre plus de
    // ligne : elle n'arrive donc jamais par `aMettreAJour`. Barrée pendant que
    // l'appareil était retiré, elle restait barrée à perpétuité, comptée
    // « inchangée » (relecture du 2026-09-12).
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-perm",
          obligationId: "permanente",
          equipementId: "eq-1",
          periodicite: "autre",
          archiveLe: new Date("2026-02-01T00:00:00Z"),
          statut: "a_planifier",
          porteUnePreuve: true,
        }),
      ],
      [],
      {
        now: NOW,
        // Elle s'applique toujours — elle n'a simplement plus de rendez-vous.
        obligationsEncoreApplicables: new Set([
          cleApplicabilite("permanente", "eq-1"),
        ]),
        equipementsEnService: new Set(["eq-1"]),
      },
    );

    expect(plan.aDesarchiver).toEqual([{ id: "v-perm" }]);
    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.inchangees).toBe(0);
  });

  it("et laisse tranquille la même ligne quand elle n'est pas archivée", () => {
    // Le témoin : sans lui, on ne saurait pas si la branche distingue quoi que
    // ce soit — elle pourrait rouvrir tout ce qui passe.
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-perm",
          obligationId: "permanente",
          equipementId: "eq-1",
          periodicite: "autre",
          statut: "a_planifier",
          porteUnePreuve: true,
        }),
      ],
      [],
      {
        now: NOW,
        obligationsEncoreApplicables: new Set([
          cleApplicabilite("permanente", "eq-1"),
        ]),
        equipementsEnService: new Set(["eq-1"]),
      },
    );

    expect(plan.aDesarchiver).toEqual([]);
    expect(plan.inchangees).toBe(1);
  });

  it("une ligne de salarié hors des titres actifs sort comme celle d'un appareil retiré (2026-09-17)", () => {
    // L'obligation vit encore — B détient le titre —, mais A est parti : sa
    // ligne, avec une action, est archivée ; celle de C, sans trace, supprimée.
    // Sans `titresActifs`, les deux restaient ouvertes, en retard à leur date.
    const titre = (id: string, salarieId: string, porteUnePreuve: boolean) =>
      ligneExistante({
        id,
        obligationId: "vip",
        equipementId: null,
        salarieId,
        periodicite: "autre",
        statut: "planifiee",
        porteUnePreuve,
      });
    const options = {
      now: NOW,
      obligationsEncoreApplicables: new Set(["vip"]),
      titresActifs: new Set([
        cleDeLigne("vip", { equipementId: null, salarieId: "sal-B" }),
      ]),
    };
    const lignes = [
      titre("v-A", "sal-A", true),
      titre("v-C", "sal-C", false),
    ];

    const plan = reconcilierCalendrier(lignes, [], options);
    expect(plan.aArchiver).toEqual([{ id: "v-A" }]);
    expect(plan.aSupprimer).toEqual(["v-C"]);

    // Absent = comportement antérieur : aucune ligne de salarié n'est réputée
    // orpheline de son porteur.
    const avant = reconcilierCalendrier(lignes, [], {
      ...options,
      titresActifs: undefined,
    });
    expect(avant.aArchiver).toEqual([]);
  });

  describe("NB4 — une ligne applicable que la génération saute se réaligne (2026-09-15)", () => {
    // Le cas : une prescription donnait un rythme semestriel à une obligation
    // `autre` sur eq-1, un rapport a fait rouler la ligne, la prescription est
    // levée. Plus aucune ligne générée ; l'obligation s'applique toujours à
    // eq-1, sans rythme. Avant la correction, la boucle finale n'écrivait
    // qu'`archiveLe` : la ligne restait semestrielle, marquée, en retard.
    const roulee = (over: Partial<OccurrenceExistante> = {}) =>
      ligneExistante({
        id: "v-portail",
        obligationId: "porte-maintien",
        equipementId: "eq-1",
        periodicite: "semestrielle",
        datePrevue: new Date("2026-03-01T00:00:00Z"),
        derniereRealisation: new Date("2025-09-01T00:00:00Z"),
        dernierResultat: "conforme",
        statut: "planifiee",
        porteUnePreuve: true,
        prescriptionId: "presc-1",
        ...over,
      });
    const sansRythme = {
      now: NOW,
      obligationsEncoreApplicables: new Set([cleApplicabilite("porte-maintien", "eq-1")]),
      periodicitesEffectives: new Map([
        [cleApplicabilite("porte-maintien", "eq-1"), "autre" as const],
      ]),
      equipementsEnService: new Set(["eq-1"]),
    };

    it("réécrit le rythme, retire la prescription, lit le statut sur le rapport, garde la date", () => {
      const plan = reconcilierCalendrier([roulee()], [], sansRythme);
      expect(plan.aMettreAJour).toEqual([
        {
          id: "v-portail",
          obligationId: "porte-maintien",
          libelleObligation: "Obligation porte-maintien",
          periodicite: "autre",
          realisateurRequis: ["personne_qualifiee"],
          datePrevue: new Date("2026-03-01T00:00:00Z"),
          statut: "realisee_conforme",
          prescriptionId: null,
        },
      ]);
      expect(plan.inchangees).toBe(0);
      expect(plan.aDesarchiver).toEqual([]);
      // Et la ligne ainsi écrite n'est plus en retard : un statut réalisé
      // purge sur une obligation sans rendez-vous suivant.
      const m = plan.aMettreAJour[0]!;
      expect(
        estVerificationEnRetard(
          { ...m, archiveLe: null },
          NOW,
        ),
      ).toBe(false);
    });

    it("archivée, elle passe par la mise à jour et non par la simple réouverture", () => {
      // `aMettreAJour` écrit `archiveLe: null` avec le reste
      // (`calendrier/actions.ts`) : `aDesarchiver` n'écrirait que l'archivage.
      const plan = reconcilierCalendrier(
        [roulee({ archiveLe: new Date("2026-05-01T00:00:00Z") })],
        [],
        sansRythme,
      );
      expect(plan.aMettreAJour.map((m) => m.id)).toEqual(["v-portail"]);
      expect(plan.aDesarchiver).toEqual([]);
    });

    it("une fois réalignée, la passe suivante ne réécrit rien", () => {
      const plan = reconcilierCalendrier(
        [
          roulee({
            periodicite: "autre",
            prescriptionId: null,
            statut: "realisee_conforme",
          }),
        ],
        [],
        sansRythme,
      );
      expect(plan.aMettreAJour).toEqual([]);
      expect(plan.inchangees).toBe(1);
    });

    it("action seule, sans rapport réalisé : la ligne passe « à planifier » et sort des retards (limite 1)", () => {
      // ~~Elle restait « planifiée », donc en retard à sa date.~~ Tranché le
      // 2026-09-15 : aucun rendez-vous n'est attendu d'une obligation sans
      // rythme. Ni statut réalisé — ce serait fabriquer une preuve —, ni
      // archivage — l'obligation s'applique : « à planifier », que
      // `lignePortantSansRendezVous` tient hors des retards et des « à
      // planifier ». L'action, elle, garde son propre retard.
      const plan = reconcilierCalendrier(
        [roulee({ derniereRealisation: null, dernierResultat: null })],
        [],
        sansRythme,
      );
      const m = plan.aMettreAJour[0]!;
      expect(m.periodicite).toBe("autre");
      expect(m.prescriptionId).toBeNull();
      expect(m.statut).toBe("a_planifier");
      expect(m.datePrevue).toEqual(new Date("2026-03-01T00:00:00Z"));
      const lue = { ...m, archiveLe: null };
      expect(estVerificationEnRetard(lue, NOW)).toBe(false);
      expect(estVerificationAPlanifier(lue, NOW)).toBe(false);
    });

    it("une ligne déjà réalignée « planifiée » est rattrapée sur son seul statut, puis ne bouge plus", () => {
      // Réalignée avant la limite 1 : `autre`, sans prescription, « planifiée ».
      // Ni le rythme ni la prescription ne diffèrent ; le statut, si.
      const dejaAlignee = roulee({
        periodicite: "autre",
        prescriptionId: null,
        derniereRealisation: null,
        dernierResultat: null,
      });
      const premiere = reconcilierCalendrier([dejaAlignee], [], sansRythme);
      expect(premiere.aMettreAJour.map((m) => m.statut)).toEqual(["a_planifier"]);

      // IDEMPOTENCE : appliquée, la passe suivante n'écrit rien.
      const seconde = reconcilierCalendrier(
        [{ ...dejaAlignee, statut: "a_planifier" }],
        [],
        sansRythme,
      );
      expect(seconde.aMettreAJour).toEqual([]);
      expect(seconde.inchangees).toBe(1);
    });

    it("à rythme déjà juste, une prescription restée sur la ligne tombe quand même", () => {
      // La clause `|| prescriptionId !== null` seule : sans elle, une ligne
      // déjà `autre` mais encore marquée d'une prescription levée garderait
      // son marquage — contractuel, le cas échéant (ADR-032).
      const plan = reconcilierCalendrier(
        [roulee({ periodicite: "autre", statut: "realisee_conforme" })],
        [],
        sansRythme,
      );
      expect(plan.aMettreAJour.map((m) => [m.periodicite, m.prescriptionId])).toEqual([
        ["autre", null],
      ]);
    });

    it("au retrait d'un rapport réalisé, un statut réalisé sans rapport ne se garde plus", () => {
      // Relecture du lot 4 (2026-09-19). La ligne `autre`, soldée par le
      // rapport qu'on retire, porte encore une prescription levée : NB4 la met
      // à jour pour cela, et gardait au passage son statut réalisé — sans
      // aucune pièce. Elle repasse « à planifier », date inchangée.
      // ~~Sous la décision ordinaire, la trace restait (c'était un legs).~~
      // Depuis le lot 5 (2026-09-19), il n'y a plus qu'une décision : un
      // statut réalisé ne survit pas sans rapport réalisé.
      const soldeeSansPiece = roulee({
        periodicite: "autre",
        statut: "realisee_conforme",
        derniereRealisation: null,
        dernierResultat: null,
      });
      const retrait = reconcilierCalendrier([soldeeSansPiece], [], sansRythme);
      expect(retrait.aMettreAJour.map((m) => [m.statut, m.prescriptionId])).toEqual([
        ["a_planifier", null],
      ]);
      expect(retrait.aMettreAJour[0].datePrevue).toEqual(new Date("2026-03-01T00:00:00Z"));
    });

    // ~~« sur un rythme, un statut réalisé sans rapport est gardé : c'est la
    // seule trace »~~ — retiré au lot 5 (2026-09-19) avec la garde du legs.
    // Le test suivant tient désormais la règle, sans décision particulière.

    it("sur un rythme, le statut réalisé sans rapport ne se garde plus", () => {
      // Une ligne de titre, non générée, au statut réalisé sans rapport : le
      // statut ne vient d'aucune pièce, ce n'est pas une trace. Sans rapport
      // réalisé ni statut « planifiée », elle repasse « à planifier ».
      const plan = reconcilierCalendrier(
        [
          ligneExistante({
            id: "v-titre",
            obligationId: "titre-quinquennal",
            equipementId: null,
            salarieId: "sal-1",
            periodicite: "triennale",
            statut: "realisee_conforme",
            porteUnePreuve: false,
          }),
        ],
        [],
        {
          now: NOW,
          obligationsEncoreApplicables: new Set(["titre-quinquennal"]),
          periodicitesEffectives: new Map([["titre-quinquennal", "quinquennale" as const]]),
        },
      );
      expect(plan.aMettreAJour.map((m) => [m.periodicite, m.statut])).toEqual([
        ["quinquennale", "a_planifier"],
      ]);
    });

    it("une périodicité effective inconnue ne réaligne rien", () => {
      // Clé indexée sans valeur (fixture qui ne connaît que la clé) : inventer
      // `autre` ferait purger un statut. Comportement antérieur.
      const plan = reconcilierCalendrier([roulee()], [], {
        ...sansRythme,
        periodicitesEffectives: new Map([
          [cleApplicabilite("porte-maintien", "eq-1"), undefined],
        ]),
      });
      expect(plan.aMettreAJour).toEqual([]);
      expect(plan.inchangees).toBe(1);
    });

    it("la table suit les surcharges par appareil, et la clé de l'ensemble d'applicabilité", () => {
      const table = periodicitesEffectives([
        {
          obligation: { id: "porte-maintien", periodicite: "autre" },
          porteur: "equipement",
          equipementsConcernes: [{ id: "eq-1" }, { id: "eq-2" }],
          surcharges: { "eq-1": { periodicite: "semestrielle" } },
        },
        {
          obligation: { id: "registre", periodicite: "autre" },
          porteur: "etablissement",
          equipementsConcernes: [],
        },
      ]);
      expect([...table.entries()].sort()).toEqual([
        ["porte-maintien::eq-1", "semestrielle"],
        ["porte-maintien::eq-2", "autre"],
        ["registre", "autre"],
      ]);
    });
  });

  it("l'ensemble d'applicabilité se construit par appareil, et par établissement", () => {
    // MUTATION SURVIVANTE de la relecture (2026-09-13) : la construction vivait
    // dans `actions.ts`, et revenir à l'identifiant nu pour le porteur
    // équipement laissait la suite verte. Extraite, elle est tenue ici.
    const cles = clesApplicabilite([
      {
        obligation: { id: "froid-annuel" },
        porteur: "equipement",
        equipementsConcernes: [{ id: "eq-A" }, { id: "eq-B" }],
      },
      {
        obligation: { id: "registre-securite" },
        porteur: "etablissement",
        equipementsConcernes: [],
      },
    ]);
    expect([...cles].sort()).toEqual([
      "froid-annuel::eq-A",
      "froid-annuel::eq-B",
      "registre-securite",
    ]);
    // Et surtout PAS l'identifiant nu d'une obligation d'équipement : c'est lui
    // qui rouvrait la ligne d'un appareil pour lequel elle ne vaut plus.
    expect(cles.has("froid-annuel")).toBe(false);
  });

  it("ne rouvre PAS la ligne d'un appareil parce qu'un AUTRE appareil déclenche l'obligation", () => {
    // LE BLOQUANT DE LA RELECTURE DU N4 (2026-09-13), rejoué sur des obligations
    // réelles : un groupe froid A reçoit une détection de fuites, l'annuelle
    // ne s'y applique plus, sa ligne est archivée — juste. Un groupe froid B,
    // déclaré plus tard sans cette réponse, déclenche l'annuelle. À la passe
    // suivante, la ligne de A n'était pas générée, l'obligation était « encore
    // applicable » (par B) et A en service : `aDesarchiver` la rouvrait, avec
    // son échéance gelée — donc « dépassée » partout, à perpétuité. L'ensemble
    // d'applicabilité était fait d'identifiants nus ; il est fait de clés
    // obligation × porteur.
    const ligneDeA = (over: Partial<OccurrenceExistante> = {}) =>
      ligneExistante({
        id: "v-A",
        obligationId: "froid-controle-etancheite-annuel",
        equipementId: "eq-A",
        periodicite: "annuelle",
        statut: "planifiee",
        porteUnePreuve: true,
        ...over,
      });
    const applicableParBSeulement = {
      now: NOW,
      obligationsEncoreApplicables: new Set([
        cleApplicabilite("froid-controle-etancheite-annuel", "eq-B"),
      ]),
      equipementsEnService: new Set(["eq-A", "eq-B"]),
    };

    // Archivée, elle le reste.
    const rouverture = reconcilierCalendrier(
      [ligneDeA({ archiveLe: new Date("2026-02-01T00:00:00Z") })],
      [],
      applicableParBSeulement,
    );
    expect(rouverture.aDesarchiver).toEqual([]);
    expect(rouverture.inchangees).toBe(1);

    // Et le jumeau, antérieur au lot : pas encore archivée, elle doit l'être —
    // l'obligation ne s'applique plus à A, quoi qu'il en soit de B.
    const archivage = reconcilierCalendrier([ligneDeA()], [], applicableParBSeulement);
    expect(archivage.aArchiver).toEqual([{ id: "v-A" }]);
    expect(archivage.aDesarchiver).toEqual([]);
  });

  it("une obligation ponctuelle consommée n'est pas supprimée quand son porteur disparaît", () => {
    // Sa colonne est éteinte et elle n'a plus de rapport : son STATUT est le
    // seul témoignage qu'elle a été faite. La supprimer effacerait la preuve
    // d'un contrôle de mise en service.
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-mes",
          obligationId: "retiree",
          equipementId: "eq-1",
          periodicite: "mise_en_service_uniquement",
          derniereRealisation: null,
          statut: "realisee_conforme",
          porteUnePreuve: false,
        }),
      ],
      [],
      { now: NOW },
    );

    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aArchiver).toHaveLength(1);
  });

  it("ne fait plus rouler une ligne déjà roulée par son dépôt (ADR-034)", () => {
    // Le cas général depuis N2 : le dépôt du 2026-03-01 a roulé la ligne au
    // 2027-03-01, statut planifiée. La régénération la trouve et la laisse —
    // ni « réalisée », ni recalculée, ni relancée.
    const o = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      { now: NOW },
    );

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o1",
          equipementId: "eq-1",
          libelleObligation: "Obligation o1",
          periodicite: "annuelle",
          realisateurRequis: o.realisateurs,
          derniereRealisation: new Date("2026-03-01T00:00:00Z"),
          datePrevue: new Date("2027-03-01T00:00:00Z"),
          statut: "planifiee",
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.inchangees).toBe(1);
  });

  it("une obligation one-shot déjà réalisée n'est ni archivée ni replanifiée", () => {
    const o = fakeObligation({
      id: "mes",
      periodicite: "mise_en_service_uniquement",
    });
    const eq = fakeEquipement("eq-1");
    // L'historique n'est volontairement pas passé au générateur : sans cela
    // l'occurrence disparaîtrait de `aGenerer` et serait prise pour une
    // obligation retirée du référentiel.
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      { now: NOW },
    );
    // Une date que les faits expliquent : sans mise en service, un ponctuel
    // soldé porte l'origine de son suivi (règle 2).
    const datePrevue = depuisCleJourCivil("2025-05-01");

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-mes",
          obligationId: "mes",
          equipementId: "eq-1",
          libelleObligation: "Obligation mes",
          periodicite: "mise_en_service_uniquement",
          datePrevue,
          suiviDepuis: datePrevue,
          derniereRealisation: new Date("2025-05-01T00:00:00Z"),
          // Le résultat du rapport, que la lecture de production porte toujours.
          // ~~Absent, la garde du legs conservait le statut~~ — retirée au lot 5
          // (2026-09-19) : un ponctuel se solde sur son rapport réalisé.
          dernierResultat: "conforme",
          statut: "realisee_conforme",
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.inchangees).toBe(1);
  });
});

describe("réconciliation — obligations devenues non applicables", () => {
  it("supprime une ligne sans aucune preuve", () => {
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-orphelin",
          obligationId: "retiree",
          equipementId: "eq-supprime",
        }),
      ],
      [],
      { now: NOW },
    );

    expect(plan.aSupprimer).toEqual(["v-orphelin"]);
    expect(plan.aArchiver).toEqual([]);
  });

  it("archive au lieu de supprimer dès qu'une preuve existe", () => {
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-preuve",
          obligationId: "retiree",
          equipementId: "eq-desactive",
          libelleObligation: "Vérification annuelle de l'installation",
          porteUnePreuve: true,
        }),
      ],
      [],
      { now: NOW },
    );

    expect(plan.aSupprimer).toEqual([]);
    // Le libellé n'entre plus dans le plan (ADR-034, N3) : la ligne conserve
    // celui du référentiel, et c'est `archiveLe` que l'exécutant date.
    expect(plan.aArchiver).toEqual([{ id: "v-preuve" }]);
  });

  it("une date de réalisation suffit à interdire la suppression", () => {
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-realisee",
          obligationId: "retiree",
          equipementId: "eq-1",
          statut: "realisee_conforme",
          porteUnePreuve: false, // rapport retiré du registre depuis
        }),
      ],
      [],
      { now: NOW },
    );

    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aArchiver).toHaveLength(1);
  });

  it("n'archive pas deux fois la même ligne (idempotence de l'archivage)", () => {
    const dejaArchivee = ligneExistante({
      id: "v-preuve",
      obligationId: "retiree",
      equipementId: "eq-1",
      libelleObligation: "Vérification annuelle",
      archiveLe: new Date("2026-07-01T00:00:00Z"),
      porteUnePreuve: true,
    });

    const plan = reconcilierCalendrier([dejaArchivee], [], { now: NOW });
    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.inchangees).toBe(1);
  });

  it("désarchive une ligne dont l'obligation redevient applicable", () => {
    // GARANTIE (b) DU LOT N3, et le cas est plus étroit qu'il n'y paraît.
    //
    // `archiveLe` n'est remis à `null` qu'AU FIL D'UNE MISE À JOUR : c'est
    // `calendrier/actions.ts` qui l'écrit, dans le `data` de chaque entrée de
    // `aMettreAJour`, et nulle part ailleurs. Une ligne archivée qui retombe
    // dans `inchangees` n'est donc jamais désarchivée — elle reste barrée à
    // perpétuité sur une obligation qui s'applique de nouveau, invisible au
    // calendrier et absente de tous les comptes.
    //
    // Du temps du préfixe, le cas ne pouvait pas se produire : le marqueur
    // vivait dans `libelleObligation`, que la réconciliation compare, donc une
    // ligne barrée différait TOUJOURS du référentiel et passait par une mise à
    // jour. En déplaçant l'archivage dans un champ que `identique` ne regarde
    // pas, le N3 a rendu ce chemin atteignable — d'où cette garde.
    //
    // La fixture est alignée sur le référentiel EXPRÈS : tous les champs
    // comparés sont déjà à leur valeur cible, si bien que `archiveLe` est la
    // seule chose qui doive encore changer. C'est le cas que le compte
    // « inchangée » avale.
    const o = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      { now: NOW },
    );

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o1",
          equipementId: "eq-1",
          libelleObligation: "Obligation o1",
          archiveLe: new Date("2026-07-01T00:00:00Z"),
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    expect(
      plan.aMettreAJour,
      "sans mise à jour, personne n'écrit `archiveLe: null` : la ligne reste barrée pour toujours",
    ).toHaveLength(1);
    expect(plan.aMettreAJour[0].id).toBe("v-1");
    expect(plan.inchangees).toBe(0);
    // Et elle n'est pas ré-archivée dans la foulée : l'obligation est générée.
    expect(plan.aArchiver).toEqual([]);
  });
});

describe("réconciliation — la date d'un titre est un fait, pas un calcul", () => {
  // Le défaut que ce test ferme : la ligne d'un titre de salarié était écrite
  // à sa création et JAMAIS réécrite. Le générateur produisait bien la nouvelle
  // date après un renouvellement, la réconciliation la jetait — la seule
  // branche qui adoptait `g.datePrevue` exigeait `ex.statut === "a_planifier"`,
  // or une ligne de titre naît `planifiee`, jamais `a_planifier`.
  // Le calendrier annonçait donc l'attestation dépassée à perpétuité, et la
  // rectification promise par docs/rgpd.md § 5.2 (art. 16) restait invisible.
  const ligneDeTitre = (over: Partial<OccurrenceExistante> = {}) =>
    ligneExistante({
      id: "v-titre",
      obligationId: "elec-attestation",
      equipementId: null,
      salarieId: "sal-1",
      libelleObligation: "Attestation médicale",
      periodicite: "quinquennale",
      datePrevue: new Date("2026-01-10T00:00:00Z"),
      // Une date déclarée, passée : arrêtée — le retard se lit sur elle.
      statut: "planifiee",
      ...over,
    });

  // La date de la pièce voyage dans les SOURCES (`dateDuTitre`) : c'est la
  // règle 1 de `echeanceDeLigne` qui la fait primer. ~~`datePrevueFaisantFoi`~~,
  // le drapeau qui le disait au réconciliateur, est parti à la bascule.
  const generee = (echeance: string | null): VerificationGenere => ({
    cleUnique: "elec-attestation::sal-1",
    obligationId: "elec-attestation",
    libelleObligation: "Attestation médicale",
    equipementId: null,
    salarieId: "sal-1",
    periodicite: "quinquennale",
    realisateurRequis: ["personne_qualifiee"],
    criticiteObligation: 4,
    raisons: ["titre détenu par Jean Dupont"],
    prescriptionId: null,
    sources: {
      premierPas: "quinquennale",
      miseEnService: null,
      dateDuTitre: echeance === null ? null : new Date(echeance),
    },
  });

  it("adopte l'échéance d'un titre renouvelé", () => {
    const plan = reconcilierCalendrier(
      [ligneDeTitre()],
      [generee("2031-01-10T00:00:00Z")],
      { now: NOW, obligationsEncoreApplicables: new Set(["elec-attestation"]) },
    );

    expect(plan.aMettreAJour).toHaveLength(1);
    expect(plan.aMettreAJour[0]?.datePrevue).toEqual(
      new Date("2031-01-10T00:00:00Z"),
    );
    expect(plan.aMettreAJour[0]?.statut).toBe("planifiee");
  });

  it("fait apparaître le retard qu'une coquille masquait", () => {
    // L'autre sens, et il compte autant : une échéance saisie 2036 par erreur,
    // corrigée en 2024, doit faire ressortir le retard. Une correction qui ne
    // corrige que dans un sens n'est pas une correction.
    const plan = reconcilierCalendrier(
      [ligneDeTitre({ datePrevue: new Date("2036-01-10T00:00:00Z"), statut: "planifiee" })],
      [generee("2024-01-10T00:00:00Z")],
      { now: NOW, obligationsEncoreApplicables: new Set(["elec-attestation"]) },
    );

    expect(plan.aMettreAJour[0]?.datePrevue).toEqual(
      new Date("2024-01-10T00:00:00Z"),
    );
    // Le retard se lit sur la date adoptée, plus sur un statut.
    expect(
      estVerificationEnRetard({ ...plan.aMettreAJour[0]!, archiveLe: null }, NOW),
    ).toBe(true);
  });

  it("adopte l'échéance même quand la ligne porte une réalisation", () => {
    // Le cas que la première correction ratait. La branche du fait déclaré
    // était placée APRÈS `ex.dateRealisee !== null` : dès qu'un rapport avait
    // été déposé sur la ligne, la date recalculée depuis `dateRealisee +
    // périodicité` écrasait celle que l'employeur venait de déclarer. Le
    // renouvellement était donc perdu sur un chemin sur deux — et le
    // calendrier affichait une échéance que personne n'avait saisie.
    const plan = reconcilierCalendrier(
      [
        ligneDeTitre({
          statut: "realisee_conforme",
        }),
      ],
      [generee("2031-06-01T00:00:00Z")],
      { now: NOW, obligationsEncoreApplicables: new Set(["elec-attestation"]) },
    );

    expect(plan.aMettreAJour[0]?.datePrevue).toEqual(
      new Date("2031-06-01T00:00:00Z"),
    );
    // INVERSÉ SUR LE STATUT (ADR-036 § 5) — la date reste, le titre prime.
    // ~~« Et le statut réalisé ne bouge pas. »~~ Il conservait un statut
    // réalisé hérité d'avant l'ADR-034 sur un rythme CYCLIQUE ; la règle 1
    // rend « planifiée », ce que les lecteurs affichaient déjà (`statutLu`).
    expect(plan.aMettreAJour[0]?.statut).toBe("planifiee");
  });

  it("ne bouge pas l'échéance d'un équipement sans source : son retard court depuis l'origine (S1)", () => {
    // La garantie inverse : déclarer un extincteur de plus ne doit toujours pas
    // effacer un retard accumulé. Ce test la tenait par un drapeau — « la date
    // en base fait foi » ; il la tient désormais par un FAIT, l'origine du
    // suivi, le 10 janvier. Sa variante où le générateur apportait une date
    // « planifiée » était le test inversé plus haut (placeholder).
    const origine = depuisCleJourCivil("2026-01-10");
    const plan = reconcilierCalendrier(
      [ligneExistante({ id: "v-eq", obligationId: "elec", equipementId: "eq-1", datePrevue: origine, suiviDepuis: origine, statut: "a_planifier" })],
      [{ ...generee(null), cleUnique: "elec::eq-1", obligationId: "elec", equipementId: "eq-1", salarieId: null, libelleObligation: "Obligation elec", periodicite: "annuelle", realisateurRequis: ["personne_qualifiee"] }],
      { now: NOW, obligationsEncoreApplicables: new Set(["elec"]) },
    );

    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.inchangees).toBe(1);
    expect(
      estVerificationEnRetard(
        { statut: "a_planifier", datePrevue: origine, periodicite: "annuelle", archiveLe: null, libelleObligation: "x" },
        NOW,
      ),
    ).toBe(true);
  });
});

describe("générateur — le plafond du premier cycle (`premierDelai`)", () => {
  // Le champ existe parce que `esp-inspection-periodique` portait le plafond du
  // PREMIER cycle (trois ans, arrêté du 20 novembre 2017 art. 15) en guise de
  // rythme. Le corriger en quatre ans a rendu la récurrence juste ET repoussé
  // la première inspection d'un an — une sous-application que personne ne peut
  // voir, sur une ligne de criticité 5. Ces trois cas tiennent la portée.
  const NOW_PD = new Date("2026-01-15T00:00:00Z");
  const avecDelai = () =>
    fakeObligation({
      id: "o-premier-delai",
      periodicite: "quadriennale",
      premierDelai: "triennale",
    });

  it("sans historique, la première échéance suit `premierDelai`, pas le rythme", () => {
    const res = genererProchainesVerifications(
      [applique(avecDelai(), [fakeEquipement()])],
      { misesEnService: new Map([["eq-1", new Date("2025-12-01T00:00:00Z")]]) },
    );
    expect(res[0].sources.premierPas).toBe("triennale");
    // L'année suffit et c'est délibéré : elle distingue 2028 (premier délai)
    // de 2029 (rythme), ce que le test doit prouver.
    expect(creees(res, NOW_PD)[0].datePrevue.getUTCFullYear()).toBe(2028);
  });

  it("une vérification connue fait repartir le RYTHME, jamais le premier délai", () => {
    // La portée à ne pas élargir : sans cette garde, le premier cycle se
    // rejouerait après chaque rapport déposé. Exprimée par un FAIT : la ligne
    // porte un rapport du 2025-12-01.
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o-premier-delai",
          equipementId: "eq-1",
          periodicite: "quadriennale",
          suiviDepuis: new Date("2025-11-01T00:00:00Z"),
          derniereRealisation: new Date("2025-12-01T00:00:00Z"),
          dernierResultat: "conforme",
          porteUnePreuve: true,
        }),
      ],
      genererProchainesVerifications([applique(avecDelai(), [fakeEquipement()])]),
      { now: NOW_PD },
    );
    expect(plan.aMettreAJour[0].datePrevue.getUTCFullYear()).toBe(2029);
  });

  it("sans `premierDelai`, le rythme s'applique dès le premier cycle", () => {
    const res = genererProchainesVerifications(
      [
        applique(
          fakeObligation({ id: "o-sans-delai", periodicite: "quadriennale" }),
          [fakeEquipement()],
        ),
      ],
      { misesEnService: new Map([["eq-1", new Date("2025-12-01T00:00:00Z")]]) },
    );
    expect(creees(res, NOW_PD)[0].datePrevue.getUTCFullYear()).toBe(2029);
  });
});

// ---------------------------------------------------------------------------
// La continuité quand un identifiant change (lot 2 du § 11)
// ---------------------------------------------------------------------------
// `OBLIGATIONS_RETIREES.absorbePar` portait la donnée depuis le 2026-08-27 et
// AUCUN CODE NE LA LISAIT — l'ADR-022 le disait de lui-même, « un manque, pas
// une décision ». Sans elle, un identifiant qui change produit : ligne barrée
// « Ne s'applique plus », plus ligne neuve « à planifier » urgente, pour un
// acte que le dirigeant vient de faire faire.

describe("réconciliation — report d'historique vers l'obligation absorbante", () => {
  const SUCCESSIONS = new Map([
    ["frag-vmc", "tout"],
    ["frag-cta", "tout"],
  ]);

  /** Ce que le référentiel produit pour l'obligation absorbante. */
  function aGenererPourLeTout() {
    return genererProchainesVerifications(
      [
        {
          obligation: fakeObligationEtablissement({
            id: "tout",
            periodicite: "annuelle",
          }) as Obligation,
          equipementsConcernes: [],
          porteur: "etablissement" as const,
          raisons: ["test"],
        },
      ],
      { now: NOW },
    );
  }

  /** Un fragment absorbé, réalisé à la date donnée. */
  function fragmentRealise(id: string, obligationId: string, quand: string) {
    return ligneExistante({
      id,
      obligationId,
      equipementId: `eq-${id}`,
      derniereRealisation: new Date(quand),
      statut: "realisee_conforme",
      porteUnePreuve: true,
    });
  }

  it("la ligne absorbante naît datée de l'héritage, pas « à planifier »", () => {
    // Le fragment a été réalisé le 2025-06-01. L'absorbante est annuelle : sa
    // prochaine échéance tombe le 2026-06-01, donc DÉPASSÉE au 2026-08-11 —
    // et non « à planifier » comme si rien n'avait eu lieu.
    const plan = reconcilierCalendrier(
      [fragmentRealise("v-frag", "frag-vmc", "2025-06-01T00:00:00Z")],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );

    expect(plan.aCreer).toHaveLength(1);
    expect(plan.aCreer[0].datePrevue).toEqual(new Date("2026-06-01T00:00:00Z"));
    // Datée d'un contrôle réel : arrêtée, et en retard par sa date.
    expect(plan.aCreer[0].statut).toBe("planifiee");
    expect(estVerificationEnRetard({ ...plan.aCreer[0], archiveLe: null }, NOW)).toBe(true);

    // Le fragment, lui, est archivé avec sa preuve — jamais supprimé.
    expect(plan.aArchiver).toHaveLength(1);
    expect(plan.aArchiver[0].id).toBe("v-frag");
    expect(plan.aSupprimer).toEqual([]);
  });

  it("de N fragments, la ligne unique reprend la réalisation LA PLUS ANCIENNE", () => {
    // LA RÈGLE DE FUSION. Deux fragments, l'un contrôlé en juin 2025, l'autre
    // en mars 2026 : c'est juin 2025 qui commande, parce que l'absorbante
    // porte sur l'ENSEMBLE et qu'un élément vieux de plus d'un an la rend non
    // satisfaite, quoi qu'ait dit l'autre.
    const plan = reconcilierCalendrier(
      [
        fragmentRealise("v-recent", "frag-cta", "2026-03-01T00:00:00Z"),
        fragmentRealise("v-ancien", "frag-vmc", "2025-06-01T00:00:00Z"),
      ],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );

    // 2025-06-01 + un an, et non 2026-03-01 + un an, qui serait à venir.
    expect(plan.aCreer[0].datePrevue).toEqual(new Date("2026-06-01T00:00:00Z"));
    // Datée d'un contrôle réel : arrêtée, et en retard par sa date.
    expect(plan.aCreer[0].statut).toBe("planifiee");
    expect(estVerificationEnRetard({ ...plan.aCreer[0], archiveLe: null }, NOW)).toBe(true);
  });

  it("un fragment sans réalisation ne lègue rien et ne bloque rien", () => {
    // Il n'atteste d'aucun contrôle, seulement d'une absence d'enregistrement.
    // Le faire primer rendrait la ligne absorbante vierge — le symptôme même
    // qu'on répare.
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-jamais",
          obligationId: "frag-cta",
          equipementId: "eq-2",
        }),
        fragmentRealise("v-fait", "frag-vmc", "2025-06-01T00:00:00Z"),
      ],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );

    expect(plan.aCreer[0].datePrevue).toEqual(new Date("2026-06-01T00:00:00Z"));
  });

  it("une réalisation faite SOUS LE NOUVEL IDENTIFIANT prime sur l'héritage", () => {
    // L'exploitant a fait son contrôle après le changement de référentiel : sa
    // ligne porte déjà une réalisation, plus récente que tout héritage. La
    // reprise ne doit pas la faire reculer.
    const plan = reconcilierCalendrier(
      [
        fragmentRealise("v-frag", "frag-vmc", "2025-06-01T00:00:00Z"),
        ligneExistante({
          id: "v-tout",
          obligationId: "tout",
          equipementId: null,
          // Ligne ROULÉE par son dépôt (ADR-034) : le fait sur le rapport,
          // l'échéance suivante sur la ligne.
          derniereRealisation: new Date("2026-07-01T00:00:00Z"),
          datePrevue: new Date("2027-07-01T00:00:00Z"),
          statut: "planifiee",
          porteUnePreuve: true,
        }),
      ],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );

    expect(plan.aCreer).toEqual([]);
    // Déjà au modèle, la ligne est INCHANGÉE : son échéance reste 2027-07-01,
    // son cycle propre, pas l'héritage de 2025. Un héritage rejoué la ferait
    // reculer — elle apparaîtrait dans `aMettreAJour` avec une date de 2026.
    expect(plan.aMettreAJour.find((m) => m.id === "v-tout")).toBeUndefined();
    expect(plan.inchangees).toBe(1);
  });

  it("un absorbant porté par un ÉQUIPEMENT n'hérite que sur le bon appareil", () => {
    // LE DÉFAUT QUE CE TEST GARDE. La première rédaction indexait l'héritage
    // sur le seul identifiant d'obligation. Le jour où un absorbant serait
    // porté par un équipement, l'unique réalisation connue daterait TOUTES ses
    // lignes : un contrôle fait sur l'appareil 1 ferait naître la ligne de
    // l'appareil 2 — jamais contrôlé — « planifiée », donc « rien à faire ».
    // C'est le sens d'erreur que la règle de fusion dit refuser.
    //
    // Aucune succession déclarée ne vise aujourd'hui un absorbant d'équipement.
    // Le test existe pour que la première qui le fera ne trouve pas le défaut
    // en production.
    const absorbant = fakeObligation({
      id: "tout-equip",
      periodicite: "annuelle",
    });
    const aGenerer = genererProchainesVerifications(
      [applique(absorbant, [fakeEquipement("eq-1"), fakeEquipement("eq-2")])],
      { now: NOW },
    );

    const plan = reconcilierCalendrier(
      // Le fragment n'a été réalisé que sur l'appareil 1.
      [fragmentRealise("v-frag-1", "frag-vmc", "2025-06-01T00:00:00Z")],
      aGenerer,
      {
        now: NOW,
        successions: new Map([["frag-vmc", "tout-equip"]]),
      },
    );

    const parEquipement = new Map(
      plan.aCreer.map((v) => [v.equipementId, v.datePrevue]),
    );
    // `fragmentRealise` pose la ligne sur `eq-v-frag-1` : aucun des deux
    // appareils générés ne partage son porteur, donc aucun n'hérite.
    expect(parEquipement.get("eq-1")).not.toEqual(
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(parEquipement.get("eq-2")).not.toEqual(
      new Date("2026-06-01T00:00:00Z"),
    );
  });

  it("même porteur des deux côtés : la ligne est ADOPTÉE, pas recréée", () => {
    // Le pendant du test précédent, et il a changé de réponse en cours de
    // route — pour mieux. Même appareil des deux côtés, donc ce n'est pas un
    // héritage d'échéance mais une ADOPTION : la rangée continue, avec son
    // identifiant, ses rapports et ses actions, et seul son identifiant
    // d'obligation est réécrit. C'est le cas du simple changement de nom.
    //
    // La première rédaction attendait une ligne CRÉÉE portant l'échéance
    // héritée. Ça marchait, mais laissait la preuve sur une ligne barrée
    // pendant que la ligne vivante affichait une date qu'elle ne pouvait pas
    // justifier.
    const absorbant = fakeObligation({
      id: "tout-equip",
      periodicite: "annuelle",
    });
    const aGenerer = genererProchainesVerifications(
      [applique(absorbant, [fakeEquipement("eq-1"), fakeEquipement("eq-2")])],
      { now: NOW },
    );

    // Réalisation du 2026-06-01 : à un an, la suivante tombe en 2027. La
    // réalisation vit sur les rapports (ADR-034), qui restent attachés à la
    // rangée tant que son IDENTIFIANT est conservé : c'est l'identifiant que
    // l'adoption doit garder, et c'est lui qu'on vérifie.
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-frag-1",
          obligationId: "frag-vmc",
          equipementId: "eq-1",
          derniereRealisation: new Date("2026-06-01T00:00:00Z"),
          datePrevue: new Date("2027-06-01T00:00:00Z"),
          statut: "planifiee",
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW, successions: new Map([["frag-vmc", "tout-equip"]]) },
    );

    // eq-1 : la ligne d'origine, reprise en place.
    expect(plan.aMettreAJour).toHaveLength(1);
    const adoptee = plan.aMettreAJour[0];
    expect(
      adoptee.id,
      "la rangée a changé : ce n'est plus une adoption mais une recréation",
    ).toBe("v-frag-1");
    expect(adoptee.obligationId).toBe("tout-equip");
    expect(
      adoptee.datePrevue,
      "la réalisation a été perdue : l'échéance ne part plus du contrôle que la ligne prouvait",
    ).toEqual(new Date("2027-06-01T00:00:00Z"));

    // Rien n'est barré, et seul eq-2 — qui n'avait pas de ligne — est créé.
    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aCreer).toHaveLength(1);
    expect(plan.aCreer[0].equipementId).toBe("eq-2");
  });

  it("ne rejoue JAMAIS l'héritage sur une ligne qui porte déjà sa preuve", () => {
    // LE DÉFAUT LE PLUS GRAVE DE CE LOT, trouvé en relecture et reproduit avant
    // d'être corrigé. Il faisait RECULER une ligne de plusieurs années, à
    // chaque passe suivant un roulement de cycle.
    //
    // Le chemin, en trois temps : (1) le fragment absorbé est archivé AVEC sa
    // preuve, donc conservé pour toujours (ADR-012) en gardant sa réalisation
    // de 2021 ; (2) l'absorbante est contrôlée, son cycle expire, et la branche
    // « période écoulée » remet `dateRealisee` à `null` ; (3) la passe suivante
    // retombait dans l'héritage — seul `dateRealisee === null` le gardait — et
    // réécrivait la date depuis 2021.
    //
    // Mesuré : une ligne au 2029-02-01 repartait au 2024-01-10. Le dossier
    // annonçait cinq ans de retard sur un contrôle fait trois ans plus tôt.
    const plan = reconcilierCalendrier(
      [
        // Le fragment archivé garde pour toujours sa réalisation de 2021.
        ligneExistante({
          id: "v-frag",
          obligationId: "frag-vmc",
          equipementId: "eq-1",
          libelleObligation: "Fragment",
          archiveLe: new Date("2021-02-01T00:00:00Z"),
          derniereRealisation: new Date("2021-01-10T00:00:00Z"),
          dernierResultat: "conforme",
          statut: "realisee_conforme",
          porteUnePreuve: true,
        }),
        // L'absorbante a sa PROPRE histoire, lue sur SON rapport : contrôlée
        // le 2026-02-01, échéance 2027-02-01. ~~La ligne ne portait que
        // `porteUnePreuve`~~, et la garde `!porteUnePreuve` tenait le test ;
        // depuis la bascule c'est l'ordre des règles — propre, sinon héritée
        // — qui le tient, sur le fait que la ligne prouve.
        ligneExistante({
          id: "v-tout",
          obligationId: "tout",
          equipementId: null,
          datePrevue: new Date("2027-02-01T00:00:00Z"),
          derniereRealisation: new Date("2026-02-01T00:00:00Z"),
          dernierResultat: "conforme",
          statut: "planifiee",
          porteUnePreuve: true,
        }),
      ],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );

    const maj = plan.aMettreAJour.find((m) => m.id === "v-tout");
    expect(
      maj?.datePrevue ?? new Date("2027-02-01T00:00:00Z"),
      "l'héritage s'est rejoué sur une ligne qui avait déjà sa propre histoire",
    ).toEqual(new Date("2027-02-01T00:00:00Z"));
  });

  it("mais l'applique bien à une ligne absorbante encore vierge", () => {
    // Le témoin : même montage, l'absorbante SANS preuve. Sans lui, la garde
    // ci-dessus pourrait éteindre la fonction entière sans qu'un test bouge.
    const plan = reconcilierCalendrier(
      [
        fragmentRealise("v-frag", "frag-vmc", "2025-06-01T00:00:00Z"),
        ligneExistante({
          id: "v-tout",
          obligationId: "tout",
          equipementId: null,
          datePrevue: new Date("2030-01-01T00:00:00Z"),
          statut: "a_planifier",
          porteUnePreuve: false,
        }),
      ],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );

    const maj = plan.aMettreAJour.find((m) => m.id === "v-tout");
    expect(maj?.datePrevue).toEqual(new Date("2026-06-01T00:00:00Z"));
    expect(maj?.statut).toBe("planifiee");
    expect(estVerificationEnRetard({ ...maj!, archiveLe: null }, NOW)).toBe(true);
  });

  it("une absorbante déjà en base, datée par l'héritage À VENIR, passe « planifiée »", () => {
    // Revue du 2026-09-14. La branche lisait `ex.statut` : une absorbante
    // existante « à planifier » recevait sa date héritée et GARDAIT « à
    // planifier, aucune date convenue » — quand la même ligne, créée depuis
    // le même héritage dans la même passe, naît « planifiée ». Fragment
    // contrôlé le 2026-03-01, annuel : échéance 2027-03-01, à venir.
    const plan = reconcilierCalendrier(
      [
        fragmentRealise("v-frag", "frag-vmc", "2026-03-01T00:00:00Z"),
        ligneExistante({
          id: "v-tout",
          obligationId: "tout",
          equipementId: null,
          datePrevue: new Date("2030-01-01T00:00:00Z"),
          statut: "a_planifier",
          porteUnePreuve: false,
        }),
      ],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );

    const maj = plan.aMettreAJour.find((m) => m.id === "v-tout");
    expect(maj?.datePrevue).toEqual(new Date("2027-03-01T00:00:00Z"));
    expect(maj?.statut).toBe("planifiee");

    // Et c'est stable : la passe suivante, sur la ligne réalignée, ne
    // réécrit rien.
    const suivante = reconcilierCalendrier(
      [
        fragmentRealise("v-frag", "frag-vmc", "2026-03-01T00:00:00Z"),
        ligneExistante({
          id: "v-tout",
          obligationId: "tout",
          equipementId: null,
          datePrevue: new Date("2027-03-01T00:00:00Z"),
          statut: "planifiee",
          porteUnePreuve: false,
        }),
      ],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );
    expect(suivante.aMettreAJour.find((m) => m.id === "v-tout")).toBeUndefined();
  });

  it("sans table de successions, rien n'est repris — le comportement d'avant", () => {
    const plan = reconcilierCalendrier(
      [fragmentRealise("v-frag", "frag-vmc", "2025-06-01T00:00:00Z")],
      aGenererPourLeTout(),
      { now: NOW },
    );

    // Ligne neuve à planifier, et le fragment barré : c'est le défaut que le
    // lot 2 corrige, gardé ici comme témoin de ce que la table change.
    expect(plan.aCreer).toHaveLength(1);
    expect(plan.aCreer[0].datePrevue).not.toEqual(
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(plan.aArchiver).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Un test de câblage par source (ADR-036, lot 4)
// ---------------------------------------------------------------------------
// La table de vérité de `echeance-de-ligne.test.ts` tient les règles. Ici, une
// rangée par SOURCE de la fonction : le fait entre par le chemin de production
// — le générateur pour la mise en service et le titre, la ligne en base pour
// le rapport et l'origine, la table des successions pour l'héritage — et le
// réconciliateur rend la source attendue. Un fait débranché en route fait
// tomber sa rangée sur une autre source.

describe("câblage — chaque source de `echeanceDeLigne` traverse le réconciliateur", () => {
  const annuelle = fakeObligation({ id: "o-cable", periodicite: "annuelle" });
  const ponctuelle = fakeObligation({ id: "o-cable", periodicite: "mise_en_service_uniquement" });
  const eq = fakeEquipement("eq-1");
  const origine = depuisCleJourCivil("2026-03-01");
  const ligneEnBase = (over: Partial<OccurrenceExistante> = {}) =>
    ligneExistante({
      id: "v-cable",
      obligationId: "o-cable",
      equipementId: "eq-1",
      suiviDepuis: origine,
      datePrevue: new Date("2000-01-01T00:00:00Z"),
      ...over,
    });
  const decider = (
    o: ObligationEq,
    ex: OccurrenceExistante,
    miseEnService: Date | null = null,
  ) =>
    reconcilierCalendrier(
      [ex],
      genererProchainesVerifications([applique(o, [eq])], {
        misesEnService: miseEnService === null ? new Map() : new Map([["eq-1", miseEnService]]),
      }),
      { now: NOW },
    ).aMettreAJour[0]?.source;

  it.each([
    {
      source: "origine",
      obtenir: () => decider(annuelle, ligneEnBase()),
    },
    {
      source: "mise_en_service",
      obtenir: () => decider(annuelle, ligneEnBase(), depuisCleJourCivil("2026-06-01")),
    },
    {
      source: "rapport",
      obtenir: () =>
        decider(
          annuelle,
          ligneEnBase({
            derniereRealisation: depuisCleJourCivil("2026-04-01"),
            dernierResultat: "conforme",
            porteUnePreuve: true,
          }),
          depuisCleJourCivil("2026-06-01"),
        ),
    },
    {
      source: "ponctuel_ouvert",
      obtenir: () =>
        decider(
          ponctuelle,
          ligneEnBase({ periodicite: "mise_en_service_uniquement" }),
          depuisCleJourCivil("2026-06-01"),
        ),
    },
    {
      source: "ponctuel_solde",
      obtenir: () =>
        decider(
          ponctuelle,
          ligneEnBase({
            periodicite: "mise_en_service_uniquement",
            derniereRealisation: depuisCleJourCivil("2026-06-02"),
            dernierResultat: "ecart_majeur",
            porteUnePreuve: true,
          }),
        ),
    },
    {
      source: "heritage",
      obtenir: () =>
        reconcilierCalendrier(
          [
            ligneExistante({
              id: "v-frag",
              obligationId: "frag",
              equipementId: "eq-9",
              derniereRealisation: depuisCleJourCivil("2026-01-10"),
              dernierResultat: "conforme",
              porteUnePreuve: true,
            }),
            ligneExistante({
              id: "v-tout",
              obligationId: "tout",
              equipementId: null,
              suiviDepuis: origine,
            }),
          ],
          genererProchainesVerifications([
            {
              obligation: fakeObligationEtablissement({ id: "tout", periodicite: "annuelle" }),
              equipementsConcernes: [],
              porteur: "etablissement",
              raisons: ["test"],
            },
          ]),
          { now: NOW, successions: new Map([["frag", "tout"]]) },
        ).aMettreAJour.find((m) => m.id === "v-tout")?.source,
    },
    {
      source: "titre",
      obtenir: () =>
        reconcilierCalendrier(
          [
            ligneExistante({
              id: "v-titre",
              obligationId: "attestation",
              equipementId: null,
              salarieId: "sal-1",
              periodicite: "quinquennale",
              suiviDepuis: origine,
            }),
          ],
          genererVerificationsDepuisTitres(
            new Map([
              [
                "attestation",
                [
                  {
                    salarieId: "sal-1",
                    libelle: "Jean Martin",
                    delivreLe: depuisCleJourCivil("2026-01-15"),
                    echeanceLe: depuisCleJourCivil("2031-01-15"),
                  },
                ],
              ],
            ]),
            (id) =>
              id === "attestation"
                ? (fakeObligationSalarie({ id, periodicite: "quinquennale" }) as Obligation)
                : undefined,
          ),
          { now: NOW },
        ).aMettreAJour[0]?.source,
    },
  ])("la source « $source » arrive jusqu'à la fonction", ({ source, obtenir }) => {
    expect(obtenir()).toBe(source);
  });
});
