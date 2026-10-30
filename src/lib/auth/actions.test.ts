import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "better-auth/api";

const h = vi.hoisted(() => ({
  redirect: vi.fn((cible: string) => {
    throw new Error(`NEXT_REDIRECT ${cible}`);
  }),
  // `auth.api` de Better Auth (ADR-052) : chaque appel reçoit un objet
  // `{ body?, headers? }` et lève une `APIError` en cas de refus.
  // Réponses par défaut posées dans `beforeEach`, un seul endroit.
  auth: {
    signInEmail: vi.fn<(arg: { body: unknown; headers?: Headers }) => Promise<unknown>>(),
    signUpEmail: vi.fn<(arg: { body: Record<string, unknown> }) => Promise<unknown>>(),
    requestPasswordReset: vi.fn<(arg: { body: Record<string, unknown> }) => Promise<unknown>>(),
    resetPassword: vi.fn<(arg: { body: Record<string, unknown> }) => Promise<unknown>>(),
    signOut: vi.fn<(arg: { headers: Headers }) => Promise<unknown>>(),
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
vi.mock("./better-auth", () => ({ auth: { api: h.auth } }));
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
  for (const f of Object.values(h.auth)) f.mockReset();
  h.auth.signInEmail.mockResolvedValue({});
  h.auth.signUpEmail.mockResolvedValue({});
  h.auth.requestPasswordReset.mockResolvedValue({ status: true });
  h.auth.resetPassword.mockResolvedValue({ status: true });
  h.auth.signOut.mockResolvedValue({ success: true });
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
 * tiers (audit du 2026-10-13, C3). Elle vient du serveur (`liens-compte.ts`,
 * testé à part) : aucune action ne transmet d'adresse à Better Auth.
 */
describe("liens envoyés par mail : aucune adresse ne vient du formulaire (C3)", () => {
  const forge = { origin: "https://evil.tld", callbackURL: "https://evil.tld", redirectTo: "https://evil.tld" };

  it("inscription et mot de passe oublié ne passent que l'adresse et le mot de passe", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    await expect(
      signUpAction({}, formulaire({ email: "a@exemple.fr", password: "motdepasse-solide", ...forge })),
    ).rejects.toThrow("NEXT_REDIRECT");
    await requestPasswordResetAction({}, formulaire({ email: "a@exemple.fr", ...forge }));
    expect(Object.keys(h.auth.signUpEmail.mock.calls[0][0].body).sort()).toEqual([
      "email",
      "name",
      "password",
    ]);
    expect(h.auth.requestPasswordReset.mock.calls[0][0].body).toEqual({ email: "a@exemple.fr" });
  });

  it("refuse d'envoyer un lien quand l'adresse publique est inconnue en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "");
    const inscription = await signUpAction(
      {},
      formulaire({ email: "a@exemple.fr", password: "motdepasse-solide" }),
    );
    const oubli = await requestPasswordResetAction({}, formulaire({ email: "a@exemple.fr" }));
    expect(inscription.error).toBeTruthy();
    expect(oubli.error).toBeTruthy();
    expect(h.auth.signUpEmail).not.toHaveBeenCalled();
    expect(h.auth.requestPasswordReset).not.toHaveBeenCalled();
  });
});

/**
 * Ce que l'écran dit, sans renseigner un tiers sur qui a un compte.
 */
describe("réponses de Better Auth traduites pour l'écran", () => {
  it("connexion d'un compte non confirmé : le dire, un nouveau lien est parti", async () => {
    h.auth.signInEmail.mockRejectedValue(
      new APIError("FORBIDDEN", { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" }),
    );
    const r = await signInAction({}, formulaire({ email: "a@exemple.fr", password: "x" }));
    expect(r.error).toMatch(/pas encore confirmée.*nouveau lien/);
  });

  it("compte non confirmé sur un serveur sans envoi : ne promet pas de lien", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "");
    h.auth.signInEmail.mockRejectedValue(
      new APIError("FORBIDDEN", { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" }),
    );
    const r = await signInAction({}, formulaire({ email: "a@exemple.fr", password: "x" }));
    expect(r.error).toMatch(/pas encore confirmée/);
    expect(r.error).not.toMatch(/nouveau lien vient/);
  });

  it("connexion refusée pour toute autre raison : « Identifiants invalides »", async () => {
    h.auth.signInEmail.mockRejectedValue(
      new APIError("UNAUTHORIZED", { code: "INVALID_EMAIL_OR_PASSWORD", message: "x" }),
    );
    const r = await signInAction({}, formulaire({ email: "a@exemple.fr", password: "x" }));
    expect(r.error).toBe("Identifiants invalides");
  });

  it("inscription d'une adresse déjà inscrite : même suite qu'une nouvelle", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    const nouvelle = await cibleDeRedirection(
      signUpAction({}, formulaire({ email: "a@exemple.fr", password: "douze-caract" })),
    );
    h.auth.signUpEmail.mockRejectedValue(
      new APIError("UNPROCESSABLE_ENTITY", { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "x" }),
    );
    const existante = await cibleDeRedirection(
      signUpAction({}, formulaire({ email: "a@exemple.fr", password: "douze-caract" })),
    );
    expect(existante).toBe(nouvelle);
    expect(nouvelle).toBe("/signup/verification-en-attente?email=a%40exemple.fr");
  });

  it("inscription en échec pour une autre raison : un message, pas de redirection", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    h.auth.signUpEmail.mockRejectedValue(new APIError("BAD_REQUEST", { code: "FAILED_TO_CREATE_USER", message: "x" }));
    const r = await signUpAction({}, formulaire({ email: "a@exemple.fr", password: "douze-caract" }));
    expect(r.error).toMatch(/n'a pas abouti/);
  });

  it("réinitialisation avec un jeton refusé : lien invalide", async () => {
    h.auth.resetPassword.mockRejectedValue(new APIError("BAD_REQUEST", { code: "INVALID_TOKEN", message: "x" }));
    const r = await definirMotDePasseAction(
      {},
      formulaire({ password: "douze-caract", confirm: "douze-caract", token: "mort" }),
    );
    expect(r.error).toMatch(/invalide ou a expiré/);
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
    expect(h.auth.signUpEmail).not.toHaveBeenCalled();
  });

  it("l'inscription accepte douze caractères", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    await expect(
      signUpAction({}, formulaire({ email: "a@exemple.fr", password: "douze-caract" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.auth.signUpEmail).toHaveBeenCalled();
  });

  it("la connexion n'impose aucune longueur : un compte de l'ancienne règle entre", async () => {
    await expect(
      signInAction({}, formulaire({ email: "a@exemple.fr", password: "8carac!!" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.auth.signInEmail).toHaveBeenCalled();
  });

  it("la réinitialisation refuse onze caractères côté serveur", async () => {
    const r = await definirMotDePasseAction(
      {},
      formulaire({ password: "onze-caract", confirm: "onze-caract", token: "t" }),
    );
    expect(r.error).toMatch(/au moins 12 caractères/);
    expect(h.auth.resetPassword).not.toHaveBeenCalled();
  });

  it("la réinitialisation refuse deux saisies différentes", async () => {
    const r = await definirMotDePasseAction(
      {},
      formulaire({ password: "douze-caract", confirm: "douze-caracX", token: "t" }),
    );
    expect(r.error).toMatch(/ne correspondent pas/);
    expect(h.auth.resetPassword).not.toHaveBeenCalled();
  });

  it("la réinitialisation sans jeton ne va pas plus loin", async () => {
    const r = await definirMotDePasseAction(
      {},
      formulaire({ password: "douze-caract", confirm: "douze-caract" }),
    );
    expect(r.error).toMatch(/invalide ou a expiré/);
    expect(h.auth.resetPassword).not.toHaveBeenCalled();
  });

  it("la réinitialisation pose le mot de passe avec le jeton du lien, puis renvoie à la connexion", async () => {
    const cible = await cibleDeRedirection(
      definirMotDePasseAction(
        {},
        formulaire({ password: "douze-caract", confirm: "douze-caract", token: "jeton-du-lien" }),
      ),
    );
    expect(h.auth.resetPassword).toHaveBeenCalledWith({
      body: { newPassword: "douze-caract", token: "jeton-du-lien" },
    });
    expect(cible).toBe("/login?reinitialise=1");
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
    expect(h.auth.signInEmail).not.toHaveBeenCalled();
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
    expect(h.auth.signUpEmail).not.toHaveBeenCalled();
    expect(h.auth.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("déconnexion (audit Next.js, B3)", () => {
  it("ferme la session en base et efface le cookie de l'établissement actif", async () => {
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(h.auth.signOut).toHaveBeenCalledWith({ headers: h.entetes });
    expect(h.cookiesEffaces).toContain("etablissement-actif");
  });

  it("une session déjà fermée n'empêche pas de terminer la déconnexion", async () => {
    h.auth.signOut.mockRejectedValue(new APIError("BAD_REQUEST", { message: "x" }));
    const cible = await cibleDeRedirection(signOutAction());
    expect(cible).toBe("/login");
    expect(h.cookiesEffaces).toContain("etablissement-actif");
  });
});
