import { describe, expect, it } from "vitest";
import {
  CHEMINS_AUTH_SERVIS,
  estAdresseDeRetourAdmise,
  estCheminAuthServi,
  estDocumentCimdAdmis,
  ressourceMcp,
} from "./oauth";
import { requeteARejouer } from "./reprise-oauth";

describe("ressourceMcp — l'audience des jetons (ADR-062 § 4)", () => {
  it("l'URL exacte du serveur, sans barre finale doublée", () => {
    expect(ressourceMcp("https://rojer.fr")).toBe("https://rojer.fr/api/mcp");
    expect(ressourceMcp("https://rojer.fr/")).toBe("https://rojer.fr/api/mcp");
  });
});

describe("estAdresseDeRetourAdmise — les assistants admis (ADR-062 § 3)", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback",
    "http://localhost:53682/callback",
    "http://127.0.0.1/callback",
    "http://[::1]:8080/callback",
  ])("admet %s", (a) => expect(estAdresseDeRetourAdmise(a)).toBe(true));

  it.each([
    // Un autre chemin, un autre hôte, un sous-domaine : refusés.
    "https://claude.ai/api/mcp/auth_callback/x",
    "https://claude.ai.attaquant.example/api/mcp/auth_callback",
    "https://evil.example/api/mcp/auth_callback",
    // La boucle locale en https n'est pas un client en ligne de commande ;
    // une boucle locale déguisée non plus.
    "https://localhost/callback",
    "http://localhost.attaquant.example/callback",
    "http://user:mdp@localhost/callback",
    "http://localhost/callback#fragment",
    "http://192.168.1.10/callback",
    "javascript:alert(1)",
    "pas une url",
  ])("refuse %s", (a) => expect(estAdresseDeRetourAdmise(a)).toBe(false));
});

describe("estDocumentCimdAdmis — éditeurs dont un document CIMD est lu", () => {
  it("admet un document servi en https par Anthropic", () => {
    expect(estDocumentCimdAdmis("https://claude.ai/oauth/claude-code-client-metadata")).toBe(true);
    expect(estDocumentCimdAdmis("https://console.anthropic.com/client.json")).toBe(true);
  });

  it.each([
    "http://claude.ai/client.json",
    "https://claude.ai:8443/client.json",
    "https://claude.ai.attaquant.example/client.json",
    "https://attaquantclaude.ai/client.json",
    "https://evil.example/client.json",
    "client-id-ordinaire",
  ])("refuse %s", (id) => expect(estDocumentCimdAdmis(id)).toBe(false));
});

describe("estCheminAuthServi — la liste blanche de /api/auth (ADR-062 § 2)", () => {
  it.each(CHEMINS_AUTH_SERVIS)("sert %s", (c) => expect(estCheminAuthServi(`/api/auth${c}`)).toBe(true));

  it.each([
    // Ce que l'ADR-052 garde aux actions serveur, avec leurs gardes.
    "/api/auth/sign-in/email",
    "/api/auth/sign-up/email",
    "/api/auth/two-factor/verify-totp",
    "/api/auth/organization/invite-member",
    "/api/auth/get-session",
    "/api/auth/reset-password",
    // Le JWT de session, et ce que nos actions appellent en interne.
    "/api/auth/token",
    "/api/auth/jwks",
    "/api/auth/oauth2/consent",
    "/api/auth/oauth2/continue",
    "/api/auth/oauth2/get-consents",
    "/api/auth/oauth2/create-client",
    "/api/auth/admin/oauth2/create-client",
    // Pas de préfixe trompeur.
    "/api/auth/oauth2/token/../../sign-in/email",
    "/api/authx/oauth2/token",
    "/api/auth",
  ])("ne sert pas %s", (c) => expect(estCheminAuthServi(c)).toBe(false));
});

describe("requeteARejouer — la reprise après /login (ADR-062 § 7)", () => {
  it("retire la signature, prompt=login et max_age, garde le reste", () => {
    const signee =
      "response_type=code&client_id=c1&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&code_challenge=abc&code_challenge_method=S256&state=s&scope=rojer%3Alecture&resource=https%3A%2F%2Frojer.fr%2Fapi%2Fmcp&prompt=login+consent&max_age=0&exp=123&sig=zzz&ba_iat=1&ba_pl=2";
    const p = new URLSearchParams(requeteARejouer(signee));
    expect(p.get("client_id")).toBe("c1");
    expect(p.get("code_challenge")).toBe("abc");
    expect(p.get("resource")).toBe("https://rojer.fr/api/mcp");
    expect(p.get("redirect_uri")).toBe("https://claude.ai/api/mcp/auth_callback");
    expect(p.get("prompt")).toBe("consent");
    for (const retire of ["sig", "exp", "ba_iat", "ba_pl", "max_age"]) expect(p.has(retire)).toBe(false);
  });

  it("sans autre prompt, le paramètre disparaît", () => {
    expect(new URLSearchParams(requeteARejouer("client_id=c1&prompt=login")).has("prompt")).toBe(false);
  });
});
