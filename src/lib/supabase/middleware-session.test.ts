import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Ce que fait le proxy AVANT et AUTOUR de l'appel d'auth (audit Next.js du
 * 2026-10-14, H4) :
 *   - un chemin public sans session ne crée aucun client Supabase, donc
 *     aucun appel réseau ;
 *   - une route qui ne lit pas la session n'y touche pas, même avec un cookie ;
 *   - `/api/*` sans session reçoit un 401 JSON, pas une redirection ;
 *   - avec un cookie, le client est créé et la session rafraîchie, sur un
 *     chemin public comme sur un chemin protégé.
 */

const h = vi.hoisted(() => ({
  creations: 0,
  claims: vi.fn<() => Promise<unknown>>(async () => ({
    data: { claims: { sub: "u1" } },
    error: null,
  })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => {
    h.creations += 1;
    return { auth: { getClaims: h.claims } };
  },
}));

const { updateSession } = await import("./middleware");

const COOKIE = "sb-projet-auth-token=jeton";

function requete(chemin: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost${chemin}`, {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  h.creations = 0;
  h.claims.mockClear();
});

describe("proxy : le chemin d'abord, l'auth ensuite", () => {
  it("un chemin public sans session ne crée aucun client", async () => {
    for (const p of ["/", "/accessibilite/mon-erp", "/verifier/sig_1", "/acces/abc", "/login"]) {
      const r = await updateSession(requete(p));
      expect(r.status, p).toBe(200);
      expect(r.headers.get("x-middleware-next"), p).toBe("1");
    }
    expect(h.creations).toBe(0);
  });

  it("une route qui ne lit pas la session n'y touche pas, même avec un cookie", async () => {
    for (const p of [
      "/api/mcp",
      "/api/mcp/cle",
      "/.well-known/oauth-protected-resource/api/mcp",
      "/api/accessibilite/mon-erp/affiche",
      "/robots.txt",
    ]) {
      const r = await updateSession(requete(p, COOKIE));
      expect(r.headers.get("x-middleware-next"), p).toBe("1");
    }
    expect(h.creations).toBe(0);
  });

  it("le vérificateur PKCE seul n'est pas une session", async () => {
    const r = await updateSession(
      requete("/etablissements/e1", "sb-projet-auth-token-code-verifier=v"),
    );
    expect(r.status).toBe(307);
    expect(h.creations).toBe(0);
  });
});

describe("proxy : refus sans session", () => {
  it("/api/* répond 401 en JSON, sans appel d'auth", async () => {
    const r = await updateSession(requete("/api/etablissements/e1/controle-zip"));
    expect(r.status).toBe(401);
    expect(r.headers.get("content-type")).toMatch(/application\/json/);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toMatchObject({ error: "non_authentifie" });
    expect(h.creations).toBe(0);
  });

  it("une page protégée redirige vers /login avec le chemin de retour", async () => {
    const r = await updateSession(requete("/etablissements/e1/calendrier"));
    expect(r.status).toBe(307);
    const cible = new URL(r.headers.get("location")!);
    expect(cible.pathname).toBe("/login");
    expect(cible.searchParams.get("next")).toBe("/etablissements/e1/calendrier");
  });

  it("un cookie dont le jeton ne se vérifie pas : 401 sur /api, redirection ailleurs", async () => {
    h.claims.mockResolvedValue({ data: null, error: { message: "invalid JWT" } });
    expect((await updateSession(requete("/api/rapports/r1/fichier", COOKIE))).status).toBe(401);
    expect((await updateSession(requete("/entreprises", COOKIE))).status).toBe(307);
    expect(h.creations).toBe(2);
  });

  it("un refresh token mort purge les cookies sur le refus", async () => {
    h.claims.mockResolvedValue({
      data: null,
      error: { code: "refresh_token_not_found", message: "Invalid Refresh Token" },
    });
    const r = await updateSession(requete("/entreprises", COOKIE));
    expect(r.status).toBe(307);
    expect(r.cookies.get("sb-projet-auth-token")?.value).toBe("");
  });
});

describe("proxy : avec une session", () => {
  it("laisse passer un chemin protégé et rafraîchit", async () => {
    h.claims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    const r = await updateSession(requete("/entreprises", COOKIE));
    expect(r.headers.get("x-middleware-next")).toBe("1");
    expect(h.claims).toHaveBeenCalledTimes(1);
  });

  it("rafraîchit aussi sur une page publique : son en-tête lit la session", async () => {
    h.claims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    await updateSession(requete("/accessibilite/mon-erp", COOKIE));
    expect(h.claims).toHaveBeenCalledTimes(1);
  });

  it("ne redirige jamais une page publique, même si la session ne se vérifie pas", async () => {
    h.claims.mockResolvedValue({ data: null, error: { message: "invalid JWT" } });
    const r = await updateSession(requete("/login", COOKIE));
    expect(r.headers.get("x-middleware-next")).toBe("1");
  });

  it("transmet au rendu les en-têtes de requête demandés", async () => {
    const r = await updateSession(requete("/"), {
      entetesRequete: { "content-security-policy": "script-src 'nonce-abc'" },
    });
    expect(r.headers.get("x-middleware-request-content-security-policy")).toBe(
      "script-src 'nonce-abc'",
    );
  });
});
