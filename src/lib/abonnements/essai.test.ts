import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirigeVers } from "@/test/redirection";

// L'essai se compte chez Rojer (ADR-053 § 9, amendé le 2026-11-16) : son
// démarrage n'appelle jamais Stripe.

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
  getOptionalCompte: vi.fn(),
  requireCompteDOnboarding: vi.fn(),
  configurationStripe: vi.fn(),
  contexte: { stripeActif: true, exige: true },
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/lib/auth/compte", () => ({
  getOptionalCompte: m.getOptionalCompte,
  requireCompteDOnboarding: m.requireCompteDOnboarding,
}));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: m.configurationStripe }));
vi.mock("./saisie", () => ({
  PAGE_ABONNEMENT: "/compte/abonnement",
  PAGE_MEMBRES: "/compte/membres",
  abonnementDuCompte: (d: typeof db, compteId: string) => d.abonnement.findUnique({ where: { compteId } }),
  contexteDroits: () => ({ ...m.contexte, maintenant: new Date() }),
  offreLancee: (c: { stripeActif: boolean; exige: boolean }) => c.stripeActif && c.exige,
}));

import { aiguillageEssai, demarrerEssaiDuCompte } from "./essai";
import { MESSAGE_COMPTE_CHANGE } from "@/lib/auth/compte-attendu";

const db = {
  abonnement: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  acceptationConditions: { create: vi.fn() },
  // La transaction rejoue le même client : une erreur l'annule entière.
  $transaction: vi.fn(async (f: (tx: unknown) => unknown) => f(db)),
};
const compte = (role = "owner") => ({ user: { id: "u1", email: "a@b.fr" }, compte: { compteId: "c1", role }, db });
const JOUR_MS = 24 * 3_600_000;

beforeEach(() => {
  vi.clearAllMocks();
  m.contexte.stripeActif = true;
  m.contexte.exige = true;
  m.configurationStripe.mockReturnValue({ active: true, cle: "sk_test_x", secretWebhook: "whsec_x", mode: "test" });
  m.requireCompteDOnboarding.mockResolvedValue(compte());
  db.abonnement.findUnique.mockResolvedValue(null);
  db.abonnement.create.mockResolvedValue({});
  db.abonnement.updateMany.mockResolvedValue({ count: 1 });
  db.acceptationConditions.create.mockResolvedValue({ id: "acc_1" });
});

describe("aiguillageEssai", () => {
  it("offre non lancée : jamais, sans rien lire", async () => {
    m.contexte.exige = false;
    expect(await aiguillageEssai()).toBeNull();
    expect(m.getOptionalCompte).not.toHaveBeenCalled();
  });

  it("sans compte, ou propriétaire sans essai pris : l'écran d'essai ; un membre : jamais", async () => {
    m.getOptionalCompte.mockResolvedValueOnce(null);
    expect(await aiguillageEssai()).toBe("/essai");
    m.getOptionalCompte.mockResolvedValueOnce(compte("owner"));
    expect(await aiguillageEssai()).toBe("/essai");
    m.getOptionalCompte.mockResolvedValueOnce(compte("member"));
    expect(await aiguillageEssai()).toBeNull();
  });

  it("essai déjà pris, ou abonné : plus d'écran d'essai", async () => {
    m.getOptionalCompte.mockResolvedValue(compte());
    db.abonnement.findUnique.mockResolvedValueOnce({ statut: null, essaiUtiliseLe: new Date() });
    expect(await aiguillageEssai()).toBeNull();
    db.abonnement.findUnique.mockResolvedValueOnce({ statut: "canceled", essaiUtiliseLe: null });
    expect(await aiguillageEssai()).toBeNull();
    db.abonnement.findUnique.mockResolvedValueOnce({ statut: null, essaiUtiliseLe: null });
    expect(await aiguillageEssai()).toBe("/essai");
  });
});

describe("demarrerEssaiDuCompte", () => {
  it("une transaction : la ligne (début, fin à 30 jours, horloge de suppression à la fin) et la preuve d'acceptation — puis /entreprises", async () => {
    const avant = Date.now();
    expect(await redirigeVers(demarrerEssaiDuCompte(true, new FormData()))).toBe("/entreprises");
    expect(db.$transaction).toHaveBeenCalledOnce();
    const data = db.abonnement.create.mock.calls[0][0].data;
    expect(data.compteId).toBe("c1");
    expect(data.essaiUtiliseLe.getTime()).toBeGreaterThanOrEqual(avant);
    const duree = data.finEssai.getTime() - data.essaiUtiliseLe.getTime();
    // Trente jours civils (une heure de plus ou de moins au changement d'heure).
    expect(Math.abs(duree - 30 * JOUR_MS)).toBeLessThanOrEqual(3_600_000);
    expect(data.sansAbonnementDepuis).toEqual(data.finEssai);
    expect(data).not.toHaveProperty("stripeCustomerId");
    expect(db.acceptationConditions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ compteId: "c1", userId: "u1", contexte: "essai", version: expect.any(String), empreinte: expect.stringMatching(/^[0-9a-f]{64}$/) }),
    });
  });

  it("une ligne sans essai ni abonnement (d'avant ce lot) : prise par une écriture conditionnelle", async () => {
    db.abonnement.findUnique.mockResolvedValue({ essaiUtiliseLe: null, statut: null });
    expect(await redirigeVers(demarrerEssaiDuCompte(true, new FormData()))).toBe("/entreprises");
    expect(db.abonnement.updateMany.mock.calls[0][0]).toMatchObject({ where: { compteId: "c1", essaiUtiliseLe: null, statut: null } });
    expect(db.abonnement.create).not.toHaveBeenCalled();
  });

  it("essai déjà pris, ou abonné : la page de l'abonnement, ni second essai ni seconde preuve", async () => {
    for (const existante of [{ essaiUtiliseLe: new Date(), statut: null }, { essaiUtiliseLe: null, statut: "canceled" }]) {
      db.abonnement.findUnique.mockResolvedValueOnce(existante);
      expect(await redirigeVers(demarrerEssaiDuCompte(true, new FormData()))).toBe("/compte/abonnement");
    }
    expect(db.abonnement.create).not.toHaveBeenCalled();
    expect(db.acceptationConditions.create).not.toHaveBeenCalled();
  });

  it("deux onglets : l'écriture conditionnelle ou l'unicité du compte départagent, l'autre va à la page de l'abonnement", async () => {
    db.abonnement.findUnique.mockResolvedValue({ essaiUtiliseLe: null, statut: null });
    db.abonnement.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await redirigeVers(demarrerEssaiDuCompte(true, new FormData()))).toBe("/compte/abonnement");
    expect(db.acceptationConditions.create).not.toHaveBeenCalled();
    db.abonnement.findUnique.mockResolvedValue(null);
    db.abonnement.create.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));
    expect(await redirigeVers(demarrerEssaiDuCompte(true, new FormData()))).toBe("/compte/abonnement");
  });

  it("sans la case cochée : une erreur, rien d'écrit", async () => {
    expect(await demarrerEssaiDuCompte(false, new FormData())).toEqual({ status: "error", message: expect.stringMatching(/conditions générales/) });
    expect(m.requireCompteDOnboarding).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("un autre onglet a changé de compte : le refus le dit, rien d'écrit (audit du 2026-11-10)", async () => {
    const page = new FormData();
    m.requireCompteDOnboarding.mockResolvedValue(null);
    expect(await demarrerEssaiDuCompte(true, page)).toEqual({ status: "error", message: MESSAGE_COMPTE_CHANGE });
    expect(m.requireCompteDOnboarding).toHaveBeenCalledWith(page, { page: "/essai" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("un membre qui n'est pas propriétaire : la page des membres, rien d'écrit", async () => {
    m.requireCompteDOnboarding.mockResolvedValue(compte("member"));
    expect(await redirigeVers(demarrerEssaiDuCompte(true, new FormData()))).toBe("/compte/membres?reserve=proprietaire");
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("offre non lancée ou Stripe désactivé : l'onboarding, rien de créé", async () => {
    m.contexte.exige = false;
    expect(await redirigeVers(demarrerEssaiDuCompte(true, new FormData()))).toBe("/onboarding");
    m.contexte.exige = true;
    m.configurationStripe.mockReturnValue({ active: false, motif: null });
    expect(await redirigeVers(demarrerEssaiDuCompte(true, new FormData()))).toBe("/onboarding");
    expect(m.requireCompteDOnboarding).not.toHaveBeenCalled();
  });
});
