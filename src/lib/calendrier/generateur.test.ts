import { describe, expect, it } from "vitest";
import { cleJourCivil } from "@/lib/dates";
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
  comparerParUrgence,
  estMarqueeNonApplicable,
  genererProchainesVerifications,
  genererVerificationsDepuisTitres,
  libelleSansMarqueur,
  MARQUEUR_NON_APPLICABLE,
  reconcilierCalendrier,
  type OccurrenceExistante,
  type VerificationGenere,
  type TitreDeclare,
  type VerificationsPrecedentes,
} from "./generateur";

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
// ============================================================================

describe("générateur calendrier — aucune vérif précédente", () => {
  it("crée une occurrence 'a_planifier' urgente pour chaque couple", () => {
    const o = fakeObligation({ id: "o-annuelle", periodicite: "annuelle" });
    const eq = fakeEquipement();
    const now = new Date("2026-01-15T00:00:00Z");

    const res = genererProchainesVerifications([applique(o, [eq])], new Map(), {
      now,
    });

    expect(res).toHaveLength(1);
    expect(res[0].statut).toBe("a_planifier");
    expect(res[0].estUrgent).toBe(true);
    expect(res[0].datePrevue).toEqual(now);
    expect(res[0].cleUnique).toBe("o-annuelle::eq-1");
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
});

describe("générateur calendrier — mise en service comme point de départ", () => {
  const o = () => fakeObligation({ id: "o-annuelle", periodicite: "annuelle" });
  const NOW = new Date("2026-01-15T00:00:00Z");

  it("date le premier cycle d'un équipement neuf, sans le dire urgent", () => {
    // Un extincteur posé le 1er décembre se vérifie le 1er décembre suivant :
    // l'outil sait le déduire, il n'a pas à réclamer la date.
    const res = genererProchainesVerifications(
      [applique(o(), [fakeEquipement()])],
      new Map(),
      {
        now: NOW,
        misesEnService: new Map([["eq-1", new Date("2025-12-01T00:00:00Z")]]),
      },
    );

    expect(res[0].statut).toBe("planifiee");
    expect(res[0].estUrgent).toBe(false);
    expect(res[0].datePrevue).toEqual(new Date("2026-12-01T00:00:00Z"));
  });

  it("ne conclut rien quand le premier cycle est déjà écoulé", () => {
    // Mise en service en 2018 et aucune vérification connue : l'équipement a
    // vécu sans que le dossier le sache. Afficher « en retard depuis 2019 »
    // serait inventer un passé — on dit « à planifier ».
    const res = genererProchainesVerifications(
      [applique(o(), [fakeEquipement()])],
      new Map(),
      {
        now: NOW,
        misesEnService: new Map([["eq-1", new Date("2018-03-01T00:00:00Z")]]),
      },
    );

    expect(res[0].statut).toBe("a_planifier");
    expect(res[0].estUrgent).toBe(true);
    expect(res[0].datePrevue).toEqual(NOW);
  });

  it("laisse la vérification connue primer sur la mise en service", () => {
    const res = genererProchainesVerifications(
      [applique(o(), [fakeEquipement()])],
      new Map([["o-annuelle::eq-1", new Date("2025-06-10T00:00:00Z")]]),
      {
        now: NOW,
        misesEnService: new Map([["eq-1", new Date("2025-12-01T00:00:00Z")]]),
      },
    );

    // 2025-06-10 + 1 an, et non 2025-12-01 + 1 an : un contrôle réalisé est
    // une preuve, une mise en service n'est qu'un point de départ par défaut.
    expect(res[0].datePrevue).toEqual(new Date("2026-06-10T00:00:00Z"));
  });

  it("retombe sur « à planifier » sans mise en service connue", () => {
    const res = genererProchainesVerifications(
      [applique(o(), [fakeEquipement()])],
      new Map(),
      { now: NOW, misesEnService: new Map() },
    );

    expect(res[0].statut).toBe("a_planifier");
  });
});

describe("générateur calendrier — dernière vérif connue", () => {
  it("calcul datePrevue = derniereDate + 365j pour annuelle", () => {
    const o = fakeObligation({ id: "annuelle", periodicite: "annuelle" });
    const eq = fakeEquipement();
    const now = new Date("2026-03-01T00:00:00Z");
    const prec: VerificationsPrecedentes = new Map([
      [`annuelle::eq-1`, new Date("2026-01-10T00:00:00Z")],
    ]);

    const res = genererProchainesVerifications([applique(o, [eq])], prec, {
      now,
    });

    expect(res).toHaveLength(1);
    const dp = res[0].datePrevue;
    const attendu = new Date("2026-01-10T00:00:00Z");
    attendu.setDate(attendu.getDate() + 365);
    expect(dp.getTime()).toBe(attendu.getTime());
    expect(res[0].statut).toBe("planifiee");
    expect(res[0].estUrgent).toBe(false);
  });

  it("dernière vérif ancienne → statut 'depassee' et urgent=true", () => {
    const o = fakeObligation({ id: "annuelle", periodicite: "annuelle" });
    const eq = fakeEquipement();
    const now = new Date("2026-03-01T00:00:00Z");
    const prec: VerificationsPrecedentes = new Map([
      [`annuelle::eq-1`, new Date("2024-01-01T00:00:00Z")],
    ]);

    const res = genererProchainesVerifications([applique(o, [eq])], prec, {
      now,
    });

    expect(res[0].statut).toBe("depassee");
    expect(res[0].estUrgent).toBe(true);
  });

  it("périodicité quinquennale → prochaine date le même jour, cinq ans plus tard", () => {
    const o = fakeObligation({ id: "quinq", periodicite: "quinquennale" });
    const eq = fakeEquipement();
    const derniere = new Date("2024-06-01T00:00:00Z");
    const prec: VerificationsPrecedentes = new Map([[`quinq::eq-1`, derniere]]);
    const now = new Date("2026-01-01T00:00:00Z"); // avant la prochaine

    const res = genererProchainesVerifications([applique(o, [eq])], prec, {
      now,
    });
    expect(res[0].statut).toBe("planifiee");
    // Ce test figeait « + 1825 jours », c'est-à-dire le 31 mai 2029 : il
    // asserterait la dérive qu'il faut corriger. Cinq ans après le 1er juin,
    // c'est le 1er juin — 2028 est bissextile, et le texte compte en années.
    expect(cleJourCivil(res[0].datePrevue)).toBe("2029-06-01");
  });
});

describe("générateur calendrier — mise en service uniquement", () => {
  it("aucune vérif ni mise en service connue → à planifier, jamais urgente", () => {
    const o = fakeObligation({
      id: "mes",
      periodicite: "mise_en_service_uniquement",
    });
    const res = genererProchainesVerifications([
      applique(o, [fakeEquipement()]),
    ]);
    expect(res).toHaveLength(1);
    expect(res[0].statut).toBe("a_planifier");
    // Il n'y a pas d'échéance à dépasser : l'événement a eu lieu ou non. Ce
    // qui manque est une pièce au dossier, pas un rendez-vous.
    expect(res[0].estUrgent).toBe(false);
  });

  it("mise en service passée → l'occurrence est datée de l'événement, pas d'aujourd'hui", () => {
    // Le défaut corrigé : datée de `now`, l'occurrence se redatait à chaque
    // régénération. Une chambre froide de 2015 était réputée due aujourd'hui,
    // dix ans plus tard, et le resterait indéfiniment.
    const o = fakeObligation({
      id: "mes",
      periodicite: "mise_en_service_uniquement",
    });
    const miseEnService = new Date("2015-03-01T00:00:00Z");
    const res = genererProchainesVerifications(
      [applique(o, [fakeEquipement()])],
      new Map(),
      { now: NOW, misesEnService: new Map([["eq-1", miseEnService]]) },
    );
    expect(res).toHaveLength(1);
    expect(res[0].datePrevue.getTime()).toBe(miseEnService.getTime());
    expect(res[0].statut).toBe("a_planifier");
    expect(res[0].estUrgent).toBe(false);
  });

  it("mise en service à venir → planifiée à cette date", () => {
    const o = fakeObligation({
      id: "mes",
      periodicite: "mise_en_service_uniquement",
    });
    const miseEnService = new Date(NOW.getTime() + 30 * 86_400_000);
    const res = genererProchainesVerifications(
      [applique(o, [fakeEquipement()])],
      new Map(),
      { now: NOW, misesEnService: new Map([["eq-1", miseEnService]]) },
    );
    expect(res[0].statut).toBe("planifiee");
    expect(res[0].datePrevue.getTime()).toBe(miseEnService.getTime());
    expect(res[0].estUrgent).toBe(false);
  });

  it("vérif précédente connue → plus d'occurrence (one-shot consommé)", () => {
    const o = fakeObligation({
      id: "mes",
      periodicite: "mise_en_service_uniquement",
    });
    const prec: VerificationsPrecedentes = new Map([
      [`mes::eq-1`, new Date("2025-05-01T00:00:00Z")],
    ]);
    const res = genererProchainesVerifications(
      [applique(o, [fakeEquipement()])],
      prec,
    );
    expect(res).toHaveLength(0);
  });
});

describe("générateur calendrier — tri par urgence", () => {
  it("urgents d'abord, puis date croissante, puis criticité décroissante", () => {
    const o1 = fakeObligation({ id: "o1", periodicite: "annuelle", criticite: 5 });
    const o2 = fakeObligation({ id: "o2", periodicite: "annuelle", criticite: 3 });
    const e1 = fakeEquipement("e1");
    const e2 = fakeEquipement("e2");

    const now = new Date("2026-03-01T00:00:00Z");
    const prec: VerificationsPrecedentes = new Map([
      // o1/e1 : dépassée
      ["o1::e1", new Date("2024-01-01T00:00:00Z")],
      // o2/e2 : planifiée dans 6 mois
      ["o2::e2", new Date("2025-09-01T00:00:00Z")],
    ]);

    const res = genererProchainesVerifications(
      [applique(o1, [e1]), applique(o2, [e2])],
      prec,
      { now },
    );
    res.sort(comparerParUrgence);
    expect(res[0].cleUnique).toBe("o1::e1"); // dépassée en premier
    expect(res[1].cleUnique).toBe("o2::e2");
  });

  it("entre deux dépassées, date plus ancienne d'abord", () => {
    const o1 = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const o2 = fakeObligation({ id: "o2", periodicite: "annuelle" });
    const e = fakeEquipement();
    const now = new Date("2026-03-01T00:00:00Z");
    const prec: VerificationsPrecedentes = new Map([
      ["o1::eq-1", new Date("2023-01-01T00:00:00Z")],
      ["o2::eq-1", new Date("2024-01-01T00:00:00Z")],
    ]);
    // Note : les deux obligations partagent le même équipement "eq-1" ;
    // les clés distinctes viennent de l'obligationId.
    const res = genererProchainesVerifications(
      [applique(o1, [e]), applique(o2, [e])],
      prec,
      { now },
    );
    res.sort(comparerParUrgence);
    expect(res[0].cleUnique).toBe("o1::eq-1"); // plus anciennement dépassée
  });

  it("à date égale, criticité 5 passe avant criticité 3", () => {
    const o1 = fakeObligation({ id: "o1", periodicite: "annuelle", criticite: 3 });
    const o2 = fakeObligation({ id: "o2", periodicite: "annuelle", criticite: 5 });
    const e = fakeEquipement();
    const now = new Date("2026-03-01T00:00:00Z");
    const derniere = new Date("2025-03-01T00:00:00Z");
    const prec: VerificationsPrecedentes = new Map([
      ["o1::eq-1", derniere],
      ["o2::eq-1", derniere],
    ]);
    const res = genererProchainesVerifications(
      [applique(o1, [e]), applique(o2, [e])],
      prec,
      { now },
    );
    res.sort(comparerParUrgence);
    expect(res[0].cleUnique).toBe("o2::eq-1"); // criticité 5 en tête
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
  it("deux appels identiques donnent le même résultat", () => {
    const o = fakeObligation({ id: "o", periodicite: "annuelle" });
    const eq = fakeEquipement();
    const now = new Date("2026-01-01T00:00:00Z");
    const a = genererProchainesVerifications([applique(o, [eq])], new Map(), {
      now,
    });
    const b = genererProchainesVerifications([applique(o, [eq])], new Map(), {
      now,
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
    dateRealisee: null,
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
      new Map(),
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
      new Map(),
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
      new Map(),
      { now: NOW },
    );

    const existante = ligneExistante({
      id: "v-pe4",
      obligationId: "pe4",
      equipementId: null,
      libelleObligation: "Obligation pe4",
      periodicite: "triennale",
      datePrevue: aGenerer[0].datePrevue,
      statut: aGenerer[0].statut,
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
      ...genererProchainesVerifications([applicableEtablissement(oEtab)], new Map(), {
        now: NOW,
      }),
      ...genererProchainesVerifications([applique(oEquip, [eq])], new Map(), {
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
    expect(plan.aArchiver).toHaveLength(1);
    expect(estMarqueeNonApplicable(plan.aArchiver[0].libelleObligation)).toBe(
      true,
    );
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
      { now: NOW },
    );

    expect(res).toHaveLength(1);
    expect(res[0].salarieId).toBe("sal-1");
    expect(res[0].equipementId).toBeNull();
    expect(res[0].datePrevue).toEqual(new Date("2031-01-15T00:00:00Z"));
    expect(res[0].statut).toBe("planifiee");
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
      { now: NOW },
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
      { now: NOW },
    );

    expect(res[0].datePrevue).toEqual(new Date("2030-10-01T00:00:00Z"));
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
      { now: NOW },
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
      { now: NOW },
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
      obligationsEncoreApplicables: new Set(["obl-permanente"]),
    });

    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.inchangees).toBe(1);
  });

  it("supprime en revanche la ligne sans preuve : elle n'aurait jamais dû être datée", () => {
    const plan = reconcilierCalendrier([ligne({ porteUnePreuve: false })], [], {
      now: NOW,
      obligationsEncoreApplicables: new Set(["obl-permanente"]),
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

    expect(plan.aArchiver).toHaveLength(1);
    expect(estMarqueeNonApplicable(plan.aArchiver[0].libelleObligation)).toBe(
      true,
    );
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
      new Map(),
      { now: NOW },
    );

    const existante = ligneExistante({
      id: "v-elec",
      obligationId: "elec",
      equipementId: "eq-elec",
      libelleObligation: "Obligation elec",
      datePrevue: new Date("2026-02-01T00:00:00Z"), // passée
      statut: "depassee",
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

  it("ne repousse jamais l'échéance d'un cycle encore ouvert", () => {
    const o = fakeObligation({ id: "elec", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-elec");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      new Map(),
      { now: NOW },
    );
    const datePrevue = new Date("2026-02-01T00:00:00Z");

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-elec",
          obligationId: "elec",
          equipementId: "eq-elec",
          datePrevue,
          statut: "a_planifier", // statut à requalifier : la date est passée
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    expect(plan.aMettreAJour).toHaveLength(1);
    expect(plan.aMettreAJour[0].datePrevue).toEqual(datePrevue);
    expect(plan.aMettreAJour[0].statut).toBe("depassee");
  });
});

describe("réconciliation — idempotence et stabilité des identifiants", () => {
  it("deux régénérations successives produisent le même état", () => {
    const o1 = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const o2 = fakeObligation({ id: "o2", periodicite: "trimestrielle" });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o1, [eq]), applique(o2, [eq])],
      new Map(),
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
      dateRealisee: null,
      statut: v.statut,
      porteUnePreuve: false,
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
      new Map(),
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
  const genere = (over: Partial<VerificationGenere> = {}): VerificationGenere => ({
    cleUnique: "o-1::eq-1",
    obligationId: "o-1",
    salarieId: null,
    libelleObligation: "Obligation o-1",
    equipementId: "eq-1",
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: new Date("2026-12-01T00:00:00Z"),
    statut: "a_planifier",
    estUrgent: true,
    criticiteObligation: 3,
    raisons: ["test"],
    prescriptionId: null,
    ...over,
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
    });
    const plan = reconcilierCalendrier(
      [existante],
      [
        genere({
          statut: "planifiee",
          datePrevue: new Date("2027-03-01T00:00:00Z"),
        }),
      ],
      { now: NOW },
    );

    expect(plan.aMettreAJour[0].datePrevue).toEqual(
      new Date("2027-03-01T00:00:00Z"),
    );
    expect(plan.aMettreAJour[0].statut).toBe("planifiee");
  });

  it("n'efface pas un retard déjà constaté", () => {
    // Une ligne dépassée porte un vrai rendez-vous, manqué. Le générateur ne
    // doit pas pouvoir le repousser — c'est la régression que le
    // delete/create causait autrefois.
    const existante = ligneExistante({
      id: "v-1",
      obligationId: "o-1",
      equipementId: "eq-1",
      statut: "depassee",
      datePrevue: new Date("2026-02-01T00:00:00Z"),
    });
    const plan = reconcilierCalendrier(
      [existante],
      [
        genere({
          statut: "planifiee",
          datePrevue: new Date("2027-03-01T00:00:00Z"),
        }),
      ],
      { now: NOW },
    );

    // Rien à mettre à jour : la ligne garde sa date manquée, et c'est
    // précisément ce qu'on vérifie — la réconciliation n'a pas à y toucher.
    expect(plan.aMettreAJour).toHaveLength(0);
    expect(plan.inchangees).toBe(1);
  });
});

describe("réconciliation — cycles de vérification", () => {
  it("un contrôle encore valide garde son résultat et reçoit sa prochaine échéance", () => {
    const o = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      new Map(),
      { now: NOW },
    );
    const dateRealisee = new Date("2026-03-01T00:00:00Z");

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o1",
          equipementId: "eq-1",
          dateRealisee,
          statut: "realisee_conforme",
          datePrevue: new Date("2026-03-01T00:00:00Z"),
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    expect(plan.aMettreAJour).toHaveLength(1);
    const maj = plan.aMettreAJour[0];
    expect(maj.statut).toBe("realisee_conforme");
    expect(maj.dateRealisee).toEqual(dateRealisee);
    // dateRealisee + 365 j
    expect(maj.datePrevue.getUTCFullYear()).toBe(2027);
  });

  it("un contrôle dont la période est écoulée rouvre un cycle « dépassée »", () => {
    const o = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      new Map(),
      { now: NOW },
    );

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o1",
          equipementId: "eq-1",
          dateRealisee: new Date("2024-01-01T00:00:00Z"),
          statut: "realisee_conforme",
          datePrevue: new Date("2024-01-01T00:00:00Z"),
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    expect(plan.aMettreAJour).toHaveLength(1);
    const maj = plan.aMettreAJour[0];
    // L'outil cesse d'afficher « Conforme » sur un contrôle annuel vieux de
    // deux ans — sans détruire les rapports, qui restent sur la même ligne.
    expect(maj.statut).toBe("depassee");
    expect(maj.dateRealisee).toBeNull();
    expect(maj.id).toBe("v-1");
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
      new Map(),
      { now: NOW },
    );
    const datePrevue = new Date("2025-05-01T00:00:00Z");

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-mes",
          obligationId: "mes",
          equipementId: "eq-1",
          libelleObligation: "Obligation mes",
          periodicite: "mise_en_service_uniquement",
          datePrevue,
          dateRealisee: new Date("2025-05-01T00:00:00Z"),
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
    expect(plan.aArchiver).toEqual([
      {
        id: "v-preuve",
        libelleObligation: `${MARQUEUR_NON_APPLICABLE}Vérification annuelle de l'installation`,
      },
    ]);
  });

  it("une date de réalisation suffit à interdire la suppression", () => {
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-realisee",
          obligationId: "retiree",
          equipementId: "eq-1",
          dateRealisee: new Date("2025-01-01T00:00:00Z"),
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
    const dejaMarquee = ligneExistante({
      id: "v-preuve",
      obligationId: "retiree",
      equipementId: "eq-1",
      libelleObligation: `${MARQUEUR_NON_APPLICABLE}Vérification annuelle`,
      porteUnePreuve: true,
    });

    const plan = reconcilierCalendrier([dejaMarquee], [], { now: NOW });
    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.inchangees).toBe(1);
  });

  it("retire le marqueur si l'obligation redevient applicable", () => {
    const o = fakeObligation({ id: "o1", periodicite: "annuelle" });
    const eq = fakeEquipement("eq-1");
    const aGenerer = genererProchainesVerifications(
      [applique(o, [eq])],
      new Map(),
      { now: NOW },
    );

    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-1",
          obligationId: "o1",
          equipementId: "eq-1",
          libelleObligation: `${MARQUEUR_NON_APPLICABLE}Obligation o1`,
          porteUnePreuve: true,
        }),
      ],
      aGenerer,
      { now: NOW },
    );

    expect(plan.aMettreAJour).toHaveLength(1);
    expect(
      estMarqueeNonApplicable(plan.aMettreAJour[0].libelleObligation),
    ).toBe(false);
  });
});

describe("marqueur de non-applicabilité", () => {
  it("est idempotent et réversible", () => {
    const brut = "Vérification quinquennale";
    const marque = `${MARQUEUR_NON_APPLICABLE}${brut}`;
    expect(estMarqueeNonApplicable(brut)).toBe(false);
    expect(estMarqueeNonApplicable(marque)).toBe(true);
    expect(libelleSansMarqueur(marque)).toBe(brut);
    expect(libelleSansMarqueur(brut)).toBe(brut);
  });
});

describe("réconciliation — la date d'un titre est un fait, pas un calcul", () => {
  // Le défaut que ce test ferme : la ligne d'un titre de salarié était écrite
  // à sa création et JAMAIS réécrite. Le générateur produisait bien la nouvelle
  // date après un renouvellement, la réconciliation la jetait — la seule
  // branche qui adoptait `g.datePrevue` exigeait `ex.statut === "a_planifier"`,
  // or une ligne de titre naît `planifiee` ou `depassee`, jamais `a_planifier`.
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
      statut: "depassee",
      ...over,
    });

  const generee = (echeance: string): VerificationGenere => ({
    cleUnique: "elec-attestation::sal-1",
    obligationId: "elec-attestation",
    libelleObligation: "Attestation médicale",
    equipementId: null,
    salarieId: "sal-1",
    periodicite: "quinquennale",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: new Date(echeance),
    statut: "planifiee",
    estUrgent: false,
    criticiteObligation: 4,
    raisons: ["titre détenu par Jean Dupont"],
    prescriptionId: null,
    datePrevueFaisantFoi: true,
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
      [{ ...generee("2024-01-10T00:00:00Z"), statut: "depassee" }],
      { now: NOW, obligationsEncoreApplicables: new Set(["elec-attestation"]) },
    );

    expect(plan.aMettreAJour[0]?.datePrevue).toEqual(
      new Date("2024-01-10T00:00:00Z"),
    );
    expect(plan.aMettreAJour[0]?.statut).toBe("depassee");
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
          dateRealisee: new Date("2024-03-01T00:00:00Z"),
          statut: "realisee_conforme",
        }),
      ],
      [generee("2031-06-01T00:00:00Z")],
      { now: NOW, obligationsEncoreApplicables: new Set(["elec-attestation"]) },
    );

    expect(plan.aMettreAJour[0]?.datePrevue).toEqual(
      new Date("2031-06-01T00:00:00Z"),
    );
    // Et la preuve ne bouge pas.
    expect(plan.aMettreAJour[0]?.dateRealisee).toEqual(
      new Date("2024-03-01T00:00:00Z"),
    );
    expect(plan.aMettreAJour[0]?.statut).toBe("realisee_conforme");
  });

  it("ne bouge pas l'échéance calculée d'un équipement", () => {
    // La garantie inverse, et c'est elle qui justifie le drapeau plutôt qu'un
    // changement de règle générale : déclarer un extincteur de plus ne doit
    // toujours pas effacer un retard accumulé sur une échéance réglementaire.
    const plan = reconcilierCalendrier(
      [ligneExistante({ id: "v-eq", obligationId: "elec", equipementId: "eq-1", datePrevue: new Date("2026-01-10T00:00:00Z"), statut: "depassee" })],
      [{ ...generee("2031-01-10T00:00:00Z"), cleUnique: "elec::eq-1", obligationId: "elec", equipementId: "eq-1", salarieId: null, datePrevueFaisantFoi: undefined }],
      { now: NOW, obligationsEncoreApplicables: new Set(["elec"]) },
    );

    const maj = plan.aMettreAJour[0];
    expect(maj?.datePrevue ?? new Date("2026-01-10T00:00:00Z")).toEqual(
      new Date("2026-01-10T00:00:00Z"),
    );
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
      new Map(),
      {
        now: NOW_PD,
        misesEnService: new Map([["eq-1", new Date("2025-12-01T00:00:00Z")]]),
      },
    );
    // L'année suffit et c'est délibéré : elle distingue 2028 (premier délai)
    // de 2029 (rythme), ce que le test doit prouver. La date exacte dérive
    // d'un jour — les périodicités sont comptées en jours, 2028 est bissextile
    // — et figer ce décalage ici asserterait une arithmétique qui n'est pas le
    // sujet, en la rendant difficile à corriger le jour où on la voudra juste.
    expect(res[0].datePrevue?.getUTCFullYear()).toBe(2028);
  });

  it("une vérification connue fait repartir le RYTHME, jamais le premier délai", () => {
    // La portée à ne pas élargir : sans cette garde, le premier cycle se
    // rejouerait après chaque rapport déposé.
    const res = genererProchainesVerifications(
      [applique(avecDelai(), [fakeEquipement()])],
      new Map([["o-premier-delai::eq-1", new Date("2025-12-01T00:00:00Z")]]),
      { now: NOW_PD },
    );
    expect(res[0].datePrevue?.getUTCFullYear()).toBe(2029);
  });

  it("sans `premierDelai`, le rythme s'applique dès le premier cycle", () => {
    const res = genererProchainesVerifications(
      [
        applique(
          fakeObligation({ id: "o-sans-delai", periodicite: "quadriennale" }),
          [fakeEquipement()],
        ),
      ],
      new Map(),
      {
        now: NOW_PD,
        misesEnService: new Map([["eq-1", new Date("2025-12-01T00:00:00Z")]]),
      },
    );
    expect(res[0].datePrevue?.getUTCFullYear()).toBe(2029);
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
      new Map(),
      { now: NOW },
    );
  }

  /** Un fragment absorbé, réalisé à la date donnée. */
  function fragmentRealise(id: string, obligationId: string, quand: string) {
    return ligneExistante({
      id,
      obligationId,
      equipementId: `eq-${id}`,
      dateRealisee: new Date(quand),
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
    expect(plan.aCreer[0].statut).toBe("depassee");

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
    expect(plan.aCreer[0].statut).toBe("depassee");
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
          dateRealisee: new Date("2026-07-01T00:00:00Z"),
          statut: "realisee_conforme",
          porteUnePreuve: true,
        }),
      ],
      aGenererPourLeTout(),
      { now: NOW, successions: SUCCESSIONS },
    );

    expect(plan.aCreer).toEqual([]);
    const maj = plan.aMettreAJour.find((m) => m.id === "v-tout");
    // 2026-07-01 + un an : son cycle propre, pas l'héritage de 2025.
    expect(maj?.datePrevue).toEqual(new Date("2027-07-01T00:00:00Z"));
    expect(maj?.dateRealisee).toEqual(new Date("2026-07-01T00:00:00Z"));
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
      new Map(),
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
      new Map(),
      { now: NOW },
    );

    // Réalisation du 2026-06-01 : à un an, la suivante tombe en 2027, donc le
    // CYCLE EST ENCORE OUVERT au 2026-08-11. C'est ce qu'il faut pour éprouver
    // la conservation — sur un cycle écoulé, `dateRealisee` est remise à
    // `null` par la règle ordinaire du nouveau cycle, et ce n'est pas une
    // perte : les rapports restent attachés à la rangée.
    const plan = reconcilierCalendrier(
      [
        ligneExistante({
          id: "v-frag-1",
          obligationId: "frag-vmc",
          equipementId: "eq-1",
          dateRealisee: new Date("2026-06-01T00:00:00Z"),
          statut: "realisee_conforme",
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
      adoptee.dateRealisee,
      "la réalisation a été perdue : une adoption doit garder ce que la ligne prouvait",
    ).toEqual(new Date("2026-06-01T00:00:00Z"));
    expect(adoptee.datePrevue).toEqual(new Date("2027-06-01T00:00:00Z"));

    // Rien n'est barré, et seul eq-2 — qui n'avait pas de ligne — est créé.
    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aCreer).toHaveLength(1);
    expect(plan.aCreer[0].equipementId).toBe("eq-2");
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
