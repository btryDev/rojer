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

  it("un rôle inconnu n'ouvre rien", async () => {
    const u = randomUUID();
    await prisma.user.create({ data: { id: u, name: "x", email: `${u}@exemple.test` } });
    await prisma.membre.create({ data: { compteId: A, userId: u, role: "admin" } });
    try {
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

  it("une personne d'un autre compte ne lit rien de A, même avec A pour compte actif", async () => {
    session.userId = ETRANGER;
    session.compteActifId = A;
    const { compte, db } = await requireCompte();
    expect(compte.compteId).toBe(B);
    expect(await db.etablissement.findUnique({ where: { id: etabA } })).toBeNull();
  });
});
