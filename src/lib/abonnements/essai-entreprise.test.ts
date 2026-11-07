import { beforeEach, describe, expect, it, vi } from "vitest";

// Un essai par entreprise (ADR-053 § 8) : un SIREN déjà essayé par un autre
// compte finit l'essai en cours ; rien d'autre ne bouge.

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({
  table: new Map<string, string>(),
  update: vi.fn(async () => ({})),
  retrieve: vi.fn(async () => ({ default_payment_method: null as string | null })),
  carte: vi.fn(async () => null as string | null),
  synchroniser: vi.fn(async () => ({})),
  active: true,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    essaiEntreprise: {
      createMany: vi.fn(async ({ data }: { data: { siren: string; compteId: string }[] }) => {
        for (const l of data) if (!h.table.has(l.siren)) h.table.set(l.siren, l.compteId);
        return { count: 1 };
      }),
      findUnique: vi.fn(async ({ where }: { where: { siren: string } }) =>
        h.table.has(where.siren) ? { compteId: h.table.get(where.siren) } : null,
      ),
    },
  },
}));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: () => ({ active: h.active }) }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: () => ({ subscriptions: { update: h.update, retrieve: h.retrieve } }) }));
vi.mock("@/lib/stripe/synchronisation", () => ({ synchroniserClientStripe: h.synchroniser }));
vi.mock("./souscription", () => ({ carteParDefaut: h.carte }));

import type { Db } from "@/lib/auth/compte";
import { finirLEssaiSiEntrepriseDejaEssayee } from "./essai-entreprise";

const db = (statut: string | null) =>
  ({
    abonnement: {
      findUnique: async () => ({ statut, stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" }),
    },
  }) as unknown as Db;

beforeEach(() => {
  h.table.clear();
  h.active = true;
  vi.clearAllMocks();
});

describe("un essai par entreprise", () => {
  it("hors d'un essai, rien n'est noté ni touché", async () => {
    expect(await finirLEssaiSiEntrepriseDejaEssayee(db("active"), "c1", "123456789")).toBe(false);
    expect(h.table.size).toBe(0);
    expect(h.update).not.toHaveBeenCalled();
  });

  it("pendant un essai, un SIREN neuf est noté sous ce compte, et l'essai continue", async () => {
    expect(await finirLEssaiSiEntrepriseDejaEssayee(db("trialing"), "c1", "123456789")).toBe(false);
    expect(h.table.get("123456789")).toBe("c1");
    // Le même compte, la même entreprise : toujours son essai.
    expect(await finirLEssaiSiEntrepriseDejaEssayee(db("trialing"), "c1", "123456789")).toBe(false);
    expect(h.update).not.toHaveBeenCalled();
  });

  it("un SIREN déjà essayé par un autre compte finit l'essai tout de suite, puis relit Stripe", async () => {
    h.table.set("123456789", "c-autre");
    expect(await finirLEssaiSiEntrepriseDejaEssayee(db("trialing"), "c1", "123456789")).toBe(true);
    expect(h.update).toHaveBeenCalledWith("sub_1", { trial_end: "now" }, { idempotencyKey: "essai-entreprise-sub_1" });
    expect(h.synchroniser).toHaveBeenCalledWith(expect.anything(), "cus_1");
    // La première trace ne change pas de compte.
    expect(h.table.get("123456789")).toBe("c-autre");
  });

  it("avec une carte enregistrée (abonnement ou client), l'essai continue : un tiers ne déclenche aucun prélèvement", async () => {
    h.table.set("123456789", "c-autre");
    h.retrieve.mockResolvedValueOnce({ default_payment_method: "pm_1" });
    expect(await finirLEssaiSiEntrepriseDejaEssayee(db("trialing"), "c1", "123456789")).toBe(false);
    h.carte.mockResolvedValueOnce("pm_2");
    expect(await finirLEssaiSiEntrepriseDejaEssayee(db("trialing"), "c1", "123456789")).toBe(false);
    expect(h.update).not.toHaveBeenCalled();
  });

  it("Stripe injoignable : l'essai continue, sans erreur", async () => {
    h.table.set("123456789", "c-autre");
    h.update.mockRejectedValueOnce(new Error("réseau"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await finirLEssaiSiEntrepriseDejaEssayee(db("trialing"), "c1", "123456789")).toBe(false);
    expect(h.synchroniser).not.toHaveBeenCalled();
  });
});
