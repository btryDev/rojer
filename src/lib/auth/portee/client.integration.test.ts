// Le client borné contre un VRAI PostgreSQL (ADR-051) : la matrice
// d'autorisation — chaque opération refusée d'un compte à l'autre, réussie
// dans le compte —, les transactions, et `creerEnLotVerifie`.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe une
// base LOCALE migrée, qu'il VIDE (`TRUNCATE "Entreprise" CASCADE`, et sur cc
// `TRUNCATE "User" CASCADE` : comptes, sessions, seconds facteurs, signatures,
// jetons d'accès) :
//   ISOLATION_INTEGRATION_URL=postgresql://duerp:<mdp>@localhost:5433/rojer_essai_isolation \
//     pnpm exec vitest run src/lib/auth/portee/client.integration
// Jamais une base qui porte des données utiles.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Le vrai client borné, pas le remplacement de vitest.setup.ts.
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/portee/lot-verifie");

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("client borné — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const { clientBorne } = await import("./client");
  const { creerEnLotVerifie } = await import("./lot-verifie");

  // Les comptes A et B, et les personnes qui y travaillent (ADR-054) :
  // identifiants distincts, pour qu'une borne qui prendrait l'un pour l'autre
  // tombe.
  const A = "00000000-0000-0000-0000-00000000000a";
  const B = "00000000-0000-0000-0000-00000000000b";
  const UA = "00000000-0000-0000-0000-0000000001aa";
  const UA2 = "00000000-0000-0000-0000-0000000002aa";
  const UB = "00000000-0000-0000-0000-0000000001bb";
  const dbA = clientBorne({ type: "compte", compteId: A, userId: UA });

  // Sur `cc`, les auteurs pointent vers l'utilisateur de Better Auth, et la
  // racine vers un compte dont il est membre : ils existent avant l'entreprise.
  const avecUtilisateurs = Prisma.dmmf.datamodel.models.some((m) => m.name === "User");
  async function utilisateur(id: string) {
    if (!avecUtilisateurs) return;
    const u = (prisma as unknown as Record<string, { upsert(a: object): Promise<unknown> }>).user;
    await u.upsert({ where: { id }, create: { id, name: id, email: `${id}@exemple.invalid` }, update: {} });
  }

  async function semer(compteId: string, userId: string, nom: string) {
    await utilisateur(userId);
    await prisma.compte.create({
      data: { id: compteId, name: nom, slug: compteId, membres: { create: { userId, role: "owner" } } },
    });
    const ent = await prisma.entreprise.create({ data: { compteId, raisonSociale: nom, effectif: 5, adresse: "1 rue" } });
    const etab = await prisma.etablissement.create({
      data: { entrepriseId: ent.id, raisonDisplay: nom, adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 5 },
    });
    const bat = await prisma.batiment.create({ data: { etablissementId: etab.id, nom: "Principal" } });
    const equip = await prisma.equipement.create({
      data: { etablissementId: etab.id, batimentId: bat.id, categorie: "INSTALLATION_ELECTRIQUE", libelle: "TGBT" },
    });
    const duerp = await prisma.duerp.create({ data: { etablissementId: etab.id } });
    const unite = await prisma.uniteTravail.create({ data: { duerpId: duerp.id, nom: "Cuisine" } });
    const risque = await prisma.risque.create({
      data: { uniteId: unite.id, libelle: "Brûlure", gravite: 2, probabilite: 2, maitrise: 2, criticite: 4 },
    });
    return { ent, etab, bat, equip, risque };
  }

  let a: Awaited<ReturnType<typeof semer>>;
  let b: Awaited<ReturnType<typeof semer>>;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Entreprise" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE "Compte" CASCADE');
    if (avecUtilisateurs) await prisma.$executeRawUnsafe('TRUNCATE "User" CASCADE');
    a = await semer(A, UA, "A");
    b = await semer(B, UB, "B");
    // Une seconde personne, membre du compte A.
    await utilisateur(UA2);
    await prisma.membre.create({ data: { compteId: A, userId: UA2, role: "member" } });
  });
  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Entreprise" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE "Compte" CASCADE');
    if (avecUtilisateurs) await prisma.$executeRawUnsafe('TRUNCATE "User" CASCADE');
    await prisma.$disconnect();
  });

  describe("lectures", () => {
    it("une ligne d'un autre compte est absente, jusqu'à quatre crans", async () => {
      expect(await dbA.etablissement.findUnique({ where: { id: b.etab.id } })).toBeNull();
      await expect(dbA.risque.findUniqueOrThrow({ where: { id: b.risque.id } })).rejects.toThrow();
      expect((await dbA.etablissement.findUnique({ where: { id: a.etab.id } }))?.raisonDisplay).toBe("A");
    });

    it("listes, comptes et regroupements ne voient que le compte", async () => {
      expect((await dbA.equipement.findMany()).map((e) => e.id)).toEqual([a.equip.id]);
      expect(await dbA.risque.count()).toBe(1);
      expect(await dbA.equipement.groupBy({ by: ["etablissementId"], _count: true })).toHaveLength(1);
    });

    it("include rend les filles du compte, comme le client brut", async () => {
      const borne = await dbA.etablissement.findUnique({ where: { id: a.etab.id }, include: { batiments: true } });
      expect(borne?.batiments.length).toBe(await prisma.batiment.count({ where: { etablissementId: a.etab.id } }));
    });

    it("seule la portée de compte existe : une autre est refusée", () => {
      expect(() => clientBorne({ type: "etablissement", etablissementId: a.etab.id } as never)).toThrow(/portée de compte/);
    });

    it("une portée à accesseur ne rend pas deux comptes", async () => {
      let n = 0;
      const p = {
        type: "compte" as const,
        userId: null,
        get compteId() {
          return n++ === 0 ? "00000000-0000-0000-0000-0000000000dd" : B;
        },
      };
      expect(await clientBorne(p).batiment.findMany()).toEqual([]);
    });

    it("la portée est figée : modifier l'objet après coup ne déplace pas le client", async () => {
      const p = { type: "compte" as const, compteId: "00000000-0000-0000-0000-0000000000c0", userId: null };
      const dbC = clientBorne(p);
      p.compteId = B;
      expect(await dbC.batiment.findMany()).toEqual([]);
    });
  });

  describe("plusieurs personnes, un compte (ADR-054)", () => {
    it("un autre membre du compte voit les mêmes lignes", async () => {
      const dbA2 = clientBorne({ type: "compte", compteId: A, userId: UA2 });
      expect((await dbA2.equipement.findMany()).map((e) => e.id)).toEqual([a.equip.id]);
      expect(await dbA2.etablissement.findUnique({ where: { id: b.etab.id } })).toBeNull();
    });

    it("l'identifiant d'une personne n'est pas un compte : il ne voit rien", async () => {
      const mal = clientBorne({ type: "compte", compteId: UA, userId: UA });
      expect(await mal.etablissement.findMany()).toEqual([]);
      expect(await mal.equipement.count()).toBe(0);
    });
  });

  describe("lecture seule (ADR-054 § 4)", () => {
    const lecture = () => clientBorne({ type: "compte", compteId: A, userId: UA2, lectureSeule: true });

    it("lit comme un membre", async () => {
      expect((await lecture().equipement.findMany()).map((e) => e.id)).toEqual([a.equip.id]);
    });

    it("n'écrit rien : création, mise à jour, suppression, en transaction, en SQL brut", async () => {
      const db = lecture();
      const avant = await prisma.equipement.findUniqueOrThrow({ where: { id: a.equip.id } });
      await expect(
        db.batiment.create({ data: { etablissementId: a.etab.id, nom: "lecture" } }),
      ).rejects.toThrow(/lecture seule/);
      await expect(
        db.equipement.update({ where: { id: a.equip.id }, data: { libelle: "modifié" } }),
      ).rejects.toThrow(/lecture seule/);
      await expect(db.equipement.deleteMany({})).rejects.toThrow(/lecture seule/);
      await expect(
        db.$transaction((tx) => tx.equipement.update({ where: { id: a.equip.id }, data: { libelle: "tx" } })),
      ).rejects.toThrow(/lecture seule/);
      await expect(
        db.$executeRaw`UPDATE "Equipement" SET "libelle" = 'brut' WHERE "id" = ${a.equip.id}`,
      ).rejects.toThrow(/lecture seule/);
      expect(await prisma.equipement.findUniqueOrThrow({ where: { id: a.equip.id } })).toEqual(avant);
      expect(await prisma.batiment.count({ where: { nom: "lecture" } })).toBe(0);
    });

    it("une lecture SQL brute passe ; une écriture déguisée en lecture, ou brute dans une transaction, non", async () => {
      const db = lecture();
      const [ligne] = await db.$queryRaw<{ n: number }[]>`SELECT 1::int AS n`;
      expect(ligne.n).toBe(1);
      await expect(
        db.$queryRaw`UPDATE "Equipement" SET "libelle" = 'brut' WHERE "id" = ${a.equip.id} RETURNING "id"`,
      ).rejects.toThrow(/lecture seule/);
      await expect(
        db.$transaction((tx) => tx.$executeRaw`UPDATE "Equipement" SET "libelle" = 'tx' WHERE "id" = ${a.equip.id}`),
      ).rejects.toThrow(/lecture seule/);
      expect((await prisma.equipement.findUniqueOrThrow({ where: { id: a.equip.id } })).libelle).toBe("TGBT");
    });

    it("la demande d'assistance reste ouverte à la lecture seule, et seulement elle", async () => {
      const d = await lecture().demandeAssistance.create({
        data: { compteId: A, userId: UA2, categorie: "autre", message: "question", page: "/" },
      });
      expect(d.compteId).toBe(A);
      await prisma.demandeAssistance.delete({ where: { id: d.id } });
      await expect(lecture().demandeAssistance.deleteMany({})).rejects.toThrow(/lecture seule/);
    });

    it("le client d'un membre qui saisit, sur le même compte, n'est pas celui de la lecture seule", async () => {
      const saisie = clientBorne({ type: "compte", compteId: A, userId: UA2 });
      const b2 = await saisie.batiment.create({ data: { etablissementId: a.etab.id, nom: "saisie" } });
      await prisma.batiment.delete({ where: { id: b2.id } });
      await expect(lecture().batiment.create({ data: { etablissementId: a.etab.id, nom: "x" } })).rejects.toThrow(
        /lecture seule/,
      );
    });
  });

  describe("écritures par where", () => {
    it("update et delete d'une ligne d'un autre compte échouent, B intact", async () => {
      await expect(dbA.etablissement.update({ where: { id: b.etab.id }, data: { raisonDisplay: "x" } })).rejects.toThrow();
      await expect(dbA.equipement.delete({ where: { id: b.equip.id } })).rejects.toThrow();
      expect((await dbA.risque.deleteMany({ where: { id: b.risque.id } })).count).toBe(0);
      const e = await prisma.etablissement.findUnique({ where: { id: b.etab.id }, include: { equipements: true } });
      expect([e?.raisonDisplay, e?.equipements.length]).toEqual(["B", 1]);
    });

    it("upsert sur l'id d'une ligne d'un autre compte crée chez A, sans toucher B", async () => {
      const x = await dbA.batiment.upsert({
        where: { id: b.bat.id },
        create: { etablissementId: a.etab.id, nom: "neuf" },
        update: { nom: "piraté" },
      });
      expect([x.etablissementId, (await prisma.batiment.findUnique({ where: { id: b.bat.id } }))?.nom]).toEqual([
        a.etab.id,
        "Principal",
      ]);
      await prisma.batiment.delete({ where: { id: x.id } });
    });
  });

  describe("créations et clés étrangères", () => {
    it("tout au compte : réussit", async () => {
      const q = await dbA.equipement.create({
        data: { etablissementId: a.etab.id, batimentId: a.bat.id, categorie: "INSTALLATION_ELECTRIQUE", libelle: "x" },
      });
      expect(q.etablissementId).toBe(a.etab.id);
      await prisma.equipement.delete({ where: { id: q.id } });
    });

    it("clé de rattachement ou clé secondaire d'un autre compte : refusée", async () => {
      await expect(
        dbA.equipement.create({ data: { etablissementId: a.etab.id, batimentId: b.bat.id, categorie: "INSTALLATION_ELECTRIQUE", libelle: "x" } }),
      ).rejects.toThrow();
      await expect(dbA.batiment.create({ data: { etablissementId: b.etab.id, nom: "x" } })).rejects.toThrow();
    });

    it("déplacer une clé vers un autre compte, ou y connecter : refusé", async () => {
      await expect(dbA.equipement.update({ where: { id: a.equip.id }, data: { batimentId: b.bat.id } })).rejects.toThrow();
      await expect(
        dbA.etablissement.update({ where: { id: a.etab.id }, data: { batiments: { connect: { id: b.bat.id } } } }),
      ).rejects.toThrow();
      expect((await prisma.batiment.findUnique({ where: { id: b.bat.id } }))?.etablissementId).toBe(b.etab.id);
    });
  });

  describe("écritures imbriquées sous une ligne bornée", () => {
    it("deleteMany imbriqué touche les lignes du parent ; update imbriqué est refusé (non servi)", async () => {
      const t = await prisma.batiment.create({ data: { etablissementId: a.etab.id, nom: "imbrique" } });
      await expect(
        dbA.etablissement.update({
          where: { id: a.etab.id },
          data: { batiments: { update: { where: { id: t.id }, data: { nom: "imbrique-2" } } } },
        }),
      ).rejects.toThrow(/non servie/);
      await dbA.etablissement.update({
        where: { id: a.etab.id },
        data: { batiments: { deleteMany: { nom: "imbrique" } } },
      });
      expect(await prisma.batiment.findUnique({ where: { id: t.id } })).toBeNull();
    });

    it("deleteMany imbriqué n'atteint pas la ligne d'un autre compte", async () => {
      await dbA.etablissement.update({
        where: { id: a.etab.id },
        data: { batiments: { deleteMany: { id: b.bat.id } } },
      });
      expect((await prisma.batiment.findUnique({ where: { id: b.bat.id } }))?.nom).toBe("Principal");
    });
  });

  describe("transactions", () => {
    it("interactive : le client de transaction est borné", async () => {
      expect(await dbA.$transaction((tx) => tx.etablissement.findUnique({ where: { id: b.etab.id } }))).toBeNull();
    });

    it("interactive : l'onboarding crée entreprise et établissement ensemble", async () => {
      const et = await dbA.$transaction(async (tx) => {
        const e = await tx.entreprise.create({ data: { raisonSociale: "A2", effectif: 3, adresse: "x" } });
        return tx.etablissement.create({
          data: { entrepriseId: e.id, raisonDisplay: "A2", adresse: "x", codeNaf: "47.11A", effectifSurSite: 3 },
          include: { entreprise: true },
        });
      });
      expect(et.entreprise.compteId).toBe(A);
      await prisma.entreprise.delete({ where: { id: et.entrepriseId } });
    });

    it("interactive : rattacher à l'entreprise d'un autre compte échoue", async () => {
      await expect(
        dbA.$transaction((tx) =>
          tx.etablissement.create({
            data: { entrepriseId: b.ent.id, raisonDisplay: "x", adresse: "x", codeNaf: "47.11A", effectifSurSite: 3 },
          }),
        ),
      ).rejects.toThrow();
    });

    it("par lot : chaque requête est bornée", async () => {
      const [liste, autre] = await dbA.$transaction([
        dbA.etablissement.findMany(),
        dbA.etablissement.findUnique({ where: { id: b.etab.id } }),
      ]);
      expect([liste.length, autre]).toEqual([1, null]);
    });
  });

  describe("références à l'utilisateur (cc)", () => {
    it.skipIf(!avecUtilisateurs)("une signature du compte se crée, clé User et clé d'établissement ensemble", async () => {
      const sig = await dbA.signature.create({
        data: {
          etablissementId: a.etab.id, userId: UA, objetType: "rapport_verification", objetId: "o",
          signataireNom: "n", signataireEmail: "n@exemple.invalid", hashDocument: "0".repeat(64),
          methode: "compte_connecte",
        },
      });
      expect([sig.etablissementId, sig.userId]).toEqual([a.etab.id, UA]);
      await prisma.signature.delete({ where: { id: sig.id } });
    });

    it.skipIf(!avecUtilisateurs)("une signature ne porte que la personne qui agit, pas un autre membre", async () => {
      await expect(
        dbA.signature.create({
          data: {
            etablissementId: a.etab.id, userId: UA2, objetType: "rapport_verification", objetId: "o",
            signataireNom: "n", signataireEmail: "n@exemple.invalid", hashDocument: "0".repeat(64),
            methode: "compte_connecte",
          },
        }),
      ).rejects.toThrow(/personne qui agit/);
    });

    it("une entreprise ne peut pas pointer un autre compte", async () => {
      await expect(
        dbA.entreprise.create({ data: { raisonSociale: "x", effectif: 1, adresse: "x", compte: { connect: { id: B } } } }),
      ).rejects.toThrow(/que le compte/);
    });
  });

  // ADR-053 : l'abonnement est une racine de compte. Le webhook l'écrit avec
  // le client borné au compte que désigne l'objet Stripe relu ; ce client ne
  // doit ni voir, ni toucher, ni créer l'abonnement d'un autre compte.
  describe("abonnement (ADR-053)", () => {
    beforeAll(async () => {
      await prisma.abonnement.create({ data: { compteId: B, stripeCustomerId: "cus_B", statut: "active" } });
    });

    it("celui d'un autre compte est absent, en lecture comme en écriture", async () => {
      expect(await dbA.abonnement.findUnique({ where: { compteId: B } })).toBeNull();
      // La recherche du webhook : par le client Stripe.
      expect(await dbA.abonnement.findUnique({ where: { stripeCustomerId: "cus_B" } })).toBeNull();
      expect((await dbA.abonnement.findMany()).filter((x) => x.compteId !== A)).toEqual([]);
      await expect(dbA.abonnement.update({ where: { compteId: B }, data: { statut: "canceled" } })).rejects.toThrow();
      await expect(dbA.abonnement.upsert({
        where: { compteId: B },
        create: { compteId: B, stripeCustomerId: "cus_z" },
        update: { statut: "canceled" },
      })).rejects.toThrow();
      expect((await prisma.abonnement.findUniqueOrThrow({ where: { compteId: B } })).statut).toBe("active");
    });

    it("ne se crée pas au nom d'un autre compte", async () => {
      await expect(dbA.abonnement.create({ data: { compteId: B, stripeCustomerId: "cus_x" } })).rejects.toThrow();
      await expect(
        dbA.abonnement.create({ data: { stripeCustomerId: "cus_y", compte: { connect: { id: B } } } }),
      ).rejects.toThrow(/que le compte/);
    });

    it("celui du compte se crée et se relit", async () => {
      await dbA.abonnement.upsert({ where: { compteId: A }, create: { compteId: A, stripeCustomerId: "cus_A" }, update: {} });
      expect((await dbA.abonnement.findMany()).map((x) => x.stripeCustomerId)).toEqual(["cus_A"]);
    });

    it("les événements Stripe sont hors compte : le client borné ne les sert pas", async () => {
      await expect(dbA.evenementStripe.findMany()).rejects.toThrow();
    });
  });

  describe("createMany imbriqué", () => {
    it("est refusé (forme non servie) : une racine d'un autre compte n'y passe pas, B ne voit rien", async () => {
      await expect(
        dbA.etablissement.update({
          where: { id: a.etab.id },
          data: { demandesAssistance: { createMany: { data: [{ compteId: B, userId: UB, categorie: "duerp", message: "injecté", page: "/" }] } } },
        } as never),
      ).rejects.toThrow(/non servie/);
      expect(await prisma.demandeAssistance.count({ where: { compteId: B } })).toBe(0);
    });
  });

  describe("createMany", () => {
    it("direct, vers un parent jamais lu : refusé", async () => {
      await expect(dbA.batiment.createMany({ data: [{ etablissementId: a.etab.id, nom: "x" }] })).rejects.toThrow(
        /creerEnLotVerifie/,
      );
    });

    it("par creerEnLotVerifie, dans le compte : inséré, dans la transaction", async () => {
      const n = await dbA.$transaction(async (tx) => {
        const r = await creerEnLotVerifie(tx, "Batiment", [
          { etablissementId: a.etab.id, nom: "lot-1" },
          { etablissementId: a.etab.id, nom: "lot-2" },
        ]);
        return r.count;
      });
      expect(n).toBe(2);
      await prisma.batiment.deleteMany({ where: { nom: { startsWith: "lot-" } } });
    });

    it("une lecture d'identifiants hors lot n'ouvre pas un createMany ensuite", async () => {
      await dbA.etablissement.findMany({ select: { id: true } });
      await expect(dbA.batiment.createMany({ data: [{ etablissementId: a.etab.id, nom: "x" }] })).rejects.toThrow(
        /creerEnLotVerifie/,
      );
    });

    it("par creerEnLotVerifie, un parent d'un autre compte : rien n'est inséré", async () => {
      await expect(
        creerEnLotVerifie(dbA, "Batiment", [
          { etablissementId: a.etab.id, nom: "lot-a" },
          { etablissementId: b.etab.id, nom: "lot-b" },
        ]),
      ).rejects.toThrow(/hors du compte/);
      expect(await prisma.batiment.count({ where: { nom: { startsWith: "lot-" } } })).toBe(0);
    });

    it("par creerEnLotVerifie, parent créé dans la même transaction : vu", async () => {
      const n = await dbA.$transaction(async (tx) => {
        const e = await tx.entreprise.create({ data: { raisonSociale: "A3", effectif: 1, adresse: "x" } });
        const et = await tx.etablissement.create({
          data: { entrepriseId: e.id, raisonDisplay: "A3", adresse: "x", codeNaf: "47.11A", effectifSurSite: 1 },
        });
        return (await creerEnLotVerifie(tx, "Batiment", [{ etablissementId: et.id, nom: "lot-tx" }])).count;
      });
      expect(n).toBe(1);
      await prisma.entreprise.deleteMany({ where: { raisonSociale: "A3" } });
    });
  });
});
