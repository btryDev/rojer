// `requireCompteDOnboarding` et le compte de la page (audit de sécurité du
// 2026-11-10, point 8) : le compte que montrait la page — ou « aucun » — doit
// être celui de la session ; sinon rien n'est créé, et la page se rend sur le
// compte actif. Un compte créé ici la fait aussi rendre de nouveau.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  retenue: null as { compteId: string; role: string } | null,
  creer: vi.fn(async (userId: string) => ({ compteId: `neuf-${userId}`, role: "owner" })),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth/membres", () => ({
  appartenanceDeLaSession: async () => ({ retenue: h.retenue, toutes: h.retenue ? [h.retenue] : [] }),
  compteDOnboarding: h.creer,
}));
vi.mock("./require-user", () => ({ requireUser: async () => ({ id: "u1" }), getOptionalUser: async () => ({ id: "u1" }) }));
vi.mock("@/lib/abonnements/quotas", () => ({ etatDeSaisieDuCompte: async () => ({ saisieFermee: false }) }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));

const { requireCompteDOnboarding } = await import("./compte");
const { CHAMP_COMPTE_ATTENDU } = await import("./compte-attendu");

const page = (compteId: string) => {
  const f = new FormData();
  f.set(CHAMP_COMPTE_ATTENDU, compteId);
  return f;
};
const PAGE = "/onboarding";

beforeEach(() => {
  vi.clearAllMocks();
  h.retenue = null;
});

describe("requireCompteDOnboarding", () => {
  it("le compte de la page : rendu tel quel, rien n'est créé ni rendu de nouveau", async () => {
    h.retenue = { compteId: "a", role: "owner" };
    expect((await requireCompteDOnboarding(page("a"), { page: PAGE }))?.compte.compteId).toBe("a");
    expect(h.creer).not.toHaveBeenCalled();
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });

  it("aucun compte, comme la page le montrait : créé, et la page rendue pour le poster au prochain essai", async () => {
    expect((await requireCompteDOnboarding(page(""), { page: PAGE, nomSiNouveau: "SARL A" }))?.compte.compteId).toBe("neuf-u1");
    expect(h.creer).toHaveBeenCalledWith("u1", "SARL A");
    expect(h.revalidatePath).toHaveBeenCalledWith(PAGE);
  });

  it.each([
    ["un autre compte", "b"],
    ["aucun compte, quand il y en a un désormais", ""],
  ])("la page montrait %s : null, rien n'est créé, la page se rend sur le compte actif", async (_cas, attendu) => {
    h.retenue = { compteId: "a", role: "member" };
    expect(await requireCompteDOnboarding(page(attendu), { page: PAGE })).toBeNull();
    expect(h.creer).not.toHaveBeenCalled();
    expect(h.revalidatePath).toHaveBeenCalledWith(PAGE);
  });

  it("la page montrait un compte que la personne n'a plus : null, aucun compte vide créé", async () => {
    expect(await requireCompteDOnboarding(page("a"), { page: PAGE })).toBeNull();
    expect(h.creer).not.toHaveBeenCalled();
  });
});
