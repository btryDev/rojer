// L'appartenance à un compte contre un VRAI PostgreSQL (ADR-054 § 3 et § 6) :
// elle est relue à chaque appel, le compte actif de la session n'est qu'une
// préférence, et un membre retiré perd l'accès à l'appel suivant — sans être
// déconnecté.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe
// une base LOCALE migrée. Il n'efface que ce qu'il crée.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/membres");
// `better-auth.ts` n'est lu que pour créer un compte, éprouvé à part
// (`creer-compte.integration`).
vi.mock("@/lib/auth/better-auth", () => ({ auth: {} }));

const session = vi.hoisted(() => ({ userId: "", compteActifId: null as string | null }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: session.userId, email: null, twoFactorEnabled: false }),
  getOptionalUser: async () => ({ id: session.userId, email: null, twoFactorEnabled: false }),
  lireSessionCourante: async () => ({ session: { activeOrganizationId: session.compteActifId } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("appartenance au compte — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { appartenanceCourante } = await import("./membres");
  const { requireCompte } = await import("./compte");
  const { creerCompteDeTest, effacerUtilisateursDeTest } = await import("@/test/utilisateur-de-test");

  const PROPRIETAIRE = randomUUID();
  const MEMBRE = randomUUID();
  const ETRANGER = randomUUID();
  let A = "";
  let B = "";
  let etabA = "";
  const entreprises: string[] = [];

  beforeAll(async () => {
    A = await creerCompteDeTest(prisma, PROPRIETAIRE);
    B = await creerCompteDeTest(prisma, ETRANGER);
    await prisma.user.create({ data: { id: MEMBRE, name: "m", email: `${MEMBRE}@exemple.test` } });
    await prisma.membre.create({ data: { compteId: A, userId: MEMBRE, role: "member" } });
    const ent = await prisma.entreprise.create({
      data: {
        compteId: A,
        raisonSociale: "A",
        effectif: 3,
        adresse: "1 rue",
        etablissements: { create: { raisonDisplay: "A", adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 3 } },
      },
      include: { etablissements: true },
    });
    entreprises.push(ent.id);
    etabA = ent.etablissements[0].id;
  });
  afterAll(async () => {
    await prisma.entreprise.deleteMany({ where: { id: { in: entreprises } } });
    await prisma.compte.deleteMany({ where: { id: { in: [A, B] } } });
    await effacerUtilisateursDeTest(prisma, [PROPRIETAIRE, MEMBRE, ETRANGER]);
    await prisma.$disconnect();
  });

  it("un seul compte : c'est lui, avec le rôle de la ligne Membre", async () => {
    expect(await appartenanceCourante(MEMBRE, null)).toEqual({ compteId: A, role: "member" });
  });

  it("un compte actif dont la personne n'est pas membre est ignoré", async () => {
    expect(await appartenanceCourante(MEMBRE, B)).toEqual({ compteId: A, role: "member" });
    expect(await appartenanceCourante(ETRANGER, A)).toEqual({ compteId: B, role: "owner" });
  });

  it("deux comptes sans choix : le plus ancien ; le compte actif tranche", async () => {
    await prisma.membre.create({ data: { compteId: B, userId: MEMBRE, role: "lecture" } });
    try {
      expect(await appartenanceCourante(MEMBRE, null)).toEqual({ compteId: A, role: "member" });
      expect(await appartenanceCourante(MEMBRE, B)).toEqual({ compteId: B, role: "lecture" });
      expect(await appartenanceCourante(MEMBRE, A)).toEqual({ compteId: A, role: "member" });
    } finally {
      await prisma.membre.deleteMany({ where: { compteId: B, userId: MEMBRE } });
    }
  });

  it("un lien d'invitation abîmé se lit comme une invitation inexistante, sans erreur", async () => {
    const { invitationAdresseeA } = await import("./membres");
    expect(await invitationAdresseeA("abc", "x@exemple.test")).toBeNull();
    expect(await invitationAdresseeA(randomUUID(), "x@exemple.test")).toBeNull();
  });

  it("un rôle inconnu ou multiple est refusé par la base elle-même", async () => {
    const u = randomUUID();
    await prisma.user.create({ data: { id: u, name: "x", email: `${u}@exemple.test` } });
    try {
      for (const role of ["admin", "member,lecture"]) {
        await expect(prisma.membre.create({ data: { compteId: A, userId: u, role } })).rejects.toThrow(/Membre_role_valide/);
      }
      expect(await appartenanceCourante(u, A)).toBeNull();
    } finally {
      await effacerUtilisateursDeTest(prisma, [u]);
    }
  });

  it("un membre retiré perd l'accès à l'appel suivant, son compte actif encore en session", async () => {
    session.userId = MEMBRE;
    session.compteActifId = A;
    const { db } = await requireCompte();
    expect((await db.etablissement.findMany({ select: { id: true } })).map((e) => e.id)).toEqual([etabA]);

    await prisma.membre.delete({ where: { compteId_userId: { compteId: A, userId: MEMBRE } } });
    try {
      // La session n'a pas bougé : `compteActifId` désigne toujours A.
      await expect(requireCompte()).rejects.toThrow("REDIRECT /onboarding");
    } finally {
      await prisma.membre.create({ data: { compteId: A, userId: MEMBRE, role: "member" } });
    }
  });

  it("un membre en lecture seule reçoit un client qui lit et n'écrit pas", async () => {
    await prisma.membre.update({ where: { compteId_userId: { compteId: A, userId: MEMBRE } }, data: { role: "lecture" } });
    try {
      session.userId = MEMBRE;
      session.compteActifId = A;
      const { compte, db } = await requireCompte();
      expect(compte.role).toBe("lecture");
      expect((await db.etablissement.findMany({ select: { id: true } })).map((e) => e.id)).toEqual([etabA]);
      await expect(db.etablissement.update({ where: { id: etabA }, data: { raisonDisplay: "x" } })).rejects.toThrow(
        /lecture seule/,
      );
      // Le rôle relu à chaque appel : repassé membre, il écrit.
      await prisma.membre.update({ where: { compteId_userId: { compteId: A, userId: MEMBRE } }, data: { role: "member" } });
      const { db: db2 } = await requireCompte();
      await db2.etablissement.update({ where: { id: etabA }, data: { raisonDisplay: "A" } });
    } finally {
      await prisma.membre.update({ where: { compteId_userId: { compteId: A, userId: MEMBRE } }, data: { role: "member" } });
    }
  });

  it("la base refuse de laisser un compte sans propriétaire ; un compte supprimé emporte ses membres", async () => {
    await expect(
      prisma.membre.delete({ where: { compteId_userId: { compteId: A, userId: PROPRIETAIRE } } }),
    ).rejects.toThrow(/au moins un propriétaire/);
    await expect(
      prisma.membre.update({ where: { compteId_userId: { compteId: A, userId: PROPRIETAIRE } }, data: { role: "member" } }),
    ).rejects.toThrow(/au moins un propriétaire/);
    const C = await creerCompteDeTest(prisma, ETRANGER);
    await prisma.compte.delete({ where: { id: C } });
    expect(await prisma.membre.count({ where: { compteId: C } })).toBe(0);
  });

  it("deux propriétaires qui se retirent l'un l'autre au même instant : un seul geste passe", async () => {
    await prisma.membre.update({ where: { compteId_userId: { compteId: A, userId: MEMBRE } }, data: { role: "owner" } });
    // Deux connexions, deux transactions qui se chevauchent : la première retire
    // PROPRIETAIRE et attend ; la seconde retire MEMBRE pendant ce temps.
    const { PrismaClient } = await import("@prisma/client");
    const [c1, c2] = [new PrismaClient({ datasourceUrl: URL_BASE }), new PrismaClient({ datasourceUrl: URL_BASE })];
    const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      const issues = await Promise.allSettled([
        c1.$transaction(async (t) => {
          await t.membre.delete({ where: { compteId_userId: { compteId: A, userId: PROPRIETAIRE } } });
          await attendre(400);
        }, { timeout: 5000 }),
        (async () => {
          await attendre(100);
          await c2.$transaction((t) => t.membre.delete({ where: { compteId_userId: { compteId: A, userId: MEMBRE } } }), {
            timeout: 5000,
          });
        })(),
      ]);
      expect(issues.map((i) => i.status)).toEqual(["fulfilled", "rejected"]);
      expect(await prisma.membre.count({ where: { compteId: A, role: "owner" } })).toBe(1);
    } finally {
      await Promise.all([c1.$disconnect(), c2.$disconnect()]);
      // Remise en état : PROPRIETAIRE propriétaire, MEMBRE membre.
      if (!(await prisma.membre.findUnique({ where: { compteId_userId: { compteId: A, userId: PROPRIETAIRE } } })))
        await prisma.membre.create({ data: { compteId: A, userId: PROPRIETAIRE, role: "owner" } });
      await prisma.membre.update({ where: { compteId_userId: { compteId: A, userId: MEMBRE } }, data: { role: "member" } });
    }
  });

  it("une personne d'un autre compte ne lit rien de A, même avec A pour compte actif", async () => {
    session.userId = ETRANGER;
    session.compteActifId = A;
    const { compte, db } = await requireCompte();
    expect(compte.compteId).toBe(B);
    expect(await db.etablissement.findUnique({ where: { id: etabA } })).toBeNull();
  });
});
