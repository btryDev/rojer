import { beforeEach, describe, expect, it, vi } from "vitest";

// La relance des dossiers muets (analyse du 2026-09-27, étape 3) : répondre
// sur le tableau de bord écrit la réponse ET régénère le calendrier — sans
// quoi la ligne « à confirmer » resterait affichée après un « non ». Éprouvé
// en retirant l'appel à `regenererApresMutation`.

const h = vi.hoisted(() => ({
  update: vi.fn(),
  regen: vi.fn(async () => true),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { etablissement: { update: h.update } } }));
vi.mock("@/lib/auth/scope", () => ({ assertEtablissementOwnership: vi.fn() }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({ regenererApresMutation: h.regen, MESSAGE_REGEN_ECHEC: "calendrier pas recalculé" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { repondreMatieres, repondreChiffons, repondreSommeil } = await import("./parametrage");

const reponse = (v: string) => {
  const fd = new FormData();
  fd.set("reponse", v);
  return fd;
};

beforeEach(() => {
  h.update.mockClear();
  h.regen.mockClear();
});

describe("relance des questions muettes", () => {
  it.each([
    ["manipuleMatieresR422722", repondreMatieres],
    ["chiffonsImpregnes", repondreChiffons],
    ["comporteLocauxSommeilPublic", repondreSommeil],
  ] as const)("%s : « non » s'écrit false, et le calendrier est régénéré", async (champ, action) => {
    const r = await action("etab-1", { status: "idle" }, reponse("non"));
    expect(r.status).toBe("success");
    expect(h.update).toHaveBeenCalledWith({ where: { id: "etab-1" }, data: { [champ]: false } });
    expect(h.regen).toHaveBeenCalledWith("etab-1", `parametrage/${champ}`);
  });

  it("une réponse vide n'écrit rien : pas de repli sur « non »", async () => {
    const r = await repondreMatieres("etab-1", { status: "idle" }, reponse(""));
    expect(r.status).toBe("error");
    expect(h.update).not.toHaveBeenCalled();
  });
});

describe("régénération ratée : la réponse est acquise, et on le dit (revue du lot 1)", () => {
  // Comme `modifierEtablissement`. Éprouvé en rendant `success` sans condition.
  it("rend success_avec_avertissement quand le calendrier n'a pas suivi", async () => {
    h.regen.mockResolvedValueOnce(false);
    const r = await repondreMatieres("etab-1", { status: "idle" }, reponse("non"));
    expect(r.status).toBe("success_avec_avertissement");
    expect(h.update).toHaveBeenCalled();
  });
});
