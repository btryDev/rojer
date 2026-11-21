// Le connecteur MCP en OAuth (ADR-062), de bout en bout, contre un VRAI
// PostgreSQL et le vrai Better Auth : découverte, enregistrement du client
// (adresses de retour admises), autorisation avec PKCE et ressource,
// consentement, jeton, porteur résolu par `/api/mcp`, formule Pro, retrait.
//
// Ce que les tests unitaires ne peuvent pas prouver : que le fournisseur de la
// 1.7.27 émet bien, avec NOTRE configuration, un jeton d'accès que NOTRE
// serveur de ressource accepte — audience, `typ`, claim du compte.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe
// une base LOCALE migrée. Il n'efface que ce qu'il crée.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/membres");
vi.unmock("@/lib/auth/portee/client");
// `nextCookies` écrit les cookies de la réponse : hors requête Next, un magasin vide.
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: () => undefined, get: () => undefined, getAll: () => [], toString: () => "" }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth/require-user", () => ({ lireSessionCourante: async () => null }));
vi.mock("@/lib/auth/mot-de-passe-divulgue", async (original) => ({
  ...(await original<typeof import("@/lib/auth/mot-de-passe-divulgue")>()),
  motDePasseDivulgue: async () => false,
}));
vi.mock("@/lib/email", async (original) => ({
  ...(await original<typeof import("@/lib/email")>()),
  sendMail: async () => undefined,
}));

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("connecteur MCP en OAuth — PostgreSQL et Better Auth réels", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  process.env.BETTER_AUTH_SECRET ??= "secret-de-test-integration-0123456789abcdef";
  process.env.PUBLIC_APP_URL ??= "http://localhost:3000";
  const BASE = process.env.PUBLIC_APP_URL.replace(/\/+$/, "");
  const RESSOURCE = `${BASE}/api/mcp`;
  const RETOUR = "https://claude.ai/api/mcp/auth_callback";

  const { prisma } = await import("@/lib/prisma");
  const { auth } = await import("@/lib/auth/better-auth");
  const { compteDOnboarding } = await import("@/lib/auth/membres");
  const { resoudrePorteur } = await import("./acces-compte");
  const { retirerAssistant, assistantsAutorises } = await import("@/lib/connecteur/assistants");
  const { lookupKey } = await import("@/lib/abonnements/formules");

  const suffixe = randomUUID().slice(0, 8);
  const email = `connecteur-${suffixe}@exemple.test`;
  const MOT_DE_PASSE = "un-mot-de-passe-solide-42";
  let userId = "";
  let compteId = "";
  let cookie = new Headers();
  const entreprises: string[] = [];
  const clients: string[] = [];

  const b64url = (b: Buffer) => b.toString("base64url");
  const verifieur = b64url(randomBytes(32));
  const defi = b64url(createHash("sha256").update(verifieur).digest());

  /** Une requête vers le gestionnaire de Better Auth, comme la route la lui passe. */
  const appel = (chemin: string, init: RequestInit = {}) => auth.handler(new Request(`${BASE}${chemin}`, init));

  async function enregistrer(redirect_uris: string[]) {
    return appel("/api/auth/oauth2/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Claude",
        redirect_uris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      }),
    });
  }

  async function jeton(corps: Record<string, string>) {
    return appel("/api/auth/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(corps).toString(),
    });
  }

  /** L'URL vers laquelle une réponse du fournisseur renvoie : en-tête `location`, ou `{ url }` en JSON. */
  async function suite(r: Response): Promise<URL> {
    const location = r.headers.get("location");
    if (location) return new URL(location, BASE);
    const corps = (await r.json()) as { url?: string };
    if (!corps.url) throw new Error(`pas de suite (${r.status}) : ${JSON.stringify(corps)}`);
    return new URL(corps.url, BASE);
  }

  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const inscrite = await auth.api.signUpEmail({ body: { email, password: MOT_DE_PASSE, name: "Connecteur" } });
    userId = inscrite.user.id;
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    const { headers } = await auth.api.signInEmail({ body: { email, password: MOT_DE_PASSE }, returnHeaders: true });
    cookie = new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") });
    compteId = (await compteDOnboarding(userId, "Café du Port")).compteId;
    const ent = await prisma.entreprise.create({
      data: {
        compteId,
        raisonSociale: "Café du Port",
        effectif: 4,
        adresse: "1 quai",
        etablissements: { create: { raisonDisplay: "Café", adresse: "1 quai", codeNaf: "56.10A", effectifSurSite: 4 } },
      },
    });
    entreprises.push(ent.id);
    await prisma.abonnement.create({ data: { compteId, statut: "active", formule: lookupKey("pro", "mensuel") } });
  });

  afterAll(async () => {
    await prisma.oauthClient.deleteMany({ where: { clientId: { in: clients } } });
    await prisma.abonnement.deleteMany({ where: { compteId } });
    await prisma.entreprise.deleteMany({ where: { id: { in: entreprises } } });
    await prisma.compte.deleteMany({ where: { id: compteId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("découverte : la ressource désigne le serveur, le serveur d'autorisation annonce PKCE S256", async () => {
    const prm = (await (await appel("/.well-known/oauth-protected-resource/api/mcp")).json()) as {
      resource: string;
      authorization_servers: string[];
      scopes_supported?: string[];
    };
    expect(prm.resource).toBe(RESSOURCE);
    expect(prm.scopes_supported).toEqual(["rojer:lecture"]);

    const emetteur = prm.authorization_servers[0];
    expect(emetteur).toBe(`${BASE}/api/auth`);
    const as = (await (await appel("/.well-known/oauth-authorization-server/api/auth")).json()) as {
      issuer: string;
      registration_endpoint: string;
      code_challenge_methods_supported: string[];
    };
    expect(as.issuer).toBe(emetteur);
    expect(as.registration_endpoint).toBe(`${BASE}/api/auth/oauth2/register`);
    expect(as.code_challenge_methods_supported).toEqual(["S256"]);
  });

  it("enregistrement : une adresse de retour étrangère est refusée", async () => {
    const r = await enregistrer(["https://evil.example/callback"]);
    expect(r.status).toBe(400);
  });

  let clientId = "";
  let code = "";
  let acces = "";
  let rafraichissement = "";

  it("enregistrement de Claude, autorisation, consentement : un code", async () => {
    const r = await enregistrer([RETOUR]);
    expect(r.status).toBeLessThan(300);
    clientId = ((await r.json()) as { client_id: string }).client_id;
    clients.push(clientId);

    const requete = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: RETOUR,
      scope: "rojer:lecture offline_access",
      state: "etat-1",
      code_challenge: defi,
      code_challenge_method: "S256",
      resource: RESSOURCE,
    });
    const vers = await suite(
      await appel(`/api/auth/oauth2/authorize?${requete}`, {
        headers: { cookie: cookie.get("cookie") ?? "", accept: "text/html" },
      }),
    );
    // Un seul compte : pas de choix, directement le consentement.
    expect(vers.pathname).toBe("/oauth/consentement");

    const accorde = await auth.api.oauth2Consent({
      headers: cookie,
      body: { accept: true, oauth_query: vers.searchParams.toString() },
    });
    const retour = new URL((accorde as { url: string }).url);
    expect(`${retour.origin}${retour.pathname}`).toBe(RETOUR);
    expect(retour.searchParams.get("state")).toBe("etat-1");
    code = retour.searchParams.get("code") ?? "";
    expect(code).not.toBe("");
  });

  it("jeton : un JWT d'accès lié à la ressource, et un jeton de rafraîchissement", async () => {
    const r = await jeton({
      grant_type: "authorization_code",
      code,
      redirect_uri: RETOUR,
      client_id: clientId,
      code_verifier: verifieur,
      resource: RESSOURCE,
    });
    expect(r.status).toBe(200);
    const corps = (await r.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    acces = corps.access_token;
    rafraichissement = corps.refresh_token ?? "";
    expect(acces.split(".")).toHaveLength(3);
    expect(rafraichissement).not.toBe("");
    expect(corps.expires_in).toBeLessThanOrEqual(15 * 60);
  });

  it("un code ne sert qu'une fois", async () => {
    const r = await jeton({
      grant_type: "authorization_code",
      code,
      redirect_uri: RETOUR,
      client_id: clientId,
      code_verifier: verifieur,
      resource: RESSOURCE,
    });
    expect(r.status).toBe(400);
  });

  const requeteMcp = (j: string) =>
    new Request(RESSOURCE, { method: "POST", headers: { authorization: `Bearer ${j}` } });

  it("/api/mcp : le porteur est la personne, sur son compte, ouvert en Pro", async () => {
    expect(await resoudrePorteur(requeteMcp(acces), RESSOURCE)).toEqual({
      statut: "ok",
      porteur: { userId, compteId, clientId, ouvert: true },
    });
  });

  it("/api/mcp : le jeton ne vaut pas pour une autre ressource", async () => {
    const r = await resoudrePorteur(requeteMcp(acces), "http://localhost:3000/api/autre");
    expect(r.statut).toBe("reponse");
  });

  it("/api/mcp : hors Pro, servi mais fermé", async () => {
    await prisma.abonnement.update({ where: { compteId }, data: { formule: lookupKey("essentiel", "mensuel") } });
    const r = await resoudrePorteur(requeteMcp(acces), RESSOURCE);
    expect(r.statut === "ok" && r.porteur.ouvert).toBe(false);
    await prisma.abonnement.update({ where: { compteId }, data: { formule: lookupKey("pro", "mensuel") } });
  });

  it("rafraîchissement : un nouveau couple, l'ancien jeton de rafraîchissement tourne", async () => {
    const r = await jeton({ grant_type: "refresh_token", refresh_token: rafraichissement, client_id: clientId, resource: RESSOURCE });
    expect(r.status).toBe(200);
    const corps = (await r.json()) as { access_token: string; refresh_token: string };
    expect(corps.refresh_token).not.toBe(rafraichissement);
    rafraichissement = corps.refresh_token;
  });

  it("retirer l'assistant : plus de consentement, et le rafraîchissement est refusé", async () => {
    const [assistant] = await assistantsAutorises(userId, compteId);
    expect(assistant?.nom).toBe("Claude");
    expect(await retirerAssistant(userId, compteId, assistant.id)).toBe(true);
    expect(await assistantsAutorises(userId, compteId)).toEqual([]);

    const r = await jeton({ grant_type: "refresh_token", refresh_token: rafraichissement, client_id: clientId, resource: RESSOURCE });
    expect(r.status).toBe(400);
  });

  it("plus membre du compte : le jeton encore valide ne sert plus", async () => {
    await prisma.membre.deleteMany({ where: { compteId, userId } });
    const r = await resoudrePorteur(requeteMcp(acces), RESSOURCE);
    expect(r.statut === "reponse" && r.reponse.status).toBe(401);
  });
});
