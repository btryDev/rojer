import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.mock("./evenements", () => ({
  prendreEnCharge: vi.fn(),
  marquerTraite: vi.fn(),
  marquerEchec: vi.fn(),
  oublierLesAnciens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./synchronisation", async (reel) => ({
  ...(await reel<typeof import("./synchronisation")>()),
  synchroniserClientStripe: vi.fn(),
}));

import * as evenements from "./evenements";
import { synchroniserClientStripe } from "./synchronisation";
import {
  EVENEMENTS_ECOUTES,
  lireCorpsBorne,
  motifDErreur,
  traiterNotificationStripe,
  verifierNotificationStripe,
  type NotificationStripe,
} from "./webhook";

const SECRET = "whsec_essai";
const stripe = new Stripe("sk_test_essai");
const PRISE = new Date("2026-11-03T10:00:00Z");

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

describe("lireCorpsBorne", () => {
  const morceaux = (...parties: string[]) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        for (const p of parties) c.enqueue(new TextEncoder().encode(p));
        c.close();
      },
    });

  it("rend le corps brut, octet pour octet", async () => {
    const corps = '{"é":"€"}';
    expect(await lireCorpsBorne(new Request("http://x", { method: "POST", body: corps }))).toBe(corps);
  });

  it("refuse un corps annoncé trop gros, sans le lire", async () => {
    const r = new Request("http://x", { method: "POST", body: "x", headers: { "content-length": "999999" } });
    expect(await lireCorpsBorne(r, 10)).toBeNull();
  });

  it("refuse un corps envoyé par morceaux sans taille annoncée, compté en octets", async () => {
    const r = new Request("http://x", { method: "POST", body: morceaux("€€", "€€"), duplex: "half" } as RequestInit);
    // 4 caractères, 12 octets.
    expect(await lireCorpsBorne(r, 10)).toBeNull();
  });
});

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
    vi.mocked(evenements.prendreEnCharge).mockResolvedValue({ etat: "prise", prise: PRISE });
    vi.mocked(synchroniserClientStripe).mockResolvedValue({ issue: "ecrit" });
  });

  it("refuse un événement d'un autre mode que la clé, avant toute écriture", async () => {
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1", true), "test")).toBe(400);
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1", false), "live")).toBe(400);
    expect(evenements.prendreEnCharge).not.toHaveBeenCalled();
  });

  it("un doublon répond 200 sans rien refaire ; une livraison en cours, 409", async () => {
    vi.mocked(evenements.prendreEnCharge)
      .mockResolvedValueOnce({ etat: "deja-traite" })
      .mockResolvedValueOnce({ etat: "en-cours" });
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1"), "test")).toBe(200);
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1"), "test")).toBe(409);
    expect(api.invoices.retrieve).not.toHaveBeenCalled();
    expect(synchroniserClientStripe).not.toHaveBeenCalled();
  });

  it("abonnement : relit l'abonnement, synchronise son client, marque traité sous sa prise", async () => {
    api.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", customer: "cus_1" });
    expect(await traiterNotificationStripe(faux, notif("v1.customer.subscription.deleted", "sub_1"), "test")).toBe(200);
    expect(api.subscriptions.retrieve).toHaveBeenCalledWith("sub_1", {}, expect.objectContaining({ maxNetworkRetries: 0 }));
    // L'abonnement relu suit : seule trace du compte si le client Stripe est supprimé.
    expect(synchroniserClientStripe).toHaveBeenCalledWith(faux, "cus_1", {
      abonnementLu: expect.objectContaining({ id: "sub_1" }),
      depuisWebhook: true,
    });
    expect(evenements.marquerTraite).toHaveBeenCalledWith("evt_test_1", PRISE, null);
  });

  it.each(EVENEMENTS_ECOUTES)("%s : chaque événement écouté relit son objet et synchronise", async (type) => {
    api.subscriptions.retrieve.mockResolvedValue({ customer: "cus_1" });
    api.checkout.sessions.retrieve.mockResolvedValue({ mode: "subscription", customer: "cus_1" });
    api.invoices.retrieve.mockResolvedValue({ customer: "cus_1" });
    expect(await traiterNotificationStripe(faux, notif(type, "obj_1"), "test")).toBe(200);
    expect(synchroniserClientStripe).toHaveBeenCalledWith(faux, "cus_1", expect.anything());
  });

  it("facture et paiement Checkout : le client de l'objet relu", async () => {
    api.invoices.retrieve.mockResolvedValue({ customer: { id: "cus_2" } });
    await traiterNotificationStripe(faux, notif("v1.invoice.payment_failed", "in_1"), "test");
    expect(synchroniserClientStripe).toHaveBeenLastCalledWith(faux, "cus_2", { abonnementLu: undefined, depuisWebhook: true });

    api.checkout.sessions.retrieve.mockResolvedValue({ mode: "subscription", customer: "cus_3" });
    await traiterNotificationStripe(faux, notif("v1.checkout.session.completed", "cs_1"), "test");
    expect(synchroniserClientStripe).toHaveBeenLastCalledWith(faux, "cus_3", { abonnementLu: undefined, depuisWebhook: true });
  });

  it("sans client à suivre (paiement ponctuel, type non écouté) : traité sans effet, avec un motif", async () => {
    api.checkout.sessions.retrieve.mockResolvedValue({ mode: "payment", customer: "cus_3" });
    expect(await traiterNotificationStripe(faux, notif("v1.checkout.session.completed", "cs_1"), "test")).toBe(200);
    expect(await traiterNotificationStripe(faux, notif("v1.customer.subscription.past_due", "sub_1"), "test")).toBe(200);
    expect(api.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(synchroniserClientStripe).not.toHaveBeenCalled();
    expect(evenements.marquerTraite).toHaveBeenCalledWith("evt_test_1", PRISE, expect.stringMatching(/sans client/));
  });

  it("un conflit (autre compte, compte disparu) est traité sans effet et signalé en erreur", async () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    api.invoices.retrieve.mockResolvedValue({ customer: "cus_1" });
    vi.mocked(synchroniserClientStripe).mockResolvedValue({ issue: "ignore", motif: "compte Rojer introuvable", alerte: true });
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1"), "test")).toBe(200);
    expect(erreur).toHaveBeenCalledWith(expect.stringMatching(/non enregistré — compte Rojer introuvable/));
    erreur.mockRestore();
  });

  it("en échec : 500, l'événement est rendu à la relance, avec un motif sans le message reçu", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    api.subscriptions.retrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        message: "No such subscription: 'sub_1' — client@exemple.fr",
        type: "invalid_request_error",
        statusCode: 404,
        code: "resource_missing",
      } as never),
    );
    expect(await traiterNotificationStripe(faux, notif("v1.customer.subscription.updated", "sub_1"), "test")).toBe(500);
    const [, , motif] = vi.mocked(evenements.marquerEchec).mock.calls[0];
    expect(motif).toMatch(/^API Stripe : StripeInvalidRequestError 404 \(resource_missing\)$/);
    expect(evenements.marquerTraite).not.toHaveBeenCalled();
  });

  it("le ménage ne transforme jamais un succès en échec, et son échec est rattrapé", async () => {
    const avertir = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(evenements.oublierLesAnciens).mockRejectedValue(new Error("verrou"));
    api.invoices.retrieve.mockResolvedValue({ customer: "cus_1" });
    // Seule l'horloge avance : le ménage n'a lieu qu'une fois par heure.
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2 * 60 * 60_000);
    expect(await traiterNotificationStripe(faux, notif("v1.invoice.paid", "in_1"), "test")).toBe(200);
    vi.mocked(Date.now).mockRestore();
    expect(evenements.oublierLesAnciens).toHaveBeenCalled();
    expect(evenements.marquerEchec).not.toHaveBeenCalled();
    // Lancé après la réponse : une promesse rejetée sans `catch` peut arrêter le processus.
    await new Promise((r) => setTimeout(r, 0));
    expect(avertir).toHaveBeenCalledWith(expect.stringMatching(/ménage des événements en échec/));
  });
});

describe("motifDErreur", () => {
  it("ne reprend jamais le message d'une erreur", () => {
    expect(motifDErreur(new Error("client@exemple.fr"))).toBe("erreur inattendue");
    expect(motifDErreur(new Stripe.errors.StripeConnectionError({ message: "client@exemple.fr" } as never))).toBe(
      "API Stripe : StripeConnectionError",
    );
    expect(motifDErreur({ code: "P2003", message: "client@exemple.fr" })).toBe("base : P2003");
  });
});
