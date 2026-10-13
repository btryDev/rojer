import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(async () => ({ error: null as unknown })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: h.exchangeCodeForSession },
  }),
}));

const { GET } = await import("./route");

async function destination(query: string): Promise<string> {
  const reponse = await GET(
    new NextRequest(`https://app.rojer.fr/auth/callback?${query}`),
  );
  return reponse.headers.get("location")!;
}

/**
 * Le lien de confirmation porte `next` dans l'URL : il se forge comme celui de
 * `/login`. `${origin}${next}` collait le paramètre derrière l'hôte, et
 * `next=@evil.tld` faisait de `app.rojer.fr` un nom d'utilisateur devant
 * l'hôte `evil.tld` (audit du 2026-10-13, C2).
 */
describe("callback d'authentification", () => {
  it("renvoie vers le chemin interne demandé", async () => {
    expect(await destination("code=c&next=/etablissements/e1")).toBe(
      "https://app.rojer.fr/etablissements/e1",
    );
  });

  it("ne quitte jamais l'origine", async () => {
    for (const next of [
      "@evil.tld",
      "//evil.tld",
      "/\\evil.tld",
      ".evil.tld",
      "/.//evil.tld",
      "/..//evil.tld",
      "/%2e%2e//evil.tld",
    ]) {
      const url = new URL(
        await destination(`code=c&next=${encodeURIComponent(next)}`),
      );
      expect(url.origin, next).toBe("https://app.rojer.fr");
      expect(url.pathname, next).toBe("/entreprises");
    }
  });

  it("garde la page dédiée quand l'échange échoue sur une réinitialisation", async () => {
    h.exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("expiré") });
    expect(await destination("code=c&next=/auth/reinitialisation")).toBe(
      "https://app.rojer.fr/auth/reinitialisation#error=lien_invalide",
    );
  });
});
