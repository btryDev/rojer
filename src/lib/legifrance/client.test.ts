// Le client Légifrance contre des réponses simulées : aucun appel réseau.
// Les identifiants ci-dessous sont des LEURRES, choisis pour être reconnus
// s'ils fuyaient dans un message.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  configurationDepuisEnv,
  creerClientLegifrance,
  ErreurLegifrance,
  POINTS_D_ENTREE,
} from "./client";

const ID = "leurre-client-id-0000";
const SECRET = "leurre-secret-AAAA-BBBB";

type Appel = { url: string; init: RequestInit };

/** Un faux `fetch` qui répond, dans l'ordre, par les réponses données (jeton compris). */
function fauxFetch(reponses: (Response | (() => Response) | Error)[]) {
  const appels: Appel[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    appels.push({ url: String(url), init: init ?? {} });
    const r = reponses.shift();
    if (!r) throw new Error("plus de réponse simulée");
    if (r instanceof Error) throw r;
    return typeof r === "function" ? r() : r;
  }) as typeof fetch;
  return { f, appels };
}

/** Rend l'erreur d'une promesse qui DOIT échouer. */
const echec = (p: Promise<unknown>): Promise<ErreurLegifrance> =>
  p.then(
    () => {
      throw new Error("attendu : un échec");
    },
    (e: unknown) => e as ErreurLegifrance,
  );

const jeton = (valeur: string, expiresIn = 3600) =>
  new Response(JSON.stringify({ access_token: valeur, token_type: "Bearer", expires_in: expiresIn, scope: "openid" }), {
    status: 200,
  });
const ok = (corps: unknown) => new Response(JSON.stringify(corps), { status: 200 });
const statut = (s: number, corps = "", headers: Record<string, string> = {}) =>
  new Response(corps, { status: s, headers });

function horloge() {
  let t = 1_000_000;
  const attentes: number[] = [];
  return {
    maintenant: () => t,
    attendre: async (ms: number) => {
      attentes.push(ms);
      t += ms;
    },
    avancer: (ms: number) => {
      t += ms;
    },
    attentes,
  };
}

function client(reponses: Parameters<typeof fauxFetch>[0], opts: Partial<Parameters<typeof creerClientLegifrance>[0]> = {}) {
  const { f, appels } = fauxFetch(reponses);
  const h = horloge();
  const c = creerClientLegifrance({
    clientId: ID,
    clientSecret: SECRET,
    env: "sandbox",
    fetch: f,
    delaiMs: 0,
    maintenant: h.maintenant,
    attendre: h.attendre,
    ...opts,
  });
  return { c, appels, h };
}

describe("points d'entrée", () => {
  it("bac à sable et production, tels que la FAQ DILA les donne", () => {
    expect(POINTS_D_ENTREE.sandbox.jeton).toBe("https://sandbox-oauth.piste.gouv.fr/api/oauth/token");
    expect(POINTS_D_ENTREE.sandbox.api).toBe("https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app");
    expect(POINTS_D_ENTREE.production.jeton).toBe("https://oauth.piste.gouv.fr/api/oauth/token");
    expect(POINTS_D_ENTREE.production.api).toBe("https://api.piste.gouv.fr/dila/legifrance/lf-engine-app");
  });
});

describe("jeton", () => {
  it("client_credentials en formulaire, puis Bearer sur l'API ; un seul jeton pour plusieurs appels", async () => {
    const { c, appels } = client([jeton("J1"), ok({ article: { id: "LEGIARTI1" } }), ok({ article: { id: "LEGIARTI2" } })]);
    await c.getArticle("LEGIARTI1");
    await c.getArticle("LEGIARTI2");
    expect(appels.map((a) => a.url)).toEqual([
      POINTS_D_ENTREE.sandbox.jeton,
      `${POINTS_D_ENTREE.sandbox.api}/consult/getArticle`,
      `${POINTS_D_ENTREE.sandbox.api}/consult/getArticle`,
    ]);
    const corps = new URLSearchParams(String(appels[0].init.body));
    expect(corps.get("grant_type")).toBe("client_credentials");
    expect(corps.get("scope")).toBe("openid");
    expect((appels[1].init.headers as Record<string, string>).Authorization).toBe("Bearer J1");
    expect(JSON.parse(String(appels[1].init.body))).toEqual({ id: "LEGIARTI1" });
    expect(c.compteurs().jetons).toBe(1);
  });

  it("renouvelé à l'expiration (marge de 60 s), pas avant", async () => {
    const { c, appels, h } = client([jeton("J1", 3600), ok({}), ok({}), jeton("J2", 3600), ok({})]);
    await c.post("/x", {});
    h.avancer(3600_000 - 61_000);
    await c.post("/x", {});
    h.avancer(2_000); // entre dans la marge
    await c.post("/x", {});
    const bearers = appels
      .filter((a) => a.url.endsWith("/x"))
      .map((a) => (a.init.headers as Record<string, string>).Authorization);
    expect(bearers).toEqual(["Bearer J1", "Bearer J1", "Bearer J2"]);
  });

  it("un 401 de l'API renouvelle le jeton une fois, puis réessaie", async () => {
    const { c, appels } = client([jeton("J1"), statut(401), jeton("J2"), ok({ article: { id: "A" } })]);
    expect((await c.getArticle("A"))?.id).toBe("A");
    expect((appels[3].init.headers as Record<string, string>).Authorization).toBe("Bearer J2");
  });

  it("deux 401 de suite : erreur d'authentification, pas de boucle", async () => {
    const { c } = client([jeton("J1"), statut(401), jeton("J2"), statut(401)]);
    await expect(c.getArticle("A")).rejects.toMatchObject({ nature: "authentification", statut: 401 });
  });
});

describe("reprises bornées", () => {
  it("429 avec Retry-After : attend ce qui est demandé, puis réussit", async () => {
    const { c, h } = client([jeton("J"), statut(429, "", { "Retry-After": "7" }), ok({ article: { id: "A" } })]);
    expect((await c.getArticle("A"))?.id).toBe("A");
    expect(h.attentes).toContain(7000);
    expect(c.compteurs().reprises).toBe(1);
  });

  it("429 sans Retry-After : attente exponentielle 1 s, 2 s, 4 s, puis erreur « quota » au 4e essai", async () => {
    const { c, h } = client([jeton("J"), statut(429), statut(429), statut(429), statut(429)]);
    await expect(c.getArticle("A")).rejects.toMatchObject({ nature: "quota", statut: 429 });
    expect(h.attentes).toEqual([1000, 2000, 4000]);
  });

  it("503 puis 200 : repris ; 400 : jamais repris", async () => {
    const a = client([jeton("J"), statut(503), ok({ article: { id: "A" } })]);
    expect((await a.c.getArticle("A"))?.id).toBe("A");
    const b = client([jeton("J"), statut(400, "mauvaise requête"), ok({})]);
    await expect(b.c.post("/x", {})).rejects.toMatchObject({ nature: "http", statut: 400 });
    expect(b.appels).toHaveLength(2);
  });

  it("panne réseau reprise, puis erreur « reseau » qui ne recopie pas l'erreur d'origine", async () => {
    const { c } = client([jeton("J"), new Error(`boom ${SECRET}`), new Error("boom"), new Error("boom"), new Error("boom")]);
    const e = await echec(c.post("/x", {}));
    expect(e).toBeInstanceOf(ErreurLegifrance);
    expect(e.nature).toBe("reseau");
    expect(e.message).not.toContain(SECRET);
  });

  it("espace les appels du délai demandé", async () => {
    const { c, h } = client([jeton("J"), ok({}), ok({})], { delaiMs: 300 });
    await c.post("/x", {});
    await c.post("/x", {});
    expect(h.attentes).toEqual([300]);
  });

  it("404 sur getArticle : null, pas une erreur", async () => {
    const { c } = client([jeton("J"), statut(404)]);
    expect(await c.getArticle("LEGIARTI000000000000")).toBeNull();
  });
});

describe("secrets", () => {
  it("un refus de jeton qui renvoie le secret en écho ne le cite pas", async () => {
    const { c } = client([statut(400, JSON.stringify({ error: "invalid_client", echo: `${ID}:${SECRET}` }))]);
    const e = await echec(c.getArticle("A"));
    expect(e.nature).toBe("authentification");
    expect(e.message).toContain("invalid_client");
    expect(e.message).not.toContain(SECRET);
    expect(e.message).not.toContain(ID);
  });

  it("une erreur d'API qui renvoie le jeton en écho ne le cite pas", async () => {
    const { c } = client([jeton("jeton-leurre-XYZ"), statut(500, "Bearer jeton-leurre-XYZ refusé"), statut(500, "Bearer jeton-leurre-XYZ refusé"), statut(500, "Bearer jeton-leurre-XYZ refusé"), statut(500, "Bearer jeton-leurre-XYZ refusé")]);
    const e = await echec(c.post("/x", {}));
    expect(e.statut).toBe(500);
    expect(e.message).not.toContain("jeton-leurre-XYZ");
  });

  it("configuration absente : nomme la variable, jamais une valeur", () => {
    expect(() => configurationDepuisEnv({ LEGIFRANCE_CLIENT_SECRET: SECRET })).toThrow(/LEGIFRANCE_CLIENT_ID/);
    try {
      configurationDepuisEnv({ LEGIFRANCE_CLIENT_SECRET: SECRET });
    } catch (e) {
      expect(String((e as Error).message)).not.toContain(SECRET);
    }
    expect(() => configurationDepuisEnv({ LEGIFRANCE_CLIENT_ID: ID, LEGIFRANCE_CLIENT_SECRET: SECRET, LEGIFRANCE_ENV: "prod" })).toThrow(
      /sandbox.*production/,
    );
    expect(configurationDepuisEnv({ LEGIFRANCE_CLIENT_ID: ID, LEGIFRANCE_CLIENT_SECRET: SECRET }).env).toBe("sandbox");
  });
});

describe("serveur seulement", () => {
  it("refuse d'être évalué dans un navigateur", async () => {
    const g = globalThis as { window?: unknown };
    g.window = {};
    try {
      const { vi } = await import("vitest");
      vi.resetModules();
      await expect(import("./client")).rejects.toThrow(/réservé au serveur/);
    } finally {
      delete g.window;
    }
  });

  it("aucun fichier « use client » n'importe src/lib/legifrance", () => {
    const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const sources = (d: string): string[] =>
      readdirSync(d).flatMap((e) => {
        const p = join(d, e);
        return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(p) ? [p] : [];
      });
    const clients = sources(racine).filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
    expect(clients.length).toBeGreaterThan(20);
    expect(clients.filter((f) => /lib\/legifrance/.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});
