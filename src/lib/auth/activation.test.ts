import { describe, expect, it, vi } from "vitest";
import { avecActivation, poserMotDePasseAvantConfirmation, type ContexteActivation } from "./activation";

function contexte(sansIdentifiant = false) {
  const appels: string[] = [];
  const ctx: ContexteActivation = {
    password: { hash: async (m) => `haché(${m})` },
    internalAdapter: {
      findAccounts: vi.fn(async () => (sansIdentifiant ? [] : [{ providerId: "credential" }])),
      updatePassword: vi.fn(async (id: string, hash: string) => appels.push(`mdp ${id} ${hash}`)),
      linkAccount: vi.fn(async (c: { userId: string; password: string }) => appels.push(`créé ${c.userId} ${c.password}`)),
      deleteUserSessions: vi.fn(async (id: string) => appels.push(`sessions ${id}`)),
    },
  };
  return { ctx, appels };
}

describe("activation : le mot de passe est choisi par qui confirme l'adresse", () => {
  it("hors d'une activation, la confirmation est refusée et rien n'est écrit", async () => {
    const { ctx, appels } = contexte();
    await expect(poserMotDePasseAvantConfirmation({ id: "u-1" }, ctx)).rejects.toThrow(/hors de l'activation/);
    expect(appels).toEqual([]);
  });

  it("dans une activation, pose le mot de passe choisi puis ferme les sessions, avant la confirmation", async () => {
    const { ctx, appels } = contexte();
    const r = await avecActivation("le-mot-de-passe-choisi", async () => {
      await poserMotDePasseAvantConfirmation({ id: "u-1" }, ctx);
      appels.push("confirmée");
      return "ok";
    });
    expect(r).toEqual({ resultat: "ok", applique: true });
    expect(appels).toEqual(["mdp u-1 haché(le-mot-de-passe-choisi)", "sessions u-1", "confirmée"]);
  });

  it("un utilisateur sans identifiant par mot de passe en reçoit un", async () => {
    const { ctx, appels } = contexte(true);
    await avecActivation("le-mot-de-passe-choisi", () => poserMotDePasseAvantConfirmation({ id: "u-2" }, ctx));
    expect(appels).toEqual(["créé u-2 haché(le-mot-de-passe-choisi)", "sessions u-2"]);
    expect(ctx.internalAdapter.linkAccount).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u-2", providerId: "credential", accountId: "u-2" }),
    );
  });

  it("un compte déjà confirmé (crochet non appelé) : rien n'est posé", async () => {
    const r = await avecActivation("x".repeat(12), async () => "déjà");
    expect(r).toEqual({ resultat: "déjà", applique: false });
  });

  it("deux activations simultanées gardent chacune leur mot de passe", async () => {
    const { ctx, appels } = contexte();
    const pause = () => new Promise((r) => setTimeout(r, 5));
    await Promise.all([
      avecActivation("mot-de-passe-A-12", async () => {
        await pause();
        await poserMotDePasseAvantConfirmation({ id: "a" }, ctx);
      }),
      avecActivation("mot-de-passe-B-12", async () => {
        await poserMotDePasseAvantConfirmation({ id: "b" }, ctx);
      }),
    ]);
    expect(appels).toContain("mdp a haché(mot-de-passe-A-12)");
    expect(appels).toContain("mdp b haché(mot-de-passe-B-12)");
  });
});
