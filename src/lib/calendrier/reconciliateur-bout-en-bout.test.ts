// Maillon 5 de l'audit de bout en bout (lot 2, 2026-09-27). Ce que les suites
// existantes tiennent par morceaux — la comparaison du sceau avec un prisma
// bouchonné (`queries.test.ts`), la réparation à l'affichage avec
// `calendrierDesynchronise` bouchonné (`regeneration-sure.test.ts`) — est
// rejoué ici D'UN BOUT À L'AUTRE : vrai `assurerCalendrierAJour`, vraie
// `calendrierDesynchronise`, vraie régénération, sur le faux client.
//
// Éprouvé en cassant, un à un (2026-09-28) — et dans trois cas sur quatre la
// suite existante restait VERTE sous la casse, ce que ce fichier comble :
//   - sceau comparé sans sa part moteur (`queries.ts`) : (b) rouge ;
//     `queries.test.ts` vert ;
//   - `updateMany` sans `datePrevue`/`statut` (`actions.ts`) : les deux (e)
//     rouges ; `actions.test.ts` vert — son crochet tire avant la lecture des
//     rapports, et le plan voit alors le dépôt ;
//   - non-convergence sans `marquerCalendrierPerime` : (e) trois passes
//     rouge ; `actions.test.ts` vert ;
//   - `archiveLe: null` retiré d'`aMettreAJour` : (d) rouge ;
//   - un accès à `declarationEtatPermanent` dans `genererCalendrier` : (f)
//     rouge.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EquipementFaux, LigneFausse } from "./faux-prisma";
import {
  REFERENTIEL_VERSION,
  empreinteReferentiel,
} from "@/lib/referentiels/conformite";
import {
  SCEAU_CALENDRIER,
  VERSION_MOTEUR_CALENDRIER,
  sceauCalendrier,
} from "./version-moteur";
import { cleJourCivil, depuisCleJourCivil } from "@/lib/dates";
import { estVerificationEnRetard } from "@/lib/dates/retard";

const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("./faux-prisma");
  const db = magasinVide();
  const modeles = new Set<string>();
  const brut = fauxPrisma(db);
  // Relève chaque modèle que le code touche : la régénération ne doit
  // atteindre ni `declarationEtatPermanent` ni aucun autre modèle que les
  // siens.
  const prisma = new Proxy(brut, {
    get(cible, cle, recepteur) {
      if (typeof cle === "string") modeles.add(cle);
      return Reflect.get(cible, cle, recepteur);
    },
  });
  return { db, prisma, modeles };
});

vi.mock("@/lib/prisma", async () => ({ prisma: (await h).prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: null })),
  getOptionalUser: vi.fn(async () => ({ id: "user-1", email: null })),
}));

const { db, modeles } = await h;
const { genererCalendrier } = await import("./actions");
const { assurerCalendrierAJour } = await import("./regeneration-sure");

const ETAB_ID = "etab-1";
const ELEC_ANNUELLE = "elec-travail-periodique-annuelle";
const ELEC_MISE_EN_SERVICE = "elec-travail-mise-en-service";
const d = (cle: string) => depuisCleJourCivil(cle);

function poserEtablissement(
  equipements: Partial<EquipementFaux>[],
  sceau: string | null = null,
) {
  const etab = {
    id: ETAB_ID,
    userId: "user-1",
    effectifSurSite: 5,
    effectifEntreprise: 5,
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
    chiffonsImpregnes: null,
    referentielVersionCalendrier: sceau,
    prescriptionsParticulieres: [],
    equipements: equipements.map((e) => ({
      libelle: `Équipement ${e.id}`,
      categorie: "INSTALLATION_ELECTRIQUE",
      caracteristiques: null,
      actif: true,
      dateMiseEnService: null,
      ...e,
    })) as EquipementFaux[],
  };
  db.etablissements = [etab];
  return etab;
}

function ligne(p: Partial<LigneFausse> & { id: string }): LigneFausse {
  return {
    etablissementId: ETAB_ID,
    equipementId: null,
    salarieId: null,
    obligationId: ELEC_ANNUELLE,
    libelleObligation: "Vérification annuelle",
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: d("2020-01-01"),
    statut: "planifiee",
    suiviDepuis: d("2020-01-01"),
    nbRapports: 0,
    nbActions: 0,
    ...p,
  };
}

const lue = (id: string) => db.verifications.find((v) => v.id === id);
const ecritures = () =>
  db.journal.filter((j) =>
    /deleteMany|updateMany|createMany|etablissement\.update/.test(j.operation),
  );

beforeEach(() => {
  db.etablissements = [];
  db.salaries = [];
  db.titres = [];
  db.verifications = [];
  db.faireEchouer = null;
  db.apresLecture = null;
  db.journal = [];
  modeles.clear();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// a + b — le sceau change, l'ouverture régénère
// ---------------------------------------------------------------------------

describe("a/b — un sceau périmé est réparé à l'ouverture, de bout en bout", () => {
  const empreinte = empreinteReferentiel();
  const cas: [string, string][] = [
    ["(a) version du référentiel antérieure", sceauCalendrier("2026-09-26.9", empreinte, VERSION_MOTEUR_CALENDRIER)],
    ["(a) empreinte différente, version identique", sceauCalendrier(REFERENTIEL_VERSION, "154-0000000000000000", VERSION_MOTEUR_CALENDRIER)],
    ["(b) moteur précédent, référentiel identique", sceauCalendrier(REFERENTIEL_VERSION, empreinte, VERSION_MOTEUR_CALENDRIER - 1)],
    ["(b) moteur 0 (forme d'avant la constante)", sceauCalendrier(REFERENTIEL_VERSION, empreinte, 0)],
  ];

  it.each(cas)("%s → régénère, pose le sceau courant, puis ne fait plus rien", async (_nom, ancien) => {
    expect(ancien).not.toBe(SCEAU_CALENDRIER);
    poserEtablissement([{ id: "eq-1" }], ancien);

    await expect(assurerCalendrierAJour(ETAB_ID)).resolves.toBe(true);
    expect(db.etablissements[0].referentielVersionCalendrier).toBe(SCEAU_CALENDRIER);
    expect(db.verifications.some((v) => v.equipementId === "eq-1")).toBe(true);

    db.journal = [];
    await expect(assurerCalendrierAJour(ETAB_ID)).resolves.toBe(false);
    expect(ecritures()).toEqual([]);
  });

  it("le sceau courant ne régénère rien", async () => {
    poserEtablissement([{ id: "eq-1" }], SCEAU_CALENDRIER);
    await expect(assurerCalendrierAJour(ETAB_ID)).resolves.toBe(false);
    expect(db.verifications).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// c — la périodicité change au référentiel pour une ligne existante
// ---------------------------------------------------------------------------
// Le référentiel dit « annuelle » ; la ligne en base porte encore « triennale »
// (écrite par un référentiel antérieur). C'est le constat B du 2026-09-09.

describe("c — une périodicité changée au référentiel réaligne la ligne ouverte", () => {
  it("sans rapport : date recalculée depuis la mise en service", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2025-06-01") }]);
    db.verifications = [
      ligne({ id: "c1", equipementId: "eq-1", periodicite: "triennale", datePrevue: d("2028-06-01"), suiviDepuis: d("2025-09-10") }),
    ];
    await genererCalendrier(ETAB_ID);
    expect(lue("c1")?.periodicite).toBe("annuelle");
    expect(lue("c1")?.datePrevue).toEqual(d("2026-06-01"));
  });

  it("avec rapport : dernier rapport + nouveau rythme, rapport conservé", async () => {
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [
      ligne({
        id: "c2", equipementId: "eq-1", periodicite: "triennale",
        datePrevue: d("2029-03-01"), suiviDepuis: d("2024-01-01"),
        rapports: [{ dateRapport: d("2026-03-01"), resultat: "conforme" }], nbRapports: 1,
      }),
    ];
    await genererCalendrier(ETAB_ID);
    expect(lue("c2")?.periodicite).toBe("annuelle");
    expect(lue("c2")?.datePrevue).toEqual(d("2027-03-01"));
    expect(lue("c2")?.nbRapports).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// d — disparition puis retour d'un porteur (équipement)
// ---------------------------------------------------------------------------

describe("d — un appareil désactivé puis réactivé", () => {
  it("avec trace : archivée puis rouverte, même identifiant, rapport et action intacts", async () => {
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [
      ligne({
        id: "d1", equipementId: "eq-1", datePrevue: d("2027-03-01"), suiviDepuis: d("2024-01-01"),
        rapports: [{ dateRapport: d("2026-03-01"), resultat: "conforme" }], nbRapports: 1, nbActions: 1,
      }),
    ];
    await genererCalendrier(ETAB_ID);
    expect(lue("d1")?.archiveLe ?? null).toBeNull();

    db.etablissements[0].equipements[0].actif = false;
    await genererCalendrier(ETAB_ID);
    expect(lue("d1")?.archiveLe).toBeInstanceOf(Date);

    db.etablissements[0].equipements[0].actif = true;
    await genererCalendrier(ETAB_ID);
    expect(lue("d1")?.archiveLe ?? null).toBeNull();
    expect(lue("d1")?.datePrevue).toEqual(d("2027-03-01"));
    expect(lue("d1")?.nbRapports).toBe(1);
    expect(lue("d1")?.nbActions).toBe(1);

    const r = await genererCalendrier(ETAB_ID);
    expect(r.created + r.updated + r.deleted + r.archived).toBe(0);
  });

  it("LIMITE ÉCRITE (chantiers-ouverts § 11) — sans trace, le retard ne survit pas à l'aller-retour", async () => {
    // Caractérise le comportement actuel ; ne le valide pas.
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [
      ligne({ id: "d2", equipementId: "eq-1", statut: "a_planifier", datePrevue: d("2020-01-01"), suiviDepuis: d("2020-01-01") }),
    ];
    await genererCalendrier(ETAB_ID);
    const avant = lue("d2")!;
    expect(estVerificationEnRetard({ ...avant, archiveLe: avant.archiveLe ?? null }, new Date())).toBe(true);

    db.etablissements[0].equipements[0].actif = false;
    await genererCalendrier(ETAB_ID);
    expect(lue("d2")).toBeUndefined();

    db.etablissements[0].equipements[0].actif = true;
    await genererCalendrier(ETAB_ID);
    const neuve = db.verifications.find((v) => v.obligationId === ELEC_ANNUELLE && v.equipementId === "eq-1")!;
    expect(neuve.id).not.toBe("d2");
    expect(estVerificationEnRetard({ ...neuve, archiveLe: neuve.archiveLe ?? null }, new Date())).toBe(false);
  });
});

describe("d bis — un salarié sorti de l'effectif, puis revenu", () => {
  // Le même aller-retour qu'un appareil, sur le troisième porteur : la ligne
  // d'un titre dont le détenteur part est archivée si elle porte une trace
  // (décision du 2026-09-17), et doit revenir, la même, à son retour.
  const TITRE = "elec-salarie-attestation-medicale-voisinage";
  it("avec trace : archivée puis rouverte, même identifiant, action intacte", async () => {
    poserEtablissement([]);
    db.salaries = [{ id: "sal-1", etablissementId: ETAB_ID, actif: true, nom: "N", prenom: "P" }];
    db.titres = [{ obligationId: TITRE, salarieId: "sal-1", delivreLe: d("2024-03-01"), echeanceLe: d("2029-03-01") }];
    db.verifications = [
      ligne({
        id: "s1", salarieId: "sal-1", obligationId: TITRE, libelleObligation: "Attestation médicale",
        periodicite: "quinquennale", datePrevue: d("2029-03-01"), suiviDepuis: d("2024-03-01"), nbActions: 1,
      }),
    ];
    await genererCalendrier(ETAB_ID);
    expect(lue("s1")?.archiveLe ?? null).toBeNull();

    db.salaries[0].actif = false;
    await genererCalendrier(ETAB_ID);
    expect(lue("s1")?.archiveLe).toBeInstanceOf(Date);

    db.salaries[0].actif = true;
    await genererCalendrier(ETAB_ID);
    expect(lue("s1")?.archiveLe ?? null).toBeNull();
    expect(lue("s1")?.datePrevue).toEqual(d("2029-03-01"));
    expect(lue("s1")?.nbActions).toBe(1);
    expect(db.verifications.filter((v) => v.obligationId === TITRE)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// e — jamais de perte : un écrivain qui ne s'arrête pas
// ---------------------------------------------------------------------------

describe("e — un dépôt APRÈS la lecture des rapports", () => {
  // Le crochet `apresLecture` du faux client tire après la lecture des LIGNES
  // mais AVANT celle des rapports (`passe.ts` lit les rapports en dernier) :
  // un rapport posé dans le crochet est donc VU par le plan, qui calcule la
  // même date que le dépôt, et l'écriture non conditionnée ne se distingue
  // plus de la conditionnée. Ici le rapport n'est visible qu'à la passe
  // suivante — c'est la fenêtre réelle d'un dépôt commité après la lecture.
  it("le roulement n'est pas écrasé par un plan calculé sans le rapport", async () => {
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [ligne({ id: "e0", equipementId: "eq-1", statut: "planifiee" })];
    const ROULEE = d("2027-09-09");
    db.apresLecture = () => {
      const v = lue("e0")!;
      v.datePrevue = ROULEE;
      v.statut = "planifiee";
      v.nbRapports = 1;
      // Le rapport n'apparaît qu'à la lecture suivante.
      db.apresLecture = () => {
        lue("e0")!.rapports = [{ dateRapport: d("2026-09-09"), resultat: "conforme" }];
      };
    };
    await genererCalendrier(ETAB_ID);
    expect(lue("e0")?.datePrevue).toEqual(ROULEE);
    expect(lue("e0")?.statut).toBe("planifiee");
  });
});

describe("e — trois passes sans converger", () => {
  it("rend la main, garde la preuve, et efface le sceau pour que l'ouverture suivante reprenne", async () => {
    // Ligne applicable, planifiée sans source : le plan la réécrit « à
    // planifier », par un `updateMany` conditionné sur la date lue.
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [ligne({ id: "e1", equipementId: "eq-1", statut: "planifiee" })];
    let n = 0;
    const ecrivain = () => {
      n += 1;
      const v = lue("e1");
      // À chaque passe, entre la lecture et l'écriture : une action, et la
      // date qui bouge — chaque passe voit un monde que la suivante ne
      // reconnaît pas.
      if (v) { v.nbActions += 1; v.datePrevue = new Date(v.datePrevue.getTime() + 86_400_000); }
      db.apresLecture = ecrivain;
    };
    db.apresLecture = ecrivain;

    await genererCalendrier(ETAB_ID);
    db.apresLecture = null;

    expect(n).toBe(3);
    expect(lue("e1")).toBeDefined();
    expect(lue("e1")?.nbActions).toBe(3);
    expect(db.etablissements[0].referentielVersionCalendrier ?? null).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// f — états permanents : jamais générés, déclaration jamais touchée
// ---------------------------------------------------------------------------

describe("f — la régénération ne touche que ses quatre modèles", () => {
  it("aucun accès à `declarationEtatPermanent` ni à un autre modèle", async () => {
    poserEtablissement([{ id: "eq-1" }]);
    await assurerCalendrierAJour(ETAB_ID);
    await genererCalendrier(ETAB_ID);
    const touches = [...modeles].filter((m) => !m.startsWith("$") && m !== "then");
    expect(touches.sort()).toEqual(
      ["etablissement", "rapportVerification", "titreSalarie", "verification"],
    );
  });
});

// ---------------------------------------------------------------------------
// g — constat 2 du 2026-09-09 : mise en service ancienne, deux passages
// ---------------------------------------------------------------------------

describe("g2 — une mise en service de 2015, créée puis repassée", () => {
  it("la seconde passe n'écrit rien, le statut ne bouge pas", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2015-06-01") }]);
    // L'origine d'une ligne neuve est le jour de sa création : prise sur
    // l'horloge ICI, pas relue sur la ligne testée (contre-lecture du lot 3).
    const aujourdhui = d(cleJourCivil(new Date()));
    await genererCalendrier(ETAB_ID);
    const photo = JSON.stringify(db.verifications);
    const mes = db.verifications.find((v) => v.obligationId === ELEC_MISE_EN_SERVICE)!;
    // ~~`d("2015-06-01")`~~ [2026-09-28, D8 : une mise en service antérieure
    // au suivi date le ponctuel à l'origine.]
    expect(mes.datePrevue).toEqual(aujourdhui);

    db.journal = [];
    const r = await genererCalendrier(ETAB_ID);
    expect(r.created + r.updated + r.deleted + r.archived).toBe(0);
    expect(ecritures()).toEqual([]);
    expect(JSON.stringify(db.verifications)).toBe(photo);
  });
});

// ---------------------------------------------------------------------------
// D8 — un ponctuel déjà posé à sa mise en service antérieure au suivi
// ---------------------------------------------------------------------------

describe("D8 — le ponctuel posé à une mise en service antérieure au suivi est redaté, sans perte", () => {
  // ~~« même identifiant, action et rapport gardés »~~ [2026-09-28,
  // contre-lecture du lot 3 : le montage ne posait aucun rapport. Un ponctuel
  // qui a un rapport est soldé, et D8 ne redate pas un ponctuel soldé — c'est
  // le second cas ci-dessous.]
  it("même identifiant, action gardée, date ramenée à l'origine ; la passe suivante n'écrit rien", async () => {
    // L'état qu'un moteur 5 a écrit en production : la ligne datée du
    // 2015-06-01, « à planifier », onze ans de retard, avec une action.
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2015-06-01") }]);
    db.verifications = [
      ligne({
        id: "p1", equipementId: "eq-1", obligationId: ELEC_MISE_EN_SERVICE, libelleObligation: "Vérification initiale",
        periodicite: "mise_en_service_uniquement", realisateurRequis: ["organisme_accredite"],
        datePrevue: d("2015-06-01"), statut: "a_planifier", suiviDepuis: d("2026-01-15"), nbActions: 1,
      }),
    ];
    await genererCalendrier(ETAB_ID);
    const apres = lue("p1")!;
    expect(apres.datePrevue).toEqual(d("2026-01-15"));
    expect(apres.statut).toBe("a_planifier");
    expect(apres.nbActions).toBe(1);
    expect(apres.archiveLe ?? null).toBeNull();
    expect(db.verifications.filter((v) => v.obligationId === ELEC_MISE_EN_SERVICE)).toHaveLength(1);

    db.journal = [];
    const r = await genererCalendrier(ETAB_ID);
    expect(r.created + r.updated + r.deleted + r.archived).toBe(0);
    expect(ecritures()).toEqual([]);
  });
});

describe("D8 — un ponctuel SOLDÉ antérieur au suivi n'est pas redaté", () => {
  it("rapport et action gardés, date et statut inchangés ; la passe suivante n'écrit rien", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2015-06-01") }]);
    db.verifications = [
      ligne({
        id: "p2", equipementId: "eq-1", obligationId: ELEC_MISE_EN_SERVICE, libelleObligation: "Vérification initiale",
        periodicite: "mise_en_service_uniquement", realisateurRequis: ["organisme_accredite"],
        datePrevue: d("2015-06-01"), statut: "realisee_conforme", suiviDepuis: d("2026-01-15"),
        rapports: [{ dateRapport: d("2015-07-01"), resultat: "conforme" }], nbRapports: 1, nbActions: 1,
      }),
    ];
    await genererCalendrier(ETAB_ID);
    const apres = lue("p2")!;
    expect(apres.datePrevue).toEqual(d("2015-06-01"));
    expect(apres.statut).toBe("realisee_conforme");
    expect(apres.nbRapports).toBe(1);
    expect(apres.nbActions).toBe(1);
    expect(apres.archiveLe ?? null).toBeNull();

    db.journal = [];
    const r = await genererCalendrier(ETAB_ID);
    expect(r.created + r.updated + r.deleted + r.archived).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// D7 — la VGP en double sort : archivée si elle porte une trace
// ---------------------------------------------------------------------------

describe("D7 — levage : l'annuelle en double sort, sans perte", () => {
  const ANNUELLE = "levage-vgp-annuelle-charges";
  const PERSONNES = "levage-vgp-semestrielle-personnes";
  const vgp = (id: string, equipementId: string, obligationId: string, p: Partial<LigneFausse> = {}) =>
    ligne({
      id, equipementId, obligationId, libelleObligation: obligationId,
      periodicite: obligationId === ANNUELLE ? "annuelle" : "semestrielle",
      realisateurRequis: ["personne_qualifiee", "organisme_agree"],
      datePrevue: d("2027-01-10"), suiviDepuis: d("2026-01-10"), ...p,
    });

  it("sans réponse : l'annuelle avec rapport est archivée, celle sans trace supprimée, la semestrielle reste", async () => {
    // L'état qu'écrivait le référentiel d'avant D7 : deux VGP par appareil muet.
    poserEtablissement([
      { id: "palan-1", categorie: "EQUIPEMENT_LEVAGE" },
      { id: "palan-2", categorie: "EQUIPEMENT_LEVAGE" },
    ]);
    db.verifications = [
      vgp("a1", "palan-1", ANNUELLE, {
        rapports: [{ dateRapport: d("2026-01-10"), resultat: "conforme" }], nbRapports: 1, nbActions: 1,
      }),
      vgp("s1", "palan-1", PERSONNES, { datePrevue: d("2026-07-10") }),
      vgp("a2", "palan-2", ANNUELLE),
      vgp("s2", "palan-2", PERSONNES, { datePrevue: d("2026-07-10") }),
    ];

    await genererCalendrier(ETAB_ID);

    // Trace : archivée, même identifiant, rapport et action attachés.
    expect(lue("a1")?.archiveLe).toBeInstanceOf(Date);
    expect(lue("a1")?.nbRapports).toBe(1);
    expect(lue("a1")?.nbActions).toBe(1);
    // Sans trace : supprimée.
    expect(lue("a2")).toBeUndefined();
    // La plus exigeante reste, ouverte, sur chaque appareil.
    for (const id of ["s1", "s2"]) expect(lue(id)?.archiveLe ?? null).toBeNull();
    const ouvertes = (eq: string) =>
      db.verifications.filter((v) => v.equipementId === eq && !v.archiveLe && [ANNUELLE, PERSONNES].includes(v.obligationId));
    expect(ouvertes("palan-1").map((v) => v.obligationId)).toEqual([PERSONNES]);
    expect(ouvertes("palan-2").map((v) => v.obligationId)).toEqual([PERSONNES]);

    db.journal = [];
    const r = await genererCalendrier(ETAB_ID);
    expect(r.created + r.updated + r.deleted + r.archived).toBe(0);
  });
});
