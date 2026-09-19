import { beforeEach, describe, expect, it, vi } from "vitest";
import { debutDuJour } from "@/lib/dates";
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
/** Portée par l'ÉTABLISSEMENT, annuelle, sans aucune source de date : elle
 *  naît « à planifier », datée du début du jour de son origine (règle 5). */
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
    // Sans source, une ligne À NAÎTRE est datée du début du jour de son
    // origine — l'horloge de la passe, que `actions.ts` écrit dans
    // `suiviDepuis`. C'est ce qui prouve ici que l'horloge est bien celle du
    // paramètre, pas celle du processus.
    expect(l1?.datePrevue).toEqual(debutDuJour(j1));
    expect(l2?.datePrevue).toEqual(debutDuJour(j2));
    expect(JSON.stringify(lecture.existantes)).toBe(avant);
  });

  it("date par la décision par les faits (ADR-036, bascule)", async () => {
    poserEtablissement();
    db.verifications = [ligne({ id: "v-1" })];
    const lecture = await lireEntrees(client, ETAB_ID);
    const now = new Date("2026-09-18T10:00:00Z");
    // ~~`planifier(lecture, now)` égal à `planifier(lecture, now,
    // STRATEGIE_FAITS)`~~ — la couture est partie au lot 5 (2026-09-19).
    const implicite = planifier(lecture, now);
    // Et elle RECALCULE depuis les faits : la ligne « à planifier » n'a ni
    // rapport ni mise en service, donc elle est datée du début du jour de son
    // ORIGINE (`suiviDepuis`, 1er mars à 9 h 30), plus du 1er mars à minuit UTC
    // que la base portait — même jour civil, réécrit une fois (ADR-036 § 5).
    expect(implicite.aMettreAJour).toHaveLength(1);
    expect(implicite.aMettreAJour[0].datePrevue).toEqual(
      debutDuJour(new Date("2026-03-01T09:30:00Z")),
    );
    expect(implicite.aMettreAJour[0].statut).toBe("a_planifier");
    expect(implicite.aMettreAJour[0].source).toBe("origine");
  });
  // ~~« remonte la `source` d'une décision qui en donne une »~~ — il injectait
  // une décision par la couture, retirée au lot 5 (2026-09-19). La `source`
  // de la décision réelle est lue par le test précédent.
});

describe("regenererUnePasse — la jointure lire → planifier → écrire", () => {
  it("date `suiviDepuis` de l'horloge de la passe, la même qui a daté le plan", async () => {
    poserEtablissement();
    await genererCalendrier(ETAB_ID);
    const creee = db.verifications.find((v) => v.obligationId === AERATION_R4222_20);
    expect(creee).toBeDefined();
    // Sans source, la ligne est datée du début du jour de son origine. Si
    // `suiviDepuis` ne portait pas le MÊME instant que l'horloge qui a daté le
    // plan, l'origine du suivi et la date diraient deux jours différents autour
    // de minuit — le décalage que la colonne existe pour fermer (ADR-036, D2).
    expect(creee!.datePrevue).toEqual(debutDuJour(creee!.suiviDepuis));
    expect(creee!.statut).toBe("a_planifier");
  });
});
