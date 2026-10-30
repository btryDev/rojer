import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

/**
 * La CSP bloquante à nonce (audit OWASP S7, 2026-10-14) tient à trois choses,
 * et chacune casse en silence si on la retire :
 *   1. le proxy tire un nonce par requête et le pose sur la requête (Next l'y
 *      lit) ET sur la réponse (le navigateur l'applique) ;
 *   2. il ne la pose pas sur `/api/*`, dont la CSP vient de `next.config.ts`
 *      (`sandbox` des fichiers déposés) ;
 *   3. aucune page n'est prérendue : le layout racine appelle `connection()`.
 *      Une page statique porte des scripts sans nonce — mesuré sur
 *      `/_not-found` dans Chrome : page morte.
 */

const { proxy } = await import("../../proxy");

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function nonceDe(csp: string | null): string | undefined {
  return csp?.match(/'nonce-([^']+)'/)?.[1];
}

describe("CSP à nonce posée par le proxy", () => {
  it("pose la même politique sur la requête et la réponse, nonce neuf à chaque fois", async () => {
    const r1 = await proxy(new NextRequest("http://localhost/login"));
    const r2 = await proxy(new NextRequest("http://localhost/login"));
    const reponse = r1.headers.get("content-security-policy");
    const requete = r1.headers.get("x-middleware-request-content-security-policy");
    expect(nonceDe(reponse)).toBeTruthy();
    expect(requete).toBe(reponse);
    expect(nonceDe(r2.headers.get("content-security-policy"))).not.toBe(nonceDe(reponse));
  });

  it("la pose aussi sur une redirection vers la connexion", async () => {
    const r = await proxy(new NextRequest("http://localhost/entreprises"));
    expect(r.status).toBe(307);
    expect(nonceDe(r.headers.get("content-security-policy"))).toBeTruthy();
  });

  it("ne la pose pas sur /api : la CSP des fichiers déposés vient de next.config", async () => {
    const r = await proxy(new NextRequest("http://localhost/api/rapports/r1/fichier"));
    expect(r.headers.get("content-security-policy")).toBeNull();
  });
});

describe("rendu à la requête", () => {
  it("le layout racine appelle connection() : aucune page prérendue sans nonce", () => {
    const layout = readFileSync(join(RACINE, "src", "app", "layout.tsx"), "utf8");
    expect(layout).toMatch(/^\s*await connection\(\);/m);
  });
});
