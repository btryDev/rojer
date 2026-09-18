import { describe, expect, it } from "vitest";
import { fauxPrisma, magasinVide, type LigneFausse } from "./faux-prisma";

// Le faux client est lui-même sous test, sur les deux points où il pouvait
// mentir en silence (ADR-036, lot 2a — 2026-09-18) : la projection `select`,
// qu'il ignorait, et l'origine du suivi, qu'une insertion pouvait omettre en
// prenant le défaut de la colonne.

function ligne(partiel: Partial<LigneFausse> & { id: string }): LigneFausse {
  return {
    etablissementId: "etab-1",
    equipementId: null,
    salarieId: null,
    obligationId: "o-1",
    libelleObligation: "Obligation",
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: new Date("2026-01-01T00:00:00Z"),
    statut: "planifiee",
    suiviDepuis: new Date("2025-06-15T10:12:00Z"),
    nbRapports: 2,
    nbActions: 0,
    ...partiel,
  };
}

type FindMany = (args: {
  where: { etablissementId: string };
  select?: Record<string, unknown>;
}) => Promise<Record<string, unknown>[]>;

type CreateMany = (args: {
  data: Record<string, unknown>[];
  skipDuplicates?: boolean;
}) => PromiseLike<{ count: number }>;

function client() {
  const db = magasinVide();
  db.verifications = [ligne({ id: "v-1" })];
  const prisma = fauxPrisma(db) as unknown as {
    verification: { findMany: FindMany; createMany: CreateMany };
  };
  return { db, prisma };
}

describe("faux-prisma — verification.findMany honore `select`", () => {
  it("ne rend que les colonnes demandées, `_count` compris", async () => {
    const { prisma } = client();
    const [v] = await prisma.verification.findMany({
      where: { etablissementId: "etab-1" },
      select: {
        id: true,
        suiviDepuis: true,
        _count: { select: { rapports: true, actions: true } },
      },
    });
    expect(v).toEqual({
      id: "v-1",
      suiviDepuis: new Date("2025-06-15T10:12:00Z"),
      _count: { rapports: 2, actions: 0 },
    });
    // La preuve que la projection est appliquée et non la ligne entière : une
    // colonne non demandée n'est pas là. C'est ce qui rend visible le retrait
    // d'une colonne du `select` de production.
    expect(v).not.toHaveProperty("datePrevue");
    expect(v).not.toHaveProperty("nbRapports");
  });

  it("sert `null` pour une colonne nullable absente de la fixture", async () => {
    const { prisma } = client();
    const [v] = await prisma.verification.findMany({
      where: { etablissementId: "etab-1" },
      select: { archiveLe: true, prescriptionId: true },
    });
    expect(v).toEqual({ archiveLe: null, prescriptionId: null });
  });

  it("refuse une clé qui n'est pas une colonne", async () => {
    const { prisma } = client();
    await expect(
      prisma.verification.findMany({
        where: { etablissementId: "etab-1" },
        select: { id: true, nbRapports: true },
      }),
    ).rejects.toThrow(/select\.nbRapports/);
    await expect(
      prisma.verification.findMany({
        where: { etablissementId: "etab-1" },
        select: { _count: { select: { commentaires: true } } },
      }),
    ).rejects.toThrow(/_count\.commentaires/);
  });

  it("sans `select`, rend la ligne entière avec `_count` — le comportement d'avant", async () => {
    const { prisma } = client();
    const [v] = await prisma.verification.findMany({
      where: { etablissementId: "etab-1" },
    });
    expect(v.id).toBe("v-1");
    expect(v.datePrevue).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(v._count).toEqual({ rapports: 2, actions: 0 });
  });
});

describe("faux-prisma — verification.createMany exige `suiviDepuis`", () => {
  it("refuse une insertion sans origine de suivi", async () => {
    const { prisma } = client();
    await expect(
      prisma.verification.createMany({
        data: [
          {
            etablissementId: "etab-1",
            obligationId: "o-2",
            equipementId: null,
            salarieId: null,
            libelleObligation: "x",
            periodicite: "annuelle",
            realisateurRequis: [],
            datePrevue: new Date("2026-01-01T00:00:00Z"),
            statut: "a_planifier",
            prescriptionId: null,
          },
        ],
      }),
    ).rejects.toThrow(/suiviDepuis absent/);
  });

  it("pose la ligne avec l'origine fournie, telle quelle", async () => {
    const { db, prisma } = client();
    const origine = new Date("2026-09-18T08:00:00Z");
    const { count } = await prisma.verification.createMany({
      data: [
        {
          etablissementId: "etab-1",
          obligationId: "o-2",
          equipementId: null,
          salarieId: null,
          libelleObligation: "x",
          periodicite: "annuelle",
          realisateurRequis: [],
          datePrevue: new Date("2026-01-01T00:00:00Z"),
          statut: "a_planifier",
          prescriptionId: null,
          suiviDepuis: origine,
        },
      ],
    });
    expect(count).toBe(1);
    expect(db.verifications.find((v) => v.obligationId === "o-2")?.suiviDepuis).toBe(
      origine,
    );
  });
});
