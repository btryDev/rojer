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
const lire = (stripeCustomerId: string | null) => ({ stripeCustomerId });
const appel = () => clientStripeDuCompte(stripe, db as never, { compteId: "c1", email: "a@b.fr" });

beforeEach(() => {
  vi.clearAllMocks();
  m.creerClientStripe.mockResolvedValue("cus_neuf");
  db.abonnement.updateMany.mockResolvedValue({ count: 1 });
});

describe("clientStripeDuCompte", () => {
  it("déjà un client : le même, rien de créé", async () => {
    db.abonnement.findUnique.mockResolvedValue(lire("cus_1"));
    expect(await appel()).toEqual({ customerId: "cus_1", neuf: false });
    expect(m.creerClientStripe).not.toHaveBeenCalled();
  });

  it("essai sans client : créé (clé du compte et de l'adresse), réservé par une écriture conditionnelle", async () => {
    db.abonnement.findUnique.mockResolvedValue(lire(null));
    expect(await appel()).toEqual({ customerId: "cus_neuf", neuf: true });
    expect(m.creerClientStripe).toHaveBeenCalledWith(
      stripe,
      expect.objectContaining({ email: "a@b.fr", metadata: { compteId: "c1" }, idempotence: expect.stringMatching(/^c1-[0-9a-f]{12}$/) }),
    );
    expect(db.abonnement.updateMany).toHaveBeenCalledWith({ where: { compteId: "c1", stripeCustomerId: null }, data: { stripeCustomerId: "cus_neuf" } });
  });

  it("deux onglets : l'autre a réservé le premier — on reprend le client enregistré", async () => {
    db.abonnement.findUnique.mockResolvedValueOnce(lire(null)).mockResolvedValueOnce(lire("cus_autre"));
    db.abonnement.updateMany.mockResolvedValue({ count: 0 });
    expect(await appel()).toEqual({ customerId: "cus_autre", neuf: false });
  });

  it("sans ligne (jamais d'essai) : une erreur — `sAbonnerAction` renvoie à l'essai avant", async () => {
    db.abonnement.findUnique.mockResolvedValue(null);
    await expect(appel()).rejects.toThrow();
    expect(m.creerClientStripe).not.toHaveBeenCalled();
  });
});
