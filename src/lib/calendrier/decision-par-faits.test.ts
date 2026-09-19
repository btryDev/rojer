import { describe, expect, it } from "vitest";
import { cleJourCivil, depuisCleJourCivil, instantCivil, ajouterJours } from "@/lib/dates";
import { joursDeRetard } from "@/lib/dates/retard";
import type { ObligationApplicable } from "@/lib/matching";
import type { EquipementMatching } from "@/lib/matching/types";
import {
  porteurDe,
  type Obligation,
  type ObligationPorteeParEquipement,
  type ObligationPorteeParEtablissement,
} from "@/lib/referentiels/conformite/types";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import {
  faitsDeLigne,
} from "./decision-par-faits";
import {
  cleDeLigne,
  genererProchainesVerifications,
  reconcilierCalendrier,
  type OccurrenceExistante,
  type PlanReconciliation,
  type VerificationGenere,
} from "./generateur";
import { appliquerPlanEnMemoire, planVide } from "./passage-a-blanc";

// ============================================================================
// La décision par les faits, DE BOUT EN BOUT dans le réconciliateur : les sept
// scénarios de l'audit du 2026-09-17 (ADR-036 § 1) traversent le générateur —
// qui renseigne `sources` — puis `reconcilierCalendrier`, dont c'est la
// décision PAR DÉFAUT depuis la bascule (lot 4). Chaque scénario dit, en
// commentaire, ce que l'ancien moteur (`deciderParConservation`, retiré)
// affichait. Les mêmes scénarios, par le dépôt et la suppression d'un rapport,
// sont rejoués dans `rapports/actions.test.ts`. La table de vérité de
// `echeance-de-ligne.test.ts` prouve la fonction ; ce fichier prouve que le
// réconciliateur lui apporte les bons faits, et qu'appliquer le plan puis
// replanifier quatre cents jours plus tard ne réécrit rien.
// ============================================================================

const NOW = depuisCleJourCivil("2026-09-17");
const d = (cle: string) => depuisCleJourCivil(cle);

type ObligationEq = ObligationPorteeParEquipement;

function obligationEquipement(
  over: Partial<ObligationEq> & Pick<ObligationEq, "id" | "periodicite">,
): ObligationEq {
  return {
    domaine: "electricite",
    libelle: `Obligation ${over.id}`,
    referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. test" }] as ObligationEq["referencesLegales"],
    realisateurs: ["personne_qualifiee"] as ObligationEq["realisateurs"],
    criticite: 3,
    transmet: [],
    nature: "echeance_recurrente",
    pieceAttendue: null,
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"] as ObligationEq["categoriesEquipement"],
    ...over,
  };
}

function obligationEtablissement(
  over: Partial<ObligationPorteeParEtablissement> &
    Pick<ObligationPorteeParEtablissement, "id" | "periodicite">,
): ObligationPorteeParEtablissement {
  return {
    domaine: "aeration",
    libelle: `Obligation ${over.id}`,
    referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 4222-20" }] as ObligationPorteeParEtablissement["referencesLegales"],
    realisateurs: ["personne_qualifiee"] as ObligationPorteeParEtablissement["realisateurs"],
    criticite: 3,
    transmet: [],
    nature: "echeance_recurrente",
    pieceAttendue: null,
    typologies: { travail: true },
    ...over,
    porteur: "etablissement",
  };
}

const EQ: EquipementMatching = {
  id: "eq-1",
  libelle: "Armoire",
  categorie: "INSTALLATION_ELECTRIQUE",
  caracteristiques: null,
};

function applicable(
  o: Obligation,
  eqs: EquipementMatching[],
  surcharge?: { periodicite: Periodicite },
): ObligationApplicable {
  return {
    obligation: o,
    equipementsConcernes: eqs,
    porteur: porteurDe(o),
    raisons: ["test"],
    ...(surcharge === undefined
      ? {}
      : {
          surcharges: Object.fromEntries(
            eqs.map((e) => [
              e.id,
              { periodicite: surcharge.periodicite, prescriptionId: "presc-1", raison: "assureur" },
            ]),
          ),
        }),
  };
}

/** Une ligne en base, réduite à ce qui varie d'un scénario à l'autre. */
function existante(
  g: VerificationGenere,
  over: Partial<OccurrenceExistante> & { datePrevue: Date; suiviDepuis: Date },
): OccurrenceExistante {
  return {
    id: `ligne-${g.cleUnique}`,
    obligationId: g.obligationId,
    equipementId: g.equipementId,
    salarieId: g.salarieId,
    libelleObligation: g.libelleObligation,
    periodicite: g.periodicite,
    realisateurRequis: g.realisateurRequis,
    statut: "planifiee",
    porteUnePreuve: false,
    derniereRealisation: null,
    dernierResultat: null,
    archiveLe: null,
    prescriptionId: g.prescriptionId,
    ...over,
  };
}

/** Génère, puis réconcilie avec la décision par défaut. */
function scenario(
  obligations: ObligationApplicable[],
  faireExistante: ((g: VerificationGenere) => OccurrenceExistante) | null,
  options: { now?: Date; misesEnService?: Map<string, Date> } = {},
) {
  const now = options.now ?? NOW;
  const aGenerer = genererProchainesVerifications(obligations, {
    now,
    misesEnService: options.misesEnService,
  });
  expect(aGenerer).toHaveLength(1);
  const g = aGenerer[0];
  const existantes = faireExistante === null ? [] : [faireExistante(g)];
  const opts = {
    now,
    obligationsEncoreApplicables: new Set(
      obligations.map((o) => (o.porteur === "equipement" ? `${o.obligation.id}::${EQ.id}` : o.obligation.id)),
    ),
    equipementsEnService: new Set([EQ.id]),
  };
  return {
    g,
    existantes,
    now,
    // SANS stratégie passée : c'est la décision par défaut qui est éprouvée.
    faits: reconcilierCalendrier(existantes, aGenerer, opts),
    rejouer: (plan: PlanReconciliation, plusTard: Date) =>
      reconcilierCalendrier(
        appliquerPlanEnMemoire(existantes, plan, now),
        genererProchainesVerifications(obligations, {
          now: plusTard,
          misesEnService: options.misesEnService,
        }),
        { ...opts, now: plusTard },
      ),
  };
}

/** La ligne telle qu'un plan la laisse : la mise à jour, sinon l'existante. */
function etat(plan: PlanReconciliation, ex: OccurrenceExistante) {
  const m = plan.aMettreAJour.find((x) => x.id === ex.id);
  return m === undefined
    ? { datePrevue: ex.datePrevue, statut: ex.statut, source: undefined }
    : { datePrevue: m.datePrevue, statut: m.statut, source: m.source };
}

const J_400 = ajouterJours(NOW, 400);

describe("deciderParFaits — les sept scénarios de l'audit, de bout en bout", () => {
  it("S1 — sans source, suivie depuis le 15/06 : la date ne glisse plus, 94 jours de retard gardés", () => {
    const o = obligationEtablissement({ id: "etab-annuelle", periodicite: "annuelle" });
    const origine = instantCivil(2026, 6, 15, 10, 12);
    const s = scenario([applicable(o, [])], (g) =>
      existante(g, { statut: "a_planifier", datePrevue: origine, suiviDepuis: origine }),
    );
    const apres = etat(s.faits, s.existantes[0]);
    expect(cleJourCivil(apres.datePrevue)).toBe("2026-06-15");
    expect(apres.statut).toBe("a_planifier");
    expect(apres.source).toBe("origine");
    expect(joursDeRetard(apres.datePrevue, NOW)).toBe(94);
    // L'ancien moteur la laissait telle quelle, au même jour : la réécriture
    // vers minuit de Paris est celle que l'ADR-036 § 5 annonce.
    expect(planVide(s.rejouer(s.faits, J_400))).toBe(true);
  });

  it("S2 — mise en service 01/06/2025, annuel : l'échéance manquée du 01/06/2026 et ses 108 jours sont gardés", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const s = scenario(
      [applicable(o, [EQ])],
      (g) => existante(g, { datePrevue: d("2026-06-01"), suiviDepuis: d("2025-09-10") }),
      { misesEnService: new Map([[EQ.id, d("2025-06-01")]]) },
    );
    const apres = etat(s.faits, s.existantes[0]);
    expect(apres.datePrevue).toEqual(d("2026-06-01"));
    expect(apres.statut).toBe("planifiee");
    expect(joursDeRetard(apres.datePrevue, NOW)).toBe(108);
    // Identique à l'ancien moteur : « écraser » avec le générateur d'avant la
    // bascule aurait rendu « à planifier » au 17/09 — la décision par les
    // faits, elle, ne touche pas la ligne.
    expect(s.faits.aMettreAJour).toEqual([]);
    expect(s.faits.inchangees).toBe(1);
    expect(planVide(s.rejouer(s.faits, J_400))).toBe(true);
  });

  it("S3a — annuel → semestriel sans rapport : la date suit le rythme, 01/12/2026", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const s = scenario(
      [applicable(o, [EQ], { periodicite: "semestrielle" })],
      (g) =>
        existante(g, {
          // Déjà réalignée « semestrielle » par une passe précédente, la date
          // restée à MES + un an : le constat B.
          periodicite: "semestrielle",
          prescriptionId: "presc-1",
          datePrevue: d("2027-06-01"),
          suiviDepuis: d("2026-06-01"),
        }),
      { misesEnService: new Map([[EQ.id, d("2026-06-01")]]) },
    );
    expect(s.g.periodicite).toBe("semestrielle");
    expect(s.g.sources.premierPas).toBe("semestrielle");
    // L'ancien moteur gardait le 01/06/2027 sur une ligne « semestrielle ».
    const apres = etat(s.faits, s.existantes[0]);
    expect(apres.datePrevue).toEqual(d("2026-12-01"));
    expect(apres.statut).toBe("planifiee");
    expect(apres.source).toBe("mise_en_service");
    expect(planVide(s.rejouer(s.faits, J_400))).toBe(true);
  });

  it("S3b — le même, régénéré le 20/12/2026 : même date, 19 jours de retard lus dessus", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const le20 = d("2026-12-20");
    const s = scenario(
      [applicable(o, [EQ], { periodicite: "semestrielle" })],
      (g) =>
        existante(g, {
          periodicite: "semestrielle",
          prescriptionId: "presc-1",
          datePrevue: d("2027-06-01"),
          suiviDepuis: d("2026-06-01"),
        }),
      { now: le20, misesEnService: new Map([[EQ.id, d("2026-06-01")]]) },
    );
    const apres = etat(s.faits, s.existantes[0]);
    expect(apres.datePrevue).toEqual(d("2026-12-01"));
    expect(joursDeRetard(apres.datePrevue, le20)).toBe(19);
    expect(planVide(s.rejouer(s.faits, ajouterJours(le20, 400)))).toBe(true);
  });

  it("S4 — la mise en service corrigée (15/03/2026 → 15/11/2025) s'applique : 15/11/2026", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const s = scenario(
      [applicable(o, [EQ])],
      (g) => existante(g, { datePrevue: d("2027-03-15"), suiviDepuis: d("2026-03-15") }),
      { misesEnService: new Map([[EQ.id, d("2025-11-15")]]) },
    );
    // L'ancien moteur comptait la ligne « inchangée » — correction ignorée.
    const apres = etat(s.faits, s.existantes[0]);
    expect(apres.datePrevue).toEqual(d("2026-11-15"));
    expect(apres.statut).toBe("planifiee");
    expect(planVide(s.rejouer(s.faits, J_400))).toBe(true);
  });

  it("S5 — mise en service saisie le lendemain de la création : 01/09/2027, quel que soit l'ordre des saisies", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const s = scenario(
      [applicable(o, [EQ])],
      (g) =>
        existante(g, {
          statut: "a_planifier",
          datePrevue: d("2026-09-16"),
          suiviDepuis: d("2026-09-16"),
        }),
      { misesEnService: new Map([[EQ.id, d("2026-09-01")]]) },
    );
    // L'ancien moteur refusait la date calculée : « à planifier » au 16/09,
    // en retard dès le 17 — pour toujours.
    const apres = etat(s.faits, s.existantes[0]);
    expect(apres.datePrevue).toEqual(d("2027-09-01"));
    expect(apres.statut).toBe("planifiee");
    expect(joursDeRetard(apres.datePrevue, NOW)).toBe(0);
    expect(planVide(s.rejouer(s.faits, J_400))).toBe(true);
  });

  it("S6 — une ligne qui porte un rapport : rapport + rythme, comme le dépôt l'avait écrit", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const s = scenario(
      [applicable(o, [EQ])],
      (g) =>
        existante(g, {
          datePrevue: d("2027-03-01"),
          suiviDepuis: d("2024-02-01"),
          derniereRealisation: d("2026-03-01"),
          dernierResultat: "conforme",
          porteUnePreuve: true,
        }),
      { misesEnService: new Map([[EQ.id, d("2024-01-10")]]) },
    );
    expect(s.faits.aMettreAJour).toEqual([]);
    expect(s.faits.inchangees).toBe(1);
    expect(planVide(s.rejouer(s.faits, J_400))).toBe(true);
  });

  it("S7 — appareil neuf sous prescription semestrielle : la ligne NAÎT à six mois, pas à un an", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const s = scenario([applicable(o, [EQ], { periodicite: "semestrielle" })], null, {
      misesEnService: new Map([[EQ.id, d("2026-09-01")]]),
    });
    // Le générateur d'avant la bascule lisait le rythme du RÉFÉRENTIEL pour le
    // premier cycle : la ligne naissait au 01/09/2027, étiquetée
    // « semestrielle ». La création est désormais datée par la fonction,
    // origine = `now`.
    expect(s.faits.aCreer).toHaveLength(1);
    expect(s.faits.aCreer[0].periodicite).toBe("semestrielle");
    expect(s.faits.aCreer[0].datePrevue).toEqual(d("2027-03-01"));
    expect(s.faits.aCreer[0].statut).toBe("planifiee");
    expect(planVide(s.rejouer(s.faits, J_400))).toBe(true);
  });
});

describe("deciderParFaits — rien hors de la fonction (la garde du legs est partie au lot 5)", () => {
  const ponctuel = obligationEquipement({
    id: "elec-mise-en-service",
    periodicite: "mise_en_service_uniquement",
  });

  it("un ponctuel au statut réalisé SANS rapport rouvre sur ses faits", () => {
    // INVERSÉ AU LOT 5 (2026-09-19). ~~La garde du legs lui gardait date et
    // statut, et la décision nommait la source `legs_statut_realise`.~~ Le
    // contrôle de santé du 2026-09-19 n'en comptait aucun en production, et
    // aucun chemin du produit n'en fabrique : un statut réalisé ne survit pas
    // sans rapport réalisé. La ligne se date de sa mise en service (règle 2).
    const s = scenario(
      [applicable(ponctuel, [EQ])],
      (g) =>
        existante(g, {
          statut: "realisee_conforme",
          datePrevue: d("2025-04-20"),
          suiviDepuis: d("2025-04-25"),
        }),
      { misesEnService: new Map([[EQ.id, d("2025-04-20")]]) },
    );
    const apres = etat(s.faits, s.existantes[0]);
    expect(apres.statut).toBe("a_planifier");
    expect(apres.datePrevue).toEqual(d("2025-04-20"));
    expect(planVide(s.rejouer(s.faits, J_400))).toBe(true);
  });

  it("le même ponctuel AVEC son rapport se solde : le statut sort du résultat", () => {
    const s = scenario(
      [applicable(ponctuel, [EQ])],
      (g) =>
        existante(g, {
          statut: "realisee_conforme",
          datePrevue: d("2025-04-20"),
          suiviDepuis: d("2025-04-25"),
          derniereRealisation: d("2025-05-01"),
          dernierResultat: "observations_mineures",
          porteUnePreuve: true,
        }),
      { misesEnService: new Map([[EQ.id, d("2025-04-20")]]) },
    );
    const apres = etat(s.faits, s.existantes[0]);
    expect(apres.statut).toBe("realisee_observations");
    expect(apres.source).toBe("ponctuel_solde");
  });

  it("un cyclique au statut réalisé sans rapport : la fonction décide", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const s = scenario(
      [applicable(o, [EQ])],
      (g) =>
        existante(g, {
          statut: "realisee_conforme",
          datePrevue: d("2026-01-10"),
          suiviDepuis: d("2026-01-10"),
        }),
      { misesEnService: new Map([[EQ.id, d("2026-01-10")]]) },
    );
    expect(etat(s.faits, s.existantes[0]).statut).toBe("planifiee");
  });
});

describe("faitsDeLigne — ce que la stratégie apporte à la fonction", () => {
  it("lit le rythme effectif, les sources du générateur, la réalisation propre et l'origine", () => {
    const o = obligationEquipement({
      id: "esp",
      periodicite: "quadriennale",
      premierDelai: "triennale",
    });
    const [g] = genererProchainesVerifications(
      [applicable(o, [EQ], { periodicite: "annuelle" })],
      { now: NOW, misesEnService: new Map([[EQ.id, d("2025-12-01")]]) },
    );
    const ex = existante(g, {
      datePrevue: d("2026-12-01"),
      suiviDepuis: d("2025-12-01"),
      derniereRealisation: d("2026-06-01"),
      dernierResultat: "conforme",
    });
    expect(faitsDeLigne(g, ex, d("2020-01-01"), NOW)).toEqual({
      periodicite: "annuelle",
      // D1 : le plus court des deux plafonds, trois ans contre un an.
      premierPas: "annuelle",
      dateDuTitre: null,
      realisation: { date: d("2026-06-01"), resultat: "conforme" },
      realisationHeritee: d("2020-01-01"),
      miseEnService: d("2025-12-01"),
      origine: d("2025-12-01"),
    });
  });

  it("un « non vérifiable » n'entre jamais comme réalisation, et une ligne à naître a `now` pour origine", () => {
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const [g] = genererProchainesVerifications([applicable(o, [EQ])], { now: NOW });
    const ex = existante(g, {
      datePrevue: NOW,
      suiviDepuis: d("2026-01-01"),
      derniereRealisation: d("2026-06-01"),
      dernierResultat: "non_verifiable",
    });
    expect(faitsDeLigne(g, ex, null, NOW).realisation).toBeNull();
    expect(faitsDeLigne(g, null, null, NOW).origine).toBe(NOW);
  });

  it("une ligne générée sans `sources` est REFUSÉE — le repli silencieux est parti à la bascule", () => {
    // INVERSÉ LE 2026-09-19 (ADR-036, lot 4). Ce test tenait le repli : sans
    // `sources`, le rythme pour premier pas, aucune mise en service, et la date
    // que `datePrevueFaisantFoi` désignait. Il perdait en silence la mise en
    // service et le premier délai d'une ligne mal câblée — donc changeait sa
    // date sans rien dire. Le lot 2c l'annonçait : à la bascule, une erreur.
    const o = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const [g] = genererProchainesVerifications([applicable(o, [EQ])], { now: NOW });
    const sansSources = { ...g, sources: undefined } as unknown as VerificationGenere;
    expect(() => faitsDeLigne(sansSources, null, null, NOW)).toThrow(/sources/);
  });
});

describe("la décision par défaut — l'idempotence temporelle sur un dossier mêlé", () => {
  // ~~« c'est bien `STRATEGIE_FAITS` que le réconciliateur prend sans qu'on la
  // lui passe »~~ — la couture est partie au lot 5 (2026-09-19) : il n'y a
  // plus de décision à passer.

  it("appliquer le plan puis replanifier à J+400 ne réécrit rien", () => {
    const annuelle = obligationEquipement({ id: "elec-annuelle", periodicite: "annuelle" });
    const ponctuel = obligationEquipement({
      id: "elec-mise-en-service",
      periodicite: "mise_en_service_uniquement",
    });
    const etab = obligationEtablissement({ id: "etab-annuelle", periodicite: "annuelle" });
    const obligations = [
      applicable(annuelle, [EQ], { periodicite: "semestrielle" }),
      applicable(ponctuel, [EQ]),
      applicable(etab, []),
    ];
    const misesEnService = new Map([[EQ.id, d("2026-06-01")]]);
    const aGenerer = genererProchainesVerifications(obligations, { now: NOW, misesEnService });
    const parCle = new Map(aGenerer.map((g) => [g.cleUnique, g]));
    const gAnnuelle = parCle.get(cleDeLigne("elec-annuelle", { equipementId: EQ.id, salarieId: null }))!;
    const gEtab = parCle.get(cleDeLigne("etab-annuelle", { equipementId: null, salarieId: null }))!;
    // Deux lignes existent — S3a et S1 —, le ponctuel est à créer.
    const existantes = [
      existante(gAnnuelle, {
        periodicite: "semestrielle",
        prescriptionId: "presc-1",
        datePrevue: d("2027-06-01"),
        suiviDepuis: d("2026-06-01"),
      }),
      existante(gEtab, {
        statut: "a_planifier",
        datePrevue: instantCivil(2026, 6, 15, 10, 12),
        suiviDepuis: instantCivil(2026, 6, 15, 10, 12),
      }),
    ];
    const opts = {
      now: NOW,
      obligationsEncoreApplicables: new Set([
        `elec-annuelle::${EQ.id}`,
        `elec-mise-en-service::${EQ.id}`,
        "etab-annuelle",
      ]),
      equipementsEnService: new Set([EQ.id]),
    };
    const plan = reconcilierCalendrier(existantes, aGenerer, opts);
    expect(plan.aMettreAJour).toHaveLength(2);
    expect(plan.aCreer).toHaveLength(1);

    const apres = appliquerPlanEnMemoire(existantes, plan, NOW);
    const replan = reconcilierCalendrier(
      apres,
      genererProchainesVerifications(obligations, { now: J_400, misesEnService }),
      { ...opts, now: J_400 },
    );
    expect(planVide(replan), JSON.stringify(replan, null, 2)).toBe(true);
    expect(replan.inchangees).toBe(3);
  });
});
