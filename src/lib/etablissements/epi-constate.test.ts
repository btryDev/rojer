import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  updateMany: vi.fn(),
  regenerer: vi.fn(async () => true),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { etablissement: { updateMany: h.updateMany } } }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({ regenererApresMutation: h.regenerer }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { constaterEpiParLesMesures } = await import("./epi-constate");

beforeEach(() => {
  h.updateMany.mockReset();
  h.regenerer.mockClear();
});

describe("constaterEpiParLesMesures — une mesure EPI vaut « oui »", () => {
  it("ne passe à « oui » qu'un silence ou un « non », et seulement sur une mesure EPI non abandonnée", async () => {
    h.updateMany.mockResolvedValue({ count: 1 });
    expect(await constaterEpiParLesMesures("etab-1")).toBe(true);
    expect(h.updateMany).toHaveBeenCalledWith({
      where: {
        id: "etab-1",
        OR: [{ epiPresents: false }, { epiPresents: null }],
        actions: {
          some: { type: "protection_individuelle", statut: { not: "abandonnee" } },
        },
      },
      data: { epiPresents: true },
    });
    expect(h.regenerer).toHaveBeenCalledWith("etab-1", "epi/mesure");
  });

  it("sans changement, ne régénère rien", async () => {
    h.updateMany.mockResolvedValue({ count: 0 });
    expect(await constaterEpiParLesMesures("etab-1")).toBe(false);
    expect(h.regenerer).not.toHaveBeenCalled();
  });
});
