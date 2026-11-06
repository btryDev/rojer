import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));

import {
  DUREE_ESSAI_JOURS,
  creerClientStripe,
  demarrerEssai,
  oublierLesPrix,
  appliquerFormule,
  ouvrirCheckout,
  ouvrirCheckoutCarte,
  prixDesFormules,
} from "./parcours";

const api = {
  customers: { create: vi.fn() },
  subscriptions: { create: vi.fn(), update: vi.fn(), resume: vi.fn() },
  invoices: { retrieve: vi.fn() },
  checkout: { sessions: { create: vi.fn(), list: vi.fn(), expire: vi.fn() } },
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
    expect(await creerClientStripe(stripe, { email: "a@b.fr", nom: "Bistrot SARL", metadata: { compteId: "c1" }, idempotence: "c1" })).toBe("cus_1");
    expect(api.customers.create).toHaveBeenCalledWith(
      { email: "a@b.fr", name: "Bistrot SARL", address: undefined, preferred_locales: ["fr"], metadata: { compteId: "c1" } },
      { idempotencyKey: "client-c1" },
    );

    api.subscriptions.create.mockResolvedValue({ id: "sub_1" });
    await demarrerEssai(stripe, { customerId: "cus_1", priceId: "price_e", metadata: { compteId: "c1" }, idempotence: "c1" });
    const [params, options] = api.subscriptions.create.mock.calls[0];
    // La formule est dans la clé : revenir en arrière pour en choisir une autre n'est pas refusé.
    expect(options).toEqual({ idempotencyKey: "essai-c1-price_e" });
    expect(params).toMatchObject({
      customer: "cus_1",
      items: [{ price: "price_e" }],
      trial_period_days: DUREE_ESSAI_JOURS,
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      metadata: { compteId: "c1" },
    });
    expect(DUREE_ESSAI_JOURS).toBe(30);
  });

  it("Checkout exige l'acceptation des conditions générales, et expire d'abord les sessions encore ouvertes", async () => {
    api.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_ancienne" }] });
    api.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    await ouvrirCheckout(stripe, { customerId: "cus_1", priceId: "price_e", metadata: { userId: "u1" }, succes: "s", annulation: "a" });
    expect(api.checkout.sessions.create.mock.calls[0][0]).toMatchObject({
      mode: "subscription",
      customer: "cus_1",
      consent_collection: { terms_of_service: "required" },
      subscription_data: { metadata: { userId: "u1" } },
    });
    expect(api.checkout.sessions.list).toHaveBeenCalledWith({ customer: "cus_1", status: "open", limit: 10 }, expect.anything());
    expect(api.checkout.sessions.expire).toHaveBeenCalledWith("cs_ancienne");
    expect(api.checkout.sessions.expire.mock.invocationCallOrder[0]).toBeLessThan(api.checkout.sessions.create.mock.invocationCallOrder[0]);
  });

  it("la carte d'un abonnement qui court : Checkout « setup », sessions ouvertes expirées d'abord", async () => {
    api.checkout.sessions.list.mockResolvedValue({ data: [] });
    api.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/c" });
    await ouvrirCheckoutCarte(stripe, { customerId: "cus_1", metadata: { formule: "f" }, succes: "s", annulation: "a" });
    expect(api.checkout.sessions.create.mock.calls[0][0]).toMatchObject({
      mode: "setup",
      customer: "cus_1",
      currency: "eur",
      metadata: { formule: "f" },
      setup_intent_data: { metadata: { formule: "f" } },
    });
  });

  it("appliquer la formule : essai continu sans facture ; immédiat = fin d'essai ; pause = reprise ; déjà fait = rien", async () => {
    const sub = (status: string, o: Record<string, unknown> = {}) =>
      ({ id: "sub_1", status, default_payment_method: null, metadata: {}, latest_invoice: null, items: { data: [{ id: "si_1", price: { id: "price_e" } }] }, ...o }) as unknown as Stripe.Subscription;
    const choix = { priceId: "price_pa", paymentMethodId: "pm_1", immediat: false, choisiLe: 100, idempotence: "carte-cs_1" };
    api.subscriptions.update.mockResolvedValue({ latest_invoice: null });
    api.subscriptions.resume.mockResolvedValue({ latest_invoice: null });

    expect(await appliquerFormule(stripe, sub("trialing"), choix)).toBeNull();
    expect(api.subscriptions.update).toHaveBeenLastCalledWith(
      "sub_1",
      {
        items: [{ id: "si_1", price: "price_pa" }],
        default_payment_method: "pm_1",
        proration_behavior: "none",
        metadata: { rojerChoixLe: "100" },
        expand: ["latest_invoice"],
      },
      { idempotencyKey: "carte-cs_1-maj" },
    );

    await appliquerFormule(stripe, sub("trialing"), { ...choix, immediat: true });
    expect(api.subscriptions.update.mock.lastCall?.[1]).toMatchObject({ trial_end: "now" });

    await appliquerFormule(stripe, sub("paused"), choix);
    expect(api.subscriptions.resume).toHaveBeenCalledWith("sub_1", { proration_behavior: "none", expand: ["latest_invoice"] }, { idempotencyKey: "carte-cs_1-reprise" });

    api.subscriptions.update.mockClear();
    await appliquerFormule(stripe, sub("trialing", { default_payment_method: "pm_1", items: { data: [{ id: "si_1", price: { id: "price_pa" } }] } }), choix);
    expect(api.subscriptions.update).not.toHaveBeenCalled();
  });

  it("rejeu : un choix plus ancien que le dernier appliqué ne fait rien ; une pause dont la reprise attend un paiement renvoie sa facture", async () => {
    const sub = (status: string, o: Record<string, unknown> = {}) =>
      ({ id: "sub_1", status, default_payment_method: null, metadata: {}, latest_invoice: null, items: { data: [{ id: "si_1", price: { id: "price_e" } }] }, ...o }) as unknown as Stripe.Subscription;
    const choix = { priceId: "price_pa", paymentMethodId: "pm_1", immediat: false, choisiLe: 100 };
    api.subscriptions.update.mockClear();
    expect(await appliquerFormule(stripe, sub("trialing", { metadata: { rojerChoixLe: "200" } }), choix)).toBeNull();
    expect(api.subscriptions.update).not.toHaveBeenCalled();

    const enAttente = { status: "open", hosted_invoice_url: "https://invoice.stripe.com/i/1" };
    expect(await appliquerFormule(stripe, sub("paused", { latest_invoice: enAttente }), choix)).toBe("https://invoice.stripe.com/i/1");
    expect(api.subscriptions.update).not.toHaveBeenCalled();
    expect(api.subscriptions.resume).not.toHaveBeenCalledWith("sub_1", expect.anything(), expect.anything());

    api.subscriptions.update.mockResolvedValue({ latest_invoice: enAttente });
    expect(await appliquerFormule(stripe, sub("trialing"), { ...choix, immediat: true })).toBe("https://invoice.stripe.com/i/1");
  });

  it("les prix viennent de Stripe, par lookup_key et au bon intervalle, gardés dix minutes s'ils sont complets", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const complet = [
      { id: "price_em", lookup_key: "rojer_essentiel_mensuel", unit_amount: 2900, currency: "eur", recurring: { interval: "month" } },
      { id: "price_ea", lookup_key: "rojer_essentiel_annuel", unit_amount: 29500, currency: "eur", recurring: { interval: "year" } },
      { id: "price_pm", lookup_key: "rojer_pro_mensuel", unit_amount: 6900, currency: "eur", recurring: { interval: "month" } },
      { id: "price_pa", lookup_key: "rojer_pro_annuel", unit_amount: 69900, currency: "eur", recurring: { interval: "year" } },
      { id: "price_x", lookup_key: null, unit_amount: 100, currency: "eur", recurring: { interval: "month" } },
    ];
    api.prices.list.mockResolvedValue({ data: complet });
    const prix = await prixDesFormules(stripe, 0);
    expect(prix.get("rojer_essentiel_mensuel")).toEqual({ priceId: "price_em", montantCentimes: 2900, devise: "eur" });
    expect(prix.size).toBe(4);
    await prixDesFormules(stripe, 5 * 60_000);
    expect(api.prices.list).toHaveBeenCalledTimes(1);
    await prixDesFormules(stripe, 11 * 60_000);
    expect(api.prices.list).toHaveBeenCalledTimes(2);
    expect(api.prices.list.mock.calls[0][0]).toMatchObject({ active: true, lookup_keys: expect.arrayContaining(["rojer_pro_annuel"]) });
  });

  it("un prix à l'intervalle faux est écarté ; un catalogue incomplet n'est pas gardé", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    api.prices.list.mockResolvedValue({
      data: [{ id: "price_faux", lookup_key: "rojer_pro_annuel", unit_amount: 6900, currency: "eur", recurring: { interval: "month" } }],
    });
    expect((await prixDesFormules(stripe, 0)).size).toBe(0);
    await prixDesFormules(stripe, 1000);
    expect(api.prices.list).toHaveBeenCalledTimes(2);
  });
});
