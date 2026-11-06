import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  abonnementsDuClient: vi.fn(),
  appliquerFormule: vi.fn(),
  prixDesFormules: vi.fn(),
  synchroniser: vi.fn(),
}));
vi.mock("@/lib/stripe/parcours", () => ({
  abonnementsDuClient: m.abonnementsDuClient,
  appliquerFormule: m.appliquerFormule,
  prixDesFormules: m.prixDesFormules,
}));
vi.mock("@/lib/stripe/synchronisation", async (reel) => ({
  ...(await reel<typeof import("@/lib/stripe/synchronisation")>()),
  synchroniserClientStripe: m.synchroniser,
}));

import { finaliserCarte } from "./souscription";

const session = (o: Record<string, unknown> = {}) => ({
  id: "cs_1",
  created: 1000,
  mode: "setup",
  status: "complete",
  customer: "cus_1",
  metadata: { compteId: "c1", formule: "rojer_pro_annuel", immediat: "non" },
  setup_intent: { id: "seti_1", payment_method: "pm_1" },
  ...o,
});
const api = { checkout: { sessions: { retrieve: vi.fn() } }, customers: { update: vi.fn(), retrieve: vi.fn() } };
const stripe = api as unknown as Stripe;
const abonnement = (status: string) => ({ id: "sub_1", status, created: 1, items: { data: [] } });

beforeEach(() => {
  vi.clearAllMocks();
  api.checkout.sessions.retrieve.mockResolvedValue(session());
  m.abonnementsDuClient.mockResolvedValue([abonnement("trialing")]);
  m.prixDesFormules.mockResolvedValue(new Map([["rojer_pro_annuel", { priceId: "price_pa" }]]));
});

describe("finaliserCarte", () => {
  it("essai : la carte par défaut, la formule choisie, l'essai continue ; puis la copie relue", async () => {
    expect(await finaliserCarte(stripe, "cs_1", { customerId: "cus_1" })).toEqual({ issue: "appliquee", immediat: false });
    expect(api.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_1", { expand: ["setup_intent"] });
    expect(api.customers.update).toHaveBeenCalledWith("cus_1", { invoice_settings: { default_payment_method: "pm_1" } });
    expect(m.appliquerFormule).toHaveBeenCalledWith(stripe, expect.objectContaining({ id: "sub_1" }), {
      priceId: "price_pa",
      paymentMethodId: "pm_1",
      immediat: false,
      choisiLe: 1000,
      idempotence: "carte-cs_1",
    });
    expect(m.synchroniser).toHaveBeenCalledWith(stripe, "cus_1");
  });

  it("« immédiat » posé par Rojer à la création de la session : transmis", async () => {
    api.checkout.sessions.retrieve.mockResolvedValue(session({ metadata: { formule: "rojer_pro_annuel", immediat: "oui" } }));
    await finaliserCarte(stripe, "cs_1");
    expect(m.appliquerFormule.mock.calls[0][2].immediat).toBe(true);
  });

  it("session d'un autre client, inachevée, d'un autre mode, sans carte ou à formule inconnue : rien", async () => {
    expect(await finaliserCarte(stripe, "cs_1", { customerId: "cus_autre" })).toEqual({ issue: "rien" });
    for (const o of [
      { status: "open" },
      { mode: "subscription" },
      { setup_intent: { id: "seti_1", payment_method: null } },
      { metadata: { formule: "rojer_surmesure_mensuel" } },
    ]) {
      api.checkout.sessions.retrieve.mockResolvedValueOnce(session(o));
      expect(await finaliserCarte(stripe, "cs_1"), JSON.stringify(o)).toEqual({ issue: "rien" });
    }
    expect(m.appliquerFormule).not.toHaveBeenCalled();
    expect(api.customers.update).not.toHaveBeenCalled();
  });

  it("rejouée après coup (déjà payant) ou abonnement terminé : rien — idempotente", async () => {
    for (const status of ["active", "canceled"]) {
      m.abonnementsDuClient.mockResolvedValueOnce([abonnement(status)]);
      expect(await finaliserCarte(stripe, "cs_1"), status).toEqual({ issue: "rien" });
    }
    expect(m.appliquerFormule).not.toHaveBeenCalled();
  });

  it("pause : la carte et la formule s'appliquent, et la reprise se paie (immédiat)", async () => {
    m.abonnementsDuClient.mockResolvedValue([abonnement("paused")]);
    expect(await finaliserCarte(stripe, "cs_1")).toEqual({ issue: "appliquee", immediat: true });
  });

  it("une facture attend un paiement (refus, 3DS) : son adresse est rendue", async () => {
    m.appliquerFormule.mockResolvedValueOnce("https://invoice.stripe.com/i/1");
    expect(await finaliserCarte(stripe, "cs_1")).toEqual({ issue: "aRegler", url: "https://invoice.stripe.com/i/1" });
  });

  it("session déjà lue (le webhook) : pas de seconde lecture ; synchronisation laissée à l'appelant", async () => {
    await finaliserCarte(stripe, session() as unknown as Stripe.Checkout.Session, { synchroniser: false });
    expect(api.checkout.sessions.retrieve).not.toHaveBeenCalled();
    expect(m.synchroniser).not.toHaveBeenCalled();
  });
});
