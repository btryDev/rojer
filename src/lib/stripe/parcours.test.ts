import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));

import {
  DUREE_ESSAI_JOURS,
  creerClientStripe,
  demarrerEssai,
  oublierLesPrix,
  annulerBaisse,
  appliquerFormule,
  baissePrevue,
  monterDeFormule,
  ouvrirCheckout,
  ouvrirCheckoutCarte,
  planifierBaisse,
  prixDesFormules,
  rendrePlanningEchu,
  tauxDeTva,
} from "./parcours";

const api = {
  customers: { create: vi.fn() },
  subscriptions: { create: vi.fn(), update: vi.fn(), resume: vi.fn() },
  invoices: { retrieve: vi.fn() },
  subscriptionSchedules: { create: vi.fn(), retrieve: vi.fn(), update: vi.fn(), release: vi.fn() },
  checkout: { sessions: { create: vi.fn(), list: vi.fn(), expire: vi.fn() } },
  prices: { list: vi.fn() },
  taxRates: { list: vi.fn() },
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
    await demarrerEssai(stripe, { customerId: "cus_1", priceId: "price_e", tauxTva: "txr_tva", metadata: { compteId: "c1" }, idempotence: "c1" });
    const [params, options] = api.subscriptions.create.mock.calls[0];
    // La formule est dans la clé : revenir en arrière pour en choisir une autre n'est pas refusé.
    expect(options).toEqual({ idempotencyKey: "essai-c1-price_e" });
    expect(params).toMatchObject({
      customer: "cus_1",
      items: [{ price: "price_e" }],
      default_tax_rates: ["txr_tva"],
      trial_period_days: DUREE_ESSAI_JOURS,
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      metadata: { compteId: "c1" },
    });
    expect(DUREE_ESSAI_JOURS).toBe(30);
  });

  it("Checkout exige l'acceptation des conditions générales, et expire d'abord les sessions encore ouvertes", async () => {
    api.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_ancienne" }] });
    api.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    await ouvrirCheckout(stripe, { customerId: "cus_1", priceId: "price_e", tauxTva: "txr_tva", metadata: { userId: "u1" }, succes: "s", annulation: "a" });
    expect(api.checkout.sessions.create.mock.calls[0][0]).toMatchObject({
      mode: "subscription",
      customer: "cus_1",
      consent_collection: { terms_of_service: "required" },
      subscription_data: { metadata: { userId: "u1" }, default_tax_rates: ["txr_tva"] },
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

  it("monter : tout de suite, prorata facturé, appliquée seulement si payée ; une baisse planifiée est abandonnée d'abord", async () => {
    const sub = { id: "sub_1", schedule: "sub_sched_1", items: { data: [{ id: "si_1", price: { id: "price_em" } }] } } as unknown as Stripe.Subscription;
    api.subscriptions.update.mockResolvedValue({ latest_invoice: { status: "paid" } });
    expect(await monterDeFormule(stripe, sub, "price_pm")).toBeNull();
    expect(api.subscriptionSchedules.release).toHaveBeenCalledWith("sub_sched_1");
    // La mise à jour d'abord : si elle échoue, la baisse prévue reste intacte.
    expect(api.subscriptions.update.mock.invocationCallOrder.at(-1)).toBeLessThan(api.subscriptionSchedules.release.mock.invocationCallOrder.at(-1)!);
    api.subscriptionSchedules.release.mockClear();
    api.subscriptions.update.mockRejectedValueOnce(new Error("refus"));
    await expect(monterDeFormule(stripe, sub, "price_pm")).rejects.toThrow("refus");
    expect(api.subscriptionSchedules.release).not.toHaveBeenCalled();
    api.subscriptions.update.mockResolvedValue({ latest_invoice: { status: "paid" } });
    expect(api.subscriptions.update).toHaveBeenLastCalledWith(
      "sub_1",
      { items: [{ id: "si_1", price: "price_pm" }], proration_behavior: "always_invoice", payment_behavior: "pending_if_incomplete", expand: ["latest_invoice"] },
      { idempotencyKey: "monter-sub_1-price_em-price_pm" },
    );
    api.subscriptions.update.mockResolvedValue({ latest_invoice: { status: "open", hosted_invoice_url: "https://invoice.stripe.com/i/2" } });
    expect(await monterDeFormule(stripe, { ...sub, schedule: null } as unknown as Stripe.Subscription, "price_pm")).toBe("https://invoice.stripe.com/i/2");
  });

  it("baisser : un planning — la période en cours, puis la nouvelle formule une période, puis rendu à lui-même ; annuler = rendre", async () => {
    const sub = {
      id: "sub_1",
      schedule: null,
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      default_tax_rates: [{ id: "txr_tva" }],
      items: { data: [{ id: "si_1", quantity: 1, price: { id: "price_pm" } }] },
    } as unknown as Stripe.Subscription;
    api.subscriptions.update.mockClear();
    api.subscriptionSchedules.create.mockResolvedValue({ id: "sub_sched_1", current_phase: { start_date: 100, end_date: 200 }, phases: [] });
    await planifierBaisse(stripe, sub, { priceId: "price_em", intervalle: "month" });
    // Le réglage « pause à la fin de l'essai » est levé d'abord : Stripe refuse sinon le planning.
    expect(api.subscriptions.update).toHaveBeenCalledWith("sub_1", { trial_settings: { end_behavior: { missing_payment_method: "create_invoice" } } });
    expect(api.subscriptionSchedules.create).toHaveBeenCalledWith({ from_subscription: "sub_1" });
    expect(api.subscriptionSchedules.update).toHaveBeenCalledWith("sub_sched_1", {
      end_behavior: "release",
      proration_behavior: "none",
      phases: [
        // La TVA de l'abonnement est reposée sur chaque phase.
        { items: [{ price: "price_pm", quantity: 1 }], start_date: 100, end_date: 200, default_tax_rates: ["txr_tva"] },
        { items: [{ price: "price_em", quantity: 1 }], duration: { interval: "month", interval_count: 1 }, default_tax_rates: ["txr_tva"] },
      ],
    });
    // Une seconde baisse reprend le planning existant.
    api.subscriptionSchedules.retrieve.mockResolvedValue({ id: "sub_sched_1", current_phase: { start_date: 100, end_date: 200 }, phases: [] });
    api.subscriptionSchedules.create.mockClear();
    await planifierBaisse(stripe, { ...sub, schedule: "sub_sched_1" } as unknown as Stripe.Subscription, { priceId: "price_ea", intervalle: "year" });
    expect(api.subscriptionSchedules.create).not.toHaveBeenCalled();
    await annulerBaisse(stripe, { ...sub, schedule: "sub_sched_1" } as unknown as Stripe.Subscription);
    expect(api.subscriptionSchedules.release).toHaveBeenLastCalledWith("sub_sched_1");
  });

  it("baisser : un planning créé dont la mise à jour échoue est rendu ; un planning échu (plus de phase à venir) aussi", async () => {
    const sub = { id: "sub_1", schedule: null, items: { data: [{ id: "si_1", quantity: 1, price: { id: "price_pm" } }] } } as unknown as Stripe.Subscription;
    api.subscriptionSchedules.create.mockResolvedValue({ id: "sub_sched_2", current_phase: { start_date: 100, end_date: 200 }, phases: [] });
    api.subscriptionSchedules.update.mockRejectedValueOnce(new Error("phases refusées"));
    api.subscriptionSchedules.release.mockClear();
    await expect(planifierBaisse(stripe, sub, { priceId: "price_em", intervalle: "month" })).rejects.toThrow("phases refusées");
    expect(api.subscriptionSchedules.release).toHaveBeenCalledWith("sub_sched_2");
    // Sans TVA sur l'abonnement (antérieur à la TVA), les phases n'en portent pas.
    const phases = api.subscriptionSchedules.update.mock.calls.at(-1)![1].phases;
    expect(phases.every((p: object) => !("default_tax_rates" in p))).toBe(true);

    const passe = Math.floor(Date.now() / 1000) - 86_400;
    api.subscriptionSchedules.retrieve.mockResolvedValue({ status: "active", created: passe, current_phase: { start_date: passe }, phases: [{ start_date: passe - 10 }, { start_date: passe }] });
    api.subscriptionSchedules.release.mockClear();
    await rendrePlanningEchu(stripe, { schedule: "sub_sched_3" } as unknown as Stripe.Subscription);
    expect(api.subscriptionSchedules.release).toHaveBeenCalledWith("sub_sched_3");
    api.subscriptionSchedules.retrieve.mockResolvedValue({ status: "active", created: passe, current_phase: { start_date: passe }, phases: [{ start_date: passe }, { start_date: passe + 10 * 86_400 }] });
    api.subscriptionSchedules.release.mockClear();
    await rendrePlanningEchu(stripe, { schedule: "sub_sched_3" } as unknown as Stripe.Subscription);
    expect(api.subscriptionSchedules.release).not.toHaveBeenCalled();
    // Tout juste créé (une seule phase, quelques secondes) : la baisse va y être ajoutée, on n'y touche pas.
    api.subscriptionSchedules.retrieve.mockResolvedValue({ status: "active", created: Math.floor(Date.now() / 1000) - 5, current_phase: { start_date: passe }, phases: [{ start_date: passe }] });
    await rendrePlanningEchu(stripe, { schedule: "sub_sched_4" } as unknown as Stripe.Subscription);
    expect(api.subscriptionSchedules.release).not.toHaveBeenCalled();
  });

  it("la baisse prévue : la phase qui suit celle en cours SELON STRIPE (horloge de simulation comprise) ; sans planning, rien", async () => {
    const dans = Math.floor(Date.now() / 1000) + 86_400;
    api.subscriptionSchedules.retrieve.mockResolvedValue({
      current_phase: { start_date: 1 },
      phases: [
        { start_date: 1, items: [{ price: { id: "price_pm", lookup_key: "rojer_pro_mensuel" } }] },
        { start_date: dans, items: [{ price: { id: "price_em", lookup_key: "rojer_essentiel_mensuel" } }] },
      ],
    });
    expect(await baissePrevue(stripe, { schedule: "sub_sched_1" } as unknown as Stripe.Subscription)).toEqual({
      priceId: "price_em",
      lookupKey: "rojer_essentiel_mensuel",
      le: new Date(dans * 1000),
    });
    expect(await baissePrevue(stripe, { schedule: null } as unknown as Stripe.Subscription)).toBeNull();
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

  it("la TVA : le taux actif, 20 %, France, type TVA, en sus du prix — le plus ancien ; aucun = null ; gardé dix minutes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const taux = (id: string, autres: object = {}) => ({
      id,
      active: true,
      inclusive: false,
      percentage: 20,
      country: "FR",
      tax_type: "vat",
      created: 10,
      ...autres,
    });
    api.taxRates.list.mockResolvedValue({
      data: [
        taux("txr_ttc", { inclusive: true }),
        taux("txr_10", { percentage: 10 }),
        taux("txr_be", { country: "BE" }),
        taux("txr_sales", { tax_type: "sales_tax" }),
        taux("txr_sans_pays", { country: null }),
        taux("txr_recent", { created: 20 }),
        taux("txr_ancien", { created: 5 }),
      ],
    });
    expect(await tauxDeTva(stripe, 0)).toBe("txr_ancien");
    expect(api.taxRates.list).toHaveBeenCalledWith({ active: true, inclusive: false, limit: 100 });
    await tauxDeTva(stripe, 5 * 60_000);
    expect(api.taxRates.list).toHaveBeenCalledTimes(1);

    oublierLesPrix();
    api.taxRates.list.mockResolvedValue({ data: [taux("txr_ttc", { inclusive: true })] });
    expect(await tauxDeTva(stripe, 0)).toBeNull();
    // Absent : relu à chaque appel, pour que le taux créé entre-temps serve aussitôt.
    await tauxDeTva(stripe, 1000);
    expect(api.taxRates.list).toHaveBeenCalledTimes(3);
  });
});
