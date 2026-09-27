import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Durée de vie des réponses du serveur MCP distant — audit du 2026-09-27.
 *
 * Ce que la production a montré : 143 « Task timed out after 300 seconds »
 * sur `POST /api/mcp/[cle]`, un toutes les quatre minutes. La cause est une
 * requête `subscriptions/listen` (révision 2026-07-28) : le SDK y répond par
 * un flux SSE qui ne se termine que lorsque le client le ferme. Sur une
 * fonction serverless, « jamais » veut dire « jusqu'au plafond de la
 * plateforme », connexion à la base comprise.
 *
 * Ces tests mesurent ce qui compte : que CHAQUE réponse se termine, et vite.
 * Lire le corps jusqu'au bout est la mesure — un flux qui ne se ferme pas
 * fait échouer le test sur le délai, pas sur une assertion.
 */

const CLE = "K7dQx2mNpR4vTzL9wYbF3sJhC6nAeU8gXtM1oPqW5rE";
const ETAB = "etab_1";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $on: vi.fn(),
    etablissement: { findUnique: vi.fn() },
    verification: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("./prisma", () => ({ prismaMcp: prismaMock }));

process.env.MCP_CLE = CLE;
process.env.MCP_ETABLISSEMENT_ID = ETAB;
process.env.MCP_HOTES = "rojer.test";

const route = await import("@/app/api/mcp/[cle]/route");
const { POST, GET, DELETE } = route;

const VERSION_MODERNE = "2026-07-28";
const URL_MCP = `https://rojer.test/api/mcp/${CLE}`;

const entetesBase = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  host: "rojer.test",
};

/** Requête de la révision 2026-07-28 : métadonnées dans `_meta` ET en en-têtes. */
function requeteModerne(
  id: number,
  method: string,
  params: Record<string, unknown> = {},
  nom?: string,
): Request {
  return new Request(URL_MCP, {
    method: "POST",
    headers: {
      ...entetesBase,
      "mcp-protocol-version": VERSION_MODERNE,
      "mcp-method": method,
      ...(nom ? { "mcp-name": nom } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": VERSION_MODERNE,
          "io.modelcontextprotocol/clientInfo": { name: "test", version: "1.0" },
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    }),
  });
}

/** Requête de l'ère 2025 : sans `_meta`, `initialize` d'abord. */
function requeteLegacy(corps: unknown): Request {
  return new Request(URL_MCP, {
    method: "POST",
    headers: entetesBase,
    body: JSON.stringify(corps),
  });
}

/**
 * Lit le corps jusqu'à sa fin, avec un plafond. Rend le texte et la durée
 * pendant laquelle la réponse est restée ouverte — ou `ouverte: true` si le
 * plafond a été atteint avant la fin du flux.
 */
async function lireJusquauBout(
  res: Response,
  plafondMs = 2_000,
): Promise<{ texte: string; ms: number; ouverte: boolean }> {
  const debut = performance.now();
  if (!res.body) return { texte: "", ms: 0, ouverte: false };
  const lecteur = res.body.getReader();
  const decodeur = new TextDecoder();
  let texte = "";
  const plafond = new Promise<"plafond">((r) =>
    setTimeout(() => r("plafond"), plafondMs),
  );
  for (;;) {
    const lu = await Promise.race([lecteur.read(), plafond]);
    if (lu === "plafond") {
      await lecteur.cancel().catch(() => {});
      return { texte, ms: performance.now() - debut, ouverte: true };
    }
    if (lu.done) break;
    texte += decodeur.decode(lu.value, { stream: true });
  }
  return { texte, ms: performance.now() - debut, ouverte: false };
}

beforeEach(() => {
  prismaMock.etablissement.findUnique.mockReset().mockResolvedValue({
    raisonDisplay: "Café du Port",
    adresse: "1 quai Neuf, 44000 Nantes",
    referentielVersionCalendrier: null,
  });
  prismaMock.verification.count.mockReset().mockResolvedValue(0);
  prismaMock.verification.findMany.mockReset().mockResolvedValue([]);
});

describe("subscriptions/listen — la cause des 300 s", () => {
  it("le flux se termine de lui-même, avec une fin gracieuse", async () => {
    const res = await POST(
      requeteModerne(7, "subscriptions/listen", {
        notifications: { toolsListChanged: true },
      }),
    );
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const { texte, ms, ouverte } = await lireJusquauBout(res);
    console.info(`[mesure] subscriptions/listen ouverte ${Math.round(ms)} ms`);

    expect(ouverte).toBe(false);
    // L'accusé de réception d'abord (la spécification l'exige), puis la
    // réponse `complete` qui dit au client que la fin est voulue.
    expect(texte).toContain("notifications/subscriptions/acknowledged");
    expect(texte).toContain('"resultType":"complete"');
    expect(texte.indexOf("acknowledged")).toBeLessThan(
      texte.indexOf('"resultType":"complete"'),
    );
  });

  it("n'accuse réception d'aucune notification : il n'y en aura jamais", async () => {
    const res = await POST(
      requeteModerne(8, "subscriptions/listen", {
        notifications: { toolsListChanged: true, resourcesListChanged: true },
      }),
    );
    const { texte } = await lireJusquauBout(res);
    const ack = texte
      .split("\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => JSON.parse(l.slice(6)))
      .find((m) => m.method === "notifications/subscriptions/acknowledged");
    expect(ack?.params?.notifications).toEqual({});
  });

  it("n'annonce pas listChanged : la liste des outils ne change pas", async () => {
    const res = await POST(requeteModerne(9, "server/discover"));
    const { texte } = await lireJusquauBout(res);
    expect(texte).toContain('"tools":{"listChanged":false}');
  });
});

describe("chaque échange se termine", () => {
  it("tools/call (2026-07-28) : réponse close", async () => {
    const res = await POST(
      requeteModerne(
        10,
        "tools/call",
        { name: "fiche_etablissement", arguments: {} },
        "fiche_etablissement",
      ),
    );
    const { ms, ouverte } = await lireJusquauBout(res);
    console.info(`[mesure] tools/call moderne ouverte ${Math.round(ms)} ms`);
    expect(ouverte).toBe(false);
  });

  it("initialize puis tools/call (2025) : réponses closes", async () => {
    const init = await POST(
      requeteLegacy({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      }),
    );
    const i = await lireJusquauBout(init);
    console.info(`[mesure] initialize 2025 ouverte ${Math.round(i.ms)} ms`);
    expect(i.ouverte).toBe(false);

    const appel = await POST(
      requeteLegacy({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "verifications", arguments: {} },
      }),
    );
    const a = await lireJusquauBout(appel);
    console.info(`[mesure] tools/call 2025 ouverte ${Math.round(a.ms)} ms`);
    expect(a.ouverte).toBe(false);
    expect(a.texte).toContain("Café du Port");
  });

  it("GET et DELETE : 405, pas de flux serveur → client", async () => {
    const get = await GET(
      new Request(URL_MCP, {
        method: "GET",
        headers: { host: "rojer.test", accept: "text/event-stream" },
      }),
    );
    expect(get.status).toBe(405);
    const del = await DELETE(
      new Request(URL_MCP, { method: "DELETE", headers: { host: "rojer.test" } }),
    );
    expect(del.status).toBe(405);
  });
});

/** Le résultat JSON-RPC d'un échange, qu'il arrive en JSON ou en SSE. */
async function resultat(res: Response) {
  const { texte } = await lireJusquauBout(res);
  const brut = texte.trimStart().startsWith("{")
    ? texte
    : texte
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6))
        .pop() ?? "{}";
  return JSON.parse(brut);
}

const appel = (id: number, name: string, args: Record<string, unknown>) =>
  POST(requeteModerne(id, "tools/call", { name, arguments: args }, name));

describe("établissement introuvable (MCP_ETABLISSEMENT_ID supprimé)", () => {
  it("répond tout de suite, en erreur d'outil, sans rien lire d'autre", async () => {
    prismaMock.etablissement.findUnique.mockResolvedValue(null);
    const debut = performance.now();
    const r = await resultat(await appel(20, "verifications", {}));
    const ms = performance.now() - debut;
    console.info(`[mesure] établissement introuvable : ${Math.round(ms)} ms`);

    expect(r.result?.isError).toBe(true);
    expect(r.result?.content?.[0]?.text).toContain(
      "Établissement introuvable pour ce connecteur",
    );
    // Une seule lecture — le nom — et le calendrier n'est pas interrogé.
    expect(prismaMock.etablissement.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.verification.findMany).not.toHaveBeenCalled();
  });
});

describe("entrées refusées", () => {
  it("un etablissementId fourni par le client est refusé, pas ignoré", async () => {
    const r = await resultat(
      await appel(21, "fiche_etablissement", { etablissementId: "autre" }),
    );
    expect(r.result?.isError ?? Boolean(r.error)).toBe(true);
    expect(prismaMock.etablissement.findUnique).not.toHaveBeenCalled();
  });

  it("un filtre de recherche démesuré est refusé", async () => {
    const r = await resultat(
      await appel(22, "verifications", { recherche: "x".repeat(201) }),
    );
    expect(r.result?.isError ?? Boolean(r.error)).toBe(true);
    expect(prismaMock.verification.findMany).not.toHaveBeenCalled();
  });

  it("le schéma annoncé ferme les propriétés (additionalProperties: false)", async () => {
    const r = await resultat(await POST(requeteModerne(23, "tools/list")));
    const fiche = r.result.tools.find(
      (t: { name: string }) => t.name === "fiche_etablissement",
    );
    expect(fiche.inputSchema.additionalProperties).toBe(false);
  });
});

describe("plafond de la plateforme", () => {
  it("la route déclare un maxDuration borné", () => {
    expect(route.maxDuration).toBeGreaterThan(0);
    expect(route.maxDuration).toBeLessThanOrEqual(60);
  });

  it("la route OAuth aussi", async () => {
    const oauth = await import("@/app/api/mcp/route");
    expect(oauth.maxDuration).toBeGreaterThan(0);
    expect(oauth.maxDuration).toBeLessThanOrEqual(60);
  });
});
