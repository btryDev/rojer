import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Le client Stripe naît au moment de s'abonner (ADR-053 § 9, amendé le
// 2026-11-16) ; la ligne du compte le réserve, deux onglets reprennent le même.

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ creerClientStripe: vi.fn() }));
vi.mock("@/lib/stripe/parcours", () => ({ creerClientStripe: m.creerClientStripe }));

import { clientStripeDuCompte } from "./client-stripe";

const stripe = {} as Stripe;
const db = { abonnement: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() } };
const lire = (stripeCustomerId: string | null) => ({ stripeCustomerId });
const appel = () => clientStripeDuCompte(stripe, db as never, { compteId: "c1", email: "a@b.fr" });

beforeEach(() => {
  vi.clearAllMocks();
  m.creerClientStripe.mockResolvedValue("cus_neuf");
  db.abonnement.updateMany.mockResolvedValue({ count: 1 });
  db.abonnement.create.mockResolvedValue({});
});

describe("clientStripeDuCompte", () => {
  it("déjà un client : le même, rien de créé", async () => {
    db.abonnement.findUnique.mockResolvedValue(lire("cus_1"));
    expect(await appel()).toBe("cus_1");
    expect(m.creerClientStripe).not.toHaveBeenCalled();
  });

  it("essai sans client : créé (clé dérivée du compte), réservé par une écriture conditionnelle", async () => {
    db.abonnement.findUnique.mockResolvedValueOnce(lire(null)).mockResolvedValueOnce(lire("cus_neuf"));
    expect(await appel()).toBe("cus_neuf");
    expect(m.creerClientStripe).toHaveBeenCalledWith(stripe, expect.objectContaining({ email: "a@b.fr", metadata: { compteId: "c1" }, idempotence: "c1" }));
    expect(db.abonnement.updateMany).toHaveBeenCalledWith({ where: { compteId: "c1", stripeCustomerId: null }, data: { stripeCustomerId: "cus_neuf" } });
  });

  it("deux onglets : l'autre a réservé le premier — on reprend le client enregistré", async () => {
    db.abonnement.findUnique.mockResolvedValueOnce(lire(null)).mockResolvedValueOnce(lire("cus_autre"));
    db.abonnement.updateMany.mockResolvedValue({ count: 0 });
    expect(await appel()).toBe("cus_autre");
  });

  it("aucune ligne (jamais d'essai) : elle naît avec son client", async () => {
    db.abonnement.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(lire("cus_neuf"));
    expect(await appel()).toBe("cus_neuf");
    expect(db.abonnement.create).toHaveBeenCalledWith({ data: { compteId: "c1", stripeCustomerId: "cus_neuf" } });
  });
});
