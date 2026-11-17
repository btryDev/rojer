import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Le client Stripe naît au moment de s'abonner (ADR-053 § 9, amendé le
// 2026-11-16) ; la ligne du compte le réserve, deux onglets reprennent le même.

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ creerClientStripe: vi.fn() }));
vi.mock("@/lib/stripe/parcours", () => ({ creerClientStripe: m.creerClientStripe }));

import { clientStripeDuCompte } from "./client-stripe";

const stripe = {} as Stripe;
const db = { abonnement: { findUnique: vi.fn(), updateMany: vi.fn() } };
const appel = (enregistre: string | null) => clientStripeDuCompte(stripe, db as never, { compteId: "c1", email: "a@b.fr", enregistre });

beforeEach(() => {
  vi.clearAllMocks();
  m.creerClientStripe.mockResolvedValue("cus_neuf");
  db.abonnement.updateMany.mockResolvedValue({ count: 1 });
});

describe("clientStripeDuCompte", () => {
  it("déjà un client enregistré : le même, rien de créé ni relu", async () => {
    expect(await appel("cus_1")).toBe("cus_1");
    expect(m.creerClientStripe).not.toHaveBeenCalled();
    expect(db.abonnement.findUnique).not.toHaveBeenCalled();
  });

  it("essai sans client : créé (clé du compte et de l'adresse), réservé par une écriture conditionnelle", async () => {
    expect(await appel(null)).toBe("cus_neuf");
    expect(m.creerClientStripe).toHaveBeenCalledWith(
      stripe,
      expect.objectContaining({ email: "a@b.fr", metadata: { compteId: "c1" }, idempotence: expect.stringMatching(/^c1-[0-9a-f]{12}$/) }),
    );
    expect(db.abonnement.updateMany).toHaveBeenCalledWith({ where: { compteId: "c1", stripeCustomerId: null }, data: { stripeCustomerId: "cus_neuf" } });
  });

  it("deux onglets : l'autre a réservé le premier — on reprend le client enregistré", async () => {
    db.abonnement.updateMany.mockResolvedValue({ count: 0 });
    db.abonnement.findUnique.mockResolvedValue({ stripeCustomerId: "cus_autre" });
    expect(await appel(null)).toBe("cus_autre");
  });
});
