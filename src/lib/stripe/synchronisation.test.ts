import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));
const { clientDuClientStripe } = vi.hoisted(() => ({ clientDuClientStripe: vi.fn() }));
vi.mock("@/lib/auth/compte-hors-session", () => ({ clientDuClientStripe }));

import { abonnementCourant, colonnesDe, synchroniserClientStripe } from "./synchronisation";

const abo = (o: Partial<Stripe.Subscription> & { id: string; prix?: string }) =>
  ({
    status: "active",
    created: 1,
    trial_end: null,
    trial_start: null,
    cancel_at: null,
    cancel_at_period_end: false,
    items: { data: [{ current_period_end: 1_800_000_000, price: { id: `price_${o.prix ?? "x"}`, lookup_key: o.prix ?? null } }] },
    ...o,
  }) as unknown as Stripe.Subscription;

describe("abonnementCourant", () => {
  it("retient le plus récent non terminé, même devant un résilié plus récent", () => {
    const r = abonnementCourant([
      abo({ id: "ancien", status: "active", created: 10 }),
      abo({ id: "resilie", status: "canceled", created: 30 }),
      abo({ id: "expire", status: "incomplete_expired", created: 40 }),
    ]);
    expect(r).toEqual({ courant: expect.objectContaining({ id: "ancien" }), plusieurs: false });
  });

  it("sans abonnement vivant : le plus récent, pour enregistrer la résiliation", () => {
    const r = abonnementCourant([abo({ id: "a", status: "canceled", created: 1 }), abo({ id: "b", status: "canceled", created: 2 })]);
    expect(r.courant?.id).toBe("b");
  });

  it("signale deux abonnements vivants à la fois", () => {
    const r = abonnementCourant([abo({ id: "a", created: 1 }), abo({ id: "b", status: "past_due", created: 2 })]);
    expect(r).toEqual({ courant: expect.objectContaining({ id: "b" }), plusieurs: true });
  });

  it("aucun abonnement : rien", () => {
    expect(abonnementCourant([])).toEqual({ courant: null, plusieurs: false });
  });
});

describe("colonnesDe", () => {
  it("recopie l'état, la formule et les dates (secondes Stripe → dates)", () => {
    const s = abo({
      id: "sub_1",
      status: "trialing",
      prix: "suivi_annuel",
      trial_end: 1_790_000_000,
      cancel_at_period_end: true,
      cancel_at: 1_800_000_000,
    });
    expect(colonnesDe(s)).toEqual({
      stripeSubscriptionId: "sub_1",
      statut: "trialing",
      formule: "suivi_annuel",
      stripePriceId: "price_suivi_annuel",
      finPeriode: new Date(1_800_000_000_000),
      finEssai: new Date(1_790_000_000_000),
      resilieEnFinDePeriode: true,
      finPrevueLe: new Date(1_800_000_000_000),
    });
  });

  it("sans abonnement : des colonnes vides, jamais un état inventé", () => {
    expect(colonnesDe(null)).toMatchObject({ stripeSubscriptionId: null, statut: null, resilieEnFinDePeriode: false });
  });
});

describe("synchroniserClientStripe — le compte vient du client Stripe relu", () => {
  const stripeAvec = (client: object) =>
    ({
      customers: { retrieve: vi.fn().mockResolvedValue(client) },
      subscriptions: { list: vi.fn() },
    }) as unknown as Stripe;

  it("client supprimé, sans compte ou au compte mal formé : sans effet, aucune écriture", async () => {
    for (const client of [
      { id: "cus_1", deleted: true },
      { id: "cus_1", metadata: {} },
      { id: "cus_1", metadata: { userId: "pas-un-uuid" } },
    ]) {
      const s = stripeAvec(client);
      expect(await synchroniserClientStripe(s, "cus_1")).toMatchObject({ issue: "ignore" });
      expect(s.subscriptions.list).not.toHaveBeenCalled();
    }
    expect(clientDuClientStripe).not.toHaveBeenCalled();
  });
});
