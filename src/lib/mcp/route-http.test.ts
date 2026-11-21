import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La route MCP distante (ADR-062), prise par le bout par lequel un client la
 * prend : des requêtes HTTP réelles, à travers toute la chaîne (gardes de
 * transport, porteur, protocole, outils).
 *
 * La vérification du jeton est simulée ici (`resoudrePorteur`) : elle est
 * éprouvée isolément par `acces-compte.test.ts`. On vérifie qu'elle est bien
 * BRANCHÉE — sans porteur rien n'est servi, un `Host` étranger ne passe pas —,
 * puis ce que le porteur voit : les établissements de SON compte, le choix
 * entre eux, et rien hors formule Pro.
 */

const ETAB = "etab_1";
const AUTRE = "etab_2";

const { prismaMock, porteur } = vi.hoisted(() => ({
  prismaMock: {
    $on: vi.fn(),
    etablissement: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      // `findFirst` : les marques « à confirmer » (`marquesAConfirmerDuDossier`), rien par défaut.
      findFirst: vi.fn().mockResolvedValue(null),
    },
    duerp: { findFirst: vi.fn() },
    action: { findMany: vi.fn() },
    // Le parc (`getParcEquipements`, axe `inventaire`) : vide par défaut.
    equipement: { findMany: vi.fn().mockResolvedValue([]) },
  },
  porteur: { ouvert: true },
}));

// La limitation de débit écrit en base : neutralisée ici, éprouvée par
// `mcp/limite-debit-mcp.test.ts` et `securite/limite-debit*.test.ts`.
vi.mock("@/lib/securite/limite-debit", async (original) => ({
  ...(await original<typeof import("@/lib/securite/limite-debit")>()),
  consommer: async () => ({ ok: true }),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Le porteur : `Bearer bon` est servi (formule selon `porteur.ouvert`), tout
// le reste reçoit le 401 du défi.
vi.mock("@/lib/mcp/acces-compte", () => ({
  resoudrePorteur: async (request: Request) =>
    request.headers.get("authorization") === "Bearer bon"
      ? { statut: "ok", porteur: { userId: "user-1", compteId: "compte-1", clientId: "claude", ouvert: porteur.ouvert } }
      : {
          statut: "reponse",
          reponse: new Response(null, { status: 401, headers: { "www-authenticate": 'Bearer resource_metadata="x"' } }),
        },
}));

// Le client borné du porteur : le faux Prisma, journalisé pour vérifier le
// compte et l'établissement demandés.
const bornes: { compteId: string; etablissementId?: string }[] = [];
vi.mock("@/lib/auth/compte-hors-session", () => ({
  clientDuPorteurMcp: (compteId: string, _userId: string, etablissementId?: string) => {
    bornes.push({ compteId, etablissementId });
    return prismaMock;
  },
}));

// La route lit sa configuration au chargement du module.
process.env.PUBLIC_APP_URL = "https://rojer.test";

const { POST, GET, DELETE } = await import("@/app/api/mcp/route");

const requete = (corps: unknown, entetes: Record<string, string> = {}) =>
  new Request("https://rojer.test/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "rojer.test",
      authorization: "Bearer bon",
      ...entetes,
    },
    body: JSON.stringify(corps),
  });

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0" } },
};

const listeOutils = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };
const appel = (name: string, args: Record<string, unknown> = {}) => ({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name, arguments: args },
});

const FICHE = {
  raisonDisplay: "Café du Port",
  adresse: "1 quai Neuf",
  codeNaf: "56.10A",
  effectifSurSite: 8,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  categorieErp: null,
  entreprise: { raisonSociale: "Port SARL", siret: null, codeNaf: "56.10A", effectif: 8 },
  equipements: [],
  _count: { equipements: 4, verifications: 12, actions: 3 },
};

const un = [{ id: ETAB, raisonDisplay: "Café du Port", adresse: "1 quai Neuf" }];
const deux = [...un, { id: AUTRE, raisonDisplay: "Café de la Gare", adresse: "2 place de la Gare" }];

beforeEach(() => {
  porteur.ouvert = true;
  bornes.length = 0;
  prismaMock.etablissement.findMany.mockReset().mockResolvedValue(un);
  prismaMock.etablissement.findUnique.mockReset().mockResolvedValue(FICHE);
  prismaMock.duerp.findFirst.mockReset().mockResolvedValue(null);
  prismaMock.action.findMany.mockReset().mockResolvedValue([]);
});

describe("porteur", () => {
  it("sert le protocole au porteur d'un jeton valide", async () => {
    const res = await POST(requete(initialize));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("rojer");
  });

  it("sans jeton valide : le 401 du défi, rien de servi", async () => {
    const res = await POST(requete(initialize, { authorization: "Bearer faux" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata");
  });

  it("sans état : GET et DELETE répondent 405", async () => {
    expect((await GET()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
  });
});

describe("gardes de transport", () => {
  it("refuse un Host étranger, même avec un jeton valide", async () => {
    const res = await POST(requete(initialize, { host: "attaquant.example" }));
    expect(res.status).toBe(403);
  });

  it("refuse une Origin étrangère, même avec un jeton valide", async () => {
    const res = await POST(requete(initialize, { origin: "https://attaquant.example" }));
    expect(res.status).toBe(403);
  });

  it("laisse passer une requête sans Origin", async () => {
    // Les clients MCP ne sont pas des navigateurs et n'envoient pas
    // d'Origin : exiger l'en-tête fermerait la porte à Claude.
    const res = await POST(requete(initialize));
    expect(res.status).toBe(200);
  });
});

describe("outils servis", () => {
  it("annonce la liste des établissements et les outils, en lecture seule", async () => {
    const corps = await (await POST(requete(listeOutils))).text();
    for (const nom of ["etablissements", "fiche_etablissement", "etat_duerp", "plan_actions", "verifications"]) {
      expect(corps).toContain(nom);
    }
    expect(corps).toContain("readOnlyHint");
  });

  it("un seul établissement : lu sans le désigner, par le client borné à lui", async () => {
    const corps = await (await POST(requete(appel("fiche_etablissement")))).text();
    expect(corps).toContain("Café du Port");
    expect(bornes).toContainEqual({ compteId: "compte-1", etablissementId: ETAB });
  });

  it("plusieurs établissements, aucun désigné : la liste et la question, rien de lu", async () => {
    prismaMock.etablissement.findMany.mockResolvedValue(deux);
    const corps = await (await POST(requete(appel("fiche_etablissement")))).text();
    expect(corps).toContain("isError");
    expect(corps).toContain("précisez lequel");
    expect(corps).toContain(AUTRE);
    expect(prismaMock.etablissement.findUnique).not.toHaveBeenCalled();
  });

  it("plusieurs établissements, l'un désigné : celui-là", async () => {
    prismaMock.etablissement.findMany.mockResolvedValue(deux);
    await POST(requete(appel("fiche_etablissement", { etablissement: AUTRE })));
    expect(bornes).toContainEqual({ compteId: "compte-1", etablissementId: AUTRE });
  });

  it("un établissement hors du compte : introuvable, rien de lu", async () => {
    const corps = await (await POST(requete(appel("fiche_etablissement", { etablissement: "etab_d_un_autre" })))).text();
    expect(corps).toContain("isError");
    expect(corps).toContain("introuvable");
    expect(bornes.some((b) => b.etablissementId === "etab_d_un_autre")).toBe(false);
    expect(prismaMock.etablissement.findUnique).not.toHaveBeenCalled();
  });

  it("`etablissements` liste ceux du compte", async () => {
    prismaMock.etablissement.findMany.mockResolvedValue(deux);
    const corps = await (await POST(requete(appel("etablissements")))).text();
    expect(corps).toContain("Café de la Gare");
    expect(corps).toContain(ETAB);
    expect(bornes).toContainEqual({ compteId: "compte-1", etablissementId: undefined });
  });

  it("un argument inconnu est refusé, pas ignoré", async () => {
    const corps = await (await POST(requete(appel("fiche_etablissement", { etablissementId: AUTRE })))).text();
    expect(corps).toContain("isError");
    expect(prismaMock.etablissement.findUnique).not.toHaveBeenCalled();
  });
});

describe("formule Pro", () => {
  it("hors Pro : chaque outil le dit, et rien n'est lu", async () => {
    porteur.ouvert = false;
    for (const nom of ["etablissements", "fiche_etablissement"]) {
      const corps = await (await POST(requete(appel(nom)))).text();
      expect(corps).toContain("isError");
      expect(corps).toContain("formule Pro");
    }
    expect(prismaMock.etablissement.findMany).not.toHaveBeenCalled();
    expect(prismaMock.etablissement.findUnique).not.toHaveBeenCalled();
  });
});
