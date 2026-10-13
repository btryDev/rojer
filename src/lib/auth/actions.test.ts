import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  redirect: vi.fn((cible: string) => {
    throw new Error(`NEXT_REDIRECT ${cible}`);
  }),
  auth: {
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signUp: vi.fn<(creds: unknown) => Promise<unknown>>(async () => ({
      data: { session: null },
      error: null,
    })),
    resetPasswordForEmail: vi.fn<
      (email: string, options: unknown) => Promise<unknown>
    >(async () => ({ error: null })),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: h.auth }),
}));

const { requestPasswordResetAction, signInAction, signUpAction } = await import(
  "./actions",
);

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}

async function cibleDeRedirection(p: Promise<unknown>): Promise<string> {
  await expect(p).rejects.toThrow("NEXT_REDIRECT");
  return h.redirect.mock.calls.at(-1)![0];
}

beforeEach(() => {
  h.redirect.mockClear();
  h.auth.signUp.mockClear();
  h.auth.resetPasswordForEmail.mockClear();
  vi.unstubAllEnvs();
});

describe("connexion : le champ `next` ne mène que dans l'application (C1)", () => {
  const identifiants = { email: "a@exemple.fr", password: "motdepasse" };

  it("suit un chemin interne", async () => {
    const cible = await cibleDeRedirection(
      signInAction({}, formulaire({ ...identifiants, next: "/etablissements/e1" })),
    );
    expect(cible).toBe("/etablissements/e1");
  });

  it("ne suit pas une adresse externe", async () => {
    for (const next of [
      "https://evil.tld",
      "//evil.tld",
      "/\\evil.tld",
      "/.//evil.tld",
      "/a/..//evil.tld",
      "/%2e//evil.tld",
    ]) {
      const cible = await cibleDeRedirection(
        signInAction({}, formulaire({ ...identifiants, next })),
      );
      expect(cible, next).toBe("/entreprises");
    }
  });
});

/**
 * Le lien de confirmation et celui de réinitialisation partent par mail au
 * nom de Rojer. Leur adresse de retour était lue dans un champ caché du
 * formulaire : un POST forgé faisait envoyer par Rojer un lien vers un site
 * tiers, qui recevait le code d'échange (audit du 2026-10-13, C3). Elle vient
 * désormais du serveur, `publicAppUrl`, comme les autres liens envoyés.
 */
describe("liens envoyés par mail : l'origine vient du serveur (C3)", () => {
  const forge = { origin: "https://evil.tld" };

  it("inscription", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    await expect(
      signUpAction(
        {},
        formulaire({ email: "a@exemple.fr", password: "motdepasse", ...forge }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.auth.signUp.mock.calls[0][0]).toMatchObject({
      options: { emailRedirectTo: "https://app.rojer.fr/auth/callback" },
    });
  });

  it("mot de passe oublié", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    await requestPasswordResetAction({}, formulaire({ email: "a@exemple.fr", ...forge }));
    expect(h.auth.resetPasswordForEmail.mock.calls[0][1]).toEqual({
      redirectTo: "https://app.rojer.fr/auth/reinitialisation",
    });
  });

  it("refuse d'envoyer un lien quand l'adresse publique est inconnue en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "");
    const inscription = await signUpAction(
      {},
      formulaire({ email: "a@exemple.fr", password: "motdepasse", ...forge }),
    );
    const oubli = await requestPasswordResetAction(
      {},
      formulaire({ email: "a@exemple.fr", ...forge }),
    );
    expect(inscription.error).toBeTruthy();
    expect(oubli.error).toBeTruthy();
    expect(h.auth.signUp).not.toHaveBeenCalled();
    expect(h.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
