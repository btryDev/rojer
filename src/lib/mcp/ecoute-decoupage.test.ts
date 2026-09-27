import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `subscriptions/listen` — la réponse ne dépend plus du découpage SSE du SDK
 * (vérification du 2026-09-27, R1).
 *
 * Le premier correctif relayait l'accusé du SDK en lisant son flux, et
 * cherchait `\n\n`. Deux découpages légaux en SSE le mettaient en défaut :
 * des fins de ligne `\r\n` (le flux restait ouvert jusqu'au plafond de la
 * plateforme) et un commentaire `:` en tête — la forme même que la
 * spécification 2026-07-28 donne au keep-alive (l'accusé était perdu).
 *
 * Ici le flux du SDK est remplacé par un flux qui NE SE TERMINE JAMAIS, dans
 * chacun des trois découpages. La réponse du serveur doit se fermer quand
 * même, vite, avec l'accusé puis la fin `complete`, et le flux du SDK doit
 * être annulé.
 */

type Decoupage = "tel_quel" | "commentaire_en_tete" | "crlf";

const etat = vi.hoisted(() => ({
  decoupage: "tel_quel" as "tel_quel" | "commentaire_en_tete" | "crlf",
  annule: false,
}));

vi.mock("./prisma", () => ({
  prismaMcp: { $on: vi.fn(), etablissement: { findUnique: vi.fn() } },
}));

vi.mock("@modelcontextprotocol/server", async (importOriginal) => {
  const reel = await importOriginal<typeof import("@modelcontextprotocol/server")>();
  const createMcpHandler: typeof reel.createMcpHandler = (factory, options) => {
    const h = reel.createMcpHandler(factory, options);
    return {
      ...h,
      fetch: async (request, opts) => {
        const ecoute = request.headers.get("mcp-method") === "subscriptions/listen";
        const reponse = await h.fetch(request, opts);
        const sse = (reponse.headers.get("content-type") ?? "").startsWith(
          "text/event-stream",
        );
        if (!ecoute || !sse) return reponse;
        await reponse.body?.cancel();
        return fluxSansFin(etat.decoupage);
      },
    };
  };
  return { ...reel, createMcpHandler };
});

/** Un flux SSE d'écoute, dans un découpage légal, qui ne se ferme jamais. */
function fluxSansFin(d: Decoupage): Response {
  const accuse = JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/subscriptions/acknowledged",
    params: { notifications: {}, _meta: { "io.modelcontextprotocol/subscriptionId": 7 } },
  });
  const nl = d === "crlf" ? "\r\n" : "\n";
  const tete = d === "commentaire_en_tete" ? `:\r\n\r\n: keepalive${nl}${nl}` : "";
  const texte = `${tete}event: message${nl}data: ${accuse}${nl}${nl}`;
  const corps = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode(texte));
      // … et plus rien : ni fermeture, ni autre trame.
    },
    cancel() {
      etat.annule = true;
    },
  });
  return new Response(corps, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

const CLE = "K7dQx2mNpR4vTzL9wYbF3sJhC6nAeU8gXtM1oPqW5rE";
process.env.MCP_CLE = CLE;
process.env.MCP_ETABLISSEMENT_ID = "etab_1";
process.env.MCP_HOTES = "rojer.test";

const { POST } = await import("@/app/api/mcp/[cle]/route");

function ecoute(id: number, params: Record<string, unknown>): Request {
  return new Request(`https://rojer.test/api/mcp/${CLE}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "rojer.test",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "subscriptions/listen",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "subscriptions/listen",
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientInfo": { name: "test", version: "1.0" },
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    }),
  });
}

/** Lit jusqu'au bout, plafond 2 s. */
async function lire(res: Response) {
  const debut = performance.now();
  const lecteur = res.body!.getReader();
  const dec = new TextDecoder();
  let texte = "";
  const plafond = new Promise<"plafond">((r) => setTimeout(() => r("plafond"), 2_000));
  for (;;) {
    const lu = await Promise.race([lecteur.read(), plafond]);
    if (lu === "plafond") {
      await lecteur.cancel().catch(() => {});
      return { texte, ms: performance.now() - debut, ouverte: true };
    }
    if (lu.done) return { texte, ms: performance.now() - debut, ouverte: false };
    texte += dec.decode(lu.value, { stream: true });
  }
}

/** Les messages d'un flux, selon la grammaire SSE (\r\n | \r | \n). */
function messages(texte: string): Array<Record<string, unknown>> {
  const sortie: Array<Record<string, unknown>> = [];
  let donnees: string[] = [];
  for (const ligne of texte.split(/\r\n|\r|\n/)) {
    if (ligne === "") {
      if (donnees.length) sortie.push(JSON.parse(donnees.join("\n")));
      donnees = [];
    } else if (ligne.startsWith("data:")) {
      donnees.push(ligne.slice(5).replace(/^ /, ""));
    }
  }
  if (donnees.length) sortie.push(JSON.parse(donnees.join("\n")));
  return sortie;
}

beforeEach(() => {
  etat.annule = false;
});

describe.each<Decoupage>(["tel_quel", "commentaire_en_tete", "crlf"])(
  "flux du SDK découpé « %s »",
  (d) => {
    it("la réponse se ferme en moins de 2 s : accusé, puis complete", async () => {
      etat.decoupage = d;
      const { texte, ms, ouverte } = await lire(
        await POST(ecoute(7, { notifications: { toolsListChanged: true } })),
      );
      expect(ouverte).toBe(false);
      expect(ms).toBeLessThan(2_000);

      const m = messages(texte);
      expect(m).toHaveLength(2);
      expect(m[0].method).toBe("notifications/subscriptions/acknowledged");
      expect(m[0].params).toEqual({
        notifications: {},
        _meta: { "io.modelcontextprotocol/subscriptionId": 7 },
      });
      expect(m[1].id).toBe(7);
      expect((m[1].result as { resultType: string }).resultType).toBe("complete");
    });

    it("le flux du SDK est annulé", async () => {
      etat.decoupage = d;
      await lire(await POST(ecoute(8, { notifications: {} })));
      expect(etat.annule).toBe(true);
    });
  },
);

describe("les validations du SDK restent en place", () => {
  it("un listen sans filtre est refusé par le SDK, et le refus passe tel quel", async () => {
    const res = await POST(ecoute(9, {}));
    expect(res.headers.get("content-type")).toContain("application/json");
    const corps = await res.json();
    expect(corps.error?.code).toBe(-32602);
    expect(corps.id).toBe(9);
  });
});
