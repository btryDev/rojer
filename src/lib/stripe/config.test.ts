import { describe, expect, it } from "vitest";
import { configurationStripe, etatStripe } from "./config";

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
  ...(cle === undefined ? {} : { STRIPE_SECRET_KEY: cle }),
  ...(wh === undefined ? {} : { STRIPE_WEBHOOK_SECRET: wh }),
});

describe("configurationStripe", () => {
  it("rien de posé : désactivée sciemment, sans motif", () => {
    expect(configurationStripe(DEV)).toEqual({ active: false, motif: null });
    expect(configurationStripe(avec(PROD, "  ", ""))).toEqual({ active: false, motif: null });
  });

  it("une clé de test en développement et en préversion", () => {
    expect(configurationStripe(avec(DEV, TEST, WH))).toEqual({
      active: true,
      cle: TEST,
      secretWebhook: WH,
      mode: "test",
    });
    expect(configurationStripe(avec(PREVIEW, TEST_RESTREINTE, WH))).toMatchObject({ active: true, mode: "test" });
    expect(configurationStripe(avec(INDETERMINE, TEST, WH))).toMatchObject({ active: true, mode: "test" });
  });

  it("une clé de production seulement en production déclarée, et restreinte", () => {
    expect(configurationStripe(avec(PROD, LIVE_RESTREINTE, WH))).toMatchObject({ active: true, mode: "live" });

    for (const env of [DEV, PREVIEW, INDETERMINE]) {
      const r = configurationStripe(avec(env, LIVE_RESTREINTE, WH));
      expect(r).toMatchObject({ active: false });
      expect(r.active || r.motif).toMatch(/production déclarée/);
    }
    // Le `.env` de production copié sur un poste : APP_ENV dit production,
    // le serveur n'en est pas un (`next dev`).
    const copieSurUnPoste = configurationStripe(avec({ NODE_ENV: "development", APP_ENV: "production" }, LIVE_RESTREINTE, WH));
    expect(copieSurUnPoste.active || copieSurUnPoste.motif).toMatch(/production déclarée/);

    const nonRestreinte = configurationStripe(avec(PROD, LIVE, WH));
    expect(nonRestreinte.active || nonRestreinte.motif).toMatch(/non restreinte/);
  });

  it("jamais une clé de test en production", () => {
    for (const cle of [TEST, TEST_RESTREINTE]) {
      const r = configurationStripe(avec(PROD, cle, WH));
      expect(r.active || r.motif).toMatch(/de test refusée en production/);
    }
  });

  it("la clé et le secret du webhook vont par deux", () => {
    const sansSecret = configurationStripe(avec(DEV, TEST));
    expect(sansSecret.active || sansSecret.motif).toMatch(/STRIPE_WEBHOOK_SECRET absente/);
    const sansCle = configurationStripe(avec(DEV, undefined, WH));
    expect(sansCle.active || sansCle.motif).toMatch(/STRIPE_SECRET_KEY absente/);
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
      const r = configurationStripe(env);
      expect(r.active).toBe(false);
      for (const valeur of [TEST, LIVE, LIVE_RESTREINTE, WH, "pk_test_abc", "pas-un-whsec"]) {
        expect(r.active || r.motif).not.toContain(valeur);
      }
    }
  });
});
