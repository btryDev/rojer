import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { clientStripe, clientStripeWebhook, OPTIONS_WEBHOOK } from "./client";

const config = { active: true, cle: "sk_test_client", mode: "test" } as unknown as Parameters<typeof clientStripe>[0];
const reglages = (s: ReturnType<typeof clientStripe>) => ({
  timeout: (s as unknown as { _api: { timeout: number } })._api.timeout,
  relances: s.getMaxNetworkRetries(),
});

describe("les clients Stripe", () => {
  it("le webhook a son propre client, aux réglages d'OPTIONS_WEBHOOK : tout ce qu'il appelle en hérite", () => {
    expect(reglages(clientStripeWebhook(config))).toEqual({ timeout: OPTIONS_WEBHOOK.timeout, relances: 0 });
    expect(clientStripeWebhook(config)).toBe(clientStripeWebhook(config));
  });

  it("le client des gestes de l'utilisateur garde 10 s et deux relances", () => {
    expect(reglages(clientStripe(config))).toEqual({ timeout: 10_000, relances: 2 });
    expect(clientStripe(config)).not.toBe(clientStripeWebhook(config));
  });

  it("la route du webhook prend ce client-là, jamais l'autre", () => {
    const route = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
    expect(route).toMatch(/clientStripeWebhook\(config\)/);
    expect(route).not.toMatch(/\bclientStripe\(/);
  });
});
