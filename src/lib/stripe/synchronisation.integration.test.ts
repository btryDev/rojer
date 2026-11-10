// La file Stripe contre un VRAI PostgreSQL (ADR-053 § 5, amendé le
// 2026-11-10) : l'aiguillage d'un événement (une seule prise, l'issue en une
// transaction), la relecture d'un client sous bail à jeton (un worker dont le
// bail a expiré n'écrit rien), l'écriture de l'abonnement par le client borné
// au compte — jamais sur la ligne d'un autre client Stripe —, et
// l'exécution du jour des tâches quotidiennes. Stripe est simulé : seule la
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
// L'appartenance réelle : un client d'avant l'ADR-054 se rattache par son propriétaire.
vi.unmock("@/lib/auth/membres");
vi.mock("@/lib/auth/better-auth", () => ({ auth: {} }));
vi.mock("@/lib/auth/require-user", () => ({ lireSessionCourante: async () => null }));

const URL_BASE = process.env.STRIPE_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("webhook Stripe — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { synchroniserClientStripe, synchroniserSousBail } = await import("./synchronisation");
  const { enregistrer, prendre, marquerAiguille, marquerEchec, oublierLesAnciens, evenementsAAiguiller, PRISE_EXPIREE_MS, CONSERVATION_MS } =
    await import("./evenements");
  const { demanderSynchronisation, demanderSynchronisations, prendreBail, clientsDus, BAIL_MS, ESSAIS_EN_MINUTES } = await import("./file");
  const { prendreLeJour, terminerLeJour, BAIL_DU_JOUR_MS } = await import("@/lib/taches/jour");
  const CLIENTS = ["cus_A", "cus_B", "cus_X", "cus_F", "cus_autre", "cus_integ_file"];
  const JOUR = "1999-01-01";

  // Les comptes A et B (ADR-054) et leurs propriétaires.
  const A = "00000000-0000-0000-0000-5715e000000a";
  const B = "00000000-0000-0000-0000-5715e000000b";
  const UA = "00000000-0000-0000-0000-5715e00001aa";
  const UB = "00000000-0000-0000-0000-5715e00001bb";

  async function menage() {
    await prisma.abonnement.deleteMany({ where: { compteId: { in: [A, B] } } });
    await prisma.evenementStripe.deleteMany({ where: { id: { startsWith: "evt_integ_" } } });
    await prisma.synchronisationStripe.deleteMany({ where: { customerId: { in: CLIENTS } } });
    await prisma.tacheQuotidienne.deleteMany({ where: { jour: JOUR } });
  }

  beforeAll(async () => {
    for (const [compteId, id] of [[A, UA], [B, UB]]) {
      await prisma.user.upsert({ where: { id }, create: { id, name: id, email: `${id}@exemple.invalid` }, update: {} });
      await prisma.compte.upsert({
        where: { id: compteId },
        create: { id: compteId, name: compteId, slug: compteId, membres: { create: { userId: id, role: "owner" } } },
        update: {},
      });
    }
  });
  beforeEach(menage);
  afterAll(async () => {
    await menage();
    await prisma.compte.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.user.deleteMany({ where: { id: { in: [UA, UB] } } });
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
      items: { data: [{ current_period_end: 1_800_000_000, price: { id: "price_1", lookup_key: o.prix ?? "rojer_essentiel_mensuel" } }] },
      ...o,
    }) as unknown as Stripe.Subscription;

  const stripe = (
    compteId: string,
    abonnements: Stripe.Subscription[] | Error,
    client?: object,
    factures: object[] = [],
    attendre: Promise<void> = Promise.resolve(),
  ) =>
    ({
      customers: {
        retrieve: async (id: string) => {
          await attendre;
          return client ?? { id, metadata: { compteId } };
        },
      },
      invoices: { list: () => ({ autoPagingToArray: async () => factures }) },
      subscriptions: {
        list: () => ({
          autoPagingToArray: async () => {
            if (abonnements instanceof Error) throw abonnements;
            return abonnements;
          },
        }),
        retrieve: async (id: string) => {
          const s = abonnements instanceof Error ? undefined : abonnements.find((a) => a.id === id);
          if (!s) throw new Error("introuvable");
          return s;
        },
      },
    }) as unknown as Stripe;
  vi.spyOn(console, "error").mockImplementation(() => {});

  const ligne = (compteId: string) => prisma.abonnement.findUnique({ where: { compteId } });

  describe("synchroniserClientStripe", () => {
    it("premier paiement : la plus ancienne facture payée non nulle, écrite une fois, jamais écrasée", async () => {
      const facture = (paye: number, montant: number) => ({ amount_paid: montant, status_transitions: { paid_at: paye } });
      const actif = [abo({ id: "sub_1", status: "active", created: 1 })];
      // Facture d'essai à zéro seulement : pas encore de paiement.
      await synchroniserClientStripe(stripe(A, actif, undefined, [facture(500, 0)]), "cus_A", { maintenant: () => new Date(1000) });
      expect((await ligne(A))?.debutPayantLe).toBeNull();
      await synchroniserClientStripe(stripe(A, actif, undefined, [facture(900, 2900), facture(700, 2900), facture(500, 0)]), "cus_A", { maintenant: () => new Date(2000) });
      expect((await ligne(A))?.debutPayantLe).toEqual(new Date(700_000));
      // Une relecture plus tard (nouvelles factures, ou une liste vide) ne la déplace pas.
      await synchroniserClientStripe(stripe(A, actif, undefined, [facture(100, 2900)]), "cus_A", { maintenant: () => new Date(3000) });
      expect((await ligne(A))?.debutPayantLe).toEqual(new Date(700_000));
      // Le client supprimé ensuite : la résiliation s'écrit, la date reste.
      const supprime = stripe(A, [abo({ id: "sub_1", status: "canceled", created: 1, metadata: { compteId: A } })], { id: "cus_A", deleted: true });
      await synchroniserClientStripe(supprime, "cus_A", { maintenant: () => new Date(4000) });
      expect(await ligne(A)).toMatchObject({ statut: "canceled", debutPayantLe: new Date(700_000) });
    });

    it("la liste des factures en échec ne bloque pas la relecture : l'état s'écrit, la date viendra plus tard", async () => {
      const s = stripe(B, [abo({ id: "sub_2", status: "active", created: 1 })]);
      (s as unknown as { invoices: { list: () => unknown } }).invoices.list = () => ({
        autoPagingToArray: async () => {
          throw new Error("délai dépassé");
        },
      });
      expect(await synchroniserClientStripe(s, "cus_B", { maintenant: () => new Date(1000) })).toEqual({ issue: "ecrit" });
      expect(await ligne(B)).toMatchObject({ statut: "active", debutPayantLe: null });
      // Depuis un geste : le bail est rendu sans couvrir la demande — la file fera la relecture stricte.
      expect(await clientsDus(new Date(1500), 10)).toContain("cus_B");
      // Depuis la file (strict) : l'état s'écrit, et le client reste dû, retenté plus tard pour la date.
      expect(await synchroniserClientStripe(s, "cus_B", { maintenant: () => new Date(2000), strict: true })).toEqual({ issue: "ecrit" });
      expect(await ligne(B)).toMatchObject({ statut: "active", debutPayantLe: null });
      expect(await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_B" } })).toMatchObject({
        tentatives: 1,
        bailJusquAu: null,
        prochainEssaiLe: new Date(2000 + ESSAIS_EN_MINUTES[0] * 60_000),
      });
      expect(await clientsDus(new Date(2000 + ESSAIS_EN_MINUTES[0] * 60_000), 10)).toContain("cus_B");
    });

    it("un client d'avant l'ADR-054 (metadata.userId) écrit au compte dont la personne est propriétaire", async () => {
      const s = stripe(A, [abo({ id: "sub_1", status: "active", created: 1 })], { id: "cus_A", metadata: { userId: UA } });
      expect(await synchroniserClientStripe(s, "cus_A", { maintenant: () => new Date(1000) })).toEqual({ issue: "ecrit" });
      expect(await ligne(A)).toMatchObject({ stripeCustomerId: "cus_A", statut: "active" });
      expect(await ligne(B)).toBeNull();
    });

    it("crée la ligne du compte que désigne le client Stripe relu, puis la met à jour", async () => {
      const essai = 1_780_000_000;
      const s1 = stripe(A, [abo({ id: "sub_1", status: "trialing", created: 1, trial_start: essai })]);
      expect(await synchroniserClientStripe(s1, "cus_A", { maintenant: () => new Date(1000) })).toEqual({ issue: "ecrit" });
      expect(await ligne(A)).toMatchObject({
        stripeCustomerId: "cus_A",
        stripeSubscriptionId: "sub_1",
        statut: "trialing",
        formule: "rojer_essentiel_mensuel",
        essaiUtiliseLe: new Date(essai * 1000),
      });

      const s2 = stripe(A, [abo({ id: "sub_1", status: "active", created: 1 })]);
      expect(await synchroniserClientStripe(s2, "cus_A", { maintenant: () => new Date(2000) })).toEqual({ issue: "ecrit" });
      // L'essai consommé le reste, même quand l'abonnement relu n'en a plus.
      expect(await ligne(A)).toMatchObject({ statut: "active", essaiUtiliseLe: new Date(essai * 1000) });
    });

    it("une relecture plus ancienne que la dernière écrite n'écrase rien (livraisons croisées)", async () => {
      await synchroniserClientStripe(stripe(A, [abo({ id: "sub_1", status: "active", created: 1 })]), "cus_A", { maintenant: () => new Date(5000) });
      const tardive = stripe(A, [abo({ id: "sub_1", status: "past_due", created: 1 })]);
      expect(await synchroniserClientStripe(tardive, "cus_A", { maintenant: () => new Date(4000) })).toEqual({ issue: "inchange" });
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
      await prisma.abonnement.create({ data: { compteId: A, stripeCustomerId: "cus_A", statut: "active" } });
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
      await prisma.abonnement.create({ data: { compteId: A, stripeCustomerId: "cus_A", statut: "active" } });
      const s = stripe(A, [abo({ id: "sub_1", status: "canceled", created: 1, metadata: { compteId: A } })], {
        id: "cus_A",
        deleted: true,
      });
      expect(await synchroniserClientStripe(s, "cus_A")).toEqual({ issue: "ecrit" });
      expect((await ligne(A))?.statut).toBe("canceled");
    });

    it("client Stripe supprimé dont la liste est refusée : le dernier abonnement vu à l'aiguillage, relu, suffit", async () => {
      await prisma.abonnement.create({ data: { compteId: A, stripeCustomerId: "cus_A", statut: "active" } });
      const lu = abo({ id: "sub_1", status: "canceled", created: 1, metadata: { compteId: A }, customer: "cus_A" } as never);
      const s = stripe(A, new Error("resource_missing"), { id: "cus_A", deleted: true });
      (s as unknown as { subscriptions: { retrieve: unknown } }).subscriptions.retrieve = async () => lu;
      await demanderSynchronisation("cus_A", new Date(), { abonnementId: "sub_1" });
      expect(await synchroniserSousBail(s, "cus_A")).toEqual({ issue: "ecrit" });
      expect((await ligne(A))?.statut).toBe("canceled");
      // Client présent : une liste refusée est une panne, retentée plus tard ; rien n'est écrit.
      await expect(synchroniserClientStripe(stripe(A, new Error("panne")), "cus_A")).rejects.toThrow("panne");
      expect((await ligne(A))?.statut).toBe("canceled");
      expect(await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_A" } })).toMatchObject({ tentatives: 1, bailJusquAu: null });
    });

    it("compte disparu : sans effet, signalé, sans erreur que Stripe relancerait", async () => {
      const fantome = "00000000-0000-0000-0000-5715e00000ff";
      const s = stripe(fantome, [abo({ id: "sub_f", status: "active", created: 1 })]);
      expect(await synchroniserClientStripe(s, "cus_F")).toMatchObject({ issue: "ignore", alerte: true });
    });

    it("client Stripe déjà à un autre compte : sans effet, signalé, rien d'écrit", async () => {
      await prisma.abonnement.create({ data: { compteId: B, stripeCustomerId: "cus_X", statut: "active" } });
      const s = stripe(A, [abo({ id: "sub_x", status: "canceled", created: 1 })]);
      expect(await synchroniserClientStripe(s, "cus_X")).toMatchObject({ issue: "ignore", alerte: true });
      expect(await ligne(A)).toBeNull();
      expect(await ligne(B)).toMatchObject({ stripeCustomerId: "cus_X", statut: "active" });
    });

    it("abonnement déjà sur la ligne d'un autre compte : sans effet, signalé", async () => {
      await prisma.abonnement.create({ data: { compteId: B, stripeCustomerId: "cus_B", stripeSubscriptionId: "sub_b" } });
      await prisma.abonnement.create({ data: { compteId: A, stripeCustomerId: "cus_A" } });
      const s = stripe(A, [abo({ id: "sub_b", status: "active", created: 1 })]);
      expect(await synchroniserClientStripe(s, "cus_A")).toMatchObject({ issue: "ignore", alerte: true });
    });

    it("n'écrit jamais dans un autre compte que celui du client Stripe relu", async () => {
      await prisma.abonnement.create({ data: { compteId: B, stripeCustomerId: "cus_B", statut: "active" } });
      await synchroniserClientStripe(stripe(A, [abo({ id: "sub_a", status: "canceled", created: 1 })]), "cus_A");
      expect(await ligne(B)).toMatchObject({ stripeCustomerId: "cus_B", statut: "active" });
      expect(await ligne(A)).toMatchObject({ stripeCustomerId: "cus_A", statut: "canceled" });
    });
  });

  describe("le bail d'une relecture", () => {
    it("un worker dont le bail a expiré n'écrit rien : celui qui l'a repris l'emporte", async () => {
      // A prend le bail et reste bloqué chez Stripe ; son bail expire ; B le
      // reprend et écrit ; A revient avec un état plus ancien.
      let debloquerA!: () => void;
      const aBloque = new Promise<void>((r) => (debloquerA = r));
      const t0 = new Date();
      const lenteA = synchroniserClientStripe(stripe(A, [abo({ id: "sub_1", status: "past_due", created: 1 })], undefined, [], aBloque), "cus_A", {
        maintenant: () => t0,
      });
      // Le bail de A est pris (la relecture attend chez Stripe).
      await vi.waitFor(async () => expect((await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_A" } }))?.bailJusquAu).toBeInstanceOf(Date));
      const apres = new Date(t0.getTime() + BAIL_MS + 1000);
      expect(
        await synchroniserClientStripe(stripe(A, [abo({ id: "sub_1", status: "active", created: 1 })]), "cus_A", { maintenant: () => apres }),
      ).toEqual({ issue: "ecrit" });
      debloquerA();
      expect(await lenteA).toEqual({ issue: "en_file" });
      expect((await ligne(A))?.statut).toBe("active");
    });

    it("tant que le bail court, une seconde relecture ne le prend pas : sa demande est notée", async () => {
      const t = new Date();
      await demanderSynchronisation("cus_integ_file", t);
      const bail = await prendreBail("cus_integ_file", t);
      expect(bail).toMatchObject({ jeton: 1, demandes: 1 });
      expect(await prendreBail("cus_integ_file", t)).toBeNull();
      expect(await synchroniserClientStripe(stripe(A, []), "cus_integ_file", { maintenant: () => t })).toEqual({ issue: "en_file" });
      expect(await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_integ_file" } })).toMatchObject({ demandes: 2 });
      // Expiré : repris, jeton suivant, les deux demandes à couvrir.
      expect(await prendreBail("cus_integ_file", new Date(t.getTime() + BAIL_MS + 1))).toMatchObject({ jeton: 2, demandes: 2 });
    });

    it("une demande arrivée pendant la relecture laisse le client dû : il repasse", async () => {
      let debloquer!: () => void;
      const bloque = new Promise<void>((r) => (debloquer = r));
      const t = new Date();
      const relecture = synchroniserClientStripe(stripe(A, [abo({ id: "sub_1", status: "active", created: 1 })], undefined, [], bloque), "cus_A", {
        maintenant: () => t,
      });
      await vi.waitFor(async () => expect((await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_A" } }))?.bailJusquAu).toBeInstanceOf(Date));
      await demanderSynchronisation("cus_A", t);
      debloquer();
      expect(await relecture).toEqual({ issue: "ecrit" });
      expect(await clientsDus(t, 10)).toContain("cus_A");
    });

    it("échecs répétés : essais espacés, puis échec durable ; une demande neuve le relance", async () => {
      const t = new Date();
      await demanderSynchronisation("cus_integ_file", t);
      let quand = t;
      for (let i = 0; i < ESSAIS_EN_MINUTES.length + 1; i++) {
        await expect(synchroniserSousBail(stripe(A, new Error("panne")), "cus_integ_file", { maintenant: () => quand })).rejects.toThrow("panne");
        const l = await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_integ_file" } });
        quand = l!.prochainEssaiLe;
      }
      const l = await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_integ_file" } });
      expect(l?.echecDurableLe).not.toBeNull();
      expect(await clientsDus(new Date(quand.getTime() + 3_600_000), 10)).not.toContain("cus_integ_file");
      await demanderSynchronisation("cus_integ_file", quand);
      expect(await clientsDus(quand, 10)).toContain("cus_integ_file");
    });
  });

  describe("le rapprochement", () => {
    it("demande en une requête : crée les absents, ajoute une demande aux présents, relance un échec durable", async () => {
      const t = new Date();
      await demanderSynchronisation("cus_A", t);
      await prisma.synchronisationStripe.update({ where: { customerId: "cus_A" }, data: { echecDurableLe: t, traitees: 1 } });
      await demanderSynchronisations(["cus_A", "cus_B"], t);
      expect(await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_A" } })).toMatchObject({ demandes: 2, traitees: 1, echecDurableLe: null });
      expect(await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_B" } })).toMatchObject({ demandes: 1, traitees: 0 });
      expect(await clientsDus(t, 10)).toEqual(expect.arrayContaining(["cus_A", "cus_B"]));
    });
  });

  describe("aiguillage d'un événement", () => {
    it("enregistré une fois ; un doublon ne crée rien", async () => {
      expect(await enregistrer("evt_integ_1", "v1.invoice.paid", "in_1")).toBe(true);
      expect(await enregistrer("evt_integ_1", "v1.invoice.paid", "in_1")).toBe(false);
      expect(await evenementsAAiguiller(new Date(), 50)).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: "evt_integ_1", objetId: "in_1", tentatives: 0 })]),
      );
    });

    it("une seule prise ; l'issue marque l'événement ET demande le client, en une transaction", async () => {
      await enregistrer("evt_integ_2", "v1.invoice.paid", "in_2");
      const t = new Date();
      const prises = await Promise.all(Array.from({ length: 5 }, () => prendre("evt_integ_2", t)));
      const prise = prises.find((p) => p !== null)!;
      expect(prises.filter((p) => p !== null)).toHaveLength(1);
      expect(await marquerAiguille("evt_integ_2", prise, { clientStripe: "cus_integ_file" }, 12, t)).toBe(true);
      expect(await prisma.evenementStripe.findUnique({ where: { id: "evt_integ_2" } })).toMatchObject({
        clientStripe: "cus_integ_file",
        dureeMs: 12,
        traiteLe: t,
      });
      expect(await clientsDus(t, 10)).toContain("cus_integ_file");
      expect(await prendre("evt_integ_2", t)).toBeNull();
    });

    it("une prise reprise entre-temps : l'ancienne ne marque rien et ne demande rien", async () => {
      await enregistrer("evt_integ_3", "v1.invoice.paid", "in_3");
      const t0 = new Date(Date.now() - PRISE_EXPIREE_MS - 1000);
      const ancienne = (await prendre("evt_integ_3", t0))!;
      const reprise = (await prendre("evt_integ_3", new Date()))!;
      expect(reprise).not.toBeNull();
      expect(await marquerAiguille("evt_integ_3", ancienne, { clientStripe: "cus_integ_file" }, 1, new Date())).toBe(false);
      expect(await marquerEchec({ id: "evt_integ_3", tentatives: 0 }, ancienne, "base : P1001", new Date())).toBe(false);
      expect(await prisma.synchronisationStripe.findUnique({ where: { customerId: "cus_integ_file" } })).toBeNull();
      expect(await prisma.evenementStripe.findUnique({ where: { id: "evt_integ_3" } })).toMatchObject({
        traitementDebuteLe: reprise,
        traiteLe: null,
        tentatives: 0,
      });
    });

    it("en échec : retenté plus tard, puis échec durable — plus jamais repris seul", async () => {
      await enregistrer("evt_integ_4", "v1.invoice.paid", "in_4");
      let quand = new Date();
      for (let tentatives = 0; tentatives < ESSAIS_EN_MINUTES.length + 1; tentatives++) {
        const prise = (await prendre("evt_integ_4", quand))!;
        expect(prise).not.toBeNull();
        const durable = await marquerEchec({ id: "evt_integ_4", tentatives }, prise, "API Stripe : api_error 500", quand);
        expect(durable).toBe(tentatives === ESSAIS_EN_MINUTES.length);
        const l = await prisma.evenementStripe.findUnique({ where: { id: "evt_integ_4" } });
        if (!durable) {
          expect(await prendre("evt_integ_4", quand)).toBeNull(); // pas avant l'essai suivant
          expect((await evenementsAAiguiller(quand, 50)).map((e) => e.id)).not.toContain("evt_integ_4");
        }
        quand = l!.prochainEssaiLe!;
      }
      expect((await evenementsAAiguiller(new Date(quand.getTime() + 3_600_000), 50)).map((e) => e.id)).not.toContain("evt_integ_4");
    });

    it("renvoyé depuis Stripe : un échec durable est relancé ; un événement déjà aiguillé redemande son client", async () => {
      await enregistrer("evt_integ_6", "v1.invoice.paid", "in_6");
      await prisma.evenementStripe.update({ where: { id: "evt_integ_6" }, data: { echecDurableLe: new Date(), tentatives: 9 } });
      expect(await enregistrer("evt_integ_6", "v1.invoice.paid", "in_6")).toBe(true);
      expect(await prisma.evenementStripe.findUnique({ where: { id: "evt_integ_6" } })).toMatchObject({ echecDurableLe: null, tentatives: 0 });

      await enregistrer("evt_integ_7", "v1.invoice.paid", "in_7");
      const t = new Date();
      await marquerAiguille("evt_integ_7", (await prendre("evt_integ_7", t))!, { clientStripe: "cus_integ_file" }, 1, t);
      await prisma.synchronisationStripe.update({ where: { customerId: "cus_integ_file" }, data: { traitees: 1 } });
      expect(await clientsDus(t, 10)).not.toContain("cus_integ_file");
      expect(await enregistrer("evt_integ_7", "v1.invoice.paid", "in_7", t)).toBe(true);
      expect(await clientsDus(t, 10)).toContain("cus_integ_file");
      // Ni l'un ni l'autre : un doublon pendant l'aiguillage, rien à faire.
      await enregistrer("evt_integ_8", "v1.invoice.paid", "in_8");
      expect(await enregistrer("evt_integ_8", "v1.invoice.paid", "in_8")).toBe(false);
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

  describe("l'exécution du jour des tâches quotidiennes", () => {
    it("une seule exécution par jour ; une exécution tuée est reprise ; l'ancienne ne marque rien", async () => {
      const t = new Date();
      const [a, b] = await Promise.all([prendreLeJour(JOUR, t), prendreLeJour(JOUR, t)]);
      expect([a, b].filter((j) => j !== null)).toHaveLength(1);
      // Tenue ailleurs, pas finie : ni jeton ni « faite ».
      expect(await prendreLeJour(JOUR, t)).toBeNull();
      const tue = (a ?? b) as number;
      // Le bail expire (exécution tuée par un déploiement) : reprise, jeton suivant.
      const repris = await prendreLeJour(JOUR, new Date(t.getTime() + BAIL_DU_JOUR_MS + 1));
      expect(repris).toBe(tue + 1);
      expect(await terminerLeJour(JOUR, tue, new Date(), {})).toBe(false);
      expect(await terminerLeJour(JOUR, repris as number, new Date(), { ok: true })).toBe(true);
      expect(await prendreLeJour(JOUR, new Date(t.getTime() + 10 * BAIL_DU_JOUR_MS))).toBe("faite");
    });
  });
});
