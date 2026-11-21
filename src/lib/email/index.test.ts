import { afterEach, describe, expect, it, vi } from "vitest";

// Le prédicat et le driver lisent la MÊME règle (`refusDuDriver`) : ce test
// les confronte sur chaque environnement, pour qu'une demande de signature ne
// passe jamais le prédicat et lève ensuite à l'envoi (C38, 2026-09-26).

vi.mock("./dev-outbox", () => ({ capturerMail: vi.fn() }));

async function charger() {
  vi.resetModules();
  return import("./index");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("envoiEnService — l'envoi se sait hors service avant d'écrire", () => {
  it("en production sans driver réel : non, et le driver lève", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_DRIVER", "");
    const m = await charger();
    // `EMAIL_DRIVER` vide n'est pas absent : il se lit comme un nom inconnu.
    expect(m.envoiEnService()).toBe(false);
    expect(() => m.getEmailDriver()).toThrow();
  });

  it("en production, driver « console » par défaut : non, et le driver lève", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.EMAIL_DRIVER;
    const m = await charger();
    expect(m.envoiEnService()).toBe(false);
    expect(() => m.getEmailDriver()).toThrow(/« console » en production/);
  });

  it("un driver nommé mais non implémenté : non, en production comme en développement", async () => {
    for (const env of ["production", "development"]) {
      vi.stubEnv("NODE_ENV", env);
      vi.stubEnv("EMAIL_DRIVER", "resend");
      const m = await charger();
      expect(m.envoiEnService(), env).toBe(false);
      expect(() => m.getEmailDriver(), env).toThrow(/non supporté/);
    }
  });

  it("en développement : oui, et le message va à la console — comportement inchangé", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.EMAIL_DRIVER;
    const m = await charger();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(m.envoiEnService()).toBe(true);
    await m.sendMail({ to: "a@exemple.test", subject: "s", text: "t" });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("sendMail — pièces jointes (2026-11-19)", () => {
  const PIECE = {
    name: "Plan_prevention_PP-001.pdf",
    content: Buffer.alloc(3 * 1024).toString("base64"),
    contentType: "application/pdf",
  };

  it("console : la pièce est nommée avec sa taille, jamais imprimée, et la boîte de dev la garde", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.EMAIL_DRIVER;
    const m = await charger();
    const outbox = await import("./dev-outbox");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await m.sendMail({ to: "a@exemple.test", subject: "s", text: "t", attachments: [PIECE] });
    const imprime = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(imprime).toContain("Pièce jointe : Plan_prevention_PP-001.pdf (3 Ko)");
    expect(imprime).not.toContain(PIECE.content.slice(0, 40));
    expect(outbox.capturerMail).toHaveBeenCalledWith(
      expect.objectContaining({ piecesJointes: ["Plan_prevention_PP-001.pdf (3 Ko)"] }),
    );
    log.mockRestore();
  });

  async function avecMailpace(reponses: Response[]) {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_DRIVER", "mailpace");
    vi.stubEnv("MAILPACE_API_KEY", "cle-de-test");
    const corps: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        corps.push(JSON.parse(String(init?.body)));
        return reponses.shift() ?? new Response("{}", { status: 200 });
      }),
    );
    return { m: await charger(), corps };
  }

  it("Mailpace refuse la pièce (4xx) : le message repart sans elle, et le journal le dit", async () => {
    const { m, corps } = await avecMailpace([
      new Response(JSON.stringify({ errors: { attachments: ["invalid"] } }), { status: 400 }),
      new Response("{}", { status: 200 }),
    ]);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await m.sendMail({ to: "a@exemple.test", subject: "s", text: "t", attachments: [PIECE] });
    expect(corps).toHaveLength(2);
    expect(corps[0]).toHaveProperty("attachments");
    expect(corps[1]).not.toHaveProperty("attachments");
    expect(corps[1].textbody).toBe("t");
    expect(String(err.mock.calls[0]?.[0])).toMatch(/pièce jointe refusée.*Plan_prevention_PP-001\.pdf/);
    err.mockRestore();
    vi.unstubAllGlobals();
  });

  it("un refus de la clé (401) n'est pas celui de la pièce : il remonte, sans second envoi", async () => {
    const { m, corps } = await avecMailpace([
      new Response(JSON.stringify({ error: "Invalid API Token" }), { status: 401 }),
    ]);
    await expect(
      m.sendMail({ to: "a@exemple.test", subject: "s", text: "t", attachments: [PIECE] }),
    ).rejects.toThrow(/401/);
    expect(corps).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

describe("publicAppUrl — pas de localhost en production (audit du 2026-10-12, B7)", () => {
  it("en production sans PUBLIC_APP_URL : refus nommé, et la lecture lève", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "");
    const m = await charger();
    expect(m.refusUrlPublique()).toMatch(/PUBLIC_APP_URL/);
    expect(() => m.publicAppUrl()).toThrow(/PUBLIC_APP_URL/);
  });

  it("en production avec PUBLIC_APP_URL : l'adresse, sans refus", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "https://app.exemple.test");
    const m = await charger();
    expect(m.refusUrlPublique()).toBeNull();
    expect(m.publicAppUrl()).toBe("https://app.exemple.test");
  });

  it("sans « / » final : chaque appelant ajoute le sien", async () => {
    // Tous les appelants écrivent `${publicAppUrl()}/…` : une variable posée
    // avec un « / » final donnait `//auth/callback` dans les liens envoyés.
    vi.stubEnv("PUBLIC_APP_URL", "https://app.exemple.test//");
    const m = await charger();
    expect(m.publicAppUrl()).toBe("https://app.exemple.test");
  });

  it("en développement, le repli sur localhost reste", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PUBLIC_APP_URL", "");
    const m = await charger();
    expect(m.refusUrlPublique()).toBeNull();
    expect(m.publicAppUrl()).toBe("http://localhost:3000");
  });
});

describe("pilote Mailpace (2026-10-30)", () => {
  it("sans clé : hors service avant toute écriture, et le driver lève", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_DRIVER", "mailpace");
    vi.stubEnv("MAILPACE_API_KEY", "");
    const m = await charger();
    expect(m.envoiEnService()).toBe(false);
    expect(() => m.getEmailDriver()).toThrow(/MAILPACE_API_KEY/);
  });

  it("avec sa clé : en service, en production comme en développement", async () => {
    for (const env of ["production", "development"]) {
      vi.stubEnv("NODE_ENV", env);
      vi.stubEnv("EMAIL_DRIVER", "mailpace");
      vi.stubEnv("MAILPACE_API_KEY", "cle-de-test");
      const m = await charger();
      expect(m.envoiEnService()).toBe(true);
      expect(() => m.getEmailDriver()).not.toThrow();
    }
  });

  it("l'expéditeur par défaut est celui de rojer.fr, la variable l'emporte", async () => {
    delete process.env.SIGNATURE_MAIL_FROM;
    expect((await charger()).mailFrom()).toBe("Rojer <no-reply@rojer.fr>");
    vi.stubEnv("SIGNATURE_MAIL_FROM", "Autre <contact@exemple.fr>");
    expect((await charger()).mailFrom()).toBe("Autre <contact@exemple.fr>");
  });
});
