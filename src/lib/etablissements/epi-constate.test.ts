import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  updateMany: vi.fn(),
  count: vi.fn(),
  regenerer: vi.fn(async () => true),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { etablissement: { updateMany: h.updateMany, count: h.count } },
}));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({ regenererApresMutation: h.regenerer }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { constaterEpi, epiConstates } = await import("./epi-constate");
// Le client que la garde de l'appelant rendrait (ADR-051) : ici, le simulé.
const { prisma: db } = await import("@/lib/prisma");

beforeEach(() => {
  h.updateMany.mockReset();
  h.count.mockReset();
  h.regenerer.mockClear();
});

const CONSTATES = {
  OR: [
    { actions: { some: { type: "protection_individuelle", statut: "levee" } } },
    { equipements: { some: { actif: true, categorie: { in: expect.any(Array) } } } },
  ],
};

describe("EPI constatés : une mesure en place ou un EPI au parc vaut « oui »", () => {
  it("ne passe à « oui » qu'un silence ou un « non », sur une mesure LEVÉE ou un EPI actif", async () => {
    h.updateMany.mockResolvedValue({ count: 1 });
    expect(await constaterEpi("etab-1")).toBe(true);
    expect(h.updateMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { id: "etab-1" },
          { OR: [{ epiPresents: false }, { epiPresents: null }] },
          CONSTATES,
        ],
      },
      data: { epiPresents: true },
    });
    expect(h.regenerer).toHaveBeenCalledWith("etab-1", "epi/constate");
  });

  it("sans changement, ou à la demande de l'appelant, ne régénère rien", async () => {
    h.updateMany.mockResolvedValue({ count: 0 });
    expect(await constaterEpi("etab-1")).toBe(false);
    h.updateMany.mockResolvedValue({ count: 1 });
    expect(await constaterEpi("etab-1", { regenerer: false })).toBe(true);
    expect(h.regenerer).not.toHaveBeenCalled();
  });

  it("epiConstates lit la même règle", async () => {
    h.count.mockResolvedValue(1);
    expect(await epiConstates(db, "etab-1")).toBe(true);
    expect(h.count).toHaveBeenCalledWith({ where: { AND: [{ id: "etab-1" }, CONSTATES] } });
    h.count.mockResolvedValue(0);
    expect(await epiConstates(db, "etab-1")).toBe(false);
  });
});
