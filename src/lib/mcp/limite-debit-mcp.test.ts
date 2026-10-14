import { beforeEach, describe, expect, it, vi } from "vitest";
import { creerHandlerMcpHttp } from "./http";

/**
 * Limitation de débit du serveur MCP (audit OWASP B3 / B14, 2026-10-14) :
 * par IP AVANT l'authentification, par portée APRÈS ; un refus est un 429
 * avec `Retry-After`, et l'authentification n'est pas appelée.
 */

const h = vi.hoisted(() => ({
  refuser: new Set<string>(),
  cles: [] as string[],
}));

vi.mock("@/lib/securite/limite-debit", async (original) => ({
  ...(await original<typeof import("@/lib/securite/limite-debit")>()),
  consommer: async (demandes: { cle: string }[]) => {
    const cle = demandes[0].cle;
    h.cles.push(cle);
    const dimension = cle.split(":")[1];
    return h.refuser.has(dimension) ? { ok: false, reessayerDansSecondes: 42 } : { ok: true };
  },
}));

vi.mock("./prisma", () => ({ prismaMcp: {} }));

const resoudreScope = vi.fn(async () => ({
  statut: "ok" as const,
  scope: { etablissementId: "etab_1" },
}));

const handler = creerHandlerMcpHttp({
  hotesAutorises: ["rojer.test"],
  originesAutorisees: [],
  resoudreScope,
});

function requete(xff?: string): Request {
  return new Request("https://rojer.test/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "rojer.test",
      ...(xff ? { "x-forwarded-for": xff } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
}

beforeEach(() => {
  h.refuser.clear();
  h.cles = [];
  resoudreScope.mockClear();
});

describe("MCP : limitation de débit", () => {
  it("au-delà de la limite par IP : 429 avant toute authentification", async () => {
    h.refuser.add("ip");
    const r = await handler.servir(requete("203.0.113.7"));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("42");
    expect((await r.json()).error.message).toMatch(/Trop de requêtes/);
    expect(resoudreScope).not.toHaveBeenCalled();
  });

  it("au-delà de la limite par portée : 429 après l'authentification", async () => {
    h.refuser.add("portee");
    const r = await handler.servir(requete("203.0.113.7"));
    expect(r.status).toBe(429);
    expect(resoudreScope).toHaveBeenCalledTimes(1);
    expect(h.cles.map((c) => c.split(":").slice(0, 2).join(":"))).toEqual(["mcp:ip", "mcp:portee"]);
  });

  it("sans IP lisible, seule la limite par portée s'applique", async () => {
    await handler.servir(requete());
    expect(h.cles.map((c) => c.split(":")[1])).toEqual(["portee"]);
  });
});
