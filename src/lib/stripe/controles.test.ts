import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Les réglages du tableau de bord dont Rojer dépend (audit du 2026-11-16) :
// le portail ne change pas de formule et résilie en fin de période ; un
// impayé qui dure dit que « marquer comme impayé » manque.

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ uneFoisParJour: vi.fn() }));
vi.mock("@/lib/alertes", () => ({ alerterUneFoisParJour: m.uneFoisParJour }));

import { IMPAYE_TROP_LONG_JOURS, controlerLesReglagesStripe, defautsDuPortail, impayesTropLongs } from "./controles";

const portail = (features: object) => ({ features }) as unknown as Stripe.BillingPortal.Configuration;
const BON = { subscription_update: { enabled: false }, subscription_cancel: { enabled: true, mode: "at_period_end" } };
const MAINTENANT = new Date("2026-12-31T12:00:00Z");
const jours = (n: number) => Math.floor(MAINTENANT.getTime() / 1000) - n * 86_400;
const impaye = (id: string, depuisJours: number, status = "past_due") =>
  ({ id, status, customer: "cus_1", latest_invoice: { created: jours(depuisJours), due_date: null } }) as unknown as Stripe.Subscription;

beforeEach(() => vi.clearAllMocks());

describe("defautsDuPortail", () => {
  it("réglé comme la notice : rien", () => {
    expect(defautsDuPortail(portail(BON))).toEqual([]);
  });

  it("changement de formule ouvert, résiliation fermée ou immédiate, aucune configuration : signalés", () => {
    expect(defautsDuPortail(portail({ ...BON, subscription_update: { enabled: true } }))).toEqual([expect.stringMatching(/changement de formule/)]);
    expect(defautsDuPortail(portail({ ...BON, subscription_cancel: { enabled: false } }))).toEqual([expect.stringMatching(/résiliation est fermée/)]);
    expect(defautsDuPortail(portail({ ...BON, subscription_cancel: { enabled: true, mode: "immediately" } }))).toEqual([expect.stringMatching(/immédiate/)]);
    expect(defautsDuPortail(null)).toEqual([expect.stringMatching(/aucune configuration/)]);
  });
});

describe("impayesTropLongs", () => {
  it("au-delà du seuil seulement, et seulement `past_due`", () => {
    expect(
      impayesTropLongs([impaye("sub_a", IMPAYE_TROP_LONG_JOURS + 1), impaye("sub_b", 10), impaye("sub_c", 90, "unpaid")], MAINTENANT),
    ).toEqual(["sub_a"]);
  });
});

describe("controlerLesReglagesStripe", () => {
  const stripe = (config: object | null, abonnements: Stripe.Subscription[]) =>
    ({
      billingPortal: { configurations: { list: vi.fn(async () => ({ data: config ? [config] : [] })) } },
      subscriptions: { list: vi.fn(() => ({ autoPagingToArray: async () => abonnements })) },
    }) as unknown as Stripe;

  it("tout en règle : aucune alerte", async () => {
    expect(await controlerLesReglagesStripe(stripe(portail(BON), [impaye("sub_b", 10)]), MAINTENANT)).toEqual({ portail: 0, impayesTropLongs: 0 });
    expect(m.uneFoisParJour).not.toHaveBeenCalled();
  });

  it("un portail de travers et un impayé qui dure : une alerte chacun, par jour, avec des identifiants seulement", async () => {
    const bilan = await controlerLesReglagesStripe(
      stripe(portail({ ...BON, subscription_update: { enabled: true } }), [impaye("sub_a", 60)]),
      MAINTENANT,
    );
    expect(bilan).toEqual({ portail: 1, impayesTropLongs: 1 });
    expect(m.uneFoisParJour.mock.calls.map((c) => c[0])).toEqual(["reglages:portail", "reglages:impayes"]);
    expect(m.uneFoisParJour.mock.calls[1][2].join("\n")).toContain("sub_a — client cus_1");
  });
});
