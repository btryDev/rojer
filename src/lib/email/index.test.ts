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
