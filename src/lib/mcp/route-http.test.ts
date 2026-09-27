import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La route MCP distante, prise par le bout par lequel un attaquant la
 * prendrait : des requêtes HTTP réelles, à travers toute la chaîne (gardes
 * de transport, secret d'URL, protocole, outils).
 *
 * Les tests d'`acces-http` couvrent la décision d'autorisation isolément.
 * Ici on vérifie qu'elle est bien **branchée** : une bonne clé sert, une
 * mauvaise ne sert pas, et un `Host` étranger ne passe pas — c'est la
 * protection contre la reliaison DNS, sans laquelle une page web visitée
 * par l'utilisateur peut faire parler son navigateur à ce serveur.
 */

const CLE = "K7dQx2mNpR4vTzL9wYbF3sJhC6nAeU8gXtM1oPqW5rE";
const ETAB = "etab_1";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $on: vi.fn(),
    // `findFirst` : les marques « à confirmer » (`marquesAConfirmerDuDossier`), rien par défaut.
    etablissement: { findUnique: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    duerp: { findFirst: vi.fn() },
    action: { findMany: vi.fn() },
  },
}));

vi.mock("./prisma", () => ({ prismaMcp: prismaMock }));

// La route lit sa configuration au chargement du module : l'environnement
// doit être posé avant l'import.
process.env.MCP_CLE = CLE;
process.env.MCP_ETABLISSEMENT_ID = ETAB;
process.env.MCP_HOTES = "rojer.test";

const { POST } = await import("@/app/api/mcp/[cle]/route");

const requete = (
  cle: string,
  corps: unknown,
  entetes: Record<string, string> = {},
) =>
  new Request(`https://rojer.test/api/mcp/${cle}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "rojer.test",
      ...entetes,
    },
    body: JSON.stringify(corps),
  });

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0" },
  },
};

const listeOutils = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };

/** Le corps peut arriver en JSON simple ou en flux d'événements. */
async function lireCorps(res: Response): Promise<string> {
  return res.text();
}

beforeEach(() => {
  prismaMock.etablissement.findUnique.mockReset().mockResolvedValue(null);
  prismaMock.duerp.findFirst.mockReset().mockResolvedValue(null);
  prismaMock.action.findMany.mockReset().mockResolvedValue([]);
});

describe("secret d'URL", () => {
  it("sert le protocole avec la bonne clé", async () => {
    const res = await POST(requete(CLE, initialize));
    expect(res.status).toBe(200);
    expect(await lireCorps(res)).toContain("rojer");
  });

  it("refuse une mauvaise clé", async () => {
    const res = await POST(requete("mauvaise-cle-quelconque", initialize));
    expect(res.status).toBe(404);
  });

  it("refuse une clé absente", async () => {
    const res = await POST(
      new Request("https://rojer.test/api/mcp/", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          host: "rojer.test",
        },
        body: JSON.stringify(initialize),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("répond 404, pas 401 : ne pas confirmer qu'il y a quelque chose ici", async () => {
    // Un 401 distinguerait « mauvaise clé » de « route inconnue » et
    // désignerait la cible à qui balaie des URL.
    const mauvaise = await POST(requete("mauvaise-cle-quelconque", initialize));
    const inconnue = await POST(
      requete("une-autre-cle-differente", initialize),
    );
    expect(mauvaise.status).toBe(404);
    expect(inconnue.status).toBe(404);
  });
});

describe("gardes de transport", () => {
  it("refuse un Host étranger, même avec la bonne clé", async () => {
    const res = await POST(
      requete(CLE, initialize, { host: "attaquant.example" }),
    );
    expect(res.status).toBe(403);
  });

  it("refuse une Origin étrangère, même avec la bonne clé", async () => {
    const res = await POST(
      requete(CLE, initialize, { origin: "https://attaquant.example" }),
    );
    expect(res.status).toBe(403);
  });

  it("laisse passer une requête sans Origin", async () => {
    // Les clients MCP ne sont pas des navigateurs et n'envoient pas
    // d'Origin : exiger l'en-tête fermerait la porte à Claude.
    const res = await POST(requete(CLE, initialize));
    expect(res.status).toBe(200);
  });
});

describe("outils servis", () => {
  it("annonce les trois outils en lecture seule", async () => {
    await POST(requete(CLE, initialize));
    const res = await POST(requete(CLE, listeOutils));
    const corps = await lireCorps(res);

    expect(corps).toContain("fiche_etablissement");
    expect(corps).toContain("etat_duerp");
    expect(corps).toContain("plan_actions");
    expect(corps).toContain("readOnlyHint");
  });

  it("n'expose aucun champ où désigner un autre établissement", async () => {
    await POST(requete(CLE, initialize));
    const res = await POST(requete(CLE, listeOutils));
    const corps = await lireCorps(res);

    // La portée vient de la clé, jamais du client. Le mot ne doit
    // apparaître dans aucun schéma d'entrée.
    expect(corps).not.toContain("etablissementId");
  });

  it("lit l'établissement désigné par la clé", async () => {
    prismaMock.etablissement.findUnique.mockResolvedValue({
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
      entreprise: {
        raisonSociale: "Port SARL",
        siret: null,
        codeNaf: "56.10A",
        effectif: 8,
      },
      _count: { equipements: 4, verifications: 12, actions: 3 },
    });

    await POST(requete(CLE, initialize));
    const res = await POST(
      requete(CLE, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "fiche_etablissement", arguments: {} },
      }),
    );

    expect(await lireCorps(res)).toContain("Café du Port");
    expect(prismaMock.etablissement.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ETAB } }),
    );
  });
});
