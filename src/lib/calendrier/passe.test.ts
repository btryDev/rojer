import { beforeEach, describe, expect, it, vi } from "vitest";
import { deciderParConservation } from "./generateur";
import type { EtablissementFaux, LigneFausse } from "./faux-prisma";
import { lireEntrees, planifier, type ClientLecture } from "./passe";

// La couture du lot 2b (ADR-036, 2026-09-18) : `regenererUnePasse` = lire,
// planifier, écrire. Ce fichier tient les deux premiers temps et leur jointure
// avec le troisième — ce qu'aucun test existant ne regardait, puisque tout
// vivait dans une seule fonction.

const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("./faux-prisma");
  const db = magasinVide();
  return { db, prisma: fauxPrisma(db) };
});

vi.mock("@/lib/prisma", async () => ({ prisma: (await h).prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: USER_ID, email: null })),
  getOptionalUser: vi.fn(async () => ({ id: USER_ID, email: null })),
}));

const USER_ID = "user-1";
const ETAB_ID = "etab-1";
/** Portée par l'ÉTABLISSEMENT, annuelle, sans aucune source de date : le
 *  générateur la date de `now`, « à planifier ». */
const AERATION_R4222_20 = "aeration-controle-installations-r4222-20";

const { db, prisma } = await h;
const client = prisma as unknown as ClientLecture;
const { genererCalendrier } = await import("./actions");

function poserEtablissement(): EtablissementFaux {
  const etab: EtablissementFaux = {
    id: ETAB_ID,
    userId: USER_ID,
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
    equipements: [],
  };
  db.etablissements = [etab];
  return etab;
}

function ligne(partiel: Partial<LigneFausse> & { id: string }): LigneFausse {
  return {
    etablissementId: ETAB_ID,
    equipementId: null,
    salarieId: null,
    obligationId: AERATION_R4222_20,
    libelleObligation: "x",
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: new Date("2026-03-01T00:00:00Z"),
    statut: "a_planifier",
    suiviDepuis: new Date("2026-03-01T09:30:00Z"),
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
  db.faireEchouer = null;
  db.apresLecture = null;
  db.journal = [];
});

describe("lireEntrees — la lecture, sans horloge", () => {
  it("porte `suiviDepuis` sur chaque ligne existante", async () => {
    poserEtablissement();
    db.verifications = [ligne({ id: "v-1" })];
    const lecture = await lireEntrees(client, ETAB_ID);
    expect(lecture.existantes).toHaveLength(1);
    expect(lecture.existantes[0].suiviDepuis).toEqual(
      new Date("2026-03-01T09:30:00Z"),
    );
  });

  it("refuse un établissement inconnu", async () => {
    await expect(lireEntrees(client, "nulle-part")).rejects.toThrow(
      /introuvable/,
    );
  });
});

describe("planifier — un plan depuis une lecture et une horloge", () => {
  it("est pure : la même lecture, deux horloges, deux plans, et la lecture n'a pas bougé", async () => {
    poserEtablissement();
    const lecture = await lireEntrees(client, ETAB_ID);
    const avant = JSON.stringify(lecture.existantes);

    const j1 = new Date("2026-09-18T10:00:00Z");
    const j2 = new Date("2027-01-15T10:00:00Z");
    const plan1 = planifier(lecture, j1);
    const plan2 = planifier(lecture, j2);

    const l1 = plan1.aCreer.find((v) => v.obligationId === AERATION_R4222_20);
    const l2 = plan2.aCreer.find((v) => v.obligationId === AERATION_R4222_20);
    // Sans source, le générateur d'aujourd'hui date la ligne de `now` : c'est
    // le défaut que l'ADR-036 nomme, et c'est ce qui prouve ici que l'horloge
    // est bien celle du paramètre, pas celle du processus.
    expect(l1?.datePrevue).toEqual(j1);
    expect(l2?.datePrevue).toEqual(j2);
    expect(JSON.stringify(lecture.existantes)).toBe(avant);
  });

  it("emploie la stratégie par défaut quand aucune n'est passée", async () => {
    poserEtablissement();
    db.verifications = [ligne({ id: "v-1" })];
    const lecture = await lireEntrees(client, ETAB_ID);
    const now = new Date("2026-09-18T10:00:00Z");
    const implicite = planifier(lecture, now);
    const explicite = planifier(lecture, now, { existante: deciderParConservation });
    expect(implicite).toEqual(explicite);
    // Et la stratégie par défaut CONSERVE : la ligne « à planifier » datée du
    // 1er mars garde sa date et son statut — seuls le libellé et les
    // réalisateurs, que la fixture n'a pas pris au référentiel, sont réalignés.
    expect(implicite.aMettreAJour).toHaveLength(1);
    expect(implicite.aMettreAJour[0].datePrevue).toEqual(
      new Date("2026-03-01T00:00:00Z"),
    );
    expect(implicite.aMettreAJour[0].statut).toBe("a_planifier");
    expect(implicite.aMettreAJour[0].source).toBeUndefined();
  });

  it("remonte la `source` d'une stratégie qui en donne une, sans la comparer", async () => {
    poserEtablissement();
    db.verifications = [ligne({ id: "v-1" })];
    const lecture = await lireEntrees(client, ETAB_ID);
    const now = new Date("2026-09-18T10:00:00Z");
    const plan = planifier(lecture, now, {
      existante: () => ({
        datePrevue: new Date("2026-12-01T00:00:00Z"),
        statut: "planifiee",
        source: "test",
      }),
    });
    expect(plan.aMettreAJour).toHaveLength(1);
    expect(plan.aMettreAJour[0].source).toBe("test");
  });
});

describe("regenererUnePasse — la jointure lire → planifier → écrire", () => {
  it("date `suiviDepuis` de l'horloge de la passe, la même qui a daté le plan", async () => {
    poserEtablissement();
    await genererCalendrier(ETAB_ID);
    const creee = db.verifications.find((v) => v.obligationId === AERATION_R4222_20);
    expect(creee).toBeDefined();
    // Sans source, le générateur date la ligne de `now`. Si `suiviDepuis` ne
    // portait pas le MÊME instant, l'origine du suivi et la date de génération
    // diraient deux jours différents autour de minuit — le décalage que la
    // colonne existe pour fermer (ADR-036, D2).
    expect(creee!.suiviDepuis.getTime()).toBe(creee!.datePrevue.getTime());
    expect(creee!.statut).toBe("a_planifier");
  });
});
