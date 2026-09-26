import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  regenerer: vi.fn(async (_id: string, _contexte: string) => true),
  update: vi.fn(async () => ({})),
  findMany: vi.fn(async () => [{ id: "etab-1" }, { id: "etab-2" }]),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    entreprise: { update: h.update },
    etablissement: { findMany: h.findMany },
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEntrepriseOwnership: vi.fn(async () => undefined),
  getOptionalUserEtablissement: vi.fn(async () => null),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/calendrier/regeneration-sure", async (orig) => ({
  ...(await orig<typeof import("@/lib/calendrier/regeneration-sure")>()),
  regenererApresMutation: h.regenerer,
}));

const { modifierEntreprise } = await import("./actions");
const { MESSAGE_REGEN_ECHEC } = await import(
  "@/lib/calendrier/regeneration-sure"
);

function formulaire(): FormData {
  const fd = new FormData();
  fd.set("raisonSociale", "Bistrot du marché");
  fd.set("codeNaf", "56.10A");
  fd.set("effectif", "12");
  fd.set("adresse", "12 rue des Halles, 75011 Paris");
  return fd;
}

beforeEach(() => {
  h.regenerer.mockReset();
  h.regenerer.mockResolvedValue(true);
});

describe("modifierEntreprise — le calendrier de chaque établissement (C37, F3)", () => {
  it("régénère chaque établissement et rend « success » quand tout a réussi", async () => {
    const r = await modifierEntreprise("ent-1", { status: "idle" }, formulaire());
    expect(r).toEqual({ status: "success" });
    expect(h.regenerer.mock.calls.map((c) => c[0])).toEqual(["etab-1", "etab-2"]);
  });

  it("ne tait pas un échec derrière « Enregistré »", async () => {
    h.regenerer.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const r = await modifierEntreprise("ent-1", { status: "idle" }, formulaire());
    expect(r).toEqual({
      status: "success_avec_avertissement",
      message: MESSAGE_REGEN_ECHEC,
    });
  });
});
