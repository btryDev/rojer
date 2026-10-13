import { describe, expect, it } from "vitest";
import { cheminPublic, refreshTokenPerime } from "./middleware";

/**
 * Chemins que le middleware laisse passer sans session Supabase.
 *
 * Cette liste est à double tranchant et mérite d'être tenue par des tests
 * plutôt que par la relecture :
 *
 *   - trop courte, elle casse ce qui doit répondre à des programmes. C'est
 *     ce qui est arrivé au serveur MCP : les routes existaient, les tests de
 *     route passaient, et en production le middleware renvoyait une
 *     redirection vers `/login` avant que la route ne soit atteinte. Le
 *     symptôme — un 307 là où le client attend du JSON-RPC — ne ressemblait
 *     pas à un problème d'authentification ;
 *   - trop longue, elle ouvre des pages qui devaient rester derrière la
 *     session.
 *
 * Les deux sens sont donc vérifiés ici.
 */

describe("chemins publics", () => {
  it("laisse passer les parcours d'entrée", () => {
    for (const p of ["/", "/login", "/signup", "/auth/callback"]) {
      expect(cheminPublic(p)).toBe(true);
    }
  });

  it("laisse passer les accès externes sans compte", () => {
    // ADR-006/007 : prestataire par lien magique, vérification de signature,
    // registre d'accessibilité consultable publiquement.
    for (const p of [
      "/acces/abc",
      "/verifier/sig_1",
      "/signe/sig_1",
      "/accessibilite/mon-erp",
      "/api/accessibilite/mon-erp/affiche",
    ]) {
      expect(cheminPublic(p)).toBe(true);
    }
  });

  it("laisse passer le serveur MCP, qui porte sa propre garde", () => {
    // Un client MCP est un programme : il n'a pas de session Supabase et
    // n'en aura jamais. S'il est redirigé, il ne voit pas une page de
    // connexion, il voit un protocole qui ne répond pas.
    expect(cheminPublic("/api/mcp")).toBe(true);
    expect(cheminPublic("/api/mcp/une-cle-quelconque")).toBe(true);
  });

  it("laisse passer la découverte OAuth, lue avant tout jeton", () => {
    expect(
      cheminPublic("/.well-known/oauth-protected-resource/api/mcp"),
    ).toBe(true);
  });

  it("garde le dossier derrière la session", () => {
    // Le sens inverse : ouvrir le MCP ne doit rien avoir ouvert d'autre.
    for (const p of [
      "/etablissements/etab_1",
      "/etablissements/etab_1/duerp",
      "/onboarding",
      "/api/etablissements/etab_1/controle-zip",
      "/api/duerp/import",
    ]) {
      expect(cheminPublic(p)).toBe(false);
    }
  });

  it("compare par segment entier, pas par début de chaîne", () => {
    // Audit du 2026-10-13, C7 : `startsWith("/auth")` ouvrait `/authorisations`,
    // `startsWith("/signe")` ouvrait `/signets`. Une route ajoutée demain sous
    // un de ces noms serait publique sans que personne l'ait décidé.
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
      "/.well-knownx",
    ]) {
      expect(cheminPublic(p), p).toBe(false);
    }
  });
});

/**
 * Le middleware efface les cookies de session sur cette erreur-là, et
 * seulement sur celle-là. Se tromper de côté coûte cher dans les deux sens :
 * trop laxiste, on déconnecte un utilisateur valide au premier hoquet réseau ;
 * trop strict, le navigateur rejoue indéfiniment un jeton mort et l'écran
 * reste bloqué sur « Invalid Refresh Token » jusqu'à un vidage manuel des
 * cookies.
 */
describe("détection d'une session irrécupérable", () => {
  it("reconnaît un refresh token que le serveur Auth ne connaît plus", () => {
    expect(
      refreshTokenPerime({
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token: Refresh Token Not Found",
        status: 400,
      }),
    ).toBe(true);
    expect(
      refreshTokenPerime({ code: "refresh_token_already_used" }),
    ).toBe(true);
    // Sans code, le message suffit : les versions d'auth-js n'en portent pas
    // toutes un.
    expect(
      refreshTokenPerime({ message: "Invalid Refresh Token: Already Used" }),
    ).toBe(true);
  });

  it("laisse passer les pannes passagères sans détruire la session", () => {
    expect(refreshTokenPerime(new TypeError("fetch failed"))).toBe(false);
    expect(
      refreshTokenPerime({ code: "over_request_rate_limit", status: 429 }),
    ).toBe(false);
    expect(refreshTokenPerime(null)).toBe(false);
    expect(refreshTokenPerime(undefined)).toBe(false);
  });
});
