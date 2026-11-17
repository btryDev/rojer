import { beforeEach, describe, expect, it, vi } from "vitest";

// Le rapprochement quotidien : tout compte qui a un client Stripe, résilié
// compris (relecture du 2026-11-17 — un réabonnement aux événements perdus
// restait « résilié »).

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ findMany: vi.fn(), demander: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { abonnement: { findMany: m.findMany } } }));
vi.mock("./file", () => ({ demanderSynchronisations: m.demander }));

import { rapprocher } from "./rapprochement";

const MAINTENANT = new Date("2026-11-17T08:00:00Z");
// Datées un quart d'heure plus tard : les relectures nées d'un paiement passent devant.
const PLUS_TARD = new Date("2026-11-17T08:15:00Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rapprocher", () => {
  it("demande tout client Stripe enregistré, quel que soit l'état de sa copie", async () => {
    m.findMany.mockResolvedValue([{ stripeCustomerId: "cus_a" }, { stripeCustomerId: "cus_resilie" }]);
    expect(await rapprocher(MAINTENANT)).toEqual({ demandes: 2 });
    expect(m.demander).toHaveBeenCalledWith(["cus_a", "cus_resilie"], PLUS_TARD);
    expect(m.findMany.mock.calls[0][0].where).toEqual({ stripeCustomerId: { not: null } });
  });
});
