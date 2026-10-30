import { describe, expect, it, vi } from "vitest";
import {
  ESSAIS_ENVOI_MAX,
  ErreurEnvoiMail,
  URL_ENVOI_MAILPACE,
  creerPiloteMailpace,
} from "./mailpace";

// Le pilote Mailpace contre une API simulée : aucun envoi réel n'a lieu dans
// les tests (jamais d'adresse btry.fr, jamais de clé réelle).

const CLE = "cle-de-test-ne-pas-utiliser";
const MESSAGE = { to: "destinataire@exemple-externe.fr", subject: "Sujet", text: "Corps" };

type Appel = { url: string; init: RequestInit };

function apiSimulee(reponses: Array<Response | Error>) {
  const appels: Appel[] = [];
  const fetchSimule = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    appels.push({ url: String(url), init: init ?? {} });
    const r = reponses.shift();
    if (!r) throw new Error("plus de réponse simulée");
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  const pilote = creerPiloteMailpace({
    cle: CLE,
    expediteur: "Rojer <no-reply@rojer.fr>",
    fetch: fetchSimule,
    attendre: async () => {},
  });
  return { pilote, appels };
}

const ok = () => new Response(JSON.stringify({ id: 1, status: "queued" }), { status: 200 });
const refus = (statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status: statut });
const entetes = (a: Appel) => new Headers(a.init.headers);

describe("pilote Mailpace — la requête", () => {
  it("POST sur l'URL documentée, JSON, clé dans MailPace-Server-Token", async () => {
    const { pilote, appels } = apiSimulee([ok()]);
    await pilote.send(MESSAGE);

    expect(appels).toHaveLength(1);
    expect(appels[0].url).toBe(URL_ENVOI_MAILPACE);
    expect(appels[0].init.method).toBe("POST");
    const h = entetes(appels[0]);
    expect(h.get("MailPace-Server-Token")).toBe(CLE);
    expect(h.get("Content-Type")).toBe("application/json");
    expect(h.get("Accept")).toBe("application/json");
    expect(h.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("l'expéditeur vient de la configuration, pas de l'appelant ; pas de htmlbody sans HTML", async () => {
    const { pilote, appels } = apiSimulee([ok()]);
    await pilote.send(MESSAGE);
    expect(JSON.parse(String(appels[0].init.body))).toEqual({
      from: "Rojer <no-reply@rojer.fr>",
      to: MESSAGE.to,
      subject: "Sujet",
      textbody: "Corps",
    });
  });

  it("deux messages, deux clés d'idempotence différentes", async () => {
    const { pilote, appels } = apiSimulee([ok(), ok()]);
    await pilote.send(MESSAGE);
    await pilote.send(MESSAGE);
    expect(entetes(appels[0]).get("Idempotency-Key")).not.toBe(
      entetes(appels[1]).get("Idempotency-Key"),
    );
  });
});

describe("pilote Mailpace — un seul destinataire", () => {
  it.each([
    ["une liste", "a@exemple.fr, b@exemple.fr"],
    ["un point-virgule", "a@exemple.fr;b@exemple.fr"],
    ["un nom et une adresse", "Jean <a@exemple.fr>"],
    ["un saut de ligne", "a@exemple.fr\nBcc: b@exemple.fr"],
    ["pas d'adresse", "pas-une-adresse"],
  ])("refuse %s, sans appeler l'API", async (_, to) => {
    const { pilote, appels } = apiSimulee([ok()]);
    await expect(pilote.send({ ...MESSAGE, to })).rejects.toBeInstanceOf(ErreurEnvoiMail);
    expect(appels).toHaveLength(0);
  });
});

describe("pilote Mailpace — erreurs et second essai", () => {
  it("429 puis 200 : un second essai, avec la MÊME clé d'idempotence", async () => {
    const { pilote, appels } = apiSimulee([
      refus(429, { error: "You are sending emails too quickly" }),
      ok(),
    ]);
    await pilote.send(MESSAGE);
    expect(appels).toHaveLength(2);
    expect(entetes(appels[1]).get("Idempotency-Key")).toBe(entetes(appels[0]).get("Idempotency-Key"));
  });

  it("réseau coupé puis 200 : un second essai", async () => {
    const { pilote, appels } = apiSimulee([new TypeError("fetch failed"), ok()]);
    await pilote.send(MESSAGE);
    expect(appels).toHaveLength(2);
  });

  it("500 deux fois : ErreurEnvoiMail après le nombre d'essais prévu", async () => {
    const { pilote, appels } = apiSimulee([
      new Response(null, { status: 500 }),
      new Response(null, { status: 500 }),
    ]);
    const e = await pilote.send(MESSAGE).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurEnvoiMail);
    expect((e as ErreurEnvoiMail).statut).toBe(500);
    expect(appels).toHaveLength(ESSAIS_ENVOI_MAX);
  });

  it.each([
    [400, { error: "Invalid API Token" }],
    [403, { error: "Domain DKIM DNS not verified, please complete DKIM Verification" }],
    [400, { errors: { to: ["contains a blocked address"] } }],
  ])("%i : pas de second essai, le motif court de Mailpace", async (statut, corps) => {
    const { pilote, appels } = apiSimulee([refus(statut, corps), ok()]);
    const e = (await pilote.send(MESSAGE).catch((x: unknown) => x)) as ErreurEnvoiMail;
    expect(e).toBeInstanceOf(ErreurEnvoiMail);
    expect(e.statut).toBe(statut);
    expect(e.message).toMatch(new RegExp(`HTTP ${statut}`));
    expect(appels).toHaveLength(1);
  });

  it("l'erreur ne porte ni la clé, ni l'adresse, ni le contenu", async () => {
    const { pilote } = apiSimulee([
      refus(400, { errors: { to: ["is invalid"] } }),
    ]);
    const e = (await pilote.send(MESSAGE).catch((x: unknown) => x)) as ErreurEnvoiMail;
    expect(e.message).not.toContain(CLE);
    expect(e.message).not.toContain(MESSAGE.to);
    expect(e.message).not.toContain("Corps");
  });
});
