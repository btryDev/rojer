import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));

import { carteQuiAPaye,
  creerClientStripe,
  oublierLesPrix,
  annulerBaisse,
  baissePrevue,
  monterDeFormule,
  ouvrirCheckout,
  planifierBaisse,
  prixDesFormules,
  rendrePlanningEchu,
  tauxDeTva,
} from "./parcours";

const api = {
  customers: { create: vi.fn(), update: vi.fn(), retrieve: vi.fn() },
  subscriptions: { create: vi.fn(), update: vi.fn(), resume: vi.fn(), retrieve: vi.fn() },
  invoices: { retrieve: vi.fn(), voidInvoice: vi.fn(), pay: vi.fn() },
  paymentMethods: { retrieve: vi.fn() },
  subscriptionSchedules: { create: vi.fn(), retrieve: vi.fn(), update: vi.fn(), release: vi.fn() },
  checkout: { sessions: { create: vi.fn(), list: vi.fn(), expire: vi.fn() } },
  prices: { list: vi.fn() },
  taxRates: { list: vi.fn() },
};
const stripe = api as unknown as Stripe;

beforeEach(() => {
  // Sans taux de TVA lisible : chaque fonction garde celui de l'abonnement (un test en pose un).
  api.taxRates.list.mockReset();
  vi.clearAllMocks();
  oublierLesPrix();
});

describe("parcours Stripe", () => {
  it("le client : une clé d'idempotence dérivée du compte", async () => {
    api.customers.create.mockResolvedValue({ id: "cus_1" });
    expect(await creerClientStripe(stripe, { email: "a@b.fr", nom: "Bistrot SARL", metadata: { compteId: "c1" }, idempotence: "c1" })).toBe("cus_1");
    expect(api.customers.create).toHaveBeenCalledWith(
      { email: "a@b.fr", name: "Bistrot SARL", address: undefined, preferred_locales: ["fr"], metadata: { compteId: "c1" } },
      { idempotencyKey: "client-c1" },
    );
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

  it("baisse planifiée : les phases portent le taux en vigueur, sinon celui de l'abonnement", async () => {
    api.taxRates.list.mockResolvedValue({
      data: [{ id: "txr_ttc", active: true, inclusive: true, percentage: 20, country: "FR", tax_type: "vat", created: 1 }],
    });
    api.subscriptions.update.mockResolvedValue({});
    api.subscriptionSchedules.create.mockResolvedValue({ id: "sub_sched_3", current_phase: { start_date: 100, end_date: 200 }, phases: [] });
    api.subscriptionSchedules.update.mockResolvedValue({});
    const sub = {
      id: "sub_1",
      status: "active",
      schedule: null,
      default_tax_rates: [{ id: "txr_ancien" }],
      items: { data: [{ id: "si_1", price: { id: "price_pm" }, quantity: 1 }] },
    } as unknown as Stripe.Subscription;
    await planifierBaisse(stripe, sub, { priceId: "price_em", intervalle: "month" });
    const phases = api.subscriptionSchedules.update.mock.lastCall?.[1].phases;
    expect(phases.map((p: { default_tax_rates: string[] }) => p.default_tax_rates)).toEqual([["txr_ttc"], ["txr_ttc"]]);
  });

  it("carte qui a payé : celle du paiement de la facture devient celle du client ; la carte fixée quitte l'abonnement ; réglage posé s'il manque (2026-11-16)", async () => {
    const facture = (pm: string | null) => ({
      id: "in_1",
      customer: "cus_1",
      parent: { subscription_details: { subscription: "sub_1" } },
      payments: { data: pm ? [{ status: "paid", payment: { payment_intent: { payment_method: pm } } }] : [] },
    });
    // La carte relue : rattachée au client, ou à usage unique (`null`).
    const rattachee = (a: string | null) => api.paymentMethods.retrieve.mockImplementation(async (id: string) => ({ id, customer: a }));
    rattachee("cus_1");
    const reglee = { payment_settings: { save_default_payment_method: "on_subscription" } };
    const etat = (pmClient: string, sub: object) => {
      api.customers.retrieve.mockResolvedValue({ id: "cus_1", invoice_settings: { default_payment_method: pmClient } });
      api.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", status: "active", ...sub });
    };
    // Payée sur la page de la facture avec une autre carte : elle devient celle du client ; la carte fixée est retirée.
    api.invoices.retrieve.mockResolvedValue(facture("pm_nouvelle"));
    etat("pm_refusee", { ...reglee, default_payment_method: "pm_nouvelle" });
    await carteQuiAPaye(stripe, "in_1");
    // Quatre niveaux d'expansion au plus chez Stripe.
    expect(api.invoices.retrieve).toHaveBeenCalledWith("in_1", { expand: ["payments.data.payment.payment_intent"] });
    expect(api.customers.update).toHaveBeenCalledWith("cus_1", { invoice_settings: { default_payment_method: "pm_nouvelle" } });
    expect(api.subscriptions.update).toHaveBeenLastCalledWith("sub_1", { default_payment_method: "" });
    // Payée sur la page de la facture sans « sauvegarder » : la carte n'est
    // rattachée à personne, Stripe refuserait — le client n'est pas réécrit
    // (répétition du 2026-11-17).
    vi.clearAllMocks();
    rattachee(null);
    api.invoices.retrieve.mockResolvedValue(facture("pm_usage_unique"));
    etat("pm_refusee", { ...reglee, default_payment_method: null });
    await carteQuiAPaye(stripe, "in_1");
    expect(api.customers.update).not.toHaveBeenCalled();
    rattachee("cus_1");
    // Renouvellement ordinaire (la carte du client a payé) : le client n'est pas réécrit ; seule la carte fixée part.
    vi.clearAllMocks();
    api.invoices.retrieve.mockResolvedValue(facture("pm_c"));
    etat("pm_c", { ...reglee, default_payment_method: "pm_c" });
    await carteQuiAPaye(stripe, "in_1");
    expect(api.customers.update).not.toHaveBeenCalled();
    expect(api.paymentMethods.retrieve).not.toHaveBeenCalled();
    expect(api.subscriptions.update).toHaveBeenLastCalledWith("sub_1", { default_payment_method: "" });
    // Né de Checkout, sans réglage : posé.
    vi.clearAllMocks();
    etat("pm_c", { default_payment_method: null, payment_settings: null });
    await carteQuiAPaye(stripe, "in_1");
    expect(api.subscriptions.update).toHaveBeenLastCalledWith("sub_1", { payment_settings: { save_default_payment_method: "on_subscription" } });
    // Rien à ranger, terminé, ou facture hors abonnement : aucune écriture.
    vi.clearAllMocks();
    etat("pm_c", { ...reglee, default_payment_method: null });
    await carteQuiAPaye(stripe, "in_1");
    etat("pm_c", { status: "canceled", default_payment_method: "pm_x" });
    await carteQuiAPaye(stripe, "in_1");
    api.invoices.retrieve.mockResolvedValue({ ...facture("pm_x"), parent: null });
    await carteQuiAPaye(stripe, "in_1");
    expect(api.subscriptions.update).not.toHaveBeenCalled();
    expect(api.customers.update).not.toHaveBeenCalled();
  });

  it("monter : tout de suite, prorata facturé, appliquée seulement si payée ; une baisse planifiée est abandonnée d'abord", async () => {
    const sub = { id: "sub_1", schedule: "sub_sched_1", items: { data: [{ id: "si_1", price: { id: "price_em", recurring: { interval: "month" } } }] } } as unknown as Stripe.Subscription;
    const pm = { priceId: "price_pm", intervalle: "month" as const };
    api.subscriptions.update.mockResolvedValue({ latest_invoice: { status: "paid" } });
    expect(await monterDeFormule(stripe, sub, pm)).toBeNull();
    expect(api.subscriptionSchedules.release).toHaveBeenCalledWith("sub_sched_1");
    // La mise à jour d'abord : si elle échoue, la baisse prévue reste intacte.
    expect(api.subscriptions.update.mock.invocationCallOrder.at(-1)).toBeLessThan(api.subscriptionSchedules.release.mock.invocationCallOrder.at(-1)!);
    api.subscriptionSchedules.release.mockClear();
    api.subscriptions.update.mockRejectedValueOnce(new Error("refus"));
    await expect(monterDeFormule(stripe, sub, pm)).rejects.toThrow("refus");
    expect(api.subscriptionSchedules.release).not.toHaveBeenCalled();
    api.subscriptions.update.mockResolvedValue({ latest_invoice: { status: "paid" } });
    expect(api.subscriptions.update).toHaveBeenLastCalledWith(
      "sub_1",
      {
        items: [{ id: "si_1", price: "price_pm" }],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        expand: ["latest_invoice"],
      },
      { idempotencyKey: "monter-sub_1-price_em-price_pm" },
    );
    api.subscriptions.update.mockResolvedValue({ latest_invoice: { status: "open", hosted_invoice_url: "https://invoice.stripe.com/i/2" } });
    expect(await monterDeFormule(stripe, { ...sub, schedule: null } as unknown as Stripe.Subscription, pm)).toBe("https://invoice.stripe.com/i/2");
    // Le rythme change (mois → année) : la période repart aujourd'hui (répétition du 2026-11-17).
    api.subscriptions.update.mockResolvedValue({ latest_invoice: { status: "paid" } });
    await monterDeFormule(stripe, { ...sub, schedule: null } as unknown as Stripe.Subscription, { priceId: "price_ea", intervalle: "year" });
    expect(api.subscriptions.update.mock.calls.at(-1)?.[1]).toMatchObject({ billing_cycle_anchor: { type: "now" }, proration_behavior: "always_invoice" });
  });

  it("baisser : un planning — la période en cours, puis la nouvelle formule une période, puis rendu à lui-même ; annuler = rendre", async () => {
    const sub = {
      id: "sub_1",
      schedule: null,
      default_tax_rates: [{ id: "txr_tva" }],
      items: { data: [{ id: "si_1", quantity: 1, price: { id: "price_pm" } }] },
    } as unknown as Stripe.Subscription;
    api.subscriptions.update.mockClear();
    api.subscriptionSchedules.create.mockResolvedValue({ id: "sub_sched_1", current_phase: { start_date: 100, end_date: 200 }, phases: [] });
    await planifierBaisse(stripe, sub, { priceId: "price_em", intervalle: "month" });
    expect(api.subscriptions.update).not.toHaveBeenCalled();
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
    // Release refusé : déjà rendu par un événement voisin, rien ; encore actif (429), l'erreur remonte (2026-11-16).
    const echu = { status: "active", created: passe, current_phase: { start_date: passe }, phases: [{ start_date: passe - 10 }, { start_date: passe }] };
    api.subscriptionSchedules.release.mockRejectedValueOnce(new Error("déjà rendu"));
    api.subscriptionSchedules.retrieve.mockResolvedValueOnce(echu).mockResolvedValueOnce({ ...echu, status: "released" });
    await rendrePlanningEchu(stripe, { schedule: "sub_sched_5" } as unknown as Stripe.Subscription);
    api.subscriptionSchedules.release.mockRejectedValueOnce(new Error("lock"));
    api.subscriptionSchedules.retrieve.mockResolvedValueOnce(echu).mockResolvedValueOnce(echu);
    await expect(rendrePlanningEchu(stripe, { schedule: "sub_sched_5" } as unknown as Stripe.Subscription)).rejects.toThrow("lock");
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

  it("la TVA : le taux actif, 20 %, France, type TVA, incluse dans le prix (prix TTC, 2026-11-14) — le plus ancien ; aucun = null ; gardé dix minutes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const taux = (id: string, autres: object = {}) => ({
      id,
      active: true,
      inclusive: true,
      percentage: 20,
      country: "FR",
      tax_type: "vat",
      created: 10,
      ...autres,
    });
    api.taxRates.list.mockResolvedValue({
      data: [
        taux("txr_ht", { inclusive: false }),
        taux("txr_10", { percentage: 10 }),
        taux("txr_be", { country: "BE" }),
        taux("txr_sales", { tax_type: "sales_tax" }),
        taux("txr_sans_pays", { country: null }),
        taux("txr_recent", { created: 20 }),
        taux("txr_ancien", { created: 5 }),
      ],
    });
    expect(await tauxDeTva(stripe, 0)).toBe("txr_ancien");
    expect(api.taxRates.list).toHaveBeenCalledWith({ active: true, inclusive: true, limit: 100 });
    await tauxDeTva(stripe, 5 * 60_000);
    expect(api.taxRates.list).toHaveBeenCalledTimes(1);

    oublierLesPrix();
    api.taxRates.list.mockResolvedValue({ data: [taux("txr_ht", { inclusive: false })] });
    expect(await tauxDeTva(stripe, 0)).toBeNull();
    // Absent : relu à chaque appel, pour que le taux créé entre-temps serve aussitôt.
    await tauxDeTva(stripe, 1000);
    expect(api.taxRates.list).toHaveBeenCalledTimes(3);
  });
});
