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
    updateUser: vi.fn<(attrs: unknown) => Promise<unknown>>(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  },
  entetes: new Headers({ "x-forwarded-for": "203.0.113.7" }),
  cookiesEffaces: [] as string[],
  limite: vi.fn<
    (demandes: { cle: string }[]) => Promise<
      { ok: true } | { ok: false; reessayerDansSecondes: number }
    >
  >(async () => ({ ok: true })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("next/headers", () => ({
  headers: async () => h.entetes,
  cookies: async () => ({ delete: (nom: string) => h.cookiesEffaces.push(nom) }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: h.auth }),
}));
vi.mock("@/lib/auth/scope", () => ({ COOKIE_ETABLISSEMENT_ACTIF: "etablissement-actif" }));
vi.mock("@/lib/securite/limite-debit", async (original) => ({
  ...(await original<typeof import("@/lib/securite/limite-debit")>()),
  consommer: h.limite,
}));

const {
  definirMotDePasseAction,
  requestPasswordResetAction,
  signInAction,
  signOutAction,
  signUpAction,
} = await import("./actions");

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
  h.auth.signInWithPassword.mockClear();
  h.auth.resetPasswordForEmail.mockClear();
  h.auth.updateUser.mockClear();
  h.limite.mockClear();
  h.limite.mockResolvedValue({ ok: true });
  h.cookiesEffaces = [];
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
        formulaire({ email: "a@exemple.fr", password: "motdepasse-solide", ...forge }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.auth.signUp.mock.calls[0][0]).toMatchObject({
      options: { emailRedirectTo: "https://app.rojer.fr/auth/callback" },
    });
  });

  it("mot de passe oublié, adresse publique posée avec un « / » final", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr/");
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
      formulaire({ email: "a@exemple.fr", password: "motdepasse-solide", ...forge }),
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

/**
 * Douze caractères au moins, vérifiés côté serveur à l'inscription et à la
 * réinitialisation (audit OWASP B4, 2026-10-14) ; aucune règle à la connexion.
 */
describe("mot de passe : douze caractères (B4)", () => {
  it("l'inscription refuse onze caractères, avec un message clair, sans appeler le fournisseur", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    const r = await signUpAction({}, formulaire({ email: "a@exemple.fr", password: "onze-caract" }));
    expect(r.error).toMatch(/au moins 12 caractères/);
    expect(h.auth.signUp).not.toHaveBeenCalled();
  });

  it("l'inscription accepte douze caractères", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    await expect(
      signUpAction({}, formulaire({ email: "a@exemple.fr", password: "douze-caract" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.auth.signUp).toHaveBeenCalled();
  });

  it("la connexion n'impose aucune longueur : un compte de l'ancienne règle entre", async () => {
    await expect(
      signInAction({}, formulaire({ email: "a@exemple.fr", password: "8carac!!" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.auth.signInWithPassword).toHaveBeenCalled();
  });

  it("la réinitialisation refuse onze caractères côté serveur", async () => {
    const r = await definirMotDePasseAction(
      {},
      formulaire({ password: "onze-caract", confirm: "onze-caract" }),
    );
    expect(r.error).toMatch(/au moins 12 caractères/);
    expect(h.auth.updateUser).not.toHaveBeenCalled();
  });

  it("la réinitialisation refuse deux saisies différentes", async () => {
    const r = await definirMotDePasseAction(
      {},
      formulaire({ password: "douze-caract", confirm: "douze-caracX" }),
    );
    expect(r.error).toMatch(/ne correspondent pas/);
    expect(h.auth.updateUser).not.toHaveBeenCalled();
  });

  it("la réinitialisation pose un mot de passe conforme puis mène au dossier", async () => {
    const cible = await cibleDeRedirection(
      definirMotDePasseAction({}, formulaire({ password: "douze-caract", confirm: "douze-caract" })),
    );
    expect(h.auth.updateUser).toHaveBeenCalledWith({ password: "douze-caract" });
    expect(cible).toBe("/entreprises");
  });
});

/**
 * Limitation de débit (audit OWASP B3 / B14) : la tentative est réservée
 * AVANT l'appel au fournisseur, par IP et par adresse saisie.
 */
describe("limitation de débit des parcours d'entrée", () => {
  const refus = { ok: false as const, reessayerDansSecondes: 600 };

  it("connexion : refusée avant le fournisseur, message clair", async () => {
    h.limite.mockResolvedValue(refus);
    const r = await signInAction({}, formulaire({ email: "a@exemple.fr", password: "x" }));
    expect(r.error).toMatch(/Trop de tentatives.*10 minutes/);
    expect(h.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("connexion : une clé par IP et une par adresse, en minuscules, sans rien en clair", async () => {
    await signInAction({}, formulaire({ email: "A@Exemple.fr", password: "x" })).catch(() => {});
    await signInAction({}, formulaire({ email: "a@exemple.fr", password: "x" })).catch(() => {});
    const [premier, second] = h.limite.mock.calls.map((c) => c[0].map((d) => d.cle));
    expect(premier).toHaveLength(2);
    expect(premier[0]).toMatch(/^connexion:ip:/);
    expect(premier[1]).toMatch(/^connexion:compte:/);
    expect(second).toEqual(premier);
    expect(premier.join()).not.toMatch(/exemple|203\.0/);
  });

  it("connexion : la clé de compte est liée à l'IP — un tiers ne bloque pas la titulaire", async () => {
    const entetes = h.entetes;
    await signInAction({}, formulaire({ email: "a@exemple.fr", password: "x" })).catch(() => {});
    h.entetes = new Headers({ "x-forwarded-for": "198.51.100.9" });
    try {
      await signInAction({}, formulaire({ email: "a@exemple.fr", password: "x" })).catch(() => {});
    } finally {
      h.entetes = entetes;
    }
    const [depuisA, depuisB] = h.limite.mock.calls.map((c) => c[0].map((d) => d.cle));
    expect(depuisA[1]).toMatch(/^connexion:compte:/);
    expect(depuisB[1]).not.toEqual(depuisA[1]);
  });

  it("réinitialisation : la clé de compte reste l'adresse seule (boîte de la titulaire)", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    const entetes = h.entetes;
    await requestPasswordResetAction({}, formulaire({ email: "a@exemple.fr" })).catch(() => {});
    h.entetes = new Headers({ "x-forwarded-for": "198.51.100.9" });
    try {
      await requestPasswordResetAction({}, formulaire({ email: "a@exemple.fr" })).catch(() => {});
    } finally {
      h.entetes = entetes;
    }
    const [depuisA, depuisB] = h.limite.mock.calls.map((c) => c[0].map((d) => d.cle));
    expect(depuisA[1]).toMatch(/^reinitialisation:compte:/);
    expect(depuisB[1]).toEqual(depuisA[1]);
  });

  it("le même refus, que le compte existe ou non : la clé est l'adresse saisie", async () => {
    h.limite.mockResolvedValue(refus);
    const inconnu = await signInAction({}, formulaire({ email: "inconnu@exemple.fr", password: "x" }));
    const connu = await signInAction({}, formulaire({ email: "a@exemple.fr", password: "x" }));
    expect(inconnu).toEqual(connu);
  });

  it("inscription et réinitialisation : refusées avant le fournisseur", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    h.limite.mockResolvedValue(refus);
    const i = await signUpAction({}, formulaire({ email: "a@exemple.fr", password: "douze-caract" }));
    const o = await requestPasswordResetAction({}, formulaire({ email: "a@exemple.fr" }));
    expect(i.error).toMatch(/Trop de tentatives/);
    expect(o.error).toMatch(/Trop de tentatives/);
    expect(h.auth.signUp).not.toHaveBeenCalled();
    expect(h.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("déconnexion (audit Next.js, B3)", () => {
  it("efface le cookie de l'établissement actif", async () => {
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(h.cookiesEffaces).toContain("etablissement-actif");
  });
});
