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
  consentement: vi.fn(),
  compte: vi.fn(),
  abonnement: vi.fn(),
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
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membre: { findUnique: h.membre },
    oauthConsent: { findFirst: h.consentement },
    compte: { findUnique: h.compte },
    abonnement: { findUnique: h.abonnement },
  },
}));

const { resoudrePorteur, enteteJwt, jetonPorteur, descriptionDuDefi, refusJetonInvalide, consentementValable } = await import(
  "./acces-compte"
);
const { lookupKey } = await import("@/lib/abonnements/formules");

const RESSOURCE = "https://rojer.test/api/mcp";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jeton = (typ: string | undefined) => `${b64(typ ? { alg: "EdDSA", typ } : { alg: "EdDSA" })}.${b64({})}.sig`;
const requete = (j: string | null) =>
  new Request(RESSOURCE, { method: "POST", headers: j ? { authorization: `Bearer ${j}` } : {} });

/** Émis le 2026-11-23 à 12:00:00 UTC (secondes). */
const IAT = Date.UTC(2026, 10, 23, 12, 0, 0) / 1000;
const CLAIMS: Record<string, unknown> = { sub: "user-1", compte: "compte-1", azp: "client-1", scope: "rojer:lecture", iat: IAT };
const pro = { statut: "active", formule: lookupKey("pro", "mensuel") };

beforeEach(() => {
  h.claims = { ...CLAIMS };
  h.membre.mockReset().mockResolvedValue({ role: "member" });
  // Consenti une minute avant l'émission du jeton.
  h.consentement
    .mockReset()
    .mockResolvedValue({ createdAt: new Date((IAT - 60) * 1000), client: { redirectUris: ["https://claude.ai/api/mcp/auth_callback"] } });
  h.compte.mockReset().mockResolvedValue({ outilsNonVerifiesAutorises: false });
  // (Lu seulement pour un client qui n'est pas de confiance.)
  h.abonnement.mockReset().mockResolvedValue(pro);
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
    h.membre.mockResolvedValue({ role: "lecture" });
    const r = await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(r.statut === "ok" && r.porteur.ouvert).toBe(true);
  });

  it("membre, hors Pro : servi mais fermé — les outils le diront", async () => {
    h.membre.mockResolvedValue({ role: "owner" });
    h.abonnement.mockResolvedValue(null);
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

describe("jetonPorteur", () => {
  const avec = (valeur: string) => new Request(RESSOURCE, { method: "POST", headers: { authorization: valeur } });
  it("lit un jeton Bearer ou DPoP (vérifié en amont par requireMcpAuth), rien d'autre", () => {
    expect(jetonPorteur(avec("Bearer abc.def.ghi"))).toBe("abc.def.ghi");
    expect(jetonPorteur(avec("DPoP abc.def.ghi"))).toBe("abc.def.ghi");
    expect(jetonPorteur(avec("Basic abc"))).toBeNull();
    expect(jetonPorteur(requete(null))).toBeNull();
  });
});

describe("refusJetonInvalide — le défi reste dans l'ASCII de RFC 6750 § 3", () => {
  it("retire accents, guillemets et caractères hors ASCII ; garde le texte entier dans le corps", async () => {
    const description = "Vous n'êtes plus membre « du » compte \"x\" \\ ici.";
    expect(descriptionDuDefi(description)).toBe("Vous n'etes plus membre du compte x ici.");
    const r = refusJetonInvalide(RESSOURCE, description);
    expect(r.headers.get("www-authenticate")).toMatch(/^[\x20-\x7E]+$/);
    expect(r.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://rojer.test/.well-known/oauth-protected-resource/api/mcp"',
    );
    expect((await r.json()).error.message).toBe(description);
  });
});

describe("le consentement qui a émis le jeton (retrait immédiat, 2026-11-23)", () => {
  it("lu pour ce client, cette personne et ce compte", async () => {
    await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(h.consentement).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: "client-1", userId: "user-1", referenceId: "compte-1" } }),
    );
  });

  it("retiré : le jeton encore valide est refusé (401), avec la raison", async () => {
    h.consentement.mockResolvedValue(null);
    const r = await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(r.statut === "reponse" && r.reponse.status).toBe(401);
    expect(r.statut === "reponse" && r.reponse.headers.get("www-authenticate")).toContain('error="invalid_token"');
  });

  it("rebranché après le retrait : un jeton émis avant le nouveau consentement ne revit pas", async () => {
    h.consentement.mockResolvedValue({
      createdAt: new Date((IAT + 120) * 1000),
      client: { redirectUris: ["https://claude.ai/api/mcp/auth_callback"] },
    });
    const r = await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(r.statut === "reponse" && r.reponse.status).toBe(401);
  });

  it("consentement et jeton dans la même seconde : servi ; la seconde suivante : refusé, sans marge", () => {
    // Le fournisseur date le consentement à la seconde entière.
    expect(consentementValable({ createdAt: new Date(IAT * 1000) }, IAT)).toBe(true);
    expect(consentementValable({ createdAt: new Date((IAT + 1) * 1000) }, IAT)).toBe(false);
  });

  it("consentement sans date : refusé — tout doute refuse", () => {
    expect(consentementValable({ createdAt: null }, IAT)).toBe(false);
  });

  it("sans iat lisible : refusé", () => {
    expect(consentementValable({ createdAt: new Date(0) }, undefined)).toBe(false);
    expect(consentementValable({ createdAt: new Date(0) }, "123")).toBe(false);
  });
});

describe("un outil non vérifié n'est servi que sur un compte qui l'admet encore (ADR-062 § 12)", () => {
  const n8n = { createdAt: new Date((IAT - 60) * 1000), client: { redirectUris: ["https://n8n.exemple.fr/cb"] } };

  it("compte fermé (refermé depuis, ou consentement posé pendant la fermeture) : 401", async () => {
    h.consentement.mockResolvedValue(n8n);
    const r = await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE);
    expect(r.statut === "reponse" && r.reponse.status).toBe(401);
  });

  it("compte ouvert : servi", async () => {
    h.consentement.mockResolvedValue(n8n);
    h.compte.mockResolvedValue({ outilsNonVerifiesAutorises: true });
    expect((await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE)).statut).toBe("ok");
  });

  it("un assistant vérifié reste servi sur un compte fermé aux non vérifiés, sans lire le réglage", async () => {
    expect((await resoudrePorteur(requete(jeton("at+jwt")), RESSOURCE)).statut).toBe("ok");
    expect(h.compte).not.toHaveBeenCalled();
  });
});
