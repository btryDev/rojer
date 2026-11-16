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
const ilYa = (n: number) => Math.floor(MAINTENANT.getTime() / 1000) - n * 86_400;
const liste = <T,>(data: T[]) => ({ autoPagingToArray: async () => data });

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
  it("au-delà du seuil seulement ; sans facture ouverte, rien", () => {
    const i = (id: string, depuis: number | null) => ({ id, client: "cus_1", depuis });
    expect(impayesTropLongs([i("sub_a", ilYa(IMPAYE_TROP_LONG_JOURS + 1)), i("sub_b", ilYa(10)), i("sub_c", null)], MAINTENANT).map((x) => x.id)).toEqual(["sub_a"]);
  });
});

describe("controlerLesReglagesStripe", () => {
  /** `factures` : les échéances (en jours) des factures ouvertes de chaque abonnement impayé. */
  const stripe = (config: object | null, factures: Record<string, number[]>, { portailEnPanne = false } = {}) =>
    ({
      billingPortal: {
        configurations: { list: vi.fn(async () => (portailEnPanne ? Promise.reject(new Error("403")) : { data: config ? [config] : [] })) },
      },
      subscriptions: { list: vi.fn(() => liste(Object.keys(factures).map((id) => ({ id, customer: "cus_1" })))) },
      invoices: {
        list: vi.fn(({ subscription }: { subscription: string }) =>
          liste(factures[subscription].map((j) => ({ created: ilYa(j), due_date: null }))),
        ),
      },
    }) as unknown as Stripe;

  it("tout en règle : aucune alerte", async () => {
    expect(await controlerLesReglagesStripe(stripe(portail(BON), { sub_b: [10] }), MAINTENANT)).toEqual({ portail: 0, impayesTropLongs: 0 });
    expect(m.uneFoisParJour).not.toHaveBeenCalled();
  });

  it("un mensuel impayé depuis trois mois : daté par sa PLUS ANCIENNE facture ouverte, pas par la dernière", async () => {
    expect(await controlerLesReglagesStripe(stripe(portail(BON), { sub_a: [5, 35 + 1, 66] }), MAINTENANT)).toEqual({ portail: 0, impayesTropLongs: 1 });
    expect(m.uneFoisParJour.mock.calls[0][0]).toBe("reglages:impayes");
    expect(m.uneFoisParJour.mock.calls[0][2].join("\n")).toContain("sub_a — client cus_1");
  });

  it("un portail de travers : son alerte, à côté de celle des impayés", async () => {
    const bilan = await controlerLesReglagesStripe(stripe(portail({ ...BON, subscription_update: { enabled: true } }), { sub_a: [60] }), MAINTENANT);
    expect(bilan).toEqual({ portail: 1, impayesTropLongs: 1 });
    expect(m.uneFoisParJour.mock.calls.map((c) => c[0]).sort()).toEqual(["reglages:impayes", "reglages:portail"]);
  });

  it("un contrôle en échec n'empêche pas l'autre ; l'échec remonte ensuite", async () => {
    await expect(controlerLesReglagesStripe(stripe(null, { sub_a: [60] }, { portailEnPanne: true }), MAINTENANT)).rejects.toThrow("403");
    expect(m.uneFoisParJour.mock.calls.map((c) => c[0])).toEqual(["reglages:impayes"]);
  });
});
