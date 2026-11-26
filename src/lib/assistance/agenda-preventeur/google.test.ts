import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { configurationGoogle, creerEvenement, listerEvenements, modifierEvenement, oublierLeJeton, ErreurGoogle } = await import(
  "./google"
);

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const cleJson = { client_email: "robot@projet.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
const env = { AGENDA_GOOGLE_ID: "agenda@group.calendar.google.com", AGENDA_GOOGLE_CLE: Buffer.from(JSON.stringify(cleJson)).toString("base64") };
const config = configurationGoogle(env)!;
const fenetre = { depuis: new Date("2026-12-01T00:00:00Z"), jusqua: new Date("2027-01-01T00:00:00Z") };

type Appel = { url: string; init?: RequestInit };
let appels: Appel[] = [];
const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });
function fauxGoogle(reponses: ((a: Appel) => Response)[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const a = { url: String(url), init };
      appels.push(a);
      if (a.url.startsWith("https://oauth2.googleapis.com/token")) return json({ access_token: "jeton", expires_in: 3600 });
      const r = reponses.shift();
      if (!r) throw new Error("appel imprévu");
      return r(a);
    }),
  );
}
const ev = (id: string, debut: string, fin: string, extra: object = {}) => ({
  id,
  etag: `"${id}"`,
  summary: "Dispo",
  start: { dateTime: debut },
  end: { dateTime: fin },
  ...extra,
});

beforeEach(() => {
  appels = [];
  oublierLeJeton();
});
afterEach(() => vi.unstubAllGlobals());

describe("configurationGoogle", () => {
  it("hors service sans agenda ou sans clé", () => {
    expect(configurationGoogle({})).toBeNull();
    expect(configurationGoogle({ AGENDA_GOOGLE_ID: "x" })).toBeNull();
  });
  it("une clé illisible lève, sans la recopier", () => {
    expect(() => configurationGoogle({ AGENDA_GOOGLE_ID: "x", AGENDA_GOOGLE_CLE: "pas-du-json" })).toThrow(ErreurGoogle);
  });
});

describe("listerEvenements", () => {
  it("lit toutes les pages, occurrences dépliées, et ignore « toute la journée » et annulés", async () => {
    fauxGoogle([
      () =>
        json({
          items: [ev("a1", "2026-12-02T09:00:00Z", "2026-12-02T10:00:00Z"), { id: "jour", etag: "x", start: { date: "2026-12-03" }, end: { date: "2026-12-04" } }],
          nextPageToken: "p2",
        }),
      () => json({ items: [ev("b2", "2026-12-05T09:00:00+01:00", "2026-12-05T10:00:00+01:00"), ev("c3", "2026-12-06T09:00:00Z", "2026-12-06T10:00:00Z", { status: "cancelled" })] }),
    ]);
    const lus = await listerEvenements(config, fenetre);
    expect(lus.map((e) => [e.id, e.debut.toISOString()])).toEqual([
      ["a1", "2026-12-02T09:00:00.000Z"],
      ["b2", "2026-12-05T08:00:00.000Z"],
    ]);
    const q = new URL(appels[1].url).searchParams;
    expect(q.get("singleEvents")).toBe("true");
    expect(new URL(appels[2].url).searchParams.get("pageToken")).toBe("p2");
    expect(appels[1].init?.headers).toMatchObject({ Authorization: "Bearer jeton" });
  });

  it("une page en erreur fait échouer toute la lecture : rien n'est réconcilié sur une liste partielle", async () => {
    fauxGoogle([() => json({ items: [ev("a1", "2026-12-02T09:00:00Z", "2026-12-02T10:00:00Z")], nextPageToken: "p2" }), () => json({}, 500)]);
    await expect(listerEvenements(config, fenetre)).rejects.toThrow(ErreurGoogle);
  });

  it("un événement de forme inattendue fait échouer la lecture", async () => {
    fauxGoogle([() => json({ items: [{ id: "a b", etag: "x", start: {}, end: {} }] })]);
    await expect(listerEvenements(config, fenetre)).rejects.toThrow(ErreurGoogle);
  });

  it("un jeton refusé fait échouer la lecture", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "invalid_grant" }, 400)));
    await expect(listerEvenements(config, fenetre)).rejects.toThrow("jeton du compte de service refusé");
  });
});

describe("modifierEvenement et creerEvenement", () => {
  it("modifie sous condition (If-Match), sans notification", async () => {
    fauxGoogle([() => json({})]);
    const debut = new Date("2026-12-02T09:00:00Z");
    const fin = new Date("2026-12-02T10:00:00Z");
    expect(await modifierEvenement(config, { id: "a1", etag: '"e1"' }, { titre: "Dispo", debut, fin })).toBe(true);
    const a = appels[1];
    expect(a.url).toContain("/events/a1?sendUpdates=none");
    expect(a.init?.method).toBe("PATCH");
    expect(a.init?.headers).toMatchObject({ "If-Match": '"e1"' });
    expect(JSON.parse(String(a.init?.body))).toEqual({ summary: "Dispo", start: { dateTime: debut.toISOString() }, end: { dateTime: fin.toISOString() } });
  });

  it("un événement changé depuis la lecture (412) n'est pas écrasé", async () => {
    fauxGoogle([() => json({}, 412)]);
    expect(await modifierEvenement(config, { id: "a1", etag: '"vieux"' }, { titre: "Dispo" })).toBe(false);
  });

  it("crée sans invité ni notification et rend l'identifiant", async () => {
    fauxGoogle([() => json({ id: "nouveau1" })]);
    const id = await creerEvenement(config, { titre: "Dispo", debut: new Date("2026-12-02T10:00:00Z"), fin: new Date("2026-12-02T11:00:00Z") });
    expect(id).toBe("nouveau1");
    expect(appels[1].url).toContain("/events?sendUpdates=none");
    expect(JSON.parse(String(appels[1].init?.body))).not.toHaveProperty("attendees");
  });
});
