import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.mock("./evenements", () => ({
  prendreEnCharge: vi.fn(),
  marquerTraite: vi.fn(),
  marquerEchec: vi.fn(),
  oublierLesAnciens: vi.fn(),
}));
vi.mock("./synchronisation", () => ({
  OPTIONS_WEBHOOK: { timeout: 3000, maxNetworkRetries: 0 },
  synchroniserClientStripe: vi.fn(),
}));

import * as evenements from "./evenements";
import { synchroniserClientStripe } from "./synchronisation";
import { motifDErreur, traiterNotificationStripe, verifierNotificationStripe, type NotificationStripe } from "./webhook";

const SECRET = "whsec_essai";
const stripe = new Stripe("sk_test_essai");

/** Une notification légère, telle que Stripe l'envoie. */
const leger = (type: string, objet: string, livemode = false) => ({
  id: "evt_test_1",
  object: "v2.core.event",
  type,
  livemode,
  created: "2026-11-03T10:00:00.000Z",
  related_object: { id: objet, type: "subscription", url: `/v1/x/${objet}` },
});

const signe = (corps: string, timestamp?: number) =>
  stripe.webhooks.generateTestHeaderString({ payload: corps, secret: SECRET, timestamp });

describe("verifierNotificationStripe", () => {
  const corps = JSON.stringify(leger("v1.customer.subscription.updated", "sub_1"));

  it("accepte une notification légère correctement signée", () => {
    const v = verifierNotificationStripe(stripe, corps, signe(corps), SECRET);
    expect(v).toMatchObject({ ok: true, notification: { id: "evt_test_1", type: "v1.customer.subscription.updated" } });
  });

  it("refuse sans signature, avec une signature d'un autre secret ou d'un corps modifié", () => {
    expect(verifierNotificationStripe(stripe, corps, null, SECRET)).toEqual({ ok: false, motif: expect.stringMatching(/absent/) });
    const autre = stripe.webhooks.generateTestHeaderString({ payload: corps, secret: "whsec_autre" });
    expect(verifierNotificationStripe(stripe, corps, autre, SECRET)).toEqual({ ok: false, motif: "signature refusée" });
    const modifie = corps.replace("sub_1", "sub_2");
    expect(verifierNotificationStripe(stripe, modifie, signe(corps), SECRET)).toEqual({ ok: false, motif: "signature refusée" });
  });

  it("refuse une signature de plus de 5 minutes (rejeu)", () => {
    const ancienne = signe(corps, Math.floor(Date.now() / 1000) - 6 * 60);
    expect(verifierNotificationStripe(stripe, corps, ancienne, SECRET)).toEqual({ ok: false, motif: "signature refusée" });
  });

  it("refuse un événement « instantané » bien signé : la destination doit envoyer des événements légers", () => {
    const instantane = JSON.stringify({ id: "evt_1", object: "event", type: "customer.subscription.updated", data: {} });
    const v = verifierNotificationStripe(stripe, instantane, signe(instantane), SECRET);
    expect(v).toEqual({ ok: false, motif: expect.stringMatching(/événements légers/) });
  });

  it("ne cite jamais la charge utile dans le motif", () => {
    const v = verifierNotificationStripe(stripe, corps, "t=1,v1=faux", SECRET);
    expect(JSON.stringify(v)).not.toContain("sub_1");
  });
});

describe("traiterNotificationStripe", () => {
  const api = {
    subscriptions: { retrieve: vi.fn() },
    checkout: { sessions: { retrieve: vi.fn() } },
    invoices: { retrieve: vi.fn() },
  };
  const faux = api as unknown as Stripe;
  const notif = (type: string, objet = "obj_1", livemode = false) =>
    stripe.parseEventNotificationWithoutVerification(JSON.stringify(leger(type, objet, livemode))) as NotificationStripe;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(evenements.prendreEnCharge).mockResolvedValue("prise");
    vi.mocked(synchroniserClientStripe).mockResolvedValue({ issue: "ecrit" });
  });

  it("refuse un événement d'un autre mode que la clé, avant toute écriture", async () => {
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1", true), "test")).toBe(400);
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1", false), "live")).toBe(400);
    expect(evenements.prendreEnCharge).not.toHaveBeenCalled();
  });

  it("un doublon répond 200 sans rien refaire ; une livraison en cours, 409", async () => {
    vi.mocked(evenements.prendreEnCharge).mockResolvedValueOnce("deja-traite").mockResolvedValueOnce("en-cours");
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1"), "test")).toBe(200);
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1"), "test")).toBe(409);
    expect(api.invoices.retrieve).not.toHaveBeenCalled();
    expect(synchroniserClientStripe).not.toHaveBeenCalled();
  });

  it("abonnement : relit l'abonnement, synchronise son client, marque traité", async () => {
    api.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", customer: "cus_1" });
    expect(await traiterNotificationStripe(faux, notif("v1.customer.subscription.deleted", "sub_1"), "test")).toBe(200);
    expect(api.subscriptions.retrieve).toHaveBeenCalledWith("sub_1", {}, expect.objectContaining({ maxNetworkRetries: 0 }));
    expect(synchroniserClientStripe).toHaveBeenCalledWith(faux, "cus_1");
    expect(evenements.marquerTraite).toHaveBeenCalledWith("evt_test_1", null);
  });

  it("facture et paiement Checkout : le client de l'objet relu", async () => {
    api.invoices.retrieve.mockResolvedValue({ customer: { id: "cus_2" } });
    await traiterNotificationStripe(faux, notif("v1.invoice.payment_failed", "in_1"), "test");
    expect(synchroniserClientStripe).toHaveBeenLastCalledWith(faux, "cus_2");

    api.checkout.sessions.retrieve.mockResolvedValue({ mode: "subscription", customer: "cus_3" });
    await traiterNotificationStripe(faux, notif("v1.checkout.session.completed", "cs_1"), "test");
    expect(synchroniserClientStripe).toHaveBeenLastCalledWith(faux, "cus_3");
  });

  it("sans client à suivre (paiement ponctuel, type non suivi) : traité sans effet, avec un motif", async () => {
    api.checkout.sessions.retrieve.mockResolvedValue({ mode: "payment", customer: "cus_3" });
    expect(await traiterNotificationStripe(faux, notif("v1.checkout.session.completed", "cs_1"), "test")).toBe(200);
    expect(await traiterNotificationStripe(faux, notif("v1.charge.refunded", "ch_1"), "test")).toBe(200);
    expect(synchroniserClientStripe).not.toHaveBeenCalled();
    expect(evenements.marquerTraite).toHaveBeenCalledWith("evt_test_1", expect.stringMatching(/sans client/));
  });

  it("en échec : 500, l'événement est rendu à la relance, avec un motif sans le message reçu", async () => {
    const erreur = Object.assign(new Error("No such subscription: 'sub_1' — client@exemple.fr"), {
      type: "StripeInvalidRequestError",
      statusCode: 404,
      code: "resource_missing",
    });
    api.subscriptions.retrieve.mockRejectedValue(erreur);
    expect(await traiterNotificationStripe(faux, notif("v1.customer.subscription.updated", "sub_1"), "test")).toBe(500);
    expect(evenements.marquerEchec).toHaveBeenCalledWith(
      "evt_test_1",
      "API Stripe : StripeInvalidRequestError 404 (resource_missing)",
    );
    expect(evenements.marquerTraite).not.toHaveBeenCalled();
  });
});

describe("motifDErreur", () => {
  it("ne reprend jamais le message d'une erreur", () => {
    expect(motifDErreur(new Error("client@exemple.fr"))).toBe("erreur inattendue");
    expect(motifDErreur({ type: "StripeConnectionError", message: "client@exemple.fr" })).toBe(
      "API Stripe : StripeConnectionError",
    );
  });
});
