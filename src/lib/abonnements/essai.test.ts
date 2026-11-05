import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
  getOptionalCompte: vi.fn(),
  requireCompteDOnboarding: vi.fn(),
  configurationStripe: vi.fn(),
  contexte: { stripeActif: true, exige: true },
  clientStripe: vi.fn(() => ({})),
  creerClientStripe: vi.fn(),
  demarrerEssai: vi.fn(),
  prixDesFormules: vi.fn(),
  synchroniserClientStripe: vi.fn(),
  ordre: [] as string[],
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/lib/auth/compte", () => ({
  getOptionalCompte: m.getOptionalCompte,
  requireCompteDOnboarding: m.requireCompteDOnboarding,
}));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: m.configurationStripe }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: m.clientStripe }));
vi.mock("@/lib/stripe/parcours", () => ({
  creerClientStripe: m.creerClientStripe,
  demarrerEssai: m.demarrerEssai,
  prixDesFormules: m.prixDesFormules,
}));
vi.mock("@/lib/stripe/synchronisation", async (reel) => ({
  ...(await reel<typeof import("@/lib/stripe/synchronisation")>()),
  synchroniserClientStripe: m.synchroniserClientStripe,
}));
vi.mock("./saisie", () => ({
  PAGE_ABONNEMENT: "/compte/abonnement",
  PAGE_MEMBRES: "/compte/membres",
  contexteDroits: () => ({ ...m.contexte, maintenant: new Date() }),
  offreLancee: (c: { stripeActif: boolean; exige: boolean }) => c.stripeActif && c.exige,
}));

import { aiguillageEssai, demarrerEssaiDuCompte } from "./essai";

const FORMULE = "rojer_essentiel_mensuel";
const db = {
  abonnement: { findUnique: vi.fn(), create: vi.fn() },
  acceptationConditions: { create: vi.fn() },
};
const compte = (role = "owner") => ({ user: { id: "u1", email: "a@b.fr" }, compte: { compteId: "c1", role }, db });
const redirigeVers = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as { url?: string }).url;
  }
  return null;
};

beforeEach(() => {
  vi.clearAllMocks();
  m.ordre.length = 0;
  m.contexte.stripeActif = true;
  m.contexte.exige = true;
  m.configurationStripe.mockReturnValue({ active: true, cle: "sk_test_x", secretWebhook: "whsec_x", mode: "test" });
  m.requireCompteDOnboarding.mockResolvedValue(compte());
  m.prixDesFormules.mockResolvedValue(new Map([[FORMULE, { priceId: "price_e", montantCentimes: 2900, devise: "eur" }]]));
  db.abonnement.findUnique.mockResolvedValue(null);
  m.creerClientStripe.mockImplementation(async () => (m.ordre.push("client"), "cus_1"));
  db.abonnement.create.mockImplementation(async () => m.ordre.push("réservation"));
  db.acceptationConditions.create.mockImplementation(async () => m.ordre.push("acceptation"));
  m.demarrerEssai.mockImplementation(async () => m.ordre.push("essai"));
  m.synchroniserClientStripe.mockImplementation(async () => (m.ordre.push("relecture"), { issue: "ecrit" }));
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

  it("essai déjà pris ou abonnement existant : plus d'écran d'essai ; une réservation interrompue le laisse ouvert", async () => {
    m.getOptionalCompte.mockResolvedValue(compte());
    db.abonnement.findUnique.mockResolvedValueOnce({ stripeSubscriptionId: null, essaiUtiliseLe: new Date() });
    expect(await aiguillageEssai()).toBeNull();
    db.abonnement.findUnique.mockResolvedValueOnce({ stripeSubscriptionId: "sub_1", essaiUtiliseLe: null });
    expect(await aiguillageEssai()).toBeNull();
    db.abonnement.findUnique.mockResolvedValueOnce({ stripeSubscriptionId: null, essaiUtiliseLe: null });
    expect(await aiguillageEssai()).toBe("/essai");
  });
});

describe("demarrerEssaiDuCompte", () => {
  it("dans l'ordre : client, ligne réservée, preuve d'acceptation, essai, relecture — puis l'onboarding", async () => {
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    expect(m.ordre).toEqual(["client", "réservation", "acceptation", "essai", "relecture"]);
    expect(m.creerClientStripe).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ metadata: { compteId: "c1" }, idempotence: "c1" }));
    expect(m.demarrerEssai).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "cus_1", priceId: "price_e", metadata: { compteId: "c1" } }));
    expect(db.acceptationConditions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ compteId: "c1", userId: "u1", contexte: "essai", version: expect.any(String), empreinte: expect.stringMatching(/^[0-9a-f]{64}$/) }),
    });
  });

  it("sans la case cochée, ou avec une formule inconnue : une erreur, rien chez Stripe", async () => {
    expect(await demarrerEssaiDuCompte(FORMULE, false)).toEqual({ status: "error", message: expect.stringMatching(/conditions générales/) });
    expect(await demarrerEssaiDuCompte("rojer_surmesure_mensuel", true)).toMatchObject({ status: "error" });
    expect(m.requireCompteDOnboarding).not.toHaveBeenCalled();
    expect(m.creerClientStripe).not.toHaveBeenCalled();
  });

  it("un membre qui n'est pas propriétaire : la page des membres, rien chez Stripe", async () => {
    m.requireCompteDOnboarding.mockResolvedValue(compte("member"));
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/compte/membres?reserve=proprietaire");
    expect(m.creerClientStripe).not.toHaveBeenCalled();
  });

  it("essai déjà pris : la page de l'abonnement, pas de second essai", async () => {
    db.abonnement.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", stripeSubscriptionId: null, essaiUtiliseLe: new Date() });
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/compte/abonnement");
    expect(m.demarrerEssai).not.toHaveBeenCalled();
  });

  it("une réservation interrompue reprend avec son client, sans en créer un autre", async () => {
    db.abonnement.findUnique.mockResolvedValue({ stripeCustomerId: "cus_ancien", stripeSubscriptionId: null, essaiUtiliseLe: null });
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    expect(m.creerClientStripe).not.toHaveBeenCalled();
    expect(db.abonnement.create).not.toHaveBeenCalled();
    expect(m.demarrerEssai).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "cus_ancien" }));
  });

  it("double clic : la réservation déjà posée par l'autre envoi avec le même client est reprise ; un autre client est refusé", async () => {
    db.abonnement.create.mockRejectedValueOnce({ code: "P2002" });
    db.abonnement.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ stripeCustomerId: "cus_1" });
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");

    db.abonnement.create.mockRejectedValueOnce({ code: "P2002" });
    db.abonnement.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ stripeCustomerId: "cus_autre" });
    expect(await demarrerEssaiDuCompte(FORMULE, true)).toMatchObject({ status: "error" });
  });

  it("Stripe en panne : une erreur affichable qui dit que rien n'a été facturé, sans détail technique", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.demarrerEssai.mockRejectedValue(new Error("No such price: client@exemple.fr"));
    const r = await demarrerEssaiDuCompte(FORMULE, true);
    expect(r).toEqual({ status: "error", message: expect.stringMatching(/rien ne vous a été facturé/) });
    expect(JSON.stringify(r)).not.toContain("exemple.fr");
  });

  it("offre non lancée ou Stripe désactivé : l'onboarding, rien de créé", async () => {
    m.contexte.exige = false;
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    m.contexte.exige = true;
    m.configurationStripe.mockReturnValue({ active: false, motif: null });
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    expect(m.requireCompteDOnboarding).not.toHaveBeenCalled();
  });
});
