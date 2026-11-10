import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.mock("./evenements", () => ({ enregistrer: vi.fn() }));

import * as evenements from "./evenements";
import { lireCorpsBorne, recevoirNotificationStripe, verifierNotificationStripe, type NotificationStripe } from "./webhook";
import { motifDErreur } from "./synchronisation";

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

describe("recevoirNotificationStripe : enregistrer, répondre, rien d'autre", () => {
  const notif = (type: string, objet = "obj_1", livemode = false) =>
    stripe.parseEventNotificationWithoutVerification(JSON.stringify(leger(type, objet, livemode))) as NotificationStripe;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(evenements.enregistrer).mockResolvedValue(true);
  });

  it("refuse un événement d'un autre mode que la clé, avant toute écriture", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await recevoirNotificationStripe(notif("v1.invoice.paid", "in_1", true), "test")).toEqual({ status: 400, neuf: false });
    expect(await recevoirNotificationStripe(notif("v1.invoice.paid", "in_1", false), "live")).toEqual({ status: 400, neuf: false });
    expect(evenements.enregistrer).not.toHaveBeenCalled();
  });

  it("enregistre l'événement et l'objet de la notification, puis 200 : le traitement suit la réponse", async () => {
    expect(await recevoirNotificationStripe(notif("v1.customer.subscription.updated", "sub_1"), "test")).toEqual({ status: 200, neuf: true });
    expect(evenements.enregistrer).toHaveBeenCalledWith("evt_test_1", "v1.customer.subscription.updated", "sub_1");
  });

  it("un doublon répond 200 aussi, sans rien à traiter", async () => {
    vi.mocked(evenements.enregistrer).mockResolvedValue(false);
    expect(await recevoirNotificationStripe(notif("v1.invoice.paid", "in_1"), "test")).toEqual({ status: 200, neuf: false });
  });

  it("base injoignable : 500, Stripe relance — sans citer l'erreur reçue", async () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(evenements.enregistrer).mockRejectedValue(Object.assign(new Error("client@exemple.fr"), { code: "P1001" }));
    expect(await recevoirNotificationStripe(notif("v1.invoice.paid", "in_1"), "test")).toEqual({ status: 500, neuf: false });
    expect(erreur).toHaveBeenCalledWith(expect.stringMatching(/non enregistré — base : P1001$/));
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
