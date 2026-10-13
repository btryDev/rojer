import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  redirect: vi.fn((cible: string) => {
    throw new Error(`NEXT_REDIRECT ${cible}`);
  }),
  auth: {
    signInWithPassword: vi.fn(async () => ({ error: null })),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: h.auth }),
}));

const { signInAction } = await import("./actions");

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
    for (const next of ["https://evil.tld", "//evil.tld", "/\\evil.tld"]) {
      const cible = await cibleDeRedirection(
        signInAction({}, formulaire({ ...identifiants, next })),
      );
      expect(cible, next).toBe("/entreprises");
    }
  });
});
