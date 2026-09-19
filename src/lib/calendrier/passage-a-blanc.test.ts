import { existsSync, readFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ajouterJours, cleJourCivil, depuisCleJourCivil, instantCivil } from "@/lib/dates";
import type { FaitsDeLigne } from "./echeance-de-ligne";
import type { EtablissementFaux, LigneFausse } from "./faux-prisma";
import type { PlanReconciliation } from "./generateur";
import {
  CATEGORIES,
  appliquerPlanEnMemoire,
  classerEcart,
  comparerAuMoteur,
  dateExpliqueeParUnFait,
  planVide,
  projeterLigne,
  projeterPlan,
  rejouerPlusTard,
  type Categorie,
  type EntreeClassement,
} from "./passage-a-blanc";
import { lireEntrees, type ClientLecture } from "./passe";

// ============================================================================
// Le passage à blanc (ADR-036, lot 2c — 2026-09-18) : le classement des
// écarts, un cas par catégorie ; l'outil de bout en bout sur le faux client et
// le vrai référentiel ; l'application d'un plan en mémoire ; et la garde de
// LECTURE SEULE du script, qui relit son texte.
// ============================================================================

const d = (cle: string) => depuisCleJourCivil(cle);

/** Des faits, tous par défaut absents : chaque cas ne renseigne que les siens. */
function faits(over: Partial<FaitsDeLigne> & { origine: Date }): FaitsDeLigne {
  return {
    periodicite: "annuelle",
    premierPas: "annuelle",
    dateDuTitre: null,
    realisation: null,
    realisationHeritee: null,
    miseEnService: null,
    ...over,
  };
}

function entree(
  avant: { datePrevue: Date; statut: string },
  apres: { datePrevue: Date; statut: string; source: string | null },
  f: FaitsDeLigne,
  legs = false,
): EntreeClassement {
  return { avant, apres, faits: f, legs };
}

describe("classerEcart — un cas par catégorie, dans l'ordre des motifs", () => {
  const CAS: { categorie: Categorie; recit: string; e: EntreeClassement }[] = [
    {
      categorie: "legs_statut_realise",
      recit:
        "Un ponctuel réalisé sans rapport : la garde de `deciderParFaits` le conserve, et il est compté à part QUEL QUE SOIT l'écart — ici aucun.",
      e: entree(
        { datePrevue: d("2025-04-20"), statut: "realisee_conforme" },
        { datePrevue: d("2025-04-20"), statut: "realisee_conforme", source: "legs_statut_realise" },
        faits({ periodicite: "mise_en_service_uniquement", premierPas: "mise_en_service_uniquement", miseEnService: d("2025-04-20"), origine: d("2025-04-25") }),
        true,
      ),
    },
    {
      categorie: "identique",
      recit: "S2 et S6 : même instant, même statut.",
      e: entree(
        { datePrevue: d("2026-06-01"), statut: "planifiee" },
        { datePrevue: d("2026-06-01"), statut: "planifiee", source: "mise_en_service" },
        faits({ miseEnService: d("2025-06-01"), origine: d("2025-09-10") }),
      ),
    },
    {
      categorie: "meme_jour_civil",
      recit:
        "S1 : « à planifier » à 10 h 12 devient « à planifier » à minuit de Paris du même jour — la règle 5 réécrit chaque placeholder une fois (ADR-036 § 5).",
      e: entree(
        { datePrevue: instantCivil(2026, 6, 15, 10, 12), statut: "a_planifier" },
        { datePrevue: d("2026-06-15"), statut: "a_planifier", source: "origine" },
        faits({ origine: instantCivil(2026, 6, 15, 10, 12) }),
      ),
    },
    {
      categorie: "statut_seul",
      recit:
        "Un titre `autre` au statut réalisé hérité d'avant l'ADR-034 : la règle 1 le rend « planifiée » à la date de la pièce, sans bouger la date.",
      e: entree(
        { datePrevue: d("2027-05-01"), statut: "realisee_conforme" },
        { datePrevue: d("2027-05-01"), statut: "planifiee", source: "titre" },
        faits({ periodicite: "autre", premierPas: "autre", dateDuTitre: d("2027-05-01"), origine: d("2024-05-02") }),
      ),
    },
    {
      categorie: "rythme",
      recit:
        "S3a : la date en base est mise en service + ANNUELLE, le premier pas est semestriel — le rythme a changé, la date était restée.",
      e: entree(
        { datePrevue: d("2027-06-01"), statut: "planifiee" },
        { datePrevue: d("2026-12-01"), statut: "planifiee", source: "mise_en_service" },
        faits({ periodicite: "semestrielle", premierPas: "semestrielle", miseEnService: d("2026-06-01"), origine: d("2026-06-01") }),
      ),
    },
    {
      categorie: "mise_en_service",
      recit:
        "S5 : la ligne était « à planifier » à son origine, la mise en service saisie le lendemain la date d'un an — aucun rythme n'explique l'ancienne date depuis l'ancre.",
      e: entree(
        { datePrevue: d("2026-09-16"), statut: "a_planifier" },
        { datePrevue: d("2027-09-01"), statut: "planifiee", source: "mise_en_service" },
        faits({ miseEnService: d("2026-09-01"), origine: d("2026-09-16") }),
      ),
    },
    {
      categorie: "retard_invente",
      recit:
        "Un appareil de 2018, ligne créée en 2026 avec une date de 2019 posée par un import : la candidate la met « à planifier » à l'origine, et le retard compté sur sept ans de non-suivi tombe.",
      e: entree(
        { datePrevue: d("2019-03-01"), statut: "planifiee" },
        { datePrevue: d("2026-01-15"), statut: "a_planifier", source: "origine" },
        faits({ miseEnService: d("2018-03-01"), origine: d("2026-01-15") }),
      ),
    },
    {
      categorie: "date_arbitraire",
      recit:
        "Une date posée par `etaler-echeances-demo.ts`, qu'aucun fait n'explique : ni l'origine, ni une mise en service, ni un rapport, ni une pièce.",
      e: entree(
        { datePrevue: d("2026-11-23"), statut: "planifiee" },
        { datePrevue: d("2026-03-10"), statut: "a_planifier", source: "origine" },
        faits({ origine: d("2026-03-10") }),
      ),
    },
    {
      categorie: "inexplique",
      recit:
        "La date en base EST expliquée — c'est la mise en service elle-même, postérieure au suivi — et pourtant la candidate rend l'origine sans qu'aucun motif ne le nomme (une telle paire ne sort pas de la fonction ; le classement ne devine pas, il dit qu'il ne sait pas).",
      e: entree(
        { datePrevue: d("2026-02-01"), statut: "planifiee" },
        { datePrevue: d("2026-01-15"), statut: "a_planifier", source: "origine" },
        faits({ miseEnService: d("2026-02-01"), origine: d("2026-01-15") }),
      ),
    },
  ];

  it("couvre chaque catégorie une fois", () => {
    expect([...new Set(CAS.map((c) => c.categorie))].sort()).toEqual([...CATEGORIES].sort());
  });

  it.each(CAS)("$categorie", ({ categorie, recit, e }) => {
    expect(classerEcart(e), recit).toBe(categorie);
  });

  it("la date de D3 — première échéance passée AVANT l'origine par un rythme resserré — est un changement de rythme", () => {
    expect(
      classerEcart(
        entree(
          { datePrevue: d("2027-01-01"), statut: "planifiee" },
          { datePrevue: d("2026-09-01"), statut: "a_planifier", source: "origine" },
          faits({ periodicite: "semestrielle", premierPas: "semestrielle", miseEnService: d("2026-01-01"), origine: d("2026-09-01") }),
        ),
      ),
    ).toBe("rythme");
  });

  it("une ligne roulée par un dépôt dont la prescription change le rythme : rythme, ancré sur le rapport", () => {
    expect(
      classerEcart(
        entree(
          { datePrevue: d("2027-03-01"), statut: "planifiee" },
          { datePrevue: d("2026-09-01"), statut: "planifiee", source: "rapport" },
          faits({
            periodicite: "semestrielle",
            premierPas: "semestrielle",
            realisation: { date: d("2026-03-01"), resultat: "conforme" },
            origine: d("2025-03-01"),
          }),
        ),
      ),
    ).toBe("rythme");
  });

  it("un ponctuel SOLDÉ dont la mise en service est saisie après coup : mise_en_service", () => {
    // LE TROU DE LA PREMIÈRE RÉDACTION (relecture neutre du 2026-09-18), rejoué
    // de bout en bout plus bas : `elec-travail-mise-en-service` sur une armoire,
    // ligne créée le 10/03 sans mise en service, rapport conforme le 02/04, puis
    // la mise en service saisie au 05/01. La règle 2 date le contrôle unique de
    // son événement ; le `switch` ignorait `ponctuel_solde` et le motif
    // `mise_en_service` ne l'acceptait pas, donc l'écart tombait en
    // `inexplique` — et le script sortait en 1 sur un comportement décidé.
    expect(
      classerEcart(
        entree(
          { datePrevue: d("2026-03-10"), statut: "realisee_conforme" },
          { datePrevue: d("2026-01-05"), statut: "realisee_conforme", source: "ponctuel_solde" },
          faits({
            periodicite: "mise_en_service_uniquement",
            premierPas: "mise_en_service_uniquement",
            miseEnService: d("2026-01-05"),
            realisation: { date: d("2026-04-02"), resultat: "conforme" },
            origine: d("2026-03-10"),
          }),
        ),
      ),
    ).toBe("mise_en_service");
  });

  it("une périodicité devenue PONCTUELLE solde une ligne roulée : rythme, pas inexplique", () => {
    // L'autre cas que l'ADR-036 § 5 nomme. La ligne roulée par son dépôt portait
    // « rapport + annuelle » (01/03/2027) ; son rythme devient ponctuel, elle
    // n'a plus de rendez-vous suivant et retombe sur son origine, faute de mise
    // en service. `dateExpliqueeParUnFait` rend `true` — la date en base EST
    // expliquée —, donc sans motif l'écart tombait en `inexplique` au lieu de
    // dire ce qui l'a déplacé : le rythme.
    expect(
      classerEcart(
        entree(
          { datePrevue: d("2027-03-01"), statut: "planifiee" },
          { datePrevue: d("2025-02-10"), statut: "realisee_observations", source: "ponctuel_solde" },
          faits({
            periodicite: "mise_en_service_uniquement",
            premierPas: "mise_en_service_uniquement",
            realisation: { date: d("2026-03-01"), resultat: "observations_mineures" },
            origine: d("2025-02-10"),
          }),
        ),
      ),
    ).toBe("rythme");
  });

  it("un ponctuel soldé que rien n'explique reste date_arbitraire, et non inexplique", () => {
    // La frontière : sans mise en service et sans ancre qui porte la date en
    // base, le classement ne prétend rien — il dit que la date ne vient d'aucun
    // fait, ce qui est le cas d'une date de démonstration.
    expect(
      classerEcart(
        entree(
          { datePrevue: d("2026-11-23"), statut: "realisee_conforme" },
          { datePrevue: d("2025-02-10"), statut: "realisee_conforme", source: "ponctuel_solde" },
          faits({
            periodicite: "mise_en_service_uniquement",
            premierPas: "mise_en_service_uniquement",
            realisation: { date: d("2026-03-01"), resultat: "conforme" },
            origine: d("2025-02-10"),
          }),
        ),
      ),
    ).toBe("date_arbitraire");
  });

  it("un ponctuel daté de `now` à sa création, dont la mise en service est connue : mise_en_service", () => {
    expect(
      classerEcart(
        entree(
          { datePrevue: d("2026-01-15"), statut: "a_planifier" },
          { datePrevue: d("2015-03-01"), statut: "a_planifier", source: "ponctuel_ouvert" },
          faits({
            periodicite: "mise_en_service_uniquement",
            premierPas: "mise_en_service_uniquement",
            miseEnService: d("2015-03-01"),
            origine: d("2026-01-15"),
          }),
        ),
      ),
    ).toBe("mise_en_service");
  });

  it("dateExpliqueeParUnFait — l'origine, son début de jour, la pièce, une ancre + n'importe quel rythme", () => {
    const f = faits({
      miseEnService: d("2025-12-01"),
      realisation: { date: d("2026-03-01"), resultat: "conforme" },
      realisationHeritee: d("2021-01-10"),
      dateDuTitre: d("2031-06-01"),
      origine: instantCivil(2026, 6, 15, 10, 12),
    });
    for (const expliquee of [
      instantCivil(2026, 6, 15, 10, 12),
      d("2026-06-15"),
      d("2025-12-01"),
      d("2031-06-01"),
      d("2029-12-01"), // mise en service + quadriennale
      d("2026-09-01"), // rapport + semestrielle
      d("2024-01-10"), // héritage + triennale
    ]) {
      expect(dateExpliqueeParUnFait(expliquee, f), cleJourCivil(expliquee)).toBe(true);
    }
    expect(dateExpliqueeParUnFait(d("2026-11-23"), f)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// De bout en bout, sur le faux client et le vrai référentiel
// ---------------------------------------------------------------------------

const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("./faux-prisma");
  const db = magasinVide();
  return { db, prisma: fauxPrisma(db) };
});

const { db, prisma } = await h;
const client = prisma as unknown as ClientLecture;

const ETAB_ID = "etab-1";
/** Établissement, annuelle, sans source : S1. */
const AERATION_R4222_20 = "aeration-controle-installations-r4222-20";
/** Équipement électrique, annuelle : S2 à S5 selon la mise en service. */
const ELEC_ANNUELLE = "elec-travail-periodique-annuelle";
/** Équipement électrique, contrôle UNIQUE à la mise en service. */
const ELEC_MISE_EN_SERVICE = "elec-travail-mise-en-service";
/** Portée par un SALARIÉ (ADR-023) : ne naît que d'un titre déclaré, et sa
 *  ligne porte le NOM de la personne dans ses `raisons`. */
const TITRE_SALARIE = "elec-salarie-attestation-medicale-voisinage";
const NOW = d("2026-09-17");

function poserEtablissement(equipements: EtablissementFaux["equipements"]) {
  db.etablissements = [
    {
      id: ETAB_ID,
      userId: "user-1",
      effectifSurSite: 5,
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
      referentielVersionCalendrier: null,
      prescriptionsParticulieres: [],
      equipements,
    },
  ];
}

function ligne(partiel: Partial<LigneFausse> & { id: string; obligationId: string }): LigneFausse {
  return {
    etablissementId: ETAB_ID,
    equipementId: null,
    salarieId: null,
    libelleObligation: "x",
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: NOW,
    statut: "planifiee",
    suiviDepuis: NOW,
    nbRapports: 0,
    nbActions: 0,
    ...partiel,
  };
}

beforeEach(() => {
  db.etablissements = [];
  db.salaries = [];
  db.titres = [];
  db.verifications = [];
  db.journal = [];
});

describe("comparerAuMoteur — l'état en base, le plan du moteur, leur différence", () => {
  // DEPUIS LA BASCULE (ADR-036, lot 4) il n'y a plus qu'une stratégie : l'outil
  // compare ce que la base PORTE à ce que la prochaine régénération ÉCRIRAIT.
  // Les dossiers de ces tests portent des dates d'avant la bascule ; les
  // catégories sont les mêmes qu'au passage à blanc du 2026-09-18.
  it("classe S1 en meme_jour_civil et S5 en mise_en_service, et le rejeu à J+400 est vide", async () => {
    poserEtablissement([
      {
        id: "eq-1",
        libelle: "Armoire",
        categorie: "INSTALLATION_ELECTRIQUE",
        caracteristiques: null,
        actif: true,
        dateMiseEnService: d("2026-09-01"),
      },
    ]);
    const origineS1 = instantCivil(2026, 6, 15, 10, 12);
    db.verifications = [
      ligne({
        id: "s1",
        obligationId: AERATION_R4222_20,
        statut: "a_planifier",
        datePrevue: origineS1,
        suiviDepuis: origineS1,
      }),
      ligne({
        id: "s5",
        obligationId: ELEC_ANNUELLE,
        equipementId: "eq-1",
        statut: "a_planifier",
        datePrevue: d("2026-09-16"),
        suiviDepuis: d("2026-09-16"),
      }),
    ];
    const lecture = await lireEntrees(client, ETAB_ID);
    const c = comparerAuMoteur(lecture, NOW);

    const s1 = c.ecarts.find((e) => e.ligne === "s1")!;
    expect(s1.categorie).toBe("meme_jour_civil");
    expect(s1.apres.source).toBe("origine");
    const s5 = c.ecarts.find((e) => e.ligne === "s5")!;
    expect(s5.categorie).toBe("mise_en_service");
    expect(s5.avant.datePrevue).toEqual(d("2026-09-16"));
    expect(s5.apres.datePrevue).toEqual(d("2027-09-01"));
    expect(s5.apres.statut).toBe("planifiee");
    // Le reste du dossier — les obligations d'établissement et d'équipement à
    // créer — n'a pas d'état en base : compté, pas classé.
    expect(c.comptes.inexplique).toBe(0);
    expect(c.comptes.date_arbitraire).toBe(0);
    expect(c.aCreer).toBeGreaterThan(0);
    expect(c.ecarts.map((e) => e.ligne).sort()).toEqual(["s1", "s5"]);
    // Aucun nom : les écarts ne portent que des identifiants.
    for (const e of c.ecarts) {
      expect(Object.keys(e).sort()).toEqual(
        ["apres", "avant", "categorie", "cleUnique", "equipementId", "ligne", "obligationId", "salarieId"],
      );
    }

    const j400 = rejouerPlusTard(lecture, c.plan, NOW, ajouterJours(NOW, 400));
    expect(planVide(j400), JSON.stringify(j400.aMettreAJour, null, 2)).toBe(true);
  });

  it("un ponctuel soldé dont la mise en service est saisie après coup ne tombe pas en inexplique", async () => {
    // Le scénario de la relecture neutre (2026-09-18), avec ses dates. La ligne
    // du contrôle unique naît le 10/03 sans mise en service, donc datée de son
    // origine ; un rapport conforme est déposé le 02/04 ; la mise en service est
    // saisie ENSUITE au 05/01. Le moteur date le ponctuel de son événement.
    poserEtablissement([
      {
        id: "eq-1",
        libelle: "Armoire",
        categorie: "INSTALLATION_ELECTRIQUE",
        caracteristiques: null,
        actif: true,
        dateMiseEnService: d("2026-01-05"),
      },
    ]);
    db.verifications = [
      ligne({
        id: "ponctuel",
        obligationId: ELEC_MISE_EN_SERVICE,
        equipementId: "eq-1",
        periodicite: "mise_en_service_uniquement",
        statut: "realisee_conforme",
        datePrevue: d("2026-03-10"),
        suiviDepuis: d("2026-03-10"),
        rapports: [{ dateRapport: d("2026-04-02"), resultat: "conforme" }],
        nbRapports: 1,
      }),
    ];
    const lecture = await lireEntrees(client, ETAB_ID);
    const c = comparerAuMoteur(lecture, NOW);
    const e = c.ecarts.find((x) => x.ligne === "ponctuel")!;
    expect(e.avant.datePrevue).toEqual(d("2026-03-10"));
    expect(e.apres.datePrevue).toEqual(d("2026-01-05"));
    expect(e.apres.source).toBe("ponctuel_solde");
    expect(e.apres.statut).toBe("realisee_conforme");
    expect(e.categorie).toBe("mise_en_service");
    expect(c.comptes.inexplique).toBe(0);
  });

  it("une date de démonstration qu'aucun fait n'explique est date_arbitraire, pas inexplique", async () => {
    poserEtablissement([]);
    db.verifications = [
      ligne({
        id: "demo",
        obligationId: AERATION_R4222_20,
        statut: "planifiee",
        datePrevue: d("2026-11-23"),
        suiviDepuis: d("2026-03-10"),
      }),
    ];
    const lecture = await lireEntrees(client, ETAB_ID);
    const c = comparerAuMoteur(lecture, NOW);
    expect(c.ecarts.find((e) => e.ligne === "demo")?.categorie).toBe("date_arbitraire");
  });
});

describe("l'export JSON — des identifiants, jamais un nom", () => {
  it("le plan BRUT porte le nom du salarié, le plan projeté ne le porte plus", async () => {
    // LE DÉFAUT RELEVÉ PAR LA RELECTURE NEUTRE (2026-09-18) : `--json`
    // sérialisait les plans en entier, et une ligne de titre naît avec
    // `raisons: ["titre détenu par Prénom Nom"]`. Le mode d'emploi affirmait
    // qu'aucun nom n'est imprimé ; c'était vrai de la console, faux du fichier.
    //
    // La première assertion n'est pas décorative : sans elle, le test passerait
    // au vert le jour où le générateur cesserait de produire cette ligne, et ne
    // prouverait plus rien de la projection.
    poserEtablissement([]);
    db.salaries = [
      { id: "sal-1", etablissementId: ETAB_ID, actif: true, nom: "Dupont", prenom: "Jeanne" },
    ];
    db.titres = [
      {
        obligationId: TITRE_SALARIE,
        salarieId: "sal-1",
        delivreLe: d("2024-01-10"),
        echeanceLe: d("2029-01-10"),
      },
    ];
    const lecture = await lireEntrees(client, ETAB_ID);
    const c = comparerAuMoteur(lecture, NOW);

    const brut = JSON.stringify(c.plan);
    expect(brut, "le plan brut porte bien le nom : la projection a quelque chose à retirer").toContain(
      "Jeanne Dupont",
    );

    const projete = JSON.stringify({
      avant: lecture.existantes.map(projeterLigne),
      plan: projeterPlan(c.plan),
      ecarts: c.ecarts,
      comptes: c.comptes,
    });
    expect(projete).not.toContain("Jeanne");
    expect(projete).not.toContain("Dupont");
    // Et la ligne du titre est bien là, sous son identifiant : la projection
    // retire le nom, pas la ligne.
    expect(projete).toContain("sal-1");
    expect(projete).toContain(TITRE_SALARIE);
  });

  it("aucun champ de libellé ne survit à la projection, quelle que soit sa source", () => {
    // `libelleObligation` d'une ligne SUR MESURE vaut le libellé de la
    // prescription — qui nomme couramment l'assureur (ADR-032) —, et `raisons`
    // porte la phrase de la surcharge. Ni l'un ni l'autre n'a d'affaire dans un
    // fichier qu'on transporte hors du poste.
    const plan: PlanReconciliation = {
      aCreer: [
        {
          cleUnique: "prescription:p1::eq-1",
          obligationId: "prescription:p1",
          libelleObligation: "Visite imposée par MutuelleTruc — police 4471",
          equipementId: "eq-1",
          salarieId: null,
          periodicite: "semestrielle",
          realisateurRequis: [],
          datePrevue: d("2026-09-17"),
          statut: "a_planifier",
          criticiteObligation: 4,
          raisons: ["titre détenu par Jeanne Dupont", "prescription de MutuelleTruc"],
          prescriptionId: "p1",
          sources: { premierPas: "semestrielle", miseEnService: null, dateDuTitre: null },
        },
      ],
      aMettreAJour: [
        {
          id: "v-1",
          obligationId: "o",
          libelleObligation: "Contrôle demandé par MutuelleTruc",
          periodicite: "annuelle",
          realisateurRequis: ["exploitant"],
          datePrevue: d("2026-09-17"),
          statut: "planifiee",
          prescriptionId: "p1",
          source: "rapport",
        },
      ],
      aArchiver: [{ id: "v-2" }],
      aDesarchiver: [{ id: "v-3" }],
      aSupprimer: ["v-4"],
      inchangees: 7,
    };
    const projete = projeterPlan(plan);
    const texte = JSON.stringify(projete);
    expect(texte).not.toContain("MutuelleTruc");
    expect(texte).not.toContain("Jeanne");
    expect(texte).not.toContain("4471");
    // Les clés de libellé ont disparu, pas seulement leur contenu.
    for (const v of projete.aCreer) {
      expect(Object.keys(v).sort()).toEqual([
        "cleUnique",
        "datePrevue",
        "equipementId",
        "obligationId",
        "periodicite",
        "prescriptionId",
        "salarieId",
        "sources",
        "statut",
      ]);
    }
    for (const m of projete.aMettreAJour) {
      expect(Object.keys(m).sort()).toEqual([
        "datePrevue",
        "id",
        "obligationId",
        "periodicite",
        "prescriptionId",
        "source",
        "statut",
      ]);
    }
    // Et ce que l'export doit garder est gardé.
    expect(projete.aArchiver).toEqual(["v-2"]);
    expect(projete.aDesarchiver).toEqual(["v-3"]);
    expect(projete.aSupprimer).toEqual(["v-4"]);
    expect(projete.inchangees).toBe(7);
  });

  it("une ligne en base perd son libellé et garde ses faits", () => {
    const projetee = projeterLigne({
      id: "v-1",
      obligationId: "o",
      equipementId: "eq-1",
      salarieId: null,
      libelleObligation: "Contrôle demandé par MutuelleTruc",
      periodicite: "annuelle",
      realisateurRequis: ["exploitant"],
      datePrevue: d("2026-06-01"),
      statut: "planifiee",
      porteUnePreuve: true,
      derniereRealisation: d("2025-06-01"),
      dernierResultat: "conforme",
      archiveLe: null,
      prescriptionId: null,
      suiviDepuis: d("2025-01-01"),
    });
    expect(JSON.stringify(projetee)).not.toContain("MutuelleTruc");
    expect(projetee).toMatchObject({
      id: "v-1",
      obligationId: "o",
      equipementId: "eq-1",
      datePrevue: d("2026-06-01"),
      suiviDepuis: d("2025-01-01"),
      derniereRealisation: d("2025-06-01"),
      dernierResultat: "conforme",
      porteUnePreuve: true,
    });
    expect(projetee).not.toHaveProperty("libelleObligation");
    expect(projetee).not.toHaveProperty("realisateurRequis");
  });

  it("le script exporte les plans PROJETÉS, et rien d'autre", () => {
    // La garde qui relie le module au script : le fichier écrit doit passer par
    // `projeterPlan` et `projeterLigne`. Sans elle, la projection pourrait
    // rester exportée et inutilisée.
    const script = readFileSync(join(RACINE, SCRIPT), "utf8");
    expect(script).toMatch(/avant: r\.avant\.map\(projeterLigne\)/);
    expect(script).toMatch(/plan: projeterPlan\(/);
    expect(script).toMatch(/planJ400: projeterPlan\(/);
    // Aucun plan ni aucune lecture bruts dans l'objet sérialisé.
    expect(script).not.toMatch(/avant: r\.avant,/);
    expect(script).not.toMatch(/plan: r\.comparaison\.plan,/);
  });
});

describe("appliquerPlanEnMemoire — ce que la base porterait après le plan", () => {
  it("supprime, met à jour (et désarchive), archive, désarchive, crée suivie depuis `now`", () => {
    const base = {
      obligationId: "o",
      equipementId: null,
      salarieId: null,
      libelleObligation: "x",
      periodicite: "annuelle" as const,
      realisateurRequis: [],
      datePrevue: d("2026-01-01"),
      statut: "planifiee" as const,
      porteUnePreuve: false,
      suiviDepuis: d("2025-01-01"),
    };
    const existantes = [
      { ...base, id: "a-supprimer" },
      { ...base, id: "a-mettre-a-jour", archiveLe: d("2026-02-02") },
      { ...base, id: "a-archiver" },
      { ...base, id: "a-desarchiver", archiveLe: d("2026-02-02") },
      { ...base, id: "inchangee" },
    ];
    const plan: PlanReconciliation = {
      aSupprimer: ["a-supprimer"],
      aMettreAJour: [
        {
          id: "a-mettre-a-jour",
          obligationId: "o2",
          libelleObligation: "y",
          periodicite: "semestrielle",
          realisateurRequis: ["exploitant"],
          datePrevue: d("2026-06-01"),
          statut: "a_planifier",
          prescriptionId: "p",
        },
      ],
      aArchiver: [{ id: "a-archiver" }],
      aDesarchiver: [{ id: "a-desarchiver" }],
      aCreer: [
        {
          cleUnique: "o3::@etablissement",
          obligationId: "o3",
          libelleObligation: "z",
          equipementId: null,
          salarieId: null,
          periodicite: "annuelle",
          realisateurRequis: [],
          datePrevue: d("2026-09-17"),
          statut: "a_planifier",
          criticiteObligation: 3,
          raisons: [],
          prescriptionId: null,
          sources: { premierPas: "annuelle", miseEnService: null, dateDuTitre: null },
        },
      ],
      inchangees: 1,
    };
    const apres = appliquerPlanEnMemoire(existantes, plan, NOW);
    const par = new Map(apres.map((e) => [e.id, e]));
    expect(par.has("a-supprimer")).toBe(false);
    expect(par.get("a-mettre-a-jour")).toMatchObject({
      obligationId: "o2",
      periodicite: "semestrielle",
      datePrevue: d("2026-06-01"),
      statut: "a_planifier",
      prescriptionId: "p",
      archiveLe: null,
      suiviDepuis: d("2025-01-01"),
    });
    expect(par.get("a-archiver")?.archiveLe).toEqual(NOW);
    expect(par.get("a-desarchiver")?.archiveLe).toBeNull();
    expect(par.get("inchangee")).toEqual(existantes[4]);
    expect(par.get("neuve:o3::@etablissement")).toMatchObject({
      obligationId: "o3",
      porteUnePreuve: false,
      derniereRealisation: null,
      suiviDepuis: NOW,
    });
  });
});

// ---------------------------------------------------------------------------
// La garde de lecture seule du script
// ---------------------------------------------------------------------------

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SCRIPT = "scripts/passage-a-blanc-echeances.ts";

/**
 * Le module que ce spécificateur désigne, ou `null` pour un paquet.
 *
 * Même résolution que `version-moteur.test.ts` : `@/` vers `src/`, relatif
 * depuis le fichier, et les trois extensions candidates.
 */
function resoudre(depuis: string, specifieur: string): string | null {
  let base: string;
  if (specifieur.startsWith("@/")) base = posix.join("src", specifieur.slice(2));
  else if (specifieur.startsWith(".")) base = posix.join(posix.dirname(depuis), specifieur);
  else return null;
  for (const candidat of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(join(RACINE, candidat))) return candidat;
  }
  return null;
}

/**
 * TOUT ce que le script embarque, de proche en proche — la fermeture
 * transitive, et non une liste tenue à la main.
 *
 * La première rédaction énumérait quatre fichiers (relecture neutre du
 * 2026-09-18) : son titre promettait « les modules qu'il importe », elle n'en
 * regardait qu'une part, et un module ajouté à la chaîne serait sorti de la
 * garde sans que personne ne le voie. Le calcul, lui, ne se périme pas.
 *
 * Les paquets ne sont pas suivis : `@prisma/client` n'est pas du code de ce
 * dépôt, et c'est lui qui PORTE les méthodes d'écriture. C'est leur APPEL qu'on
 * cherche ici, et un appel s'écrit dans nos fichiers.
 */
function fermetureDuScript(): string[] {
  const vus = new Set<string>();
  const aVoir = [SCRIPT];
  while (aVoir.length > 0) {
    const chemin = aVoir.pop()!;
    if (vus.has(chemin)) continue;
    vus.add(chemin);
    const code = readFileSync(join(RACINE, chemin), "utf8");
    for (const m of code.matchAll(/from\s+["']([^"']+)["']/g)) {
      const cible = resoudre(chemin, m[1]);
      if (cible !== null) aVoir.push(cible);
    }
  }
  return [...vus].sort();
}

/** Les commentaires neutralisés, chaînes préservées (voir
 *  `echeance-de-ligne.test.ts`). */
function sansCommentaires(code: string): string {
  return code.replace(
    /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (tout: string, chaine: string | undefined) => chaine ?? tout.replace(/[^\n]/g, " "),
  );
}

describe("scripts/passage-a-blanc-echeances.ts — lecture seule stricte", () => {
  const fermeture = fermetureDuScript();
  const codes = fermeture.map((chemin) => ({
    chemin,
    code: sansCommentaires(readFileSync(join(RACINE, chemin), "utf8")),
  }));

  it("la fermeture des imports est calculée, et elle tient les modules du passage à blanc", () => {
    // Garde-fou de la garde : une résolution cassée rendrait la liste réduite au
    // script, et l'assertion suivante passerait presque à vide.
    expect(fermeture).toContain(SCRIPT);
    expect(fermeture).toContain("src/lib/calendrier/passage-a-blanc.ts");
    expect(fermeture).toContain("src/lib/calendrier/decision-par-faits.ts");
    expect(fermeture).toContain("src/lib/calendrier/passe.ts");
    expect(fermeture).toContain("src/lib/calendrier/generateur.ts");
    expect(fermeture.length).toBeGreaterThan(20);
    // Et ce que le script n'embarque PAS : le client partagé de l'application,
    // qui porte la session et les écritures du produit. Il construit le sien.
    expect(fermeture).not.toContain("src/lib/prisma.ts");
  });

  it("ouvre sa transaction par `SET TRANSACTION READ ONLY`, et n'offre aucun `--appliquer`", () => {
    const script = codes.find((c) => c.chemin === SCRIPT)!.code;
    expect(script).toMatch(/\$executeRaw`SET TRANSACTION READ ONLY`/);
    expect(script).not.toMatch(/--appliquer/);
  });

  it("aucune méthode d'écriture Prisma, nulle part dans la fermeture de ses imports", () => {
    // `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`,
    // `deleteMany`, et le brut : `$executeRaw` hors de l'instruction READ ONLY,
    // `$executeRawUnsafe`, `$queryRawUnsafe`.
    const ecritures =
      /\.(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)\s*\(|\$executeRawUnsafe|\$queryRawUnsafe/;
    const fautes: string[] = [];
    for (const { chemin, code } of codes) {
      const sansReadOnly = code.replace(/\$executeRaw`SET TRANSACTION READ ONLY`/g, "");
      code.split("\n").forEach((l, i) => {
        if (ecritures.test(l)) fautes.push(`${chemin}:${i + 1} ${l.trim()}`);
      });
      if (/\$executeRaw/.test(sansReadOnly)) fautes.push(`${chemin} : \`$executeRaw\` hors READ ONLY`);
    }
    expect(fautes).toEqual([]);
  });

  it("le motif reconnaît bien une écriture", () => {
    // La garde d'une garde : un motif trop étroit passerait à vide.
    const ecritures =
      /\.(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)\s*\(|\$executeRawUnsafe|\$queryRawUnsafe/;
    for (const l of [
      "await tx.verification.updateMany({ where, data })",
      "prisma.equipement.create({ data })",
      "tx.rapportVerification.delete ({ where })",
      'await tx.$executeRawUnsafe("UPDATE …")',
    ]) {
      expect(ecritures.test(l), l).toBe(true);
    }
    expect(ecritures.test("await tx.verification.findMany({ where })")).toBe(false);
    expect(ecritures.test("const misesAJour = new Map(plan.aMettreAJour.map((m) => [m.id, m]));")).toBe(false);
  });
});
