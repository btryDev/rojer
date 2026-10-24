import { beforeEach, describe, expect, it, vi } from "vitest";

// « Besoin d'aide ? » (2026-10-24) : ce que la demande enregistre, et ce
// qu'elle refuse.

const h = vi.hoisted(() => ({
  count: vi.fn(async () => 0),
  create: vi.fn(async () => ({})),
  requireEtablissement: vi.fn(async (id: string) => {
    if (id !== "e1") throw new Error("NEXT_NOT_FOUND");
    return { etablissement: { id: "e1" } };
  }),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { demandeAssistance: { count: h.count, create: h.create } } }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("@/lib/auth/scope", () => ({ requireEtablissement: h.requireEtablissement }));

const { demanderAssistance } = await import("./actions");
const IDLE = { status: "idle" } as const;

function fd(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries({ categorie: "rapport", message: "Que faire ?", page: "/etablissements/e1", ...champs }))
    f.set(k, v);
  return f;
}
const ecrit = () => (h.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;

beforeEach(() => {
  vi.clearAllMocks();
  h.count.mockResolvedValue(0);
});

describe("demanderAssistance", () => {
  it("enregistre la demande, l'utilisateur, l'établissement du compte et la page", async () => {
    const r = await demanderAssistance(IDLE, fd({ etablissementId: "e1", contexte: "BAES", telephone: "06 00" }));
    expect(r.status).toBe("success");
    expect(ecrit()).toMatchObject({
      userId: "u1",
      etablissementId: "e1",
      categorie: "rapport",
      message: "Que faire ?",
      telephone: "06 00",
      contexte: "BAES",
      page: "/etablissements/e1",
    });
  });

  it("sans établissement donné, celui de la page est retenu, s'il est du compte", async () => {
    await demanderAssistance(IDLE, fd({ page: "/etablissements/e1/modifier" }));
    expect(ecrit().etablissementId).toBe("e1");
    vi.clearAllMocks();
    await expect(demanderAssistance(IDLE, fd({ page: "/etablissements/autre/modifier" }))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(h.create).not.toHaveBeenCalled();
  });

  it("l'établissement d'un autre compte n'est pas écrit (404)", async () => {
    await expect(demanderAssistance(IDLE, fd({ etablissementId: "autre" }))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("une page qui n'est pas un chemin de ce site n'est pas gardée", async () => {
    await demanderAssistance(IDLE, fd({ page: "https://ailleurs.example/x" }));
    expect(ecrit().page).toBe("");
    vi.clearAllMocks();
    await demanderAssistance(IDLE, fd({ page: "//ailleurs.example" }));
    expect(ecrit().page).toBe("");
  });

  it("un contexte trop long se tronque au lieu de rendre la demande impossible", async () => {
    const r = await demanderAssistance(IDLE, fd({ contexte: "x".repeat(400), page: "/" + "p".repeat(600) }));
    expect(r.status).toBe("success");
    expect((ecrit().contexte as string).length).toBe(300);
    expect(ecrit().page).toBe("");
  });

  it("refuse un message vide et une catégorie inconnue", async () => {
    expect((await demanderAssistance(IDLE, fd({ message: "   " }))).status).toBe("error");
    expect((await demanderAssistance(IDLE, fd({ categorie: "pirate" }))).status).toBe("error");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("au-delà du plafond du jour, rien n'est écrit", async () => {
    h.count.mockResolvedValue(10);
    expect((await demanderAssistance(IDLE, fd({}))).status).toBe("error");
    expect(h.create).not.toHaveBeenCalled();
  });
});
