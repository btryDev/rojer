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

  it("cursor imbriqué dans un include ou un _count : refusé aussi", () => {
    expect(() =>
      argumentsBornes("Etablissement", "findFirst", { include: { batiments: { cursor: { id: "x" } } } }, A),
    ).toThrow(/cursor/);
    expect(() =>
      argumentsBornes(
        "Etablissement",
        "findFirst",
        { select: { _count: { select: { batiments: { cursor: { id: "x" } } } } } },
        A,
      ),
    ).toThrow(/cursor/);
  });

  it("un filtre ou un tri qui traverse des relations du compte passe", () => {
    expect(() =>
      argumentsBornes(
        "Equipement",
        "findMany",
        {
          where: {
            OR: [{ batiment: { nom: "A" } }, { etablissement: { entreprise: { userId: "u-a" } } }],
            actions: { some: { statut: "ouverte" } },
          },
          orderBy: [{ batiment: { nom: "asc" } }],
          include: { actions: { where: { verification: { is: { statut: "a_planifier" } } } } },
        },
        A,
      ),
    ).not.toThrow();
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

  it("disconnect imbriqué par identifiant : refusé (seul `disconnect: true` est servi)", () => {
    expect(() =>
      argumentsBornes("Action", "update", { where: { id: "a" }, data: { equipement: { disconnect: { id: "q" } } } }, A),
    ).toThrow(ErreurPortee);
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
  it("une Entreprise créée est rattachée au compte (cc : la racine est une relation vers User)", () => {
    expect(argumentsBornes("Entreprise", "create", { data: { raisonSociale: "x" } }, A).data).toEqual({
      raisonSociale: "x",
      user: { connect: { id: "u-a" } },
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

// Sur cc, Signature.userId et AccessToken.createdByUserId sont des relations
// vers l'identité (`User`) : elles ne désignent que le compte de la portée, et
// aucune lecture ne remonte vers User ni vers les tables d'authentification.
// Ces tests n'ont pas d'équivalent sur main, où User n'existe pas : c'est ici
// que les gardes de l'identité s'éprouvent (fusion de #140 dans cc).
describe("identité (cc) : relations vers User", () => {
  it.each([
    ["Signature", "create", { data: { userId: "u-b" } }],
    ["Signature", "create", { data: { user: { connect: { email: "b@exemple.fr" } } } }],
    ["Signature", "create", { data: { user: { connect: { id: "u-b" } } } }],
    ["Signature", "update", { where: { id: "s" }, data: { userId: { set: "u-b" } } }],
    ["AccessToken", "create", { data: { createdByUserId: "u-b" } }],
    ["AccessToken", "create", { data: { createdBy: { connect: { id: "u-a", email: "a@exemple.fr" } } } }],
    ["AccessToken", "upsert", { where: { id: "t" }, create: { createdByUserId: "u-a" }, update: { createdByUserId: "u-b" } }],
  ])("%s.%s vers un autre utilisateur, ou par un autre champ que l'id : refusé", (nom, op, args) => {
    expect(() => argumentsBornes(nom, op, args, A)).toThrow(/ne désigne que le compte/);
  });

  it.each([
    ["Signature", "create", { data: { user: { create: { email: "x" } } } }],
    ["Signature", "update", { where: { id: "s" }, data: { user: { update: { email: "x" } } } }],
    ["AccessToken", "update", { where: { id: "t" }, data: { createdBy: { upsert: {} } } }],
  ])("%s.%s : écrire dans User par imbrication est refusé", (nom, op, args) => {
    expect(() => argumentsBornes(nom, op, args, A)).toThrow(/seule la relation au compte/);
  });

  it("une clé d'identité dans un lot (createMany, updateMany) est refusée", async () => {
    expect(() => argumentsBornes("Signature", "updateMany", { data: { userId: "u-b" } }, A)).toThrow(ErreurPortee);
    expect(() => argumentsBornes("Signature", "updateMany", { data: { userId: "u-a" } }, A)).toThrow(ErreurPortee);
    await dansUnLot(async () => {
      expect(() =>
        argumentsBornes("AccessToken", "createMany", { data: [{ createdByUserId: "u-b" }] }, A),
      ).toThrow(ErreurPortee);
    });
  });

  it("une création imbriquée qui porte un autre utilisateur est refusée", () => {
    expect(() =>
      argumentsBornes(
        "Etablissement",
        "update",
        { where: { id: "e" }, data: { accessTokens: { create: { createdByUserId: "u-b" } } } },
        A,
      ),
    ).toThrow(/ne désigne que le compte/);
  });

  it("le compte lui-même, ou null : accepté, réécrit en relation", () => {
    expect(argumentsBornes("Signature", "create", { data: { userId: "u-a" } }, A).data).toEqual({
      user: { connect: { id: "u-a" } },
    });
    expect(argumentsBornes("Signature", "update", { where: { id: "s" }, data: { userId: null } }, A).data).toEqual({
      user: { disconnect: true },
    });
    expect(
      argumentsBornes("AccessToken", "create", { data: { createdBy: { connect: { id: "u-a" } } } }, A).data,
    ).toEqual({ createdBy: { connect: { id: "u-a" } } });
  });

  it.each([
    ["include vers user", { include: { user: true } }],
    ["include profond vers les sessions", { include: { user: { include: { sessions: true } } } }],
    ["select imbriqué dans un include", { include: { etablissement: { select: { entreprise: { select: { user: true } } } } } }],
    ["select direct", { select: { id: true, user: { select: { email: true } } } }],
    ["where qui traverse vers le second facteur", { where: { user: { twoFactor: { secret: { startsWith: "A" } } } } }],
    ["orderBy par l'adresse de l'utilisateur", { orderBy: { user: { email: "asc" } } }],
  ])("lecture d'une Signature : %s → refusée", (_cas, args) => {
    expect(() => argumentsBornes("Signature", "findMany", args, A)).toThrow(ErreurPortee);
  });

  it.each([
    [
      "connect dont la condition remonte vers le second facteur",
      "Etablissement",
      { data: { entreprise: { connect: { id: "e", user: { twoFactor: { secret: { startsWith: "A" } } } } } } },
    ],
    [
      "deleteMany imbriqué dont la condition remonte vers les sessions",
      "Etablissement",
      {
        where: { id: "e" },
        data: { signatures: { deleteMany: { user: { sessions: { some: { token: { startsWith: "x" } } } } } } },
      },
    ],
  ])("écriture : %s → refusée", (_cas, nom, args) => {
    const op = "where" in args ? "update" : "create";
    expect(() => argumentsBornes(nom, op, args, A)).toThrow(/hors compte/);
  });

  it.each(["User", "Session", "Account", "AuthVerification", "TwoFactor"])(
    "le client borné ne sert jamais %s, en lecture comme en écriture",
    (nom) => {
      expect(() => argumentsBornes(nom, "findMany", {}, A)).toThrow(ErreurPortee);
      expect(() => argumentsBornes(nom, "deleteMany", {}, A)).toThrow(ErreurPortee);
      expect(() => argumentsBornes(nom, "create", { data: {} }, A)).toThrow(ErreurPortee);
    },
  );

});

