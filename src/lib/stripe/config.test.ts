import { describe, expect, it } from "vitest";
import { configurationStripe, etatStripe, horlogeDeTestActive } from "./config";

// Valeurs volontairement courtes et fausses : rien qu'un détecteur de secrets
// puisse prendre pour une vraie clé.
const TEST = "sk_test_abc";
const TEST_RESTREINTE = "rk_test_abc";
const LIVE = "sk_live_abc";
const LIVE_RESTREINTE = "rk_live_abc";
const WH = "whsec_abc";

const DEV = { NODE_ENV: "development" };
const PREVIEW = { NODE_ENV: "production", APP_ENV: "preview" };
const PROD = { NODE_ENV: "production", APP_ENV: "production" };
/** Un serveur de production qui ne dit pas ce qu'il est : indéterminé, pas production. */
const INDETERMINE = { NODE_ENV: "production" };

const avec = (env: Record<string, string>, cle?: string, wh?: string) => ({
  ...env,
  STRIPE_SECRET_KEY: cle,
  STRIPE_WEBHOOK_SECRET: wh,
});

/** Le motif d'un refus (`undefined` si la configuration est active). */
const motifDe = (env: Record<string, string | undefined>) => {
  const r = configurationStripe(env);
  return r.active ? undefined : r.motif;
};

describe("configurationStripe", () => {
  it("rien de posé : désactivée sciemment, sans motif", () => {
    expect(configurationStripe(DEV)).toEqual({ active: false, motif: null });
    expect(configurationStripe(avec(PROD, "  ", ""))).toEqual({ active: false, motif: null });
  });

  it("une clé de test en développement et en préversion déclarés", () => {
    expect(configurationStripe(avec(DEV, TEST, WH))).toEqual({
      active: true,
      cle: TEST,
      secretWebhook: WH,
      mode: "test",
    });
    expect(configurationStripe(avec(PREVIEW, TEST_RESTREINTE, WH))).toMatchObject({ active: true, mode: "test" });

  });

  it("une clé de production seulement en production déclarée, et restreinte", () => {
    expect(configurationStripe(avec(PROD, LIVE_RESTREINTE, WH))).toMatchObject({ active: true, mode: "live" });

    for (const env of [DEV, PREVIEW, INDETERMINE]) {
      expect(motifDe(avec(env, LIVE_RESTREINTE, WH))).toMatch(/production déclarée/);
    }
    // Le `.env` de production copié sur un poste : APP_ENV dit production,
    // le serveur n'en est pas un (`next dev`).
    const copieSurUnPoste = { NODE_ENV: "development", APP_ENV: "production" };
    expect(motifDe(avec(copieSurUnPoste, LIVE_RESTREINTE, WH))).toMatch(/production déclarée/);

    expect(motifDe(avec(PROD, LIVE, WH))).toMatch(/non restreinte/);
  });

  it("jamais une clé de test en production, ni sur un serveur qui ne dit pas ce qu'il est", () => {
    // Une mise en ligne sans APP_ENV ouvrait les abonnements en mode test sur
    // le vrai site (revue de code du socle).
    expect(motifDe(avec(INDETERMINE, TEST, WH))).toMatch(/ne déclare pas son environnement/);
    for (const cle of [TEST, TEST_RESTREINTE]) {
      expect(motifDe(avec(PROD, cle, WH))).toMatch(/de test refusée en production/);
    }
  });

  it("la clé et le secret du webhook vont par deux", () => {
    expect(motifDe(avec(DEV, TEST))).toMatch(/STRIPE_WEBHOOK_SECRET absente/);
    expect(motifDe(avec(DEV, undefined, WH))).toMatch(/STRIPE_SECRET_KEY absente/);
  });

  it("refuse une forme inconnue", () => {
    expect(configurationStripe(avec(DEV, "pk_test_abc", WH)).active).toBe(false);
    expect(configurationStripe(avec(DEV, TEST, "pas-un-whsec")).active).toBe(false);
  });

  it("retire les espaces autour des valeurs (copier-coller)", () => {
    expect(configurationStripe(avec(DEV, ` ${TEST}\n`, `${WH} `))).toMatchObject({ active: true, cle: TEST, secretWebhook: WH });
  });

  it("etatStripe rend la décision sans aucun secret", () => {
    const etat = etatStripe(avec(DEV, TEST, WH));
    expect(etat).toEqual({ active: true, mode: "test" });
    expect(JSON.stringify(etat)).not.toContain(TEST);
    expect(JSON.stringify(etat)).not.toContain(WH);
    expect(etatStripe(avec(PROD, TEST, WH))).toMatchObject({ active: false, motif: expect.stringMatching(/de test/) });
  });

  it("ne cite jamais une valeur dans un motif", () => {
    const cas = [
      avec(PROD, TEST, WH),
      avec(DEV, LIVE_RESTREINTE, WH),
      avec(PROD, LIVE, WH),
      avec(DEV, "pk_test_abc", WH),
      avec(DEV, TEST, "pas-un-whsec"),
      avec(DEV, TEST),
    ];
    for (const env of cas) {
      const motif = motifDe(env);
      expect(motif).toEqual(expect.any(String));
      for (const valeur of [TEST, LIVE, LIVE_RESTREINTE, WH, "pk_test_abc", "pas-un-whsec"]) {
        expect(motif).not.toContain(valeur);
      }
    }
  });
});

describe("horlogeDeTestActive (2026-11-16)", () => {
  const horloge = { STRIPE_HORLOGE_TEST: "oui" };
  it("clé de test, hors production, variable à oui : active", () => {
    expect(horlogeDeTestActive({ ...avec(PREVIEW, TEST, WH), ...horloge })).toBe(true);
    expect(horlogeDeTestActive({ ...avec(DEV, TEST_RESTREINTE, WH), STRIPE_HORLOGE_TEST: " OUI " })).toBe(true);
  });
  it("sans la variable, avec une clé de production, en production, ou Stripe refusé : jamais", () => {
    expect(horlogeDeTestActive(avec(PREVIEW, TEST, WH))).toBe(false);
    expect(horlogeDeTestActive({ ...avec(PREVIEW, TEST, WH), STRIPE_HORLOGE_TEST: "non" })).toBe(false);
    expect(horlogeDeTestActive({ ...avec(PROD, LIVE_RESTREINTE, WH), ...horloge })).toBe(false);
    expect(horlogeDeTestActive({ ...avec(PROD, TEST, WH), ...horloge })).toBe(false);
    expect(horlogeDeTestActive({ ...avec(INDETERMINE, TEST, WH), ...horloge })).toBe(false);
    expect(horlogeDeTestActive({ ...avec(PREVIEW), ...horloge })).toBe(false);
  });
});
