// Le webhook Stripe contre un VRAI PostgreSQL (ADR-053 § 5) : la prise en
// charge d'un événement (une seule livraison le traite), et l'écriture de
// l'abonnement par le client borné au compte — conditionnelle sur `relueLe`,
// jamais sur la ligne d'un autre client Stripe. Stripe est simulé : seule la
// base est réelle.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `STRIPE_INTEGRATION_URL` pointe une
// base LOCALE migrée. Il n'efface que ses propres lignes (deux comptes
// `…-5715e…`, les événements `evt_integ_…`).
//   STRIPE_INTEGRATION_URL=postgresql://…@localhost:5433/rojer_essai \
//     pnpm exec vitest run src/lib/stripe/synchronisation.integration

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/portee/lot-verifie");

const URL_BASE = process.env.STRIPE_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("webhook Stripe — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { synchroniserClientStripe } = await import("./synchronisation");
  const { prendreEnCharge, marquerTraite, marquerEchec, oublierLesAnciens, PRISE_EXPIREE_MS, CONSERVATION_MS } =
    await import("./evenements");

  const A = "00000000-0000-0000-0000-5715e000000a";
  const B = "00000000-0000-0000-0000-5715e000000b";

  async function menage() {
    await prisma.abonnement.deleteMany({ where: { userId: { in: [A, B] } } });
    await prisma.evenementStripe.deleteMany({ where: { id: { startsWith: "evt_integ_" } } });
  }

  beforeAll(async () => {
    for (const id of [A, B]) {
      await prisma.user.upsert({ where: { id }, create: { id, name: id, email: `${id}@exemple.invalid` }, update: {} });
    }
  });
  beforeEach(menage);
  afterAll(async () => {
    await menage();
    await prisma.user.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.$disconnect();
  });

  const abo = (o: {
    id: string;
    status: string;
    created: number;
    prix?: string;
    trial_start?: number;
    metadata?: Record<string, string>;
  }) =>
    ({
      trial_end: null,
      trial_start: null,
      cancel_at: null,
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: 1_800_000_000, price: { id: "price_1", lookup_key: o.prix ?? "suivi" } }] },
      ...o,
    }) as unknown as Stripe.Subscription;

  const stripe = (userId: string, abonnements: Stripe.Subscription[], client?: object) =>
    ({
      customers: { retrieve: async (id: string) => client ?? { id, metadata: { userId } } },
      subscriptions: { list: async () => ({ data: abonnements }) },
    }) as unknown as Stripe;
  vi.spyOn(console, "error").mockImplementation(() => {});

  const ligne = (userId: string) => prisma.abonnement.findUnique({ where: { userId } });

  describe("synchroniserClientStripe", () => {
    it("crée la ligne du compte que désigne le client Stripe relu, puis la met à jour", async () => {
      const essai = 1_780_000_000;
      const s1 = stripe(A, [abo({ id: "sub_1", status: "trialing", created: 1, trial_start: essai })]);
      expect(await synchroniserClientStripe(s1, "cus_A", () => new Date(1000))).toEqual({ issue: "ecrit" });
      expect(await ligne(A)).toMatchObject({
        stripeCustomerId: "cus_A",
        stripeSubscriptionId: "sub_1",
        statut: "trialing",
        formule: "suivi",
        essaiUtiliseLe: new Date(essai * 1000),
      });

      const s2 = stripe(A, [abo({ id: "sub_1", status: "active", created: 1 })]);
      expect(await synchroniserClientStripe(s2, "cus_A", () => new Date(2000))).toEqual({ issue: "ecrit" });
      // L'essai consommé le reste, même quand l'abonnement relu n'en a plus.
      expect(await ligne(A)).toMatchObject({ statut: "active", essaiUtiliseLe: new Date(essai * 1000) });
    });

    it("une relecture plus ancienne que la dernière écrite n'écrase rien (livraisons croisées)", async () => {
      await synchroniserClientStripe(stripe(A, [abo({ id: "sub_1", status: "active", created: 1 })]), "cus_A", () => new Date(5000));
      const tardive = stripe(A, [abo({ id: "sub_1", status: "past_due", created: 1 })]);
      expect(await synchroniserClientStripe(tardive, "cus_A", () => new Date(4000))).toEqual({ issue: "inchange" });
      expect((await ligne(A))?.statut).toBe("active");
    });

    it("un ancien abonnement résilié ne ferme pas celui qui court", async () => {
      const s = stripe(A, [
        abo({ id: "sub_neuf", status: "active", created: 20 }),
        abo({ id: "sub_ancien", status: "canceled", created: 10 }),
      ]);
      await synchroniserClientStripe(s, "cus_A");
      expect(await ligne(A)).toMatchObject({ stripeSubscriptionId: "sub_neuf", statut: "active" });
    });

    it("un client Stripe qui n'est pas celui de la ligne du compte ne la touche pas", async () => {
      await prisma.abonnement.create({ data: { userId: A, stripeCustomerId: "cus_A", statut: "active" } });
      const intrus = stripe(A, [abo({ id: "sub_x", status: "canceled", created: 1 })]);
      expect(await synchroniserClientStripe(intrus, "cus_autre")).toMatchObject({ issue: "ignore" });
      expect(await ligne(A)).toMatchObject({ stripeCustomerId: "cus_A", statut: "active" });
    });

    it("un abonnement neuf en attente de paiement ne remplace pas celui qui paie ; l'essai d'un ancien abonnement compte", async () => {
      const s = stripe(A, [
        abo({ id: "sub_essai", status: "canceled", created: 5, trial_start: 1_700_000_000 }),
        abo({ id: "sub_paye", status: "active", created: 10 }),
        abo({ id: "sub_attente", status: "incomplete", created: 20 }),
      ]);
      await synchroniserClientStripe(s, "cus_A");
      expect(await ligne(A)).toMatchObject({
        stripeSubscriptionId: "sub_paye",
        statut: "active",
        essaiUtiliseLe: new Date(1_700_000_000_000),
      });
    });

    it("client Stripe supprimé : le compte se lit sur l'abonnement, la résiliation s'enregistre", async () => {
      await prisma.abonnement.create({ data: { userId: A, stripeCustomerId: "cus_A", statut: "active" } });
      const s = stripe(A, [abo({ id: "sub_1", status: "canceled", created: 1, metadata: { userId: A } })], {
        id: "cus_A",
        deleted: true,
      });
      expect(await synchroniserClientStripe(s, "cus_A")).toEqual({ issue: "ecrit" });
      expect((await ligne(A))?.statut).toBe("canceled");
    });

    it("compte disparu : sans effet, signalé, sans erreur que Stripe relancerait", async () => {
      const fantome = "00000000-0000-0000-0000-5715e00000ff";
      const s = stripe(fantome, [abo({ id: "sub_f", status: "active", created: 1 })]);
      expect(await synchroniserClientStripe(s, "cus_F")).toMatchObject({ issue: "ignore", alerte: true });
    });

    it("client Stripe déjà à un autre compte : sans effet, signalé, rien d'écrit", async () => {
      await prisma.abonnement.create({ data: { userId: B, stripeCustomerId: "cus_X", statut: "active" } });
      const s = stripe(A, [abo({ id: "sub_x", status: "canceled", created: 1 })]);
      expect(await synchroniserClientStripe(s, "cus_X")).toMatchObject({ issue: "ignore", alerte: true });
      expect(await ligne(A)).toBeNull();
      expect(await ligne(B)).toMatchObject({ stripeCustomerId: "cus_X", statut: "active" });
    });

    it("abonnement déjà sur la ligne d'un autre compte : sans effet, signalé", async () => {
      await prisma.abonnement.create({ data: { userId: B, stripeCustomerId: "cus_B", stripeSubscriptionId: "sub_b" } });
      await prisma.abonnement.create({ data: { userId: A, stripeCustomerId: "cus_A" } });
      const s = stripe(A, [abo({ id: "sub_b", status: "active", created: 1 })]);
      expect(await synchroniserClientStripe(s, "cus_A")).toMatchObject({ issue: "ignore", alerte: true });
    });

    it("n'écrit jamais dans un autre compte que celui du client Stripe relu", async () => {
      await prisma.abonnement.create({ data: { userId: B, stripeCustomerId: "cus_B", statut: "active" } });
      await synchroniserClientStripe(stripe(A, [abo({ id: "sub_a", status: "canceled", created: 1 })]), "cus_A");
      expect(await ligne(B)).toMatchObject({ stripeCustomerId: "cus_B", statut: "active" });
      expect(await ligne(A)).toMatchObject({ stripeCustomerId: "cus_A", statut: "canceled" });
    });
  });

  describe("prise en charge d'un événement", () => {
    const prise = (p: Awaited<ReturnType<typeof prendreEnCharge>>) => {
      if (p.etat !== "prise") throw new Error(`prise attendue, ${p.etat}`);
      return p.prise;
    };

    it("une seule livraison le prend ; traité, il ne se refait pas ; en échec, il se reprend", async () => {
      const id = "evt_integ_1";
      const p1 = await prendreEnCharge(id, "v1.invoice.paid");
      expect(p1.etat).toBe("prise");
      expect(await prendreEnCharge(id, "v1.invoice.paid")).toEqual({ etat: "en-cours" });
      await marquerEchec(id, prise(p1), "API Stripe : StripeConnectionError");
      const p2 = await prendreEnCharge(id, "v1.invoice.paid");
      expect(p2.etat).toBe("prise");
      await marquerTraite(id, prise(p2));
      expect(await prendreEnCharge(id, "v1.invoice.paid")).toEqual({ etat: "deja-traite" });
      expect(await prisma.evenementStripe.findUnique({ where: { id } })).toMatchObject({ derniereErreur: null });
    });

    it("un événement traité ne se reprend pas, même renvoyé bien après sa prise", async () => {
      const t0 = new Date(Date.now() - PRISE_EXPIREE_MS - 60_000);
      const p = await prendreEnCharge("evt_integ_4", "v1.invoice.paid", t0);
      await marquerTraite("evt_integ_4", prise(p), null, t0);
      expect(await prendreEnCharge("evt_integ_4", "v1.invoice.paid")).toEqual({ etat: "deja-traite" });
    });

    it("une prise abandonnée puis reprise : l'ancienne livraison ne touche plus à rien", async () => {
      const t0 = new Date(Date.now() - PRISE_EXPIREE_MS - 1000);
      const ancienne = await prendreEnCharge("evt_integ_5", "v1.invoice.paid", t0);
      const reprise = await prendreEnCharge("evt_integ_5", "v1.invoice.paid");
      // La reprise tourne encore : l'ancienne échoue, puis croit avoir fini.
      await marquerEchec("evt_integ_5", prise(ancienne), "base : P1001");
      await marquerTraite("evt_integ_5", prise(ancienne), null);
      expect(await prisma.evenementStripe.findUnique({ where: { id: "evt_integ_5" } })).toMatchObject({
        traitementDebuteLe: prise(reprise),
        traiteLe: null,
        derniereErreur: null,
      });
      expect(await prendreEnCharge("evt_integ_5", "v1.invoice.paid")).toEqual({ etat: "en-cours" });
      await marquerTraite("evt_integ_5", prise(reprise), null);
      expect(await prendreEnCharge("evt_integ_5", "v1.invoice.paid")).toEqual({ etat: "deja-traite" });
    });

    it("deux livraisons simultanées : une seule prise", async () => {
      const prises = await Promise.all(Array.from({ length: 5 }, () => prendreEnCharge("evt_integ_2", "v1.invoice.paid")));
      expect(prises.filter((p) => p.etat === "prise")).toHaveLength(1);
    });

    it("une prise abandonnée (processus tué) se reprend après le délai", async () => {
      const t0 = new Date(Date.now() - PRISE_EXPIREE_MS - 1000);
      expect((await prendreEnCharge("evt_integ_3", "v1.invoice.paid", t0)).etat).toBe("prise");
      expect((await prendreEnCharge("evt_integ_3", "v1.invoice.paid")).etat).toBe("prise");
    });

    it("le ménage n'oublie que les anciens", async () => {
      await prisma.evenementStripe.create({
        data: { id: "evt_integ_vieux", type: "x", recuLe: new Date(Date.now() - CONSERVATION_MS - 60_000) },
      });
      await prisma.evenementStripe.create({ data: { id: "evt_integ_recent", type: "x" } });
      await oublierLesAnciens();
      expect(await prisma.evenementStripe.findMany({ where: { id: { startsWith: "evt_integ_" } }, select: { id: true } }))
        .toEqual([{ id: "evt_integ_recent" }]);
    });
  });
});
