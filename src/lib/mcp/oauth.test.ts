import { describe, expect, it } from "vitest";
import {
  CHEMINS_AUTH_SERVIS,
  estAdresseDeRetourAdmise,
  estCheminAuthServi,
  estDocumentCimdAdmis,
  issueDuConsentement,
  niveauAdresseDeRetour,
  niveauDuClient,
  nomReserve,
  ressourceMcp,
  adressesDUnSeulTenant,
} from "./oauth";
import { requeteARejouer } from "./reprise-oauth";

describe("ressourceMcp — l'audience des jetons (ADR-062 § 4)", () => {
  it("l'URL exacte du serveur, sans barre finale doublée", () => {
    expect(ressourceMcp("https://rojer.fr")).toBe("https://rojer.fr/api/mcp");
    expect(ressourceMcp("https://rojer.fr/")).toBe("https://rojer.fr/api/mcp");
  });
});

describe("niveauAdresseDeRetour — trois niveaux de confiance (ADR-062 § 12)", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback",
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "https://chatgpt.com/connector/oauth/abc123XYZ",
  ])("vérifiée : %s", (a) => expect(niveauAdresseDeRetour(a)).toBe("verifie"));

  it.each(["http://localhost:53682/callback", "http://127.0.0.1/callback", "http://[::1]:8080/callback"])(
    "boucle locale : %s",
    (a) => expect(niveauAdresseDeRetour(a)).toBe("local"),
  );

  it.each([
    // Un faux Claude ou un faux ChatGPT : un autre chemin, un sous-domaine, un
    // hôte voisin ne sont jamais vérifiés — non vérifiés, donc fermés par défaut.
    "https://claude.ai/api/mcp/auth_callback/x",
    "https://claude.ai.attaquant.example/api/mcp/auth_callback",
    "https://chatgpt.com.attaquant.example/connector_platform_oauth_redirect",
    "https://chatgpt.com/connector/oauth/",
    "https://chatgpt.com/connector/oauth/abc/../../autre",
    "https://chatgpt.com/connector/oauth/abc/suite",
    "https://n8n.exemple.fr/rest/oauth2-credential/callback",
    "https://localhost/callback",
  ])("non vérifiée : %s", (a) => expect(niveauAdresseDeRetour(a)).toBe("non_verifie"));

  it.each([
    "http://evil.example/callback",
    "http://localhost.attaquant.example/callback",
    "http://user:mdp@localhost/callback",
    "http://localhost/callback#fragment",
    "https://user:mdp@n8n.exemple.fr/callback",
    "https://n8n.exemple.fr/callback#x",
    "http://192.168.1.10/callback",
    "javascript:alert(1)",
    "monapp://callback",
    "pas une url",
  ])("refusée : %s", (a) => {
    expect(niveauAdresseDeRetour(a)).toBe("refuse");
    expect(estAdresseDeRetourAdmise(a)).toBe(false);
  });
});

describe("niveauDuClient — la moins sûre de ses adresses", () => {
  it("vérifiée seule, ou avec la boucle locale", () => {
    expect(niveauDuClient(["https://claude.ai/api/mcp/auth_callback"])).toBe("verifie");
    expect(niveauDuClient(["https://claude.ai/api/mcp/auth_callback", "http://localhost/cb"])).toBe("local");
  });
  it("une adresse non vérifiée suffit à faire un client non vérifié ; aucune adresse : refusé", () => {
    expect(niveauDuClient(["https://claude.ai/api/mcp/auth_callback", "https://evil.example/cb"])).toBe("non_verifie");
    expect(niveauDuClient([])).toBe("refuse");
  });
});

describe("adressesDUnSeulTenant — une adresse non vérifiée ne se mêle à rien", () => {
  it("vérifiée + boucle locale : admis (Claude Code) ; une seule adresse non vérifiée : admis", () => {
    expect(adressesDUnSeulTenant(["https://claude.ai/api/mcp/auth_callback", "http://localhost:3000/cb"])).toBe(true);
    expect(adressesDUnSeulTenant(["https://n8n.exemple/cb"])).toBe(true);
  });
  it("deux adresses non vérifiées : refusé — consenti pour l'une, le code partirait vers l'autre", () => {
    expect(adressesDUnSeulTenant(["https://a.exemple/cb", "https://b.exemple/cb"])).toBe(false);
    expect(adressesDUnSeulTenant(["https://a.exemple/cb", "https://a.exemple/autre"])).toBe(false);
  });
  it("non vérifiée avec une vérifiée ou une locale : refusé — le consentement de l'une servirait l'autre", () => {
    expect(adressesDUnSeulTenant(["https://claude.ai/api/mcp/auth_callback", "https://evil.example/cb"])).toBe(false);
    expect(adressesDUnSeulTenant(["http://localhost:3000/cb", "https://evil.example/cb"])).toBe(false);
  });
});

describe("nomReserve — un nom ne fait pas un vérifié", () => {
  it.each(["Claude", "claude", "Claude Desktop", "C-l-a-u-d-e", "ChatGPT", "Chat GPT", "OpenAI", "Anthropic", "Rojer", "Assistant Rojer", "Röjer"])(
    "réservé : %s",
    (n) => expect(nomReserve(n)).toBe(true),
  );
  it.each(["n8n", "Hermes", "Mon agent", ""])("libre : %s", (n) => expect(nomReserve(n)).toBe(false));
});

describe("issueDuConsentement — ce que l'écran permet", () => {
  it("vérifié ou local : autoriser, quel que soit le réglage", () => {
    expect(issueDuConsentement("https://claude.ai/api/mcp/auth_callback", false)).toBe("autoriser");
    expect(issueDuConsentement("http://localhost:3000/cb", false)).toBe("autoriser");
  });
  it("non vérifié : fermé par défaut, à confirmer si le compte l'a ouvert", () => {
    expect(issueDuConsentement("https://n8n.exemple.fr/cb", false)).toBe("ferme");
    expect(issueDuConsentement("https://n8n.exemple.fr/cb", true)).toBe("confirmer");
  });
  it("adresse absente ou refusée : fermé, même ouvert", () => {
    expect(issueDuConsentement(null, true)).toBe("ferme");
    expect(issueDuConsentement("http://evil.example/cb", true)).toBe("ferme");
  });
});

describe("estDocumentCimdAdmis — éditeurs dont un document CIMD est lu", () => {
  it("admet un document servi en https par Anthropic ou OpenAI", () => {
    expect(estDocumentCimdAdmis("https://claude.ai/oauth/claude-code-client-metadata")).toBe(true);
    expect(estDocumentCimdAdmis("https://console.anthropic.com/client.json")).toBe(true);
    expect(estDocumentCimdAdmis("https://chatgpt.com/oauth/client.json")).toBe(true);
  });

  it.each([
    "http://claude.ai/client.json",
    "https://claude.ai:8443/client.json",
    "https://claude.ai.attaquant.example/client.json",
    "https://attaquantclaude.ai/client.json",
    // Un sous-domaine quelconque d'un éditeur n'est pas l'éditeur.
    "https://contenu.chatgpt.com/client.json",
    "https://communaute.openai.com/client.json",
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
    "/api/auth/oauth2/introspect",
    "/api/auth/.well-known/openid-configuration",
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
  // La demande signée à t = 1 000 000 ms ; une session ouverte après, une avant.
  const apres = new Date(1_000_500);
  const avant = new Date(999_000);

  it("session postérieure : retire la signature, prompt=login et max_age, garde le reste", () => {
    const signee =
      "response_type=code&client_id=c1&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&code_challenge=abc&code_challenge_method=S256&state=s&scope=rojer%3Alecture&resource=https%3A%2F%2Frojer.fr%2Fapi%2Fmcp&prompt=login+consent&max_age=0&exp=123&sig=zzz&ba_iat=1000000&ba_pl=2";
    const p = new URLSearchParams(requeteARejouer(signee, apres) ?? "");
    expect(p.get("client_id")).toBe("c1");
    expect(p.get("code_challenge")).toBe("abc");
    expect(p.get("resource")).toBe("https://rojer.fr/api/mcp");
    expect(p.get("redirect_uri")).toBe("https://claude.ai/api/mcp/auth_callback");
    expect(p.get("prompt")).toBe("consent");
    for (const retire of ["sig", "exp", "ba_iat", "ba_pl", "max_age"]) expect(p.has(retire)).toBe(false);
  });

  it("sans autre prompt, le paramètre disparaît ; prompt=create se lève comme login", () => {
    for (const prompt of ["login", "create"]) {
      const rejouee = requeteARejouer(`client_id=c1&prompt=${prompt}&ba_iat=1000000`, apres);
      expect(rejouee, prompt).not.toBeNull();
      expect(new URLSearchParams(rejouee ?? "").has("prompt"), prompt).toBe(false);
    }
  });

  it("session antérieure à la demande : prompt=login, create ou max_age ne se lèvent pas", () => {
    for (const q of ["prompt=login", "prompt=create", "max_age=0", "prompt=consent+login"]) {
      expect(requeteARejouer(`client_id=c1&${q}&ba_iat=1000000`, avant), q).toBeNull();
    }
    // Sans `ba_iat` lisible, la fraîcheur ne se prouve pas.
    expect(requeteARejouer("client_id=c1&prompt=login", apres)).toBeNull();
  });

  it("sans exigence de connexion, la requête se rejoue quelle que soit la session", () => {
    const p = new URLSearchParams(requeteARejouer("client_id=c1&prompt=consent&ba_iat=1000000&sig=z", avant) ?? "");
    expect(p.get("prompt")).toBe("consent");
    expect(p.has("sig")).toBe(false);
  });
});
