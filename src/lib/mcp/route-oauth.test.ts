import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les deux routes de l'accès OAuth, prises par le bout par lequel un client
 * les prend : des requêtes HTTP réelles, à travers toute la chaîne.
 *
 * `acces-oauth.test.ts` couvre les décisions isolément. Ici on vérifie
 * qu'elles sont **branchées**, ce qui est une autre question — et la seule
 * qui compte pour qu'un connecteur fonctionne :
 *
 *   - un accès sans jeton doit produire un **401** portant
 *     `WWW-Authenticate`. C'est ce statut, et lui seul, qui déclenche le flux
 *     d'authentification côté client. Un 200 contenant une erreur, ou le 404
 *     muet de la route à clé, laisserait l'utilisateur devant un échec sans
 *     jamais lui proposer de se connecter ;
 *   - la portée doit venir du jeton, jamais de la requête ;
 *   - les métadonnées doivent désigner exactement l'URL saisie.
 */

const SUB = "11111111-2222-3333-4444-555555555555";
const ETAB = "etab_du_porteur";

const { prismaMock, verifierMock, chercherMock } = vi.hoisted(() => ({
  prismaMock: {
    $on: vi.fn(),
    // `findFirst` : les marques « à confirmer » (`marquesAConfirmerDuDossier`), rien par défaut.
    etablissement: { findUnique: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    duerp: { findFirst: vi.fn() },
    action: { findMany: vi.fn() },
    entreprise: { findUnique: vi.fn() },
  },
  verifierMock: vi.fn(),
  chercherMock: vi.fn(),
}));

vi.mock("./prisma", () => ({ prismaMcp: prismaMock }));
vi.mock("./acces-oauth-deps", () => ({
  creerVerificateurSupabase: () => verifierMock,
  chercherEtablissementDeUtilisateur: chercherMock,
}));

// Les routes lisent leur configuration au chargement : l'environnement doit
// être posé avant l'import.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "cle-publique-test";
process.env.MCP_HOTES = "rojer.test";

const { POST } = await import("@/app/api/mcp/route");
const metadonnees = await import(
  "@/app/.well-known/oauth-protected-resource/api/mcp/route"
);

const JETON = "jeton-porteur-valide";

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

const requete = (
  corps: unknown,
  entetes: Record<string, string> = {},
  url = "https://rojer.test/api/mcp",
) =>
  new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "rojer.test",
      ...entetes,
    },
    body: JSON.stringify(corps),
  });

const avecJeton = (jeton = JETON) => ({ authorization: `Bearer ${jeton}` });

beforeEach(() => {
  prismaMock.etablissement.findUnique.mockReset().mockResolvedValue(null);
  prismaMock.duerp.findFirst.mockReset().mockResolvedValue(null);
  prismaMock.action.findMany.mockReset().mockResolvedValue([]);
  verifierMock.mockReset().mockResolvedValue({ sub: SUB });
  chercherMock.mockReset().mockResolvedValue([{ id: ETAB, nom: "Café du Port" }]);
});

describe("refus — la forme qui déclenche le flux OAuth", () => {
  it("répond 401 sans jeton, pas 404 ni 200", async () => {
    const res = await POST(requete(initialize));
    expect(res.status).toBe(401);
  });

  it("désigne les métadonnées de ressource dans WWW-Authenticate", async () => {
    const res = await POST(requete(initialize));
    const defi = res.headers.get("www-authenticate") ?? "";

    expect(defi).toContain("Bearer");
    expect(defi).toContain(
      'resource_metadata="https://rojer.test/.well-known/oauth-protected-resource/api/mcp"',
    );
  });

  it("refuse un jeton que le vérificateur rejette", async () => {
    verifierMock.mockResolvedValue(null);
    expect((await POST(requete(initialize, avecJeton()))).status).toBe(401);
  });

  it("refuse un porteur sans établissement, sans distinguer le motif", async () => {
    // Compte créé mais onboarding non terminé : c'est un refus, et il doit
    // être indiscernable d'un jeton invalide.
    chercherMock.mockResolvedValue([]);
    const sansEtab = await POST(requete(initialize, avecJeton()));

    verifierMock.mockResolvedValue(null);
    const jetonInvalide = await POST(requete(initialize, avecJeton()));

    expect(sansEtab.status).toBe(401);
    expect(jetonInvalide.status).toBe(401);
    expect(await sansEtab.text()).toBe(await jetonInvalide.text());
  });

  it("ne lit jamais un jeton passé dans l'URL", async () => {
    const res = await POST(
      requete(initialize, {}, `https://rojer.test/api/mcp?access_token=${JETON}`),
    );
    expect(res.status).toBe(401);
    expect(verifierMock).not.toHaveBeenCalled();
  });
});

describe("gardes de transport", () => {
  it("refuse un Host étranger, même avec un jeton valide", async () => {
    const res = await POST(
      requete(initialize, { ...avecJeton(), host: "attaquant.example" }),
    );
    expect(res.status).toBe(403);
    // La garde passe avant l'authentification : rien ne doit avoir été
    // vérifié pour une requête qu'on rejette d'emblée.
    expect(verifierMock).not.toHaveBeenCalled();
  });

  it("refuse une Origin étrangère, même avec un jeton valide", async () => {
    const res = await POST(
      requete(initialize, {
        ...avecJeton(),
        origin: "https://attaquant.example",
      }),
    );
    expect(res.status).toBe(403);
  });
});

/**
 * La désambiguïsation, branchée (ADR-028).
 *
 * `acces-oauth.test.ts` couvre la décision. Ici on vérifie qu'elle atteint bien
 * le client — et surtout qu'elle ne se déguise pas en refus d'authentification
 * en chemin : c'est le seul endroit où l'on voit le statut HTTP réellement
 * rendu, et le `401` de la route serait ici une boucle infinie côté connecteur.
 */
describe("porteur de plusieurs établissements", () => {
  const DEUX = [
    { id: ETAB, nom: "Café du Port" },
    { id: "etab_2", nom: "Café de la Gare" },
  ];

  it("répond 400 en listant, et ne construit aucun serveur", async () => {
    chercherMock.mockResolvedValue(DEUX);
    const res = await POST(requete(initialize, avecJeton()));

    expect(res.status).toBe(400);
    const corps = await res.json();
    expect(corps.etablissements).toEqual(DEUX);
    // Aucune lecture de dossier : on n'a pas ouvert « par défaut » celui du
    // haut de la liste avant de se raviser.
    expect(prismaMock.etablissement.findUnique).not.toHaveBeenCalled();
  });

  it("sert celui que l'URL désigne", async () => {
    chercherMock.mockResolvedValue(DEUX);
    const res = await POST(
      requete(
        initialize,
        avecJeton(),
        "https://rojer.test/api/mcp?etablissement=etab_2",
      ),
    );
    expect(res.status).toBe(200);
  });
});

describe("service", () => {
  it("sert le protocole à un porteur légitime", async () => {
    const res = await POST(requete(initialize, avecJeton()));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("rojer");
  });

  it("lit l'établissement du porteur, jamais un autre", async () => {
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

    await POST(requete(initialize, avecJeton()));
    const res = await POST(
      requete(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "fiche_etablissement", arguments: {} },
        },
        avecJeton(),
      ),
    );

    expect(await res.text()).toContain("Café du Port");
    expect(chercherMock).toHaveBeenCalledWith(SUB);
    expect(prismaMock.etablissement.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ETAB } }),
    );
  });

  it("n'expose aucun champ où désigner un autre établissement", async () => {
    await POST(requete(initialize, avecJeton()));
    const res = await POST(
      requete({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} }, avecJeton()),
    );
    expect(await res.text()).not.toContain("etablissementId");
  });
});

describe("métadonnées de ressource protégée", () => {
  it("annonce la ressource et son unique serveur d'autorisation", async () => {
    const res = metadonnees.GET(
      new Request(
        "https://rojer.test/.well-known/oauth-protected-resource/api/mcp",
        { headers: { host: "rojer.test" } },
      ),
    );

    expect(res.status).toBe(200);
    const doc = await res.json();

    // `resource` doit correspondre exactement à l'URL saisie côté client,
    // chemin compris : un écart fait rejeter le document.
    expect(doc.resource).toBe("https://rojer.test/api/mcp");
    // Les clients ne garantissent pas d'essayer les entrées suivantes.
    expect(doc.authorization_servers).toEqual([
      "https://projet.supabase.co/auth/v1",
    ]);
    expect(doc.bearer_methods_supported).toContain("header");
  });

  it("se laisse lire depuis un navigateur", async () => {
    // Le document est public par construction : un client le lit avant
    // d'avoir le moindre jeton.
    const res = metadonnees.GET(
      new Request(
        "https://rojer.test/.well-known/oauth-protected-resource/api/mcp",
        { headers: { host: "rojer.test" } },
      ),
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("*");

    const preflight = metadonnees.OPTIONS();
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("ne contient aucun secret", async () => {
    const res = metadonnees.GET(
      new Request(
        "https://rojer.test/.well-known/oauth-protected-resource/api/mcp",
        { headers: { host: "rojer.test" } },
      ),
    );
    const brut = await res.text();

    expect(brut).not.toContain("cle-publique-test");
    expect(brut).not.toContain(JETON);
  });
});
