// Ce que le client borné fait des arguments d'une opération (ADR-051 § 2),
// sans base : la borne ajoutée, les clés étrangères réécrites en `connect`
// borné, et les refus. Le comportement contre un PostgreSQL réel est dans
// `client.integration.test.ts`.

import { describe, expect, it } from "vitest";
import { argumentsBornes, borne, ErreurPortee, estLectureDIdentifiants, noterVus, type Portee } from "./borne";

const A: Portee = { type: "compte", userId: "u-a" };
const COMPTE_A = { entreprise: { userId: "u-a" } };
const ETAB_A = { etablissement: COMPTE_A };

describe("borne d'un modèle", () => {
  it("compte : racine, un cran, quatre crans", () => {
    expect(borne("Entreprise", A)).toEqual({ userId: "u-a" });
    expect(borne("Etablissement", A)).toEqual(COMPTE_A);
    expect(borne("Risque", A)).toEqual({ unite: { duerp: ETAB_A } });
    expect(borne("ReleveTemperature", A)).toEqual({ pointReleve: { carnet: ETAB_A } });
  });

  it("refuse un modèle hors compte", () => {
    expect(() => borne("LimiteDebit", A)).toThrow(ErreurPortee);
  });
});

describe("lectures et écritures par where", () => {
  it.each(["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy", "deleteMany"])(
    "%s : la borne s'ajoute au where",
    (op) => {
      expect(argumentsBornes("Equipement", op, { where: { libelle: "x" } }, A)).toMatchObject({
        where: { libelle: "x", AND: [ETAB_A] },
      });
    },
  );

  it("findUnique garde son champ unique en tête", () => {
    expect(argumentsBornes("Equipement", "findUnique", { where: { id: "q" } }, A)).toEqual({
      where: { id: "q", AND: [ETAB_A] },
    });
  });

  it("un AND existant est conservé", () => {
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

  it("select et include passent tels quels", () => {
    const a = argumentsBornes("Etablissement", "findFirst", { include: { batiments: true } }, A);
    expect(a.include).toEqual({ batiments: true });
  });
});

describe("créations et clés étrangères", () => {
  it("la clé de rattachement devient un connect borné", () => {
    expect(
      argumentsBornes("Batiment", "create", { data: { etablissementId: "e", nom: "n" } }, A),
    ).toEqual({
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

  it("update : une clé remise à null devient un disconnect", () => {
    expect(argumentsBornes("Action", "update", { where: { id: "a" }, data: { equipementId: null } }, A))
      .toMatchObject({ data: { equipement: { disconnect: true } } });
  });

  it("un connect explicite, une liste set, un disconnect ciblé sont bornés", () => {
    const { data } = argumentsBornes(
      "Etablissement",
      "update",
      {
        where: { id: "e" },
        data: {
          batiments: { connect: [{ id: "b1" }], set: [{ id: "b2" }], disconnect: [{ id: "b3" }] },
        },
      },
      A,
    );
    expect(data).toEqual({
      batiments: {
        connect: [{ id: "b1", AND: [ETAB_A] }],
        set: [{ id: "b2", AND: [ETAB_A] }],
        disconnect: [{ id: "b3", AND: [ETAB_A] }],
      },
    });
  });

  it("une création imbriquée est réécrite à son tour", () => {
    const { data } = argumentsBornes(
      "Etablissement",
      "update",
      { where: { id: "e" }, data: { equipements: { create: { batimentId: "b", libelle: "x" } } } },
      A,
    );
    expect(data).toMatchObject({
      equipements: { create: { batiment: { connect: { id: "b", AND: [ETAB_A] } }, libelle: "x" } },
    });
  });

  it("connectOrCreate : where borné, création réécrite", () => {
    const { data } = argumentsBornes(
      "Equipement",
      "create",
      {
        data: {
          etablissementId: "e",
          libelle: "x",
          batiment: { connectOrCreate: { where: { id: "b" }, create: { etablissementId: "e", nom: "n" } } },
        },
      },
      A,
    );
    expect(data).toMatchObject({
      batiment: {
        connectOrCreate: {
          where: { id: "b", AND: [ETAB_A] },
          create: { etablissement: { connect: { id: "e", AND: [COMPTE_A] } } },
        },
      },
    });
  });

  it("refuse une clé et sa relation données ensemble", () => {
    expect(() =>
      argumentsBornes("Batiment", "create", { data: { etablissementId: "e", etablissement: { connect: { id: "e" } }, nom: "n" } }, A),
    ).toThrow(ErreurPortee);
  });

  it.each(["update", "upsert", "delete", "deleteMany", "updateMany"])(
    "refuse une écriture imbriquée %s",
    (op) => {
      expect(() =>
        argumentsBornes("Etablissement", "update", { where: { id: "e" }, data: { batiments: { [op]: {} } } }, A),
      ).toThrow(/écriture imbriquée non bornée/);
    },
  );

  it("upsert : where borné, create et update réécrits", () => {
    const a = argumentsBornes(
      "Batiment",
      "upsert",
      { where: { id: "b" }, create: { etablissementId: "e", nom: "n" }, update: { nom: "m" } },
      A,
    );
    expect(a.where).toEqual({ id: "b", AND: [ETAB_A] });
    expect(a.create).toMatchObject({ etablissement: { connect: { id: "e" } } });
  });
});

describe("racine du compte", () => {
  it("une Entreprise créée reçoit le userId du compte", () => {
    expect(argumentsBornes("Entreprise", "create", { data: { raisonSociale: "x" } }, A).data).toMatchObject({
      userId: "u-a",
    });
  });

  it("refuse une Entreprise au userId d'un autre compte", () => {
    expect(() => argumentsBornes("Entreprise", "create", { data: { userId: "u-b" } }, A)).toThrow(ErreurPortee);
    expect(() =>
      argumentsBornes("Entreprise", "update", { where: { id: "x" }, data: { userId: "u-b" } }, A),
    ).toThrow(ErreurPortee);
    expect(() =>
      argumentsBornes("Entreprise", "updateMany", { data: { userId: "u-b" } }, A),
    ).toThrow(ErreurPortee);
  });

  it("un createMany imbriqué pose la racine du compte, et refuse celle d'un autre", () => {
    const { data } = argumentsBornes(
      "Etablissement",
      "update",
      { where: { id: "e" }, data: { demandesAssistance: { createMany: { data: [{ message: "m" }] } } } },
      A,
    );
    expect(data).toMatchObject({ demandesAssistance: { createMany: { data: [{ message: "m", userId: "u-a" }] } } });
    expect(() =>
      argumentsBornes(
        "Etablissement",
        "update",
        { where: { id: "e" }, data: { demandesAssistance: { createMany: { data: [{ userId: "u-b" }] } } } },
        A,
      ),
    ).toThrow(/différent du compte/);
  });
});

describe("ce qui n'est pas bornable", () => {
  it("createMany vers un parent jamais lu : refusé", () => {
    expect(() =>
      argumentsBornes("Batiment", "createMany", { data: [{ etablissementId: "jamais-lu", nom: "n" }] }, A),
    ).toThrow(/creerEnLotVerifie/);
  });

  it("createMany vers des parents lus par une lecture bornée d'identifiants : accepté", () => {
    noterVus("Etablissement", A, [{ id: "e-lu" }]);
    expect(argumentsBornes("Batiment", "createMany", { data: [{ etablissementId: "e-lu", nom: "n" }] }, A)).toEqual({
      data: [{ etablissementId: "e-lu", nom: "n" }],
    });
  });

  it("un parent lu par un compte n'ouvre pas le createMany d'un autre", () => {
    noterVus("Etablissement", A, [{ id: "e-de-a" }]);
    const B: Portee = { type: "compte", userId: "u-b" };
    expect(() =>
      argumentsBornes("Batiment", "createMany", { data: [{ etablissementId: "e-de-a", nom: "n" }] }, B),
    ).toThrow(ErreurPortee);
  });

  it("seule une lecture des seuls identifiants est retenue", () => {
    expect(estLectureDIdentifiants("findMany", { select: { id: true } })).toBe(true);
    expect(estLectureDIdentifiants("findMany", { select: { id: true, nom: true } })).toBe(false);
    expect(estLectureDIdentifiants("findMany", {})).toBe(false);
    expect(estLectureDIdentifiants("findFirst", { select: { id: true } })).toBe(false);
  });

  it("createMany d'une racine au userId d'un autre compte : refusé", () => {
    expect(() => argumentsBornes("DemandeAssistance", "createMany", { data: [{ userId: "u-b" }] }, A)).toThrow(
      ErreurPortee,
    );
  });

  it("une clé étrangère changée par updateMany est refusée", () => {
    expect(() => argumentsBornes("Action", "updateMany", { data: { equipementId: "q" } }, A)).toThrow(
      ErreurPortee,
    );
  });

  it("une opération inconnue est refusée", () => {
    expect(() => argumentsBornes("Batiment", "aggregateRaw", {}, A)).toThrow(/opération inconnue/);
  });

  it("un modèle hors compte est refusé", () => {
    expect(() => argumentsBornes("QuotaEnvoiOtp", "findMany", {}, A)).toThrow(ErreurPortee);
  });
});
