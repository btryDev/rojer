// LE REMPLISSAGE DE LA MIGRATION `20261103180000_effectif_par_les_sites`,
// rejoué sur une base PEUPLÉE (2026-11-03). Il remplit les deux colonnes
// neuves pour que la somme des sites retombe sur l'effectif déclaré jusqu'ici
// — jamais en dessous —, puis écrit cette somme dans `Entreprise.effectif`.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `EFFECTIF_INTEGRATION_URL` pointe une
// base LOCALE migrée, qu'il peuple et nettoie :
//   EFFECTIF_INTEGRATION_URL=postgresql://duerp:<mdp>@localhost:5447/duerp \
//     pnpm exec vitest run effectif-migration.integration

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const URL_BASE = process.env.EFFECTIF_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("migration effectif par les sites — PostgreSQL réel", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: URL_BASE });
  const MARQUE = "test-integration-effectif";
  const remplissage = readFileSync(
    join(process.cwd(), "prisma/migrations/20261103180000_effectif_par_les_sites/migration.sql"),
    "utf8",
  ).match(/UPDATE[\s\S]*?;/g)!;

  const nettoyer = () => prisma.entreprise.deleteMany({ where: { raisonSociale: MARQUE } });
  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  async function entreprise(effectif: number, sites: number[]) {
    return prisma.entreprise.create({
      data: {
        raisonSociale: MARQUE,
        effectif,
        adresse: "1 rue, 75000 Paris",
        etablissements: {
          create: sites.map((n) => ({
            raisonDisplay: MARQUE,
            adresse: "1 rue, 75000 Paris",
            codeNaf: "56.10A",
            effectifSurSite: n,
          })),
        },
      },
      select: { id: true },
    });
  }

  async function etat(id: string) {
    const e = await prisma.entreprise.findUniqueOrThrow({
      where: { id },
      select: {
        effectif: true,
        effectifHorsRojer: true,
        etablissements: { select: { effectifSurSite: true, apprentisSurSite: true } },
      },
    });
    const somme =
      e.etablissements.reduce((n, s) => n + s.effectifSurSite - s.apprentisSurSite, 0) +
      e.effectifHorsRojer;
    return { ...e, somme };
  }

  it("la somme retombe sur l'effectif déclaré, jamais en dessous, et le remplissage se rejoue", async () => {
    await nettoyer();
    const a = await entreprise(8, [10]); // un site, déclaré sous le site : 2 apprentis
    const b = await entreprise(40, [10]); // un site, 30 salariés hors Rojer
    const c = await entreprise(30, [20, 15]); // deux sites, déclaré sous leur somme
    const d = await entreprise(40, [10, 5]); // deux sites, 25 hors Rojer
    for (let passe = 0; passe < 2; passe++) {
      for (const sql of remplissage) await prisma.$executeRawUnsafe(sql);
      expect(await etat(a.id)).toMatchObject({ effectif: 8, somme: 8, effectifHorsRojer: 0 });
      expect((await etat(a.id)).etablissements[0].apprentisSurSite).toBe(2);
      expect(await etat(b.id)).toMatchObject({ effectif: 40, somme: 40, effectifHorsRojer: 30 });
      // Plusieurs sites : la somme des sites l'emporte quand elle est plus haute.
      expect(await etat(c.id)).toMatchObject({ effectif: 35, somme: 35, effectifHorsRojer: 0 });
      expect(await etat(d.id)).toMatchObject({ effectif: 40, somme: 40, effectifHorsRojer: 25 });
    }
  });

  it("la base refuse plus d'apprentis que de travailleurs", async () => {
    await nettoyer();
    const a = await entreprise(5, [5]);
    await expect(
      prisma.etablissement.updateMany({ where: { entrepriseId: a.id }, data: { apprentisSurSite: 6 } }),
    ).rejects.toThrow();
  });
});
