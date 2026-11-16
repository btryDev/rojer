// La purge des inscriptions jamais activées (2026-11-16), contre un VRAI
// PostgreSQL : seules partent les personnes non confirmées, inscrites depuis
// plus de trente jours, sans aucun lien — et leurs sessions avec elles.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe
// une base LOCALE migrée. La purge s'applique à toute la base de test : elle
// efface aussi les personnes non confirmées d'autres tests, inscrites avant
// le 2026-12-01 — la base d'intégration n'en garde pas.

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("inscriptions jamais activées : effacées au bout de trente jours", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { purgerComptesNonActives, JOURS_AVANT_PURGE } = await import("./comptes-non-actives");
  const { ajouterJours } = await import("@/lib/dates");

  const maintenant = new Date("2026-12-31T10:00:00Z");
  const jours = (n: number) => ajouterJours(maintenant, -n);
  const crees: string[] = [];
  const personne = async (o: { verifiee: boolean; il_y_a: number }) => {
    const email = `purge-${randomUUID()}@exemple.test`;
    const u = await prisma.user.create({
      data: { email, name: email, emailVerified: o.verifiee, createdAt: jours(o.il_y_a) },
    });
    crees.push(u.id);
    return u.id;
  };

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: { in: crees } } });
    await prisma.user.deleteMany({ where: { id: { in: crees } } });
  });

  it("efface la non confirmée trop ancienne et ses sessions ; garde la récente et la confirmée", async () => {
    const ancienne = await personne({ verifiee: false, il_y_a: JOURS_AVANT_PURGE + 1 });
    const recente = await personne({ verifiee: false, il_y_a: JOURS_AVANT_PURGE - 1 });
    const confirmee = await personne({ verifiee: true, il_y_a: JOURS_AVANT_PURGE + 100 });
    await prisma.session.create({
      data: { userId: ancienne, token: randomUUID(), expiresAt: maintenant },
    });

    const { supprimes } = await purgerComptesNonActives(maintenant);

    expect(supprimes).toBeGreaterThanOrEqual(1);
    const restants = await prisma.user.findMany({ where: { id: { in: [ancienne, recente, confirmee] } }, select: { id: true } });
    expect(restants.map((r) => r.id).sort()).toEqual([recente, confirmee].sort());
    expect(await prisma.session.count({ where: { userId: ancienne } })).toBe(0);
  });
});
