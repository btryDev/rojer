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
import { SCEAU_CALENDRIER } from "./version-moteur";
import type { EquipementFaux, LigneFausse } from "./faux-prisma";
import { estVerificationEnRetard } from "@/lib/dates/retard";
import { classerVerification } from "./etats";
import { ajouterJours, cleJourCivil, depuisCleJourCivil, instantCivil } from "@/lib/dates";
import { prochaineEcheance } from "./periodicite";
import { lireEntrees, planifier, type ClientLecture } from "./passe";
import { planVide } from "./passage-a-blanc";

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
/**
 * Un vrai couple retiré → absorbant du référentiel (`OBLIGATIONS_RETIREES`).
 * Le fragment « VMC/CTA » de R. 4222-20 a été retiré le 2026-08-27 au profit de
 * l'article porté en entier par l'établissement.
 */
const AERATION_FRAGMENT_RETIRE = "aeration-travail-entretien-annuel";
const AERATION_ABSORBANTE = "aeration-controle-installations-r4222-20";
/** Portée par un appareil (porte ou portail automatique), `periodicite: "autre"`,
 *  et ciblable par une prescription qui lui donne un rythme (NB4). */
const PORTAIL_MAINTIEN = "porte-auto-maintien-en-etat";
/** Portée par un SALARIÉ, passée de triennale à `autre` (ADR-023 § 6). */
const HABILITATION_SALARIE = "elec-salarie-habilitation";

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
    statut: "planifiee",
    // L'origine du suivi (ADR-036, D2) : requise par le magasin comme la
    // colonne l'est en base. La stratégie par défaut ne la lit pas.
    suiviDepuis: new Date("2020-01-01T00:00:00Z"),
    nbRapports: 0,
    nbActions: 0,
    ...partiel,
  };
}

/** Une prescription qui rend `porte-auto-maintien-en-etat` semestrielle sur
 *  `eq-portail`, LEVÉE fin 2020. Le magasin n'en type que `{ id, actif }`. */
function prescriptionPortail() {
  return {
    id: "presc-portail",
    actif: true,
    source: "arrete_prefectoral",
    effet: "renforce_periodicite",
    reference: "Arrêté n° 1",
    autorite: null,
    dateDocument: new Date("2019-01-01T00:00:00Z"),
    dateFin: new Date("2020-12-31T00:00:00Z") as Date | null,
    obligationId: PORTAIL_MAINTIEN,
    libelle: null,
    description: null,
    periodicite: "semestrielle",
    realisateurRequis: [],
    categorieEquipement: null,
    equipementId: "eq-portail",
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
  db.apresLecture = null;
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
    // L'archivage est une DATE (ADR-034, N3) : le libellé reste celui du
    // référentiel, et c'est l'écran qui dit « ne s'applique plus » à partir du
    // champ. Il portait un préfixe, qu'il fallait lire par `startsWith`.
    expect(conservee?.archiveLe).toBeInstanceOf(Date);
    expect(conservee?.libelleObligation).not.toContain("Ne s'applique plus");
  });

  it("désarchive une ligne dont l'obligation redevient applicable", async () => {
    // L'appareil a été retiré, sa ligne archivée avec sa preuve ; il est
    // réactivé. Si `archiveLe` restait posé, tous les lecteurs la tiendraient
    // pour éteinte alors que le calendrier la présente comme vivante — et
    // aucun écran ne la réclamerait plus jamais.
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [
      ligne({
        id: "v-1",
        equipementId: "eq-1",
        obligationId: ELEC_ANNUELLE,
        libelleObligation: "Vérification électrique",
        archiveLe: new Date("2026-01-01T00:00:00Z"),
        nbRapports: 1,
      }),
    ];

    await genererCalendrier(ETAB_ID);

    const reprise = db.verifications.find((v) => v.id === "v-1");
    expect(reprise?.archiveLe).toBeNull();
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

// ---------------------------------------------------------------------------
// La fenêtre entre la lecture et l'écriture
// ---------------------------------------------------------------------------
// Le plan est calculé sur une lecture, puis appliqué. Ces deux tests écrivent
// DANS l'intervalle, ce qu'aucun test ne faisait : les deux pertes de données
// du § 11 (lot 1) ont été reproduites ainsi, sur base réelle, avant d'être
// reproduites ici. Elles rougissent toutes deux si l'on retire une clause
// conditionnelle d'`actions.ts`.

describe("genererCalendrier — écriture concurrente entre la lecture et le plan", () => {
  it("un rapport déposé pendant la régénération ne perd pas sa réalisation", async () => {
    // La ligne est en retard et sans preuve : le plan va la réaligner, donc
    // écrire `datePrevue` et `statut`. Entre-temps, un prestataire dépose son
    // rapport — c'est-à-dire, depuis l'ADR-034, fait ROULER la ligne : il
    // réécrit exactement ces deux champs.
    poserEtablissement([{ id: "eq-elec" }]);
    db.verifications = [
      ligne({
        id: "v-1",
        equipementId: "eq-elec",
        obligationId: ELEC_ANNUELLE,
        statut: "planifiee",
      }),
    ];

    const LE_DEPOT = new Date("2026-09-09T10:00:00Z");
    const ROULEE = new Date("2027-09-09T10:00:00Z");
    db.apresLecture = () => {
      const v = db.verifications.find((x) => x.id === "v-1");
      if (v === undefined) throw new Error("ligne v-1 disparue avant le dépôt");
      v.datePrevue = ROULEE;
      v.statut = "planifiee";
      v.nbRapports = 1;
      v.rapports = [{ dateRapport: LE_DEPOT, resultat: "conforme" }];
    };

    await genererCalendrier(ETAB_ID);

    const apres = db.verifications.find((v) => v.id === "v-1");
    // Sans la condition sur `datePrevue`/`statut`, l'`update` par identifiant
    // réécrit l'échéance d'avant, `depassee`, par-dessus le dépôt : la ligne
    // redemande le contrôle qu'un rapport conforme vient d'honorer.
    expect(
      apres?.datePrevue,
      "le roulement déposé pendant la régénération a été écrasé",
    ).toEqual(ROULEE);
    expect(apres?.statut).toBe("planifiee");
    expect(apres?.nbRapports).toBe(1);
  });

  it("une action corrective créée pendant la régénération n'est pas emportée", async () => {
    // Aucun équipement : la ligne n'est plus applicable et ne porte aucune
    // preuve, donc le plan la met à SUPPRIMER. Entre-temps, le dirigeant crée
    // une action corrective dessus — et `Action.verificationId` est en
    // `onDelete: Cascade`.
    poserEtablissement([]);
    db.verifications = [
      ligne({
        id: "v-vide",
        equipementId: "eq-1",
        obligationId: ELEC_ANNUELLE,
        statut: "a_planifier",
      }),
    ];

    db.apresLecture = () => {
      const v = db.verifications.find((x) => x.id === "v-vide");
      if (v === undefined) throw new Error("ligne v-vide disparue avant l'action");
      v.nbActions = 1;
    };

    await genererCalendrier(ETAB_ID);

    // C'est mot pour mot ce que l'ADR-012 déclare impossible : « aucune action
    // corrective, aucun rapport ne peut plus disparaître par effet de bord
    // d'une régénération ». Tant que la ligne vit, l'action vit.
    const survivante = db.verifications.find((v) => v.id === "v-vide");
    expect(
      survivante,
      "la ligne a été supprimée, donc l'action corrective est partie en cascade",
    ).toBeDefined();
    // La passe suivante l'a relue avec sa preuve : elle est archivée — datée
    // (ADR-034, N3) —, pas supprimée.
    expect(survivante?.archiveLe).toBeInstanceOf(Date);
  });

  it("relance jusqu'à converger, et le compte rendu est celui de la passe qui a convergé", async () => {
    // Une seule injection, donc une seule divergence : la deuxième passe lit
    // le monde tel qu'il est devenu et s'applique intégralement.
    poserEtablissement([]);
    db.verifications = [
      ligne({ id: "v-vide", equipementId: "eq-1", statut: "a_planifier" }),
    ];
    db.apresLecture = () => {
      const v = db.verifications.find((x) => x.id === "v-vide");
      if (v !== undefined) v.nbActions = 1;
    };

    const res = await genererCalendrier(ETAB_ID);

    // La première passe planifiait une suppression qui n'a pas eu lieu ; la
    // seconde, lisant la preuve, planifie un archivage — et c'est ce
    // compte-là qui est rendu.
    expect(res.deleted).toBe(0);
    expect(res.archived).toBe(1);
    // Deux passes, donc deux lectures des lignes.
    expect(
      db.journal.filter((j) => j.operation === "verification.findMany"),
    ).toHaveLength(2);
  });

  it("une réouverture déjà faite par ailleurs est vue, et la passe se relance", async () => {
    // MUTATION SURVIVANTE du banc des corrections (2026-09-13). La réouverture
    // n'était conditionnée que sur l'identifiant : son compte valait 1 quoi
    // qu'il soit arrivé à la ligne entre la lecture et l'écriture, et la passe
    // se croyait convergée sur un monde qu'elle n'avait pas lu. Conditionnée
    // sur « encore archivée », elle voit qu'une autre écriture l'a précédée.
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [
      ligne({
        id: "v-registre",
        obligationId: REGISTRE_SECURITE,
        libelleObligation: "Registre de sécurité",
        periodicite: "autre",
        // « À planifier » (limite 1, 2026-09-15) : c'est le statut qu'une ligne
        // sans rendez-vous porte désormais. « Planifiée », elle partait en mise
        // à jour de statut, et ce test ne mesurait plus la réouverture.
        statut: "a_planifier",
        archiveLe: new Date("2026-02-01T00:00:00Z"),
        nbRapports: 1,
      }),
    ];
    db.apresLecture = () => {
      const v = db.verifications.find((x) => x.id === "v-registre");
      if (v !== undefined) v.archiveLe = null;
    };

    const res = await genererCalendrier(ETAB_ID);

    // La première passe planifiait une réouverture qui n'a rien touché ; la
    // seconde lit la ligne ouverte et n'a plus rien à faire.
    expect(
      db.journal.filter((j) => j.operation === "verification.findMany"),
      "la réouverture n'a pas détecté l'écriture concurrente",
    ).toHaveLength(2);
    // `updated` à 0 : le compte rendu est bien celui de la seconde passe, qui
    // n'a rien rouvert. (`unchanged` compte aussi les lignes d'établissement
    // que la première passe a créées — il ne mesure pas ce test.)
    expect(res.updated).toBe(0);
    expect(db.verifications.find((v) => v.id === "v-registre")?.archiveLe).toBeNull();
  });
});

describe("genererCalendrier — continuité par-dessus un identifiant retiré", () => {
  it("reprend l'échéance du fragment retiré sur l'obligation qui l'absorbe", async () => {
    // CÂBLAGE RÉEL : ce test n'invente aucune table, il s'appuie sur le vrai
    // `OBLIGATIONS_RETIREES` du référentiel. Il rougit donc aussi si la
    // succession cesse d'être passée depuis `actions.ts`, là où les tests purs
    // du générateur ne verraient rien.
    //
    // Le fragment « VMC/CTA » a été contrôlé le 2025-06-01. L'absorbante est
    // annuelle et portée par l'établissement — due même sans le moindre
    // appareil déclaré. Sa ligne doit donc naître datée du 2026-06-01, donc en
    // retard, et NON « à planifier » comme si le contrôle n'avait pas eu lieu.
    poserEtablissement([]);
    db.verifications = [
      ligne({
        id: "v-fragment",
        equipementId: "eq-vmc",
        obligationId: AERATION_FRAGMENT_RETIRE,
        libelleObligation: "Entretien annuel VMC/CTA",
        // La réalisation vit sur le rapport (ADR-034) : une ligne qui PORTE un
        // rapport ne se lit plus sur sa colonne, précisément pour qu'un
        // rapport supprimé ne ressuscite pas.
        rapports: [
          { dateRapport: new Date("2025-06-01T00:00:00Z"), resultat: "conforme" },
        ],
        statut: "realisee_conforme",
        nbRapports: 1,
      }),
    ];

    await genererCalendrier(ETAB_ID);

    const absorbante = db.verifications.find(
      (v) => v.obligationId === AERATION_ABSORBANTE,
    );
    expect(
      absorbante,
      "l'obligation absorbante n'a produit aucune ligne",
    ).toBeDefined();
    expect(
      absorbante?.datePrevue,
      "la ligne absorbante est repartie de zéro : la succession déclarée n'a pas été lue",
    ).toEqual(new Date("2026-06-01T00:00:00Z"));

    // Le fragment garde sa preuve et son archivage — rien n'est détruit.
    const fragment = db.verifications.find((v) => v.id === "v-fragment");
    expect(fragment?.nbRapports).toBe(1);
    expect(fragment?.archiveLe).toBeInstanceOf(Date);
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
        statut: "realisee_conforme",
        nbRapports: 1,
      }),
    ];

    await genererCalendrier(ETAB_ID);

    const hist = db.verifications.find((v) => v.id === "v-hist");
    expect(hist?.nbRapports).toBe(1);
    expect(hist?.archiveLe).toBeInstanceOf(Date);
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

  it("rouvre en base une ligne permanente archivée dont l'obligation revient", async () => {
    // Le second chemin de désarchivage, jusqu'au bout : une obligation sans
    // rendez-vous n'est jamais générée, donc jamais mise à jour — elle serait
    // restée barrée pour toujours, et aucun écran ne l'aurait plus réclamée.
    poserEtablissement([{ id: "eq-1" }]);
    db.verifications = [
      ligne({
        id: "v-registre",
        obligationId: REGISTRE_SECURITE,
        libelleObligation: "Registre de sécurité",
        periodicite: "autre",
        archiveLe: new Date("2026-02-01T00:00:00Z"),
        nbRapports: 1,
      }),
    ];

    const r = await genererCalendrier(ETAB_ID);

    expect(db.verifications.find((v) => v.id === "v-registre")?.archiveLe).toBeNull();
    // ET LA RÉOUVERTURE EST COMPTÉE. Le commentaire du résultat disait « les
    // réouvertures comptent comme des réalignements » ; `updated` valait 0
    // sur cette passe (relecture du 2026-09-13). Mesuré ici, pas affirmé.
    expect(r.updated).toBe(1);
  });

  it("une prescription levée rend son rythme à la ligne qu'elle avait fait rouler (NB4)", async () => {
    // LE SCÉNARIO DE PRODUCTION, de bout en bout (2026-09-15) : vrai matching,
    // vraie `appliquerPrescriptions`, vrai générateur, vraie réconciliation.
    // Un arrêté donne un rythme semestriel à `porte-auto-maintien-en-etat`,
    // obligation `autre` ; un rapport conforme a fait rouler la ligne ; l'arrêté
    // est levé. L'obligation n'engendre plus de ligne. Sans la correction, la
    // ligne restait semestrielle, marquée de l'arrêté, en retard depuis 2021 —
    // et un nouveau dépôt la faisait rouler au semestre.
    poserEtablissement([{ id: "eq-portail", categorie: "PORTAIL_AUTO" }]);
    // Le magasin ne type que `{ id, actif }` ; la lecture rend l'objet entier,
    // et `appliquerPrescriptions` lit le reste.
    db.etablissements[0]!.prescriptionsParticulieres = [
      prescriptionPortail() as unknown as { id: string; actif: boolean },
    ];
    db.verifications = [
      ligne({
        id: "v-portail",
        equipementId: "eq-portail",
        obligationId: PORTAIL_MAINTIEN,
        libelleObligation: "Maintien en état",
        periodicite: "semestrielle",
        datePrevue: new Date("2021-03-01T00:00:00Z"),
        statut: "planifiee",
        prescriptionId: "presc-portail",
        rapports: [{ dateRapport: new Date("2020-09-01T00:00:00Z"), resultat: "conforme" }],
        nbRapports: 1,
      }),
    ];

    await genererCalendrier(ETAB_ID);

    const l = db.verifications.find((v) => v.id === "v-portail")!;
    expect(l.periodicite).toBe("autre");
    expect(l.prescriptionId).toBeNull();
    expect(l.statut).toBe("realisee_conforme");
    expect(l.datePrevue).toEqual(new Date("2021-03-01T00:00:00Z"));
    expect(l.archiveLe ?? null).toBeNull();
    expect(
      estVerificationEnRetard({ ...l, archiveLe: l.archiveLe ?? null }, new Date()),
    ).toBe(false);
  });

  it("une prescription EN VIGUEUR garde son rythme et son marquage, et la passe suivante n'écrit rien (ADR-032)", async () => {
    // Le témoin du réalignement : il ne doit toucher que les lignes que la
    // génération saute. Une prescription active génère sa ligne, qui passe par
    // la boucle principale et garde `prescriptionId` — c'est lui qui porte le
    // marquage contractuel d'une demande d'assureur.
    poserEtablissement([{ id: "eq-portail", categorie: "PORTAIL_AUTO" }]);
    db.etablissements[0]!.prescriptionsParticulieres = [
      { ...prescriptionPortail(), dateFin: null } as unknown as {
        id: string;
        actif: boolean;
      },
    ];
    db.verifications = [
      ligne({
        id: "v-portail",
        equipementId: "eq-portail",
        obligationId: PORTAIL_MAINTIEN,
        libelleObligation: "Maintien en état",
        periodicite: "semestrielle",
        datePrevue: new Date("2021-03-01T00:00:00Z"),
        statut: "planifiee",
        prescriptionId: "presc-portail",
        rapports: [{ dateRapport: new Date("2020-09-01T00:00:00Z"), resultat: "conforme" }],
        nbRapports: 1,
      }),
    ];

    await genererCalendrier(ETAB_ID);
    const l = db.verifications.find((v) => v.id === "v-portail")!;
    expect(l.periodicite).toBe("semestrielle");
    expect(l.prescriptionId).toBe("presc-portail");

    const seconde = await genererCalendrier(ETAB_ID);
    expect(seconde.updated).toBe(0);
    expect(db.verifications.find((v) => v.id === "v-portail")?.prescriptionId).toBe(
      "presc-portail",
    );
  });

  describe("un plan calculé avant une réactivation n'écrase pas la ligne rétablie (2026-09-15)", () => {
    // La course : le plan lit la prescription LEVÉE et prépare, pour la ligne,
    // `autre` + `prescriptionId: null`. Entre la lecture et l'écriture, la
    // prescription est réactivée et une autre passe rétablit la ligne sous
    // elle. Sans condition sur le rythme et la prescription lus, l'écriture
    // passait par-dessus : datePrevue et statut n'avaient pas bougé. Avec, la
    // passe diverge, se relance sur la prescription active et laisse la ligne.
    const scenario = async (
      lue: { periodicite: string; prescriptionId: string | null },
    ) => {
      poserEtablissement([{ id: "eq-portail", categorie: "PORTAIL_AUTO" }]);
      const presc = prescriptionPortail();
      db.etablissements[0]!.prescriptionsParticulieres = [
        presc as unknown as { id: string; actif: boolean },
      ];
      db.verifications = [
        ligne({
          id: "v-portail",
          equipementId: "eq-portail",
          obligationId: PORTAIL_MAINTIEN,
          libelleObligation: "Maintien en état",
          datePrevue: new Date("2021-03-01T00:00:00Z"),
          statut: "planifiee",
          nbActions: 1,
          ...lue,
        }),
      ];
      db.apresLecture = () => {
        presc.dateFin = null;
        const v = db.verifications.find((x) => x.id === "v-portail")!;
        v.periodicite = "semestrielle";
        v.prescriptionId = "presc-portail";
      };

      await genererCalendrier(ETAB_ID);

      const l = db.verifications.find((v) => v.id === "v-portail")!;
      expect(l.periodicite, "le rythme rétabli a été écrasé").toBe("semestrielle");
      expect(l.prescriptionId, "la prescription rétablie a été effacée").toBe(
        "presc-portail",
      );
    };

    it("quand seul le rythme a été rétabli", () =>
      scenario({ periodicite: "autre", prescriptionId: "presc-portail" }));

    it("quand seule la prescription a été rétablie", () =>
      scenario({ periodicite: "semestrielle", prescriptionId: null }));
  });

  it("l'appareil retiré perd sa ligne alors que l'obligation vit chez son voisin", async () => {
    // LE CAS QUI A FAIT LE LOT 2. Deux appareils électriques, l'un désactivé.
    // L'obligation reste applicable — le second la porte —, donc le garde-fou
    // d'applicabilité, qui ne teste que l'identifiant d'obligation, classait la
    // ligne du premier « rien à faire ». Elle restait en base avec son statut
    // `depassee`, comptée en retard indéfiniment, pour un appareil retiré du
    // parc. Le bouton de suppression promet pourtant « ne génère plus
    // d'échéance ».
    //
    // Une ligne est identifiée par une obligation ET UN PORTEUR : c'est le
    // porteur de CETTE ligne qui doit être interrogé, pas l'obligation.
    poserEtablissement([
      { id: "eq-retire", actif: false },
      { id: "eq-actif", actif: true },
    ]);
    db.verifications = [
      ligne({
        id: "v-retire",
        equipementId: "eq-retire",
        obligationId: ELEC_ANNUELLE,
        statut: "realisee_conforme",
        nbRapports: 1,
      }),
    ];

    const res = await genererCalendrier(ETAB_ID);

    // Porteuse d'une preuve : archivée, jamais supprimée (ADR-012).
    expect(
      res.archived,
      "la ligne de l'appareil retiré est restée gelée : le garde-fou teste encore l'obligation seule",
    ).toBe(1);
    const retiree = db.verifications.find((v) => v.id === "v-retire");
    expect(retiree?.nbRapports).toBe(1);
    expect(retiree?.archiveLe).toBeInstanceOf(Date);

    // Et l'appareil encore en service, lui, a bien sa ligne.
    const vivantes = db.verifications.filter(
      (v) => v.equipementId === "eq-actif",
    );
    expect(vivantes.length).toBeGreaterThan(0);
  });

  // CE TEST NE ROUGIT PAS SI L'ON RETIRE LE CORRECTIF, et il faut le dire :
  // sans preuve, l'ancienne branche supprimait déjà. Il ne garde donc aucune
  // garantie neuve — il décrit le versant de la règle qui était juste, pour
  // qu'on ne le casse pas en réparant l'autre. Un test qui ne peut pas échouer
  // se signale, sinon il se compte comme une protection qu'il n'est pas.
  it("l'appareil retiré sans preuve voit sa ligne supprimée, pas gelée", async () => {
    poserEtablissement([
      { id: "eq-retire", actif: false },
      { id: "eq-actif", actif: true },
    ]);
    db.verifications = [
      ligne({
        id: "v-retire-vide",
        equipementId: "eq-retire",
        obligationId: ELEC_ANNUELLE,
        statut: "a_planifier",
      }),
    ];

    const res = await genererCalendrier(ETAB_ID);

    expect(res.deleted).toBe(1);
    expect(
      db.verifications.find((v) => v.id === "v-retire-vide"),
    ).toBeUndefined();
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
      db.verifications.find((v) => v.id === "v-elec")?.archiveLe,
    ).toBeInstanceOf(Date);
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

  // ~~« ne barre pas la ligne d'un titre dont le seul détenteur est parti »~~ :
  // ce test tenait la règle inverse, qu'aucune décision n'avait posée. La ligne
  // restait ouverte, donc comptée en retard si elle portait une action, pendant
  // qu'Équipe disait « Ne s'applique plus » du même titre. Depuis le 2026-09-17
  // (`lot/salarie-inactif-et-menage`, décision de la propriétaire), une ligne de
  // salarié sort comme celle d'un appareil retiré. Le TITRE reste en base : c'est
  // lui la preuve que `docs/rgpd.md` § 4.3 veut garder.
  describe("une personne sortie de l'effectif sort des comptes (2026-09-17)", () => {
    /** La ligne de l'attestation médicale de `salarieId`, échue en 2020 — donc
     *  en retard si elle restait ouverte. */
    const ligneTitre = (id: string, salarieId: string, nbActions: number) =>
      ligne({
        id,
        salarieId,
        obligationId: TITRE_SALARIE,
        libelleObligation: "Attestation médicale",
        periodicite: "quinquennale",
        datePrevue: new Date("2020-03-01T00:00:00Z"),
        statut: "planifiee",
        nbActions,
      });
    const titre = (salarieId: string) => ({
      obligationId: TITRE_SALARIE,
      salarieId,
      delivreLe: new Date("2015-03-01T00:00:00Z"),
      echeanceLe: new Date("2020-03-01T00:00:00Z"),
    });
    const lue = (id: string) => {
      const l = db.verifications.find((v) => v.id === id)!;
      return { ...l, archiveLe: l.archiveLe ?? null };
    };

    it("sa ligne qui porte une action est archivée, et n'est plus en retard nulle part", async () => {
      poserEtablissement([]);
      poserSalarie("sal-parti", false);
      db.titres = [titre("sal-parti")];
      db.verifications = [ligneTitre("v-titre", "sal-parti", 1)];

      const res = await genererCalendrier(ETAB_ID);

      expect(res.archived).toBe(1);
      expect(res.deleted).toBe(0);
      expect(lue("v-titre").archiveLe).toBeInstanceOf(Date);
      // Le prédicat que lisent le calendrier, le score et la barre latérale,
      // et l'état que le calendrier peint — « ne s'applique plus », comme Équipe.
      expect(estVerificationEnRetard(lue("v-titre"), new Date())).toBe(false);
      expect(classerVerification(lue("v-titre"), new Date())).toBe("archivee");
      // L'action reste attachée, et le titre reste en base.
      expect(lue("v-titre").nbActions).toBe(1);
      expect(db.titres).toHaveLength(1);
    });

    it("sa ligne sans trace est supprimée", async () => {
      poserEtablissement([]);
      poserSalarie("sal-parti", false);
      db.titres = [titre("sal-parti")];
      db.verifications = [ligneTitre("v-titre", "sal-parti", 0)];

      const res = await genererCalendrier(ETAB_ID);

      expect(res.deleted).toBe(1);
      expect(db.verifications.find((v) => v.id === "v-titre")).toBeUndefined();
      expect(db.titres).toHaveLength(1);
    });

    it("le titre retiré à A sort la ligne de A, même quand B détient le même titre", async () => {
      // La variante : l'obligation vit encore, chez B. Tester l'obligation seule
      // laissait la ligne de A ouverte, en retard, avec son action.
      poserEtablissement([]);
      poserSalarie("sal-A", true);
      poserSalarie("sal-B", true);
      db.titres = [titre("sal-B")];
      db.verifications = [
        ligneTitre("v-A", "sal-A", 1),
        ligneTitre("v-B", "sal-B", 1),
      ];

      await genererCalendrier(ETAB_ID);

      expect(lue("v-A").archiveLe).toBeInstanceOf(Date);
      expect(estVerificationEnRetard(lue("v-A"), new Date())).toBe(false);
      // Le témoin : la ligne de B reste ouverte, et en retard à sa date.
      expect(lue("v-B").archiveLe).toBeNull();
      expect(estVerificationEnRetard(lue("v-B"), new Date())).toBe(true);
    });

    it("une personne réactivée retrouve sa ligne, désarchivée", async () => {
      poserEtablissement([]);
      poserSalarie("sal-1", false);
      db.titres = [titre("sal-1")];
      db.verifications = [ligneTitre("v-titre", "sal-1", 1)];
      await genererCalendrier(ETAB_ID);
      expect(lue("v-titre").archiveLe).toBeInstanceOf(Date);

      db.salaries[0].actif = true;
      await genererCalendrier(ETAB_ID);

      expect(lue("v-titre").archiveLe).toBeNull();
      expect(estVerificationEnRetard(lue("v-titre"), new Date())).toBe(true);
    });

    it("une personne réactivée dont la ligne sans trace a été supprimée la retrouve en retard, à la date du titre", async () => {
      // Le pendant salarié du blanchiment par désactivation d'un appareil —
      // qui, ici, n'a pas lieu : la ligne recréée tient sa date de la pièce,
      // pas de la génération (relecture du 2026-09-17).
      poserEtablissement([]);
      poserSalarie("sal-1", false);
      db.titres = [titre("sal-1")];
      db.verifications = [ligneTitre("v-titre", "sal-1", 0)];
      await genererCalendrier(ETAB_ID);
      expect(lignesDe(TITRE_SALARIE)).toHaveLength(0);

      db.salaries[0].actif = true;
      await genererCalendrier(ETAB_ID);

      const recreees = lignesDe(TITRE_SALARIE);
      expect(recreees).toHaveLength(1);
      expect(recreees[0].datePrevue).toEqual(new Date("2020-03-01T00:00:00Z"));
      expect(
        estVerificationEnRetard(
          { ...recreees[0], archiveLe: recreees[0].archiveLe ?? null },
          new Date(),
        ),
      ).toBe(true);
    });

    it("la passe suivante n'écrit plus rien (idempotence)", async () => {
      poserEtablissement([]);
      poserSalarie("sal-parti", false);
      db.titres = [titre("sal-parti")];
      db.verifications = [ligneTitre("v-titre", "sal-parti", 1)];
      await genererCalendrier(ETAB_ID);
      const archiveLe = lue("v-titre").archiveLe;

      const res = await genererCalendrier(ETAB_ID);

      expect(res.created + res.updated + res.deleted + res.archived).toBe(0);
      expect(lue("v-titre").archiveLe).toBe(archiveLe);
    });
  });

  it("la ligne d'un titre non générée prend le rythme du référentiel, et sort des retards sur une action seule (NB4, limite 1)", async () => {
    // Le cas qui a déjà eu lieu : l'habilitation électrique est passée de
    // triennale à `autre` (ADR-023 § 6). Un titre sans échéance saisie n'a plus
    // d'échéance calculable (`echeanceDuTitre`), donc sa ligne n'est plus
    // générée. Aucune surcharge ne vise un titre : le rythme vient
    // d'`obligationParId` (2026-09-15).
    //
    // LA FIXTURE EST CELLE QUI PEUT EXISTER. Une ligne de salarié ne reçoit
    // jamais de rapport — `uploadRapport` refuse le dépôt sur un porteur
    // salarié. Sans preuve, elle est supprimée (test suivant) ; sa seule trace
    // possible est une action corrective. ~~Le rythme tombait à `autre`, le
    // statut restait « planifiée » et la ligne RESTAIT EN RETARD pendant que
    // la page Équipe disait « Sans terme écrit ».~~ Limite 1, tranchée le
    // 2026-09-15 : la ligne passe « à planifier », hors des retards — le
    // calendrier dit enfin la même chose qu'Équipe.
    poserEtablissement([]);
    poserSalarie("sal-1", true);
    db.titres = [
      {
        obligationId: HABILITATION_SALARIE,
        salarieId: "sal-1",
        delivreLe: new Date("2020-03-01T00:00:00Z"),
        echeanceLe: null,
      },
    ];
    db.verifications = [
      ligne({
        id: "v-habilitation",
        salarieId: "sal-1",
        obligationId: HABILITATION_SALARIE,
        libelleObligation: "Habilitation électrique",
        periodicite: "triennale",
        datePrevue: new Date("2023-03-01T00:00:00Z"),
        statut: "planifiee",
        nbActions: 1,
      }),
    ];

    await genererCalendrier(ETAB_ID);

    const l = db.verifications.find((v) => v.id === "v-habilitation")!;
    expect(l.periodicite).toBe("autre");
    expect(l.statut).toBe("a_planifier");
    expect(l.datePrevue).toEqual(new Date("2023-03-01T00:00:00Z"));
    expect(
      estVerificationEnRetard({ ...l, archiveLe: l.archiveLe ?? null }, new Date()),
    ).toBe(false);
  });

  it("un titre `autre` dont l'échéance est SAISIE reste « planifiée », donc en retard à sa date", async () => {
    // Le témoin de la limite 1 : l'échéance vient de la pièce, c'est une vraie
    // date. La ligne est générée — elle ne passe pas par la boucle finale — et
    // `lignePortantSansRendezVous` ne la touche pas.
    poserEtablissement([]);
    poserSalarie("sal-1", true);
    db.titres = [
      {
        obligationId: HABILITATION_SALARIE,
        salarieId: "sal-1",
        delivreLe: new Date("2020-03-01T00:00:00Z"),
        echeanceLe: new Date("2023-03-01T00:00:00Z"),
      },
    ];
    db.verifications = [];

    await genererCalendrier(ETAB_ID);

    const l = db.verifications.find((v) => v.salarieId === "sal-1")!;
    expect(l.periodicite).toBe("autre");
    expect(l.statut).toBe("planifiee");
    expect(
      estVerificationEnRetard({ ...l, archiveLe: l.archiveLe ?? null }, new Date()),
    ).toBe(true);
  });

  it("sans aucune preuve, la même ligne de titre est supprimée", async () => {
    poserEtablissement([]);
    poserSalarie("sal-1", true);
    db.titres = [
      {
        obligationId: HABILITATION_SALARIE,
        salarieId: "sal-1",
        delivreLe: new Date("2020-03-01T00:00:00Z"),
        echeanceLe: null,
      },
    ];
    db.verifications = [
      ligne({
        id: "v-habilitation",
        salarieId: "sal-1",
        obligationId: HABILITATION_SALARIE,
        periodicite: "triennale",
        datePrevue: new Date("2023-03-01T00:00:00Z"),
      }),
    ];

    await genererCalendrier(ETAB_ID);

    expect(db.verifications.find((v) => v.id === "v-habilitation")).toBeUndefined();
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
      // Les QUATRE conditions de non-preuve accompagnent désormais la clause
      // de portée, et pour la même raison : ce que la lecture a conclu doit
      // être REDIT à l'écriture, sans quoi une preuve déposée entre les deux
      // est emportée par la cascade. La quatrième vient de l'ADR-034 : une
      // obligation ponctuelle consommée n'a plus ni rapport ni date, son
      // statut est sa seule trace.
      rapports: { none: {} },
      actions: { none: {} },
      statut: {
        notIn: [
          "realisee_conforme",
          "realisee_observations",
          "realisee_ecart_majeur",
        ],
      },
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
      SCEAU_CALENDRIER,
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
      SCEAU_CALENDRIER,
    );
  });

  it("une passe sans changement n'écrit pas l'établissement (2026-09-17)", async () => {
    // Le repère réécrit à l'identique faisait bouger `updatedAt`, que le
    // registre PDF imprime comme date de mise à jour des fiches générales :
    // tout dépôt de rapport les redatait.
    poserEtablissement([{ id: "eq-elec" }]);
    await genererCalendrier(ETAB_ID);
    db.journal = [];

    await genererCalendrier(ETAB_ID);

    expect(
      db.journal.filter((j) => j.operation === "etablissement.update"),
    ).toEqual([]);
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

// ---------------------------------------------------------------------------
// ADR-036 — les sept scénarios de l'audit, DE BOUT EN BOUT par la régénération
// ---------------------------------------------------------------------------
// Vrai matching, vraies prescriptions, vrai générateur, vraie réconciliation,
// écritures conditionnées du faux client. Chaque scénario pose les FAITS du
// § 1 de l'ADR-036 et la date que l'ancien moteur avait laissée en base, puis
// régénère. Puis le dossier entier est REPLANIFIÉ à J+400 sur ce qui a été
// écrit : le plan doit être vide — l'idempotence temporelle, sur la base.
// (Les mêmes scénarios, au niveau du réconciliateur seul :
// `decision-par-faits.test.ts` ; par le dépôt et le retrait :
// `rapports/actions.test.ts`.)

describe("ADR-036 — S1 à S7, de la base à la base", () => {
  const d = (cle: string) => depuisCleJourCivil(cle);
  const AERATION_ETAB = "aeration-controle-installations-r4222-20";
  const assureurSemestriel = () => ({
    id: "presc-assureur",
    actif: true,
    source: "demande_assureur",
    effet: "renforce_periodicite",
    reference: "Avenant n° 3",
    autorite: null,
    dateDocument: d("2026-01-10"),
    dateFin: null,
    obligationId: ELEC_ANNUELLE,
    libelle: null,
    description: null,
    periodicite: "semestrielle",
    realisateurRequis: [],
    categorieEquipement: null,
    equipementId: "eq-1",
  });
  const ligneDe = (id: string) => db.verifications.find((v) => v.id === id)!;

  async function regenererPuisRejouer() {
    await genererCalendrier(ETAB_ID);
    const client = (await h).prisma as unknown as ClientLecture;
    const lecture = await lireEntrees(client, ETAB_ID);
    const plusTard = planifier(lecture, ajouterJours(new Date(), 400));
    expect(planVide(plusTard), JSON.stringify(plusTard.aMettreAJour, null, 2)).toBe(true);
    // Et une seconde régénération, aujourd'hui, n'écrit rien non plus.
    const seconde = await genererCalendrier(ETAB_ID);
    expect(seconde.created + seconde.updated + seconde.deleted + seconde.archived).toBe(0);
  }

  it("S1 — une obligation d'établissement sans source garde son retard, daté de son origine", async () => {
    poserEtablissement([]);
    const origine = instantCivil(2026, 6, 15, 10, 12);
    db.verifications = [
      ligne({
        id: "s1",
        obligationId: AERATION_ETAB,
        equipementId: null,
        statut: "a_planifier",
        datePrevue: origine,
        suiviDepuis: origine,
      }),
    ];
    await regenererPuisRejouer();
    expect(ligneDe("s1").datePrevue).toEqual(d("2026-06-15"));
    expect(ligneDe("s1").statut).toBe("a_planifier");
  });

  it("S2 — l'échéance manquée du 01/06/2026, née pendant le suivi, est gardée", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2025-06-01") }]);
    db.verifications = [
      ligne({ id: "s2", equipementId: "eq-1", datePrevue: d("2026-06-01"), suiviDepuis: d("2025-09-10") }),
    ];
    await regenererPuisRejouer();
    expect(ligneDe("s2").datePrevue).toEqual(d("2026-06-01"));
    expect(ligneDe("s2").statut).toBe("planifiee");
  });

  it("S3 — annuel → semestriel par une prescription, sans rapport : 01/12/2026", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2026-06-01") }]);
    db.etablissements[0]!.prescriptionsParticulieres = [
      assureurSemestriel() as unknown as { id: string; actif: boolean },
    ];
    db.verifications = [
      ligne({ id: "s3", equipementId: "eq-1", datePrevue: d("2027-06-01"), suiviDepuis: d("2026-06-01") }),
    ];
    await regenererPuisRejouer();
    expect(ligneDe("s3").periodicite).toBe("semestrielle");
    expect(ligneDe("s3").prescriptionId).toBe("presc-assureur");
    expect(ligneDe("s3").datePrevue).toEqual(d("2026-12-01"));
  });

  it("S4 — la mise en service corrigée s'applique : 15/11/2026", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2025-11-15") }]);
    db.verifications = [
      ligne({ id: "s4", equipementId: "eq-1", datePrevue: d("2027-03-15"), suiviDepuis: d("2026-03-15") }),
    ];
    await regenererPuisRejouer();
    expect(ligneDe("s4").datePrevue).toEqual(d("2026-11-15"));
  });

  it("S5 — la mise en service saisie le lendemain donne ce que la même saisie le jour même aurait donné", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2026-09-01") }]);
    db.verifications = [
      ligne({
        id: "s5",
        equipementId: "eq-1",
        statut: "a_planifier",
        datePrevue: d("2026-09-16"),
        suiviDepuis: d("2026-09-16"),
      }),
    ];
    await regenererPuisRejouer();
    expect(ligneDe("s5").datePrevue).toEqual(d("2027-09-01"));
    expect(ligneDe("s5").statut).toBe("planifiee");
  });

  it("S6 — une ligne qui porte un rapport : rapport + rythme, rien ne bouge", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2024-01-10") }]);
    db.verifications = [
      ligne({
        id: "s6",
        equipementId: "eq-1",
        datePrevue: d("2027-03-01"),
        suiviDepuis: d("2024-02-01"),
        rapports: [{ dateRapport: d("2026-03-01"), resultat: "conforme" }],
        nbRapports: 1,
      }),
    ];
    await regenererPuisRejouer();
    expect(ligneDe("s6").datePrevue).toEqual(d("2027-03-01"));
  });

  it("S7 — un appareil neuf sous prescription semestrielle naît à six mois", async () => {
    // Mis en service AUJOURD'HUI : la ligne naît aujourd'hui, et sa première
    // échéance ne dépend pas du jour où le test tourne.
    const miseEnService = d(cleJourCivil(new Date()));
    poserEtablissement([{ id: "eq-1", dateMiseEnService: miseEnService }]);
    db.etablissements[0]!.prescriptionsParticulieres = [
      assureurSemestriel() as unknown as { id: string; actif: boolean },
    ];
    await regenererPuisRejouer();
    const s7 = db.verifications.find(
      (v) => v.obligationId === ELEC_ANNUELLE && v.equipementId === "eq-1",
    )!;
    expect(s7.periodicite).toBe("semestrielle");
    // Six mois, pas un an : `premierPas` sous prescription (D1).
    expect(s7.datePrevue).toEqual(prochaineEcheance(miseEnService, "semestrielle"));
    expect(s7.statut).toBe("planifiee");
  });
});
