// Régénération du calendrier — tests de bout en bout de la server action,
// sur une base Prisma simulée en mémoire (`./faux-prisma`).
//
// Ce qui est vérifié ici ne peut pas l'être sur la seule fonction pure : c'est
// la **conservation des lignes** au fil des régénérations successives. Les
// cascades (`Action.verificationId`, `RapportVerification.verificationId` en
// `onDelete: Cascade`) sont des comportements de la base ; le test les
// représente par le fait qu'une ligne de vérification porteuse de preuve ne
// disparaît jamais du magasin. Tant que la ligne vit, l'action vit.
//
// DEUX CHOSES ONT CHANGÉ LE 2026-09-09, ET ELLES SONT LIÉES.
//
//  1. Le faux client honore les `where` (cf. `faux-prisma.ts`). Avant, la
//     fixture filtrait elle-même les équipements sur `actif` : le filtre
//     `equipements: { where: { actif: true } }` pouvait être retiré de
//     `actions.ts` sans qu'aucun test ne bouge, et la garantie « un équipement
//     désactivé ne génère plus d'obligation » ne vérifiait que la fixture.
//
//  2. Le référentiel n'est plus simulé. `determineObligationsApplicables` est
//     le vrai. Poser `h.db.obligations = []` revenait à CHOISIR le monde où
//     l'obligation disparaît ; c'est ce qui a permis d'écrire « un équipement
//     désactivé ne génère plus d'obligation » sans jamais se demander ce qui
//     arrive s'il reste un second appareil de la même catégorie. Avec le vrai
//     matching, la question se pose d'elle-même — et sa réponse est un défaut
//     du produit, pas du test (cf. `docs/chantiers-ouverts.md` § 11, lot 2).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { REFERENTIEL_VERSION } from "@/lib/referentiels/conformite";
import type { EquipementFaux, LigneFausse } from "./faux-prisma";

// `vi.hoisted` : les fabriques de `vi.mock` sont remontées en tête de module,
// elles ne peuvent donc pas capturer une variable déclarée plus bas.
const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("./faux-prisma");
  const db = magasinVide();
  return { db, prisma: fauxPrisma(db) };
});

vi.mock("@/lib/prisma", async () => ({ prisma: (await h).prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// `assertEtablissementOwnership` n'est PAS bouchonné : c'est le vrai garde qui
// tourne, sur le faux client. Un bouchon rendait son retrait indolore — c'était
// l'une des seize. Seule la lecture de session l'est.
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: USER_ID, email: null })),
  getOptionalUser: vi.fn(async () => ({ id: USER_ID, email: null })),
}));

const USER_ID = "user-1";
const AUTRE_USER = "user-2";
const ETAB_ID = "etab-1";

const { db } = await h;
const { genererCalendrier } = await import("./actions");

// ---------------------------------------------------------------------------
// Obligations réelles du référentiel, citées nommément
// ---------------------------------------------------------------------------
// Les tests s'appuient sur des identifiants réels plutôt que sur des totaux :
// un total se répare en le recopiant, un identifiant nommé dit ce qu'on attend.

/** Portée par un ÉQUIPEMENT électrique, périodicité annuelle. */
const ELEC_ANNUELLE = "elec-travail-periodique-annuelle";
/** Portée par un équipement électrique, one-shot à la mise en service. */
const ELEC_MISE_EN_SERVICE = "elec-travail-mise-en-service";
/** Portée par l'ÉTABLISSEMENT, `periodicite: "autre"` — aucune ligne générée,
 *  et c'est exactement ce que le garde-fou d'applicabilité protège. */
const REGISTRE_SECURITE = "incendie-registre-securite";
/** Portée par un SALARIÉ (ADR-023) : ne naît que d'un titre déclaré. */
const TITRE_SALARIE = "elec-salarie-attestation-medicale-voisinage";

// ---------------------------------------------------------------------------
// Fixtures — elles rendent le monde tel qu'il est, sans pré-filtrer
// ---------------------------------------------------------------------------

function poserEtablissement(
  equipements: Partial<EquipementFaux>[],
  options: { userId?: string; id?: string } = {},
) {
  const id = options.id ?? ETAB_ID;
  const etab = {
    id,
    userId: options.userId ?? USER_ID,
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
    // LA LISTE COMPLÈTE, actifs ET inactifs. C'est au code sous test de
    // filtrer ; la fixture qui filtrait à sa place vérifiait la fixture.
    equipements: equipements.map((e) => ({
      libelle: `Équipement ${e.id}`,
      categorie: "INSTALLATION_ELECTRIQUE",
      caracteristiques: null,
      actif: true,
      dateMiseEnService: null,
      ...e,
    })) as EquipementFaux[],
  };
  const existant = db.etablissements.findIndex((e) => e.id === id);
  if (existant >= 0) db.etablissements[existant] = etab;
  else db.etablissements.push(etab);
  return etab;
}

function poserSalarie(id: string, actif: boolean) {
  db.salaries.push({
    id,
    etablissementId: ETAB_ID,
    actif,
    nom: `Nom-${id}`,
    prenom: "Prénom",
  });
}

function ligne(partiel: Partial<LigneFausse> & { id: string }): LigneFausse {
  return {
    etablissementId: ETAB_ID,
    equipementId: null,
    salarieId: null,
    obligationId: ELEC_ANNUELLE,
    libelleObligation: "Vérification annuelle",
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: new Date("2020-01-01T00:00:00Z"),
    dateRealisee: null,
    statut: "depassee",
    nbRapports: 0,
    nbActions: 0,
    ...partiel,
  };
}

/** Les lignes du magasin portant cette obligation. */
const lignesDe = (obligationId: string) =>
  db.verifications.filter((v) => v.obligationId === obligationId);

/** La dernière clause reçue par une opération donnée. */
const dernierWhere = (operation: string) =>
  db.journal.filter((j) => j.operation === operation).at(-1)?.where as
    | Record<string, unknown>
    | undefined;

function estNotFound(e: unknown): boolean {
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("404");
}

beforeEach(() => {
  db.etablissements = [];
  db.salaries = [];
  db.titres = [];
  db.verifications = [];
  db.faireEchouer = null;
  db.journal = [];
});

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe("genererCalendrier — conservation des actions correctives", () => {
  it("une action rattachée à une vérification dépassée survit à la régénération", async () => {
    // Le dirigeant a une vérification électrique dépassée, sur laquelle il a
    // créé une action corrective (responsable + échéance).
    poserEtablissement([{ id: "eq-elec" }]);
    db.verifications = [
      ligne({
        id: "v-elec",
        equipementId: "eq-elec",
        obligationId: ELEC_ANNUELLE,
        nbActions: 1, // ← l'action corrective
      }),
    ];

    // Le lendemain, il déclare un second appareil : le calendrier est régénéré.
    poserEtablissement([{ id: "eq-elec" }, { id: "eq-2" }]);

    const res = await genererCalendrier(ETAB_ID);

    // La ligne porteuse de l'action est toujours là, avec le même identifiant.
    const survivante = db.verifications.find((v) => v.id === "v-elec");
    expect(survivante).toBeDefined();
    expect(survivante?.nbActions).toBe(1);
    expect(res.deleted).toBe(0);
    // Et le second appareil a bien ouvert sa propre ligne annuelle.
    expect(
      lignesDe(ELEC_ANNUELLE).map((v) => v.equipementId).sort(),
    ).toEqual(["eq-2", "eq-elec"]);
  });

  it("ne supprime pas une vérification porteuse d'un rapport quand l'obligation ne s'applique plus", async () => {
    // Aucun équipement : les obligations électriques ne s'appliquent plus.
    poserEtablissement([]);
    db.verifications = [
      ligne({
        id: "v-1",
        equipementId: "eq-1",
        obligationId: ELEC_ANNUELLE,
        nbRapports: 1,
      }),
    ];

    const res = await genererCalendrier(ETAB_ID);

    expect(res.deleted).toBe(0);
    expect(res.archived).toBe(1);
    const conservee = db.verifications.find((v) => v.id === "v-1");
    expect(conservee?.libelleObligation).toContain("Ne s'applique plus");
  });

  it("supprime en revanche une ligne devenue inutile et sans preuve", async () => {
    poserEtablissement([]);
    db.verifications = [
      ligne({
        id: "v-vide",
        equipementId: "eq-1",
        obligationId: ELEC_ANNUELLE,
        statut: "a_planifier",
      }),
    ];

    const res = await genererCalendrier(ETAB_ID);
    expect(res.deleted).toBe(1);
    expect(db.verifications.find((v) => v.id === "v-vide")).toBeUndefined();
  });
});

describe("genererCalendrier — idempotence", () => {
  it("deux régénérations successives laissent exactement le même état", async () => {
    poserEtablissement([{ id: "eq-1" }, { id: "eq-2" }]);

    const premier = await genererCalendrier(ETAB_ID);
    expect(premier.created).toBeGreaterThan(0);

    const apresPremier = JSON.stringify(db.verifications);
    const idsApresPremier = db.verifications.map((v) => v.id).sort();

    const second = await genererCalendrier(ETAB_ID);
    expect(second).toEqual({
      created: 0,
      updated: 0,
      deleted: 0,
      archived: 0,
      unchanged: premier.created,
    });
    expect(JSON.stringify(db.verifications)).toBe(apresPremier);

    // Stabilité des identifiants : c'est ce qui garantit que les liens
    // externes (fiche vérification, action corrective) restent valides.
    const troisieme = await genererCalendrier(ETAB_ID);
    expect(troisieme.created).toBe(0);
    expect(db.verifications.map((v) => v.id).sort()).toEqual(idsApresPremier);
  });
});

describe("genererCalendrier — équipements désactivés", () => {
  it("un équipement désactivé ne génère aucune ligne, l'actif si", async () => {
    // LE MONDE COMPLET : les deux appareils existent en base, l'un est hors
    // service. C'est `equipements: { where: { actif: true } }` qui doit
    // l'écarter — la fixture ne l'écarte plus.
    poserEtablissement([
      { id: "eq-actif" },
      { id: "eq-retire", actif: false },
    ]);

    await genererCalendrier(ETAB_ID);

    const porteurs = db.verifications
      .filter((v) => v.equipementId !== null)
      .map((v) => v.equipementId);
    expect(porteurs).not.toContain("eq-retire");
    expect(porteurs).toContain("eq-actif");
  });

  it("l'historique d'un équipement désactivé est conservé, marqué non applicable", async () => {
    // Le seul appareil électrique du parc est retiré : plus aucune obligation
    // électrique d'équipement ne s'applique.
    poserEtablissement([{ id: "eq-1", actif: false }]);
    db.verifications = [
      ligne({
        id: "v-hist",
        equipementId: "eq-1",
        obligationId: ELEC_ANNUELLE,
        dateRealisee: new Date("2025-01-01T00:00:00Z"),
        statut: "realisee_conforme",
        nbRapports: 1,
      }),
    ];

    await genererCalendrier(ETAB_ID);

    const hist = db.verifications.find((v) => v.id === "v-hist");
    expect(hist?.nbRapports).toBe(1);
    expect(hist?.libelleObligation).toContain("Ne s'applique plus");
  });
});

describe("genererCalendrier — le garde-fou d'applicabilité", () => {
  it("ne barre pas une obligation permanente, qui n'engendre aucune échéance", async () => {
    // `incendie-registre-securite` est `periodicite: "autre"` : la boucle de
    // génération la saute. Sans `obligationsEncoreApplicables`, la
    // réconciliation prendrait cette absence pour un retrait et écrirait
    // « Ne s'applique plus » sur une obligation qui s'applique parfaitement.
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [
      ligne({
        id: "v-registre",
        obligationId: REGISTRE_SECURITE,
        libelleObligation: "Registre de sécurité",
        periodicite: "autre",
        nbRapports: 1,
      }),
    ];

    const res = await genererCalendrier(ETAB_ID);

    expect(res.archived).toBe(0);
    expect(db.verifications.find((v) => v.id === "v-registre")?.libelleObligation)
      .toBe("Registre de sécurité");
  });

  it("un titre déclaré par erreur sur une obligation d'équipement n'entre pas au garde-fou", async () => {
    // `TitreSalarie.obligationId` n'a pas de clé étrangère : rien n'empêche de
    // déclarer un titre sur une obligation d'ÉQUIPEMENT. Si le filtre
    // `estPorteeParSalarie` sautait, cette obligation entrerait dans les
    // « encore applicables » et l'archivage légitime de sa ligne n'aurait
    // jamais lieu.
    poserEtablissement([]); // plus aucun équipement : l'obligation est retirée
    poserSalarie("sal-1", true);
    db.titres = [
      {
        obligationId: ELEC_ANNUELLE, // ← porteur ÉQUIPEMENT, déclaré à tort
        salarieId: "sal-1",
        delivreLe: new Date("2024-01-01T00:00:00Z"),
        echeanceLe: new Date("2027-01-01T00:00:00Z"),
      },
    ];
    db.verifications = [
      ligne({
        id: "v-elec",
        equipementId: "eq-parti",
        obligationId: ELEC_ANNUELLE,
        nbRapports: 1,
      }),
    ];

    const res = await genererCalendrier(ETAB_ID);

    expect(res.archived).toBe(1);
    expect(
      db.verifications.find((v) => v.id === "v-elec")?.libelleObligation,
    ).toContain("Ne s'applique plus");
  });
});

describe("genererCalendrier — titres de salariés (ADR-023)", () => {
  it("ouvre une ligne nominative pour le titre d'un salarié présent", async () => {
    poserEtablissement([]);
    poserSalarie("sal-present", true);
    db.titres = [
      {
        obligationId: TITRE_SALARIE,
        salarieId: "sal-present",
        delivreLe: new Date("2024-03-01T00:00:00Z"),
        echeanceLe: new Date("2029-03-01T00:00:00Z"),
      },
    ];

    await genererCalendrier(ETAB_ID);

    const lignes = lignesDe(TITRE_SALARIE);
    expect(lignes).toHaveLength(1);
    // Le porteur est la personne : sans lui, la ligne s'affiche « Tout
    // l'établissement » sur les six surfaces qui la lisent.
    expect(lignes[0].salarieId).toBe("sal-present");
    expect(lignes[0].equipementId).toBeNull();
    expect(lignes[0].datePrevue).toEqual(new Date("2029-03-01T00:00:00Z"));
  });

  it("n'ouvre aucune ligne pour le titre d'un salarié sorti de l'effectif", async () => {
    // docs/rgpd.md § 4.3 : une personne partie ne doit plus apparaître au
    // calendrier. C'est `salarie: { actif: true }` qui l'assure, et le faux
    // client l'honore désormais.
    poserEtablissement([]);
    poserSalarie("sal-parti", false);
    db.titres = [
      {
        obligationId: TITRE_SALARIE,
        salarieId: "sal-parti",
        delivreLe: new Date("2024-03-01T00:00:00Z"),
        echeanceLe: new Date("2029-03-01T00:00:00Z"),
      },
    ];

    await genererCalendrier(ETAB_ID);

    expect(lignesDe(TITRE_SALARIE)).toHaveLength(0);
  });

  it("ne barre pas la ligne d'un titre dont le seul détenteur est parti", async () => {
    // Le second périmètre de `titreSalarie.findMany`, celui SANS `actif` :
    // toute obligation qu'un titre a un jour instanciée reste « encore
    // applicable ». Sinon le départ du seul détenteur ferait barrer une
    // obligation qui s'applique — c'est la personne qui est partie.
    poserEtablissement([]);
    poserSalarie("sal-parti", false);
    db.titres = [
      {
        obligationId: TITRE_SALARIE,
        salarieId: "sal-parti",
        delivreLe: new Date("2024-03-01T00:00:00Z"),
        echeanceLe: new Date("2029-03-01T00:00:00Z"),
      },
    ];
    db.verifications = [
      ligne({
        id: "v-titre",
        salarieId: "sal-parti",
        obligationId: TITRE_SALARIE,
        libelleObligation: "Attestation médicale",
        nbRapports: 1,
      }),
    ];

    const res = await genererCalendrier(ETAB_ID);

    expect(res.archived).toBe(0);
    expect(
      db.verifications.find((v) => v.id === "v-titre")?.libelleObligation,
    ).toBe("Attestation médicale");
  });
});

describe("genererCalendrier — mise en service", () => {
  it("date la ligne one-shot de la mise en service, pas de maintenant", async () => {
    // Une chambre froide installée en 2015 ne doit pas hériter, dix ans plus
    // tard, d'une échéance réputée due aujourd'hui. La date suit l'événement.
    const mes = new Date("2015-06-01T00:00:00Z");
    poserEtablissement([{ id: "eq-1", dateMiseEnService: mes }]);

    await genererCalendrier(ETAB_ID);

    const oneShot = lignesDe(ELEC_MISE_EN_SERVICE);
    expect(oneShot).toHaveLength(1);
    expect(oneShot[0].datePrevue).toEqual(mes);
  });
});

describe("genererCalendrier — application du plan", () => {
  it("écrit tout ou rien : une écriture qui échoue ne laisse aucune création", async () => {
    // Le plan est appliqué en UNE transaction. Remplacée par des `await`
    // successifs, la panne de la dernière écriture laisserait les créations
    // déjà posées — un calendrier à moitié régénéré, que personne ne signale.
    poserEtablissement([{ id: "eq-1" }]);
    db.faireEchouer = (op) => op === "etablissement.update";

    await expect(genererCalendrier(ETAB_ID)).rejects.toThrow(
      /panne injectée/,
    );

    expect(
      db.verifications,
      "des lignes ont survécu à l'échec du plan : la transaction n'est pas atomique",
    ).toHaveLength(0);
  });

  it("borne la suppression à l'établissement régénéré", async () => {
    // `deleteMany` ne doit jamais porter sur des identifiants seuls. La
    // garantie est dans la CLAUSE : deux `Verification` de clients différents
    // ne peuvent pas partager d'identifiant en base, donc rien d'observable ne
    // la distingue à l'exécution — c'est la clause envoyée qui la porte, comme
    // pour les lectures de `queries.test.ts`.
    poserEtablissement([]);
    db.verifications = [
      ligne({ id: "v-vide", equipementId: "eq-1", statut: "a_planifier" }),
    ];

    await genererCalendrier(ETAB_ID);

    expect(dernierWhere("verification.deleteMany")).toEqual({
      id: { in: ["v-vide"] },
      etablissementId: ETAB_ID,
    });
  });

  it("deux régénérations simultanées sur un calendrier vide ne créent aucun doublon", async () => {
    // Déclaration d'équipement dans un onglet, dépôt de rapport dans l'autre :
    // les deux passes lisent le même magasin vide et planifient les mêmes
    // créations. `skipDuplicates` laisse la contrainte d'unicité trancher au
    // lieu de faire échouer la transaction.
    poserEtablissement([{ id: "eq-1" }]);

    await Promise.all([genererCalendrier(ETAB_ID), genererCalendrier(ETAB_ID)]);

    const cles = db.verifications.map(
      (v) => `${v.obligationId}|${v.equipementId}|${v.salarieId}`,
    );
    expect(new Set(cles).size).toBe(cles.length);
  });
});

describe("genererCalendrier — estampille de version du référentiel", () => {
  // Le référentiel vit en TypeScript versionné (ADR-003) mais ses effets sont
  // figés en base : chaque ligne porte un libellé et une périodicité copiés au
  // moment de sa génération. Sans estampille, une correction du référentiel
  // n'atteignait les calendriers existants qu'au hasard d'une mutation
  // d'équipement, et une obligation retirée laissait des lignes orphelines
  // invisibles des filtres.
  it("estampille l'établissement avec la version appliquée", async () => {
    poserEtablissement([{ id: "eq-elec" }]);

    await genererCalendrier(ETAB_ID);

    expect(db.etablissements[0].referentielVersionCalendrier).toBe(
      REFERENTIEL_VERSION,
    );
  });

  it("ré-estampille même quand le plan ne change rien", async () => {
    // Cas du rattrapage : le contenu est déjà aligné, mais l'établissement
    // porte encore une version antérieure. Si l'estampille n'était écrite que
    // lorsqu'une ligne bouge, il resterait éternellement « désynchronisé » et
    // relancerait une réconciliation à chaque affichage.
    poserEtablissement([{ id: "eq-elec" }]);
    await genererCalendrier(ETAB_ID);

    db.etablissements[0].referentielVersionCalendrier = "2000-01-01.1";
    const res = await genererCalendrier(ETAB_ID);

    expect(res.created + res.updated + res.deleted + res.archived).toBe(0);
    expect(db.etablissements[0].referentielVersionCalendrier).toBe(
      REFERENTIEL_VERSION,
    );
  });
});

// ---------------------------------------------------------------------------
// Traversée entre clients — le calendrier n'en avait aucune
// ---------------------------------------------------------------------------
// Six suites de ce genre existent ailleurs dans le dépôt (`transverses`,
// `rapports`, `prescriptions`…). Le modèle est `lib/transverses/isolation.test.ts`
// et il affirme deux choses, pas une : le refus, ET l'absence de toute écriture.
describe("genererCalendrier — établissement d'un autre client", () => {
  beforeEach(() => {
    poserEtablissement([{ id: "eq-1" }], {
      id: "etab-autre",
      userId: AUTRE_USER,
    });
  });

  it("refuse et n'écrit rien", async () => {
    await expect(genererCalendrier("etab-autre")).rejects.toSatisfy(
      estNotFound,
    );
    expect(db.verifications).toHaveLength(0);
    expect(db.etablissements[0].referentielVersionCalendrier).toBeNull();
  });

  it("refuse AVANT de lire l'établissement", async () => {
    // Le garde passe en premier. Sans lui, la régénération lisait le dossier
    // d'en face par `findUnique` — non scopé — et son plan se calculait sur
    // des données qui ne sont pas les siennes, même si l'écriture échouait
    // ensuite pour une autre raison.
    await expect(genererCalendrier("etab-autre")).rejects.toSatisfy(
      estNotFound,
    );
    expect(dernierWhere("etablissement.findUnique")).toBeUndefined();
  });

  it("laisse intact le calendrier de l'autre client", async () => {
    db.verifications = [
      ligne({
        id: "v-autre",
        etablissementId: "etab-autre",
        equipementId: "eq-1",
        nbRapports: 0,
        statut: "a_planifier",
      }),
    ];

    await expect(genererCalendrier("etab-autre")).rejects.toSatisfy(
      estNotFound,
    );
    expect(db.verifications.map((v) => v.id)).toEqual(["v-autre"]);
  });
});
