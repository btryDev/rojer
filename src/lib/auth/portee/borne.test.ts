// Ce que le client borné fait des arguments d'une opération (ADR-051 § 2),
// sans base : la borne ajoutée, les clés étrangères réécrites en `connect`
// borné, et les refus. Le comportement contre un PostgreSQL réel est dans
// `client.integration.test.ts` ; ce qui touche l'identité (`User`, sur cc)
// s'éprouve sur cc, seul schéma qui la porte.

import { describe, expect, it } from "vitest";
import {
  argumentsBornes,
  borne,
  dansUnLot,
  ErreurPortee,
  estLectureDIdentifiants,
  noterVus,
  type Portee,
} from "./borne";

const A: Portee = { type: "compte", userId: "u-a" };
const B: Portee = { type: "compte", userId: "u-b" };
const COMPTE_A = { entreprise: { userId: "u-a" } };
const ETAB_A = { etablissement: COMPTE_A };

describe("borne d'un modèle", () => {
  it("racine, un cran, quatre crans", () => {
    expect(borne("Entreprise", A)).toEqual({ userId: "u-a" });
    expect(borne("Etablissement", A)).toEqual(COMPTE_A);
    expect(borne("Risque", A)).toEqual({ unite: { duerp: ETAB_A } });
    expect(borne("ReleveTemperature", A)).toEqual({ pointReleve: { carnet: ETAB_A } });
  });

  it("refuse un modèle hors compte", () => {
    expect(() => borne("LimiteDebit", A)).toThrow(ErreurPortee);
    expect(() => argumentsBornes("QuotaEnvoiOtp", "findMany", {}, A)).toThrow(ErreurPortee);
  });
});

describe("lectures et écritures par where", () => {
  it.each(["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy", "delete", "deleteMany"])(
    "%s : la borne s'ajoute au where",
    (op) => {
      expect(argumentsBornes("Equipement", op, { where: { libelle: "x" } }, A)).toMatchObject({
        where: { libelle: "x", AND: [ETAB_A] },
      });
    },
  );

  it("findUnique garde son champ unique en tête, un AND existant est conservé", () => {
    expect(argumentsBornes("Equipement", "findUnique", { where: { id: "q" } }, A)).toEqual({
      where: { id: "q", AND: [ETAB_A] },
    });
    expect(argumentsBornes("Action", "findMany", { where: { AND: { statut: "ouverte" } } }, A)).toEqual({
      where: { AND: [{ statut: "ouverte" }, ETAB_A] },
    });
  });

  it("sans where, la borne devient le where", () => {
    expect(argumentsBornes("Batiment", "updateMany", { data: { nom: "n" } }, A)).toEqual({
      where: { AND: [ETAB_A] },
      data: { nom: "n" },
    });
  });

  it("include et select vers des modèles du compte passent tels quels", () => {
    const include = { batiments: { include: { equipements: true } } };
    expect(argumentsBornes("Etablissement", "findFirst", { include }, A).include).toEqual(include);
    expect(() =>
      argumentsBornes("Etablissement", "findFirst", { select: { _count: { select: { batiments: true } } } }, A),
    ).not.toThrow();
  });

  it("cursor est refusé (aucun usage)", () => {
    expect(() => argumentsBornes("Action", "findMany", { cursor: { id: "x" } }, A)).toThrow(/cursor/);
  });
});

describe("créations et clés étrangères", () => {
  it("la clé de rattachement devient un connect borné", () => {
    expect(argumentsBornes("Batiment", "create", { data: { etablissementId: "e", nom: "n" } }, A)).toEqual({
      data: { nom: "n", etablissement: { connect: { id: "e", AND: [COMPTE_A] } } },
    });
  });

  it("une clé secondaire aussi (Action.equipementId)", () => {
    const { data } = argumentsBornes(
      "Action",
      "create",
      { data: { etablissementId: "e", verificationId: "v", equipementId: "q", libelle: "x" } },
      A,
    );
    expect(data).toMatchObject({
      equipement: { connect: { id: "q", AND: [ETAB_A] } },
      verification: { connect: { id: "v", AND: [ETAB_A] } },
    });
    expect(data).not.toHaveProperty("equipementId");
  });

  it("une clé écrite { set: v } est lue comme v ; une autre opération sur une clé est refusée", () => {
    expect(
      argumentsBornes("Equipement", "update", { where: { id: "q" }, data: { batimentId: { set: "b" } } }, A).data,
    ).toEqual({ batiment: { connect: { id: "b", AND: [ETAB_A] } } });
    expect(() =>
      argumentsBornes("Equipement", "update", { where: { id: "q" }, data: { batimentId: { increment: 1 } } }, A),
    ).toThrow(ErreurPortee);
  });

  it("update : une clé remise à null devient un disconnect", () => {
    expect(argumentsBornes("Action", "update", { where: { id: "a" }, data: { equipementId: null } }, A)).toMatchObject(
      { data: { equipement: { disconnect: true } } },
    );
  });

  it("un connect explicite (liste comprise) est borné", () => {
    const { data } = argumentsBornes(
      "Batiment",
      "update",
      { where: { id: "b" }, data: { equipements: { connect: [{ id: "q1" }, { id: "q2" }] } } },
      A,
    );
    expect(data).toEqual({
      equipements: { connect: [{ id: "q1", AND: [ETAB_A] }, { id: "q2", AND: [ETAB_A] }] },
    });
  });

  it("une création imbriquée est réécrite à son tour ; deleteMany imbriqué passe", () => {
    const { data } = argumentsBornes(
      "Etablissement",
      "update",
      { where: { id: "e" }, data: { equipements: { create: { batimentId: "b", libelle: "x" } } } },
      A,
    );
    expect(data).toMatchObject({
      equipements: { create: { batiment: { connect: { id: "b", AND: [ETAB_A] } }, libelle: "x" } },
    });
    expect(
      argumentsBornes("PlanPrevention", "update", { where: { id: "p" }, data: { lignes: { deleteMany: {} } } }, A)
        .data,
    ).toEqual({ lignes: { deleteMany: {} } });
  });

  it.each(["set", "connectOrCreate", "createMany", "update", "updateMany", "upsert", "delete"])(
    "refuse une écriture imbriquée non servie : %s",
    (op) => {
      expect(() =>
        argumentsBornes("Etablissement", "update", { where: { id: "e" }, data: { batiments: { [op]: {} } } }, A),
      ).toThrow(/non servie/);
    },
  );

  it("refuse une clé et sa relation données ensemble", () => {
    expect(() =>
      argumentsBornes(
        "Batiment",
        "create",
        { data: { etablissementId: "e", etablissement: { connect: { id: "e" } }, nom: "n" } },
        A,
      ),
    ).toThrow(/ensemble/);
  });

  it("upsert : where borné, création ET mise à jour réécrites", () => {
    const a = argumentsBornes(
      "Equipement",
      "upsert",
      { where: { id: "q" }, create: { etablissementId: "e", libelle: "n" }, update: { batimentId: "b" } },
      A,
    );
    expect(a.where).toEqual({ id: "q", AND: [ETAB_A] });
    expect(a.create).toMatchObject({ etablissement: { connect: { id: "e", AND: [COMPTE_A] } } });
    expect(a.update).toEqual({ batiment: { connect: { id: "b", AND: [ETAB_A] } } });
  });

  it("updateMany : une clé étrangère changée est refusée", () => {
    expect(() => argumentsBornes("Action", "updateMany", { data: { equipementId: "q" } }, A)).toThrow(/non bornable/);
  });
});

describe("racine du compte", () => {
  it("une Entreprise créée reçoit le userId du compte", () => {
    expect(argumentsBornes("Entreprise", "create", { data: { raisonSociale: "x" } }, A).data).toEqual({
      raisonSociale: "x",
      userId: "u-a",
    });
  });

  it.each([
    ["create", { data: { userId: "u-b" } }],
    ["update", { where: { id: "x" }, data: { userId: "u-b" } }],
    ["update", { where: { id: "x" }, data: { userId: { set: "u-b" } } }],
    ["update", { where: { id: "x" }, data: { userId: null } }],
    ["updateMany", { data: { userId: "u-b" } }],
    ["upsert", { where: { id: "x" }, create: {}, update: { userId: "u-b" } }],
  ])("refuse la racine d'un autre compte : %s %j", (op, args) => {
    expect(() => argumentsBornes("Entreprise", op, args, A)).toThrow(/différent du compte/);
  });

  it("createMany d'une racine : posée, ou refusée si elle désigne un autre compte", async () => {
    await dansUnLot(async () => {
      expect(argumentsBornes("DemandeAssistance", "createMany", { data: [{ message: "m" }] }, A).data).toEqual([
        { message: "m", userId: "u-a" },
      ]);
    });
    expect(() => argumentsBornes("DemandeAssistance", "createMany", { data: [{ userId: "u-b" }] }, A)).toThrow(
      ErreurPortee,
    );
  });
});

describe("createMany", () => {
  it("vers un parent jamais lu : refusé", () => {
    expect(() =>
      argumentsBornes("Batiment", "createMany", { data: [{ etablissementId: "jamais-lu", nom: "n" }] }, A),
    ).toThrow(/creerEnLotVerifie/);
  });

  it("dans un lot, vers des parents lus par une lecture bornée d'identifiants : accepté", async () => {
    await dansUnLot(async () => {
      noterVus("Etablissement", A, [{ id: "e-lu" }]);
      expect(argumentsBornes("Batiment", "createMany", { data: [{ etablissementId: "e-lu", nom: "n" }] }, A)).toEqual({
        data: [{ etablissementId: "e-lu", nom: "n" }],
      });
    });
  });

  it("hors d'un lot ou après lui, une lecture d'identifiants n'ouvre rien", async () => {
    noterVus("Etablissement", A, [{ id: "e-hors" }]);
    await dansUnLot(async () => noterVus("Etablissement", A, [{ id: "e-fini" }]));
    for (const id of ["e-hors", "e-fini"])
      expect(() => argumentsBornes("Batiment", "createMany", { data: [{ etablissementId: id, nom: "n" }] }, A)).toThrow(
        ErreurPortee,
      );
  });

  it("dans un même lot, un parent lu par un compte n'ouvre pas le createMany d'un autre", async () => {
    await dansUnLot(async () => {
      noterVus("Etablissement", A, [{ id: "e-de-a" }]);
      expect(() =>
        argumentsBornes("Batiment", "createMany", { data: [{ etablissementId: "e-de-a", nom: "n" }] }, B),
      ).toThrow(ErreurPortee);
    });
  });

  it("seule une lecture des seuls identifiants est retenue", () => {
    expect(estLectureDIdentifiants("findMany", { select: { id: true } })).toBe(true);
    expect(estLectureDIdentifiants("findMany", { select: { id: true, nom: true } })).toBe(false);
    expect(estLectureDIdentifiants("findMany", {})).toBe(false);
    expect(estLectureDIdentifiants("findFirst", { select: { id: true } })).toBe(false);
  });
});

it("une opération non servie est refusée", () => {
  expect(() => argumentsBornes("Batiment", "aggregateRaw", {}, A)).toThrow(/non servie/);
  expect(() => argumentsBornes("Batiment", "updateManyAndReturn", {}, A)).toThrow(/non servie/);
});
