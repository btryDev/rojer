// La limitation de débit contre un VRAI PostgreSQL : l'atomicité de
// `INSERT … ON CONFLICT DO UPDATE` sous concurrence, la réouverture de la
// fenêtre et le ménage ne se voient pas avec un faux client.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `LIMITE_DEBIT_INTEGRATION_URL` pointe
// une base LOCALE migrée (jamais Supabase ni la prod) :
//   LIMITE_DEBIT_INTEGRATION_URL=postgresql://duerp:duerp@localhost:5433/<base> \
//     vitest run limite-debit.integration
// Il n'écrit que des clés `test-integration:*`, et les efface.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL_BASE = process.env.LIMITE_DEBIT_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("limite de débit — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { consommer } = await import("./limite-debit");
  const prefixe = `test-integration:${Date.now()}`;
  const sansMenage = { tirage: () => 0.5 };

  const nettoyer = () =>
    prisma.$executeRaw`DELETE FROM "LimiteDebit" WHERE "cle" LIKE ${prefixe + "%"}`;
  beforeAll(nettoyer);
  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  it("vingt tentatives simultanées sur une limite de cinq : cinq passent", async () => {
    const cle = `${prefixe}:rafale`;
    const verdicts = await Promise.all(
      Array.from({ length: 20 }, () =>
        consommer([{ cle, limite: { max: 5, fenetreSecondes: 60 } }], sansMenage),
      ),
    );
    expect(verdicts.filter((v) => v.ok)).toHaveLength(5);
    const refus = verdicts.find((v) => !v.ok);
    expect(refus && !refus.ok && refus.reessayerDansSecondes).toBeGreaterThan(50);
    const [ligne] = await prisma.$queryRaw<{ compte: number }[]>`
      SELECT "compte" FROM "LimiteDebit" WHERE "cle" = ${cle}`;
    expect(ligne.compte).toBe(20);
  });

  it("une fenêtre close repart de un", async () => {
    const cle = `${prefixe}:fenetre`;
    const limite = { max: 1, fenetreSecondes: 60 };
    expect((await consommer([{ cle, limite }], sansMenage)).ok).toBe(true);
    expect((await consommer([{ cle, limite }], sansMenage)).ok).toBe(false);
    await prisma.$executeRaw`
      UPDATE "LimiteDebit" SET "fenetreFin" = now() - interval '1 second' WHERE "cle" = ${cle}`;
    expect((await consommer([{ cle, limite }], sansMenage)).ok).toBe(true);
  });

  it("le ménage efface les fenêtres closes depuis plus d'un jour, pas les autres", async () => {
    const vieille = `${prefixe}:vieille`;
    const recente = `${prefixe}:recente`;
    await prisma.$executeRaw`
      INSERT INTO "LimiteDebit" ("cle", "compte", "fenetreFin") VALUES
        (${vieille}, 3, now() - interval '2 days'),
        (${recente}, 3, now() - interval '1 hour')`;
    await consommer([{ cle: `${prefixe}:declencheur`, limite: { max: 9, fenetreSecondes: 60 } }], {
      tirage: () => 0,
    });
    const restantes = await prisma.$queryRaw<{ cle: string }[]>`
      SELECT "cle" FROM "LimiteDebit" WHERE "cle" IN (${vieille}, ${recente})`;
    expect(restantes.map((r) => r.cle)).toEqual([recente]);
  });
});
