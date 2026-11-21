import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le porteur d'une requête sur `/api/mcp` (ADR-062 § 4). La vérification
 * cryptographique du jeton est celle de `requireMcpAuth` (Better Auth),
 * simulée ici : on éprouve ce que Rojer ajoute — le refus d'un JWT qui n'est
 * pas un jeton d'accès, les claims exigés, l'appartenance relue, la formule.
 */

const h = vi.hoisted(() => ({
  claims: null as Record<string, unknown> | null,
  refus: new Response(null, { status: 401 }),
  options: null as unknown,
  membre: vi.fn(),
}));

vi.mock("@better-auth/mcp", () => ({
  requireMcpAuth:
    (_auth: unknown, suite: (r: Request, c: Record<string, unknown>) => Promise<Response>, options: unknown) =>
    async (r: Request) => {
      h.options = options;
      return h.claims ? suite(r, h.claims) : h.refus;
    },
}));
vi.mock("@/lib/auth/better-auth", () => ({ auth: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { membre: { findUnique: h.membre } } }));

const { resoudrePorteur, enteteJwt } = await import("./acces-compte");
const { lookupKey } = await import("@/lib/abonnements/formules");

const RESSOURCE = "https://rojer.test/api/mcp";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jeton = (typ: string | undefined) => `${b64(typ ? { alg: "EdDSA", typ } : { alg: "EdDSA" })}.${b64({})}.sig`;
const requete = (j: string | null) =>
  new Request(RESSOURCE, { method: "POST", headers: j ? { authorization: `Bearer ${j}` } : {} });

const CLAIMS: Record<string, string> = { sub: "user-1", compte: "compte-1", azp: "client-1", scope: "rojer:lecture" };
const pro = { role: "member", compte: { abonnement: { statut: "active", formule: lookupKey("pro", "mensuel") } } };

beforeEach(() => {
  h.claims = { ...CLAIMS };
  h.membre.mockReset().mockResolvedValue(pro);
});

describe("resoudrePorteur", () => {
  it("exige l'audience du serveur et la portée de lecture", async () => {
    await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(h.options).toEqual({ resource: RESSOURCE, requiredScopes: ["rojer:lecture"] });
  });

  it("jeton refusé par la vérification : sa réponse part telle quelle, la base n'est pas lue", async () => {
    h.claims = null;
    const r = await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(r).toEqual({ statut: "reponse", reponse: h.refus });
    expect(h.membre).not.toHaveBeenCalled();
  });

  it("un JWT signé qui n'est pas un jeton d'accès (typ) est refusé — écart de la 1.7", async () => {
    for (const typ of ["JWT", undefined]) {
      const r = await resoudrePorteur(requete(jeton(typ)), RESSOURCE);
      expect(r.statut).toBe("reponse");
      if (r.statut === "reponse") {
        expect(r.reponse.status).toBe(401);
        expect(r.reponse.headers.get("www-authenticate")).toContain(
          'resource_metadata="https://rojer.test/.well-known/oauth-protected-resource/api/mcp"',
        );
      }
    }
    expect(h.membre).not.toHaveBeenCalled();
  });

  it("un claim manquant (compte, sub, azp) : refusé", async () => {
    for (const manque of ["compte", "sub", "azp"]) {
      const { [manque]: _retire, ...reste } = CLAIMS;
      h.claims = reste;
      expect((await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE)).statut).toBe("reponse");
    }
  });

  it("plus membre du compte du jeton : 401, le jeton ne vaut plus rien", async () => {
    h.membre.mockResolvedValue(null);
    const r = await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(r.statut === "reponse" && r.reponse.status).toBe(401);
    expect(h.membre).toHaveBeenCalledWith(
      expect.objectContaining({ where: { compteId_userId: { compteId: "compte-1", userId: "user-1" } } }),
    );
  });

  it("membre, Pro : servi et ouvert", async () => {
    expect(await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE)).toEqual({
      statut: "ok",
      porteur: { userId: "user-1", compteId: "compte-1", clientId: "client-1", ouvert: true },
    });
  });

  it("membre en lecture seule : servi aussi — le connecteur ne fait que lire", async () => {
    h.membre.mockResolvedValue({ ...pro, role: "lecture" });
    const r = await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(r.statut === "ok" && r.porteur.ouvert).toBe(true);
  });

  it("membre, hors Pro : servi mais fermé — les outils le diront", async () => {
    h.membre.mockResolvedValue({ role: "owner", compte: { abonnement: null } });
    const r = await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(r.statut === "ok" && r.porteur.ouvert).toBe(false);
  });
});

describe("enteteJwt", () => {
  it("lit l'en-tête, et rend null pour un texte illisible", () => {
    expect(enteteJwt(jeton("at+jwt"))?.typ).toBe("at+jwt");
    expect(enteteJwt("pas-un-jwt")).toBeNull();
    expect(enteteJwt("")).toBeNull();
  });
});
