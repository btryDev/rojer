import { beforeEach, describe, expect, it, vi } from "vitest";

// La date du dernier contrôle déclarée (ADR-051) : ce que l'action écrit, et
// ce qu'elle refuse.

const h = vi.hoisted(() => ({
  ligne: {
    id: "v1",
    etablissementId: "e1",
    equipementId: "eq1" as string | null,
    archiveLe: null as Date | null,
    salarieId: null as string | null,
    periodicite: "annuelle" as string,
  },
  actif: true,
  miseEnService: null as Date | null,
  archiveSousVerrou: null as Date | null,
  realises: 0,
  updateMany: vi.fn(async () => ({ count: 1 })),
  recalculer: vi.fn(async () => ({ ecrit: true })),
  regenerer: vi.fn(async () => true),
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    $queryRaw: vi.fn(async () => []),
    rapportVerification: { count: vi.fn(async () => h.realises) },
    verification: {
      updateMany: h.updateMany,
      findUnique: vi.fn(async () => ({ archiveLe: h.archiveSousVerrou })),
    },
  };
  return {
    prisma: {
      equipement: {
        findFirst: vi.fn(async () => ({ actif: h.actif, dateMiseEnService: h.miseEnService })),
      },
      $transaction: vi.fn(async (f: (t: typeof tx) => unknown) => f(tx)),
    },
  };
});
vi.mock("@/lib/auth/scope", () => ({
  requireVerification: vi.fn(async () => ({ verification: h.ligne, etablissementId: "e1" })),
}));
vi.mock("@/lib/calendrier/recalcul-ligne", () => ({ recalculerLigne: h.recalculer }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({ regenererApresMutation: h.regenerer }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { declarerDernierControle } = await import("./actions");

const IDLE = { status: "idle" } as const;
const fd = (v: string) => {
  const f = new FormData();
  f.set("dernierControleLe", v);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  h.ligne.periodicite = "annuelle";
  h.ligne.salarieId = null;
  h.actif = true;
  h.miseEnService = null;
  h.archiveSousVerrou = null;
  h.realises = 0;
});

describe("declarerDernierControle", () => {
  it("écrit la date sur la ligne du compte, puis la recalcule", async () => {
    const r = await declarerDernierControle("v1", IDLE, fd("2026-03-15"));
    expect(r).toEqual({ status: "success" });
    expect(h.updateMany).toHaveBeenCalledWith({
      where: { id: "v1", etablissementId: "e1" },
      data: { dernierControleDeclareLe: new Date("2026-03-14T23:00:00Z") },
    });
    expect(h.recalculer).toHaveBeenCalledWith(expect.anything(), "v1");
  });

  it("refuse quand un rapport réalisé est déjà là : la pièce date l'échéance", async () => {
    h.realises = 1;
    const r = await declarerDernierControle("v1", IDLE, fd("2026-03-15"));
    expect(r.status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
  });

  it("refuse un contrôle ponctuel", async () => {
    h.ligne.periodicite = "mise_en_service_uniquement";
    const r = await declarerDernierControle("v1", IDLE, fd("2026-03-15"));
    expect(r.status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
  });

  it("refuse un appareil retiré du parc", async () => {
    h.actif = false;
    const r = await declarerDernierControle("v1", IDLE, fd("2026-03-15"));
    expect(r.status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
  });

  it("refuse une date à venir", async () => {
    const r = await declarerDernierControle("v1", IDLE, fd("2999-01-01"));
    expect(r.status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
  });

  it("vide : retire la date déclarée", async () => {
    await declarerDernierControle("v1", IDLE, fd(""));
    expect(h.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dernierControleDeclareLe: null } }),
    );
  });

  it("refuse une date antérieure à la mise en service de l'appareil", async () => {
    h.miseEnService = new Date("2025-08-31T22:00:00Z"); // 1er septembre 2025, Paris
    const r = await declarerDernierControle("v1", IDLE, fd("2025-08-31"));
    expect(r.status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
    expect((await declarerDernierControle("v1", IDLE, fd("2025-09-01"))).status).toBe("success");
  });

  it("refuse une ligne archivée entre la lecture et le verrou", async () => {
    h.archiveSousVerrou = new Date();
    const r = await declarerDernierControle("v1", IDLE, fd("2026-03-15"));
    expect(r.status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
  });
});
