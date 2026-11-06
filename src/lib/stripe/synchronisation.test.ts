import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));
const { clientDuClientStripe } = vi.hoisted(() => ({ clientDuClientStripe: vi.fn() }));
vi.mock("@/lib/auth/compte-hors-session", () => ({ clientDuClientStripe }));

import { abonnementCourant, colonnesDe, premierEssai, premierPaiement, synchroniserClientStripe } from "./synchronisation";

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

  it("un abonnement neuf en attente de paiement ne remplace pas celui qui paie", () => {
    const r = abonnementCourant([
      abo({ id: "paye", status: "active", created: 10 }),
      abo({ id: "attente", status: "incomplete", created: 20 }),
    ]);
    expect(r).toEqual({ courant: expect.objectContaining({ id: "paye" }), plusieurs: false });
  });

  it("un état inconnu passe après celui qui paie, avant celui qui attend son paiement", () => {
    const inconnu = abo({ id: "inconnu", status: "nouvel_etat" as Stripe.Subscription.Status, created: 30 });
    expect(abonnementCourant([abo({ id: "paye", created: 1 }), inconnu]).courant?.id).toBe("paye");
    expect(abonnementCourant([abo({ id: "attente", status: "incomplete", created: 40 }), inconnu]).courant?.id).toBe("inconnu");
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
  it("un prix remplacé (sans clé) garde sa formule par ses metadata ; une clé inconnue ne donne rien", () => {
    const remplace = abo({ id: "sub_1" });
    (remplace.items.data[0].price as unknown as Record<string, unknown>).lookup_key = null;
    (remplace.items.data[0].price as unknown as Record<string, unknown>).metadata = { formule: "essentiel", periodicite: "mensuel" };
    expect(colonnesDe(remplace).formule).toBe("rojer_essentiel_mensuel");
    expect(colonnesDe(abo({ id: "sub_2", prix: "suivi_annuel" })).formule).toBeNull();
  });

  it("recopie l'état, la formule et les dates (secondes Stripe → dates)", () => {
    const s = abo({
      id: "sub_1",
      status: "trialing",
      prix: "rojer_pro_annuel",
      trial_end: 1_790_000_000,
      cancel_at_period_end: true,
      cancel_at: 1_800_000_000,
    });
    expect(colonnesDe(s)).toEqual({
      stripeSubscriptionId: "sub_1",
      statut: "trialing",
      formule: "rojer_pro_annuel",
      stripePriceId: "price_rojer_pro_annuel",
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

describe("premierEssai", () => {
  it("le premier essai pris, sur quelque abonnement que ce soit", () => {
    expect(premierEssai([abo({ id: "a", trial_start: 300 }), abo({ id: "b" }), abo({ id: "c", trial_start: 200 })]))
      .toEqual(new Date(200_000));
    expect(premierEssai([abo({ id: "a" })])).toBeNull();
  });
});

describe("premierPaiement", () => {
  it("la plus ancienne facture payée d'un montant non nul ; rien tant qu'il n'y a que l'essai", async () => {
    const avec = (factures: object[]) =>
      ({ invoices: { list: vi.fn().mockReturnValue({ autoPagingToArray: vi.fn().mockResolvedValue(factures) }) } }) as unknown as Stripe;
    const f = (paye: number | null, montant: number) => ({ amount_paid: montant, status_transitions: { paid_at: paye } });
    expect(await premierPaiement(avec([f(900, 2900), f(700, 8900), f(100, 0)]), "cus_1")).toEqual(new Date(700_000));
    expect(await premierPaiement(avec([f(100, 0)]), "cus_1")).toBeNull();
    expect(await premierPaiement(avec([f(null, 2900)]), "cus_1")).toBeNull();
  });
});

describe("synchroniserClientStripe — le compte vient de Stripe relu, jamais de la notification", () => {
  const stripeAvec = (client: object, abonnements: Stripe.Subscription[] = []) =>
    ({
      customers: { retrieve: vi.fn().mockResolvedValue(client) },
      subscriptions: { list: vi.fn().mockReturnValue({ autoPagingToArray: vi.fn().mockResolvedValue(abonnements) }) },
      invoices: { list: vi.fn().mockReturnValue({ autoPagingToArray: vi.fn().mockResolvedValue([]) }) },
    }) as unknown as Stripe;

  it("sans compte, au compte mal formé, ou supprimé sans abonnement qui le nomme : sans effet, aucune écriture", async () => {
    for (const s of [
      stripeAvec({ id: "cus_1", metadata: {} }),
      stripeAvec({ id: "cus_1", metadata: { userId: "pas-un-uuid" } }),
      stripeAvec({ id: "cus_1", deleted: true }),
      // Un client supprimé n'a plus de metadata : l'abonnement fait foi,
      // pas un userId qui traînerait sur l'objet supprimé.
      stripeAvec({ id: "cus_1", deleted: true, metadata: { userId: "00000000-0000-0000-0000-00000000000b" } }),
    ]) {
      expect(await synchroniserClientStripe(s, "cus_1")).toMatchObject({ issue: "ignore" });
    }
    expect(clientDuClientStripe).not.toHaveBeenCalled();
  });
});
