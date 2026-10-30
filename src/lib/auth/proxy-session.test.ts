import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { cheminPublic, garderSession } from "./proxy-session";
import { ENTETE_IP_CLIENT } from "./entete-ip";

/**
 * Le proxy et la session (ADR-052). Deux listes à double tranchant, tenues
 * par des tests plutôt que par la relecture :
 *   - trop courte, elle casse ce qui doit répondre à des programmes (le MCP a
 *     déjà reçu un 307 vers /login là où il attendait du JSON-RPC) ;
 *   - trop longue, elle ouvre des pages qui devaient rester derrière la
 *     session.
 * Et l'IP publiée pour Better Auth ne vient jamais du client.
 */

const COOKIE = "better-auth.session_token=jeton.signature";

function requete(chemin: string, entetes: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${chemin}`, { headers: entetes });
}

/** L'en-tête de requête transmis au rendu, tel que Next le relit. */
function transmis(reponse: Response, nom: string): string | null {
  return reponse.headers.get(`x-middleware-request-${nom}`);
}

describe("chemins publics", () => {
  it("laisse passer les parcours d'entrée", () => {
    for (const p of ["/", "/login", "/signup", "/auth/verification", "/auth/reinitialisation"]) {
      expect(cheminPublic(p), p).toBe(true);
    }
  });

  it("laisse passer les accès externes sans compte", () => {
    for (const p of [
      "/acces/abc",
      "/verifier/sig_1",
      "/signe/sig_1",
      "/accessibilite/mon-erp",
      "/api/accessibilite/mon-erp/affiche",
      "/robots.txt",
    ]) {
      expect(cheminPublic(p), p).toBe(true);
    }
  });

  it("laisse passer le serveur MCP par clé, qui porte sa propre garde", () => {
    expect(cheminPublic("/api/mcp/une-cle-quelconque")).toBe(true);
  });

  it("garde le dossier derrière la session", () => {
    for (const p of [
      "/etablissements/etab_1",
      "/onboarding",
      "/entreprises",
      "/api/etablissements/etab_1/controle-zip",
      "/api/duerp/import",
      // Aucune route HTTP de Better Auth n'est montée : rien à ouvrir.
      "/api/auth/sign-in/email",
    ]) {
      expect(cheminPublic(p), p).toBe(false);
    }
  });

  it("compare par segment entier, pas par début de chaîne", () => {
    for (const p of [
      "/authorisations",
      "/signets",
      "/acces-admin",
      "/verifiers",
      "/loginx",
      "/signup-admin",
      "/accessibilite-interne",
      "/api/mcpx",
      "/api/accessibilites",
      "/_nextx",
    ]) {
      expect(cheminPublic(p), p).toBe(false);
    }
  });
});

describe("garderSession : refus sans cookie de session", () => {
  it("/api/* répond 401 en JSON", async () => {
    const r = garderSession(requete("/api/etablissements/e1/controle-zip"));
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ error: "non_authentifie" });
  });

  it("une page protégée redirige vers /login avec le chemin de retour", () => {
    const r = garderSession(requete("/etablissements/e1"));
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toBe("http://localhost/login?next=%2Fetablissements%2Fe1");
  });

  it("un cookie d'un autre nom n'est pas une session", () => {
    const r = garderSession(requete("/etablissements/e1", { cookie: "sb-projet-auth-token=x" }));
    expect(r.status).toBe(307);
  });
});

describe("garderSession : passage", () => {
  it("avec un cookie, un chemin protégé passe (la validation est à requireUser)", () => {
    const r = garderSession(requete("/etablissements/e1", { cookie: COOKIE }));
    expect(r.headers.get("x-middleware-next")).toBe("1");
  });

  it("un chemin public passe sans cookie", () => {
    const r = garderSession(requete("/login"));
    expect(r.headers.get("x-middleware-next")).toBe("1");
  });

  it("transmet au rendu les en-têtes de requête demandés", () => {
    const r = garderSession(requete("/login"), { entetesRequete: { "content-security-policy": "x" } });
    expect(transmis(r, "content-security-policy")).toBe("x");
  });
});

describe("garderSession : l'IP publiée pour Better Auth", () => {
  it("est la dernière entrée de X-Forwarded-For, pas celle du client", () => {
    const r = garderSession(
      requete("/login", { "x-forwarded-for": "6.6.6.6, 203.0.113.9" }),
    );
    expect(transmis(r, ENTETE_IP_CLIENT)).toBe("203.0.113.9");
  });

  it("écrase la valeur envoyée par le client", () => {
    const r = garderSession(
      requete("/login", { [ENTETE_IP_CLIENT]: "6.6.6.6", "x-forwarded-for": "203.0.113.9" }),
    );
    expect(transmis(r, ENTETE_IP_CLIENT)).toBe("203.0.113.9");
  });

  it("sans IP lisible, retire celle qu'aurait posée le client", () => {
    const r = garderSession(requete("/login", { [ENTETE_IP_CLIENT]: "6.6.6.6" }));
    expect(transmis(r, ENTETE_IP_CLIENT)).toBeNull();
  });
});
