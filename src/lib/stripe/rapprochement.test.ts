import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Le rapprochement quotidien : les copies non terminées, et les clients des
// abonnements nés récemment chez Stripe (revue du 2026-11-17 — un réabonnement
// dont les événements se perdent laissait la copie « résilié »).

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ findMany: vi.fn(), demander: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { abonnement: { findMany: m.findMany } } }));
vi.mock("./file", () => ({ demanderSynchronisations: m.demander }));
vi.mock("@/lib/auth/compte-hors-session", () => ({ clientDuClientStripe: vi.fn() }));
vi.mock("@/lib/alertes", () => ({ alerter: vi.fn() }));

import { rapprocher } from "./rapprochement";

const MAINTENANT = new Date("2026-11-17T08:00:00Z");
// Datées un quart d'heure plus tard : les relectures nées d'un paiement passent devant.
const PLUS_TARD = new Date("2026-11-17T08:15:00Z");
const liste = vi.fn();
const stripe = { subscriptions: { list: liste } } as unknown as Stripe;

beforeEach(() => {
  vi.clearAllMocks();
  m.findMany.mockResolvedValue([]);
  liste.mockReturnValue({ autoPagingToArray: async () => [] });
});

describe("rapprocher", () => {
  it("demande les clients des copies non terminées", async () => {
    m.findMany.mockResolvedValue([{ stripeCustomerId: "cus_a" }, { stripeCustomerId: "cus_b" }]);
    expect(await rapprocher(MAINTENANT, stripe)).toEqual({ demandes: 2 });
    expect(m.demander).toHaveBeenLastCalledWith(["cus_a", "cus_b"], PLUS_TARD);
    expect(m.findMany.mock.calls[0][0].where.OR).toEqual([{ statut: null }, { statut: { notIn: ["canceled", "incomplete_expired"] } }]);
  });

  it("demande aussi les clients des abonnements nés chez Stripe depuis trois jours, une fois chacun", async () => {
    liste.mockReturnValue({
      autoPagingToArray: async () => [{ customer: "cus_resilie" }, { customer: { id: "cus_resilie" } }, { customer: "cus_autre" }],
    });
    expect(await rapprocher(MAINTENANT, stripe)).toEqual({ demandes: 2 });
    expect(m.demander).toHaveBeenCalledWith(["cus_resilie", "cus_autre"], PLUS_TARD);
    const depuis = Math.floor(MAINTENANT.getTime() / 1000) - 3 * 24 * 3600;
    expect(liste).toHaveBeenCalledWith({ created: { gte: depuis }, status: "all", limit: 100 });
  });
});
