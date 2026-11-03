import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));

import {
  DUREE_ESSAI_JOURS,
  changerFormuleEssai,
  creerClientStripe,
  demarrerEssai,
  oublierLesPrix,
  ouvrirCheckout,
  prixDesFormules,
} from "./parcours";

const api = {
  customers: { create: vi.fn() },
  subscriptions: { create: vi.fn(), update: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  prices: { list: vi.fn() },
};
const stripe = api as unknown as Stripe;

beforeEach(() => {
  vi.clearAllMocks();
  oublierLesPrix();
});

describe("parcours Stripe", () => {
  it("client et essai : une clé d'idempotence chacun, dérivée du compte", async () => {
    api.customers.create.mockResolvedValue({ id: "cus_1" });
    expect(await creerClientStripe(stripe, { email: "a@b.fr", metadata: { userId: "u1" }, idempotence: "u1" })).toBe("cus_1");
    expect(api.customers.create).toHaveBeenCalledWith({ email: "a@b.fr", metadata: { userId: "u1" } }, { idempotencyKey: "client-u1" });

    api.subscriptions.create.mockResolvedValue({ id: "sub_1" });
    await demarrerEssai(stripe, { customerId: "cus_1", priceId: "price_e", metadata: { userId: "u1" }, idempotence: "u1" });
    const [params, options] = api.subscriptions.create.mock.calls[0];
    expect(options).toEqual({ idempotencyKey: "essai-u1" });
    expect(params).toMatchObject({
      customer: "cus_1",
      items: [{ price: "price_e" }],
      trial_period_days: DUREE_ESSAI_JOURS,
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      metadata: { userId: "u1" },
    });
    expect(DUREE_ESSAI_JOURS).toBe(30);
  });

  it("changer de formule pendant l'essai ne proratise rien et ne touche pas à la fin de l'essai", async () => {
    await changerFormuleEssai(stripe, { subscriptionId: "sub_1", itemId: "si_1", priceId: "price_p" });
    const [, params] = api.subscriptions.update.mock.calls[0];
    expect(params).toEqual({ items: [{ id: "si_1", price: "price_p" }], proration_behavior: "none" });
    expect(params).not.toHaveProperty("trial_end");
  });

  it("Checkout exige l'acceptation des conditions générales", async () => {
    api.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    await ouvrirCheckout(stripe, { customerId: "cus_1", priceId: "price_e", metadata: { userId: "u1" }, succes: "s", annulation: "a" });
    expect(api.checkout.sessions.create.mock.calls[0][0]).toMatchObject({
      mode: "subscription",
      customer: "cus_1",
      consent_collection: { terms_of_service: "required" },
      subscription_data: { metadata: { userId: "u1" } },
    });
  });

  it("les prix viennent de Stripe, par lookup_key, gardés dix minutes", async () => {
    api.prices.list.mockResolvedValue({
      data: [
        { id: "price_e", lookup_key: "rojer_essentiel_mensuel", unit_amount: 2900, currency: "eur" },
        { id: "price_x", lookup_key: null, unit_amount: 100, currency: "eur" },
      ],
    });
    const prix = await prixDesFormules(stripe, 0);
    expect(prix.get("rojer_essentiel_mensuel")).toEqual({ priceId: "price_e", montantCentimes: 2900, devise: "eur" });
    expect(prix.size).toBe(1);
    await prixDesFormules(stripe, 5 * 60_000);
    expect(api.prices.list).toHaveBeenCalledTimes(1);
    await prixDesFormules(stripe, 11 * 60_000);
    expect(api.prices.list).toHaveBeenCalledTimes(2);
    expect(api.prices.list.mock.calls[0][0]).toMatchObject({ active: true, lookup_keys: expect.arrayContaining(["rojer_pro_annuel"]) });
  });
});
