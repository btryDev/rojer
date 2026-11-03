// La création d'un compte par le plugin `organization` de Better Auth, contre
// un VRAI PostgreSQL (ADR-054 § 5) : nos noms de tables (`Compte`, `Membre`)
// et l'« action système » de l'onboarding, la création depuis une session
// étant fermée.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe
// une base LOCALE migrée. Il n'efface que ce qu'il crée.

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/membres");
vi.mock("@/lib/auth/require-user", () => ({ lireSessionCourante: async () => null }));

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("création d'un compte par le plugin — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  process.env.BETTER_AUTH_SECRET ??= "secret-de-test-integration-0123456789abcdef";
  const { prisma } = await import("@/lib/prisma");
  const { compteDOnboarding, appartenanceCourante } = await import("./membres");
  const { auth } = await import("./better-auth");

  const U = randomUUID();
  const comptes: string[] = [];

  afterAll(async () => {
    await prisma.compte.deleteMany({ where: { id: { in: comptes } } });
    await prisma.user.deleteMany({ where: { id: U } });
    await prisma.$disconnect();
  });

  it("crée le compte et son propriétaire, que l'appartenance relit", async () => {
    await prisma.user.create({ data: { id: U, name: "Dirigeante", email: `${U}@exemple.test`, emailVerified: true } });
    const a = await compteDOnboarding(U, "Café du Port");
    comptes.push(a.compteId);
    expect(a.role).toBe("owner");
    const compte = await prisma.compte.findUniqueOrThrow({ where: { id: a.compteId }, include: { membres: true } });
    expect(compte.name).toBe("Café du Port");
    expect(compte.membres.map((m) => [m.userId, m.role])).toEqual([[U, "owner"]]);
    expect(await appartenanceCourante(U, null)).toEqual(a);
  });

  // Un appel HTTP (en-têtes) n'est jamais une « action système ». Le refus
  // d'une session réelle (`allowUserToCreateOrganization: false`) est lu dans
  // le code du plugin (`crud-org.mjs`), pas éprouvé ici : il faudrait un
  // cookie de session signé.
  it("deux premiers onboardings simultanés ne laissent qu'un compte, le même pour les deux", async () => {
    const V = randomUUID();
    await prisma.user.create({ data: { id: V, name: "Deux onglets", email: `${V}@exemple.test`, emailVerified: true } });
    try {
      const [x, y] = await Promise.all([compteDOnboarding(V, "Onglet 1"), compteDOnboarding(V, "Onglet 2")]);
      expect(x.compteId).toBe(y.compteId);
      expect(await prisma.membre.count({ where: { userId: V } })).toBe(1);
      comptes.push(x.compteId);
    } finally {
      await prisma.compte.deleteMany({ where: { membres: { some: { userId: V } } } });
      await prisma.user.deleteMany({ where: { id: V } });
    }
  });

  it("un appel porteur d'en-têtes, sans session, est refusé", async () => {
    await expect(
      auth.api.createOrganization({ body: { name: "x", slug: randomUUID() }, headers: new Headers() }),
    ).rejects.toThrow();
  });
});
