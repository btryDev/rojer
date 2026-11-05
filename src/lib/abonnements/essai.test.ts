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
  listeAbonnements: vi.fn(),
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
  abonnementsDuClient: m.listeAbonnements,
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
  abonnementDuCompte: (d: typeof db, compteId: string) => d.abonnement.findUnique({ where: { compteId } }),
  contexteDroits: () => ({ ...m.contexte, maintenant: new Date() }),
  offreLancee: (c: { stripeActif: boolean; exige: boolean }) => c.stripeActif && c.exige,
}));

import { aiguillageEssai, demarrerEssaiDuCompte } from "./essai";

const FORMULE = "rojer_essentiel_mensuel";
const db = {
  abonnement: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  acceptationConditions: { create: vi.fn(), delete: vi.fn() },
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
  db.abonnement.updateMany.mockImplementation(async (a: { where: { essaiUtiliseLe: unknown } }) => {
    m.ordre.push(a.where.essaiUtiliseLe instanceof Date ? "verrou rendu" : "verrou");
    return { count: 1 };
  });
  db.acceptationConditions.create.mockImplementation(async () => (m.ordre.push("acceptation"), { id: "acc_1" }));
  m.listeAbonnements.mockResolvedValue([]);
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

  it("abonnement existant : plus d'écran d'essai ; une réservation ou un démarrage interrompus le laissent ouvert", async () => {
    m.getOptionalCompte.mockResolvedValue(compte());
    db.abonnement.findUnique.mockResolvedValueOnce({ statut: "canceled", stripeSubscriptionId: "sub_1", essaiUtiliseLe: new Date() });
    expect(await aiguillageEssai()).toBeNull();
    db.abonnement.findUnique.mockResolvedValueOnce({ statut: null, stripeSubscriptionId: null, essaiUtiliseLe: new Date() });
    expect(await aiguillageEssai()).toBe("/essai");
    db.abonnement.findUnique.mockResolvedValueOnce({ statut: null, stripeSubscriptionId: null, essaiUtiliseLe: null });
    expect(await aiguillageEssai()).toBe("/essai");
  });
});

describe("demarrerEssaiDuCompte", () => {
  it("dans l'ordre : client, ligne réservée, preuve d'acceptation, essai, relecture — puis l'onboarding", async () => {
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    expect(m.ordre).toEqual(["client", "réservation", "verrou", "acceptation", "essai", "relecture"]);
    expect(db.abonnement.updateMany.mock.calls[0][0]).toMatchObject({
      where: { compteId: "c1", essaiUtiliseLe: null, stripeSubscriptionId: null },
    });
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

  it("abonnement enregistré : la page de l'abonnement, pas de second essai", async () => {
    db.abonnement.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", essaiUtiliseLe: new Date() });
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

  it("double clic : la réservation déjà posée par l'autre envoi l'emporte, son client sert à l'essai", async () => {
    db.abonnement.create.mockRejectedValueOnce({ code: "P2002" });
    db.abonnement.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ stripeCustomerId: "cus_enregistre" });
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    expect(m.demarrerEssai).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "cus_enregistre" }));
  });

  it("deux envois simultanés : le verrou n'en laisse passer qu'un, l'autre ne touche pas Stripe", async () => {
    db.abonnement.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 0 });
    expect(await demarrerEssaiDuCompte(FORMULE, true)).toEqual({ status: "error", message: expect.stringMatching(/déjà en cours/) });
    expect(m.demarrerEssai).not.toHaveBeenCalled();
    expect(db.acceptationConditions.create).not.toHaveBeenCalled();
  });

  it("Stripe refuse l'essai et confirme n'avoir rien créé : le verrou est rendu, la preuve reste au journal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.demarrerEssai.mockRejectedValue(new Error("panne"));
    expect(await demarrerEssaiDuCompte(FORMULE, true)).toMatchObject({ status: "error" });
    expect(m.ordre).toContain("verrou rendu");
    expect(db.acceptationConditions.delete).not.toHaveBeenCalled();
    const rendu = db.abonnement.updateMany.mock.calls[1][0];
    expect(rendu).toEqual({ where: { compteId: "c1", essaiUtiliseLe: expect.any(Date) }, data: { essaiUtiliseLe: null } });
  });

  it("réponse perdue, l'essai existe chez Stripe : on le relit, on ne rend rien, l'onboarding", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.demarrerEssai.mockRejectedValue(new Error("délai dépassé"));
    m.listeAbonnements.mockResolvedValue([{ id: "sub_1" }]);
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    expect(m.ordre).not.toContain("verrou rendu");
    expect(m.synchroniserClientStripe).toHaveBeenCalledWith(expect.anything(), "cus_1");
  });

  it("réponse perdue et Stripe injoignable : le verrou est gardé (il expirera), une erreur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.demarrerEssai.mockRejectedValue(new Error("délai dépassé"));
    m.listeAbonnements.mockRejectedValue(new Error("injoignable"));
    expect(await demarrerEssaiDuCompte(FORMULE, true)).toMatchObject({ status: "error" });
    expect(m.ordre).not.toContain("verrou rendu");
  });

  it("verrou expiré : repris ; si Stripe a déjà l'essai, relu sans en créer un second", async () => {
    const ancien = new Date(Date.now() - 10 * 60_000);
    db.abonnement.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", stripeSubscriptionId: null, essaiUtiliseLe: ancien });
    db.abonnement.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    m.listeAbonnements.mockResolvedValue([{ id: "sub_1" }]);
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    expect(m.demarrerEssai).not.toHaveBeenCalled();
    expect(db.abonnement.updateMany.mock.calls[1][0].where).toMatchObject({ essaiUtiliseLe: { lt: expect.any(Date) } });
  });

  it("verrou expiré, rien chez Stripe, nouvel échec : le verrou retrouve sa valeur d'avant, jamais vide", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ancien = new Date(Date.now() - 10 * 60_000);
    db.abonnement.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", stripeSubscriptionId: null, essaiUtiliseLe: ancien });
    db.abonnement.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    m.demarrerEssai.mockRejectedValue(new Error("panne"));
    expect(await demarrerEssaiDuCompte(FORMULE, true)).toMatchObject({ status: "error" });
    expect(db.abonnement.updateMany.mock.calls[2][0].data).toEqual({ essaiUtiliseLe: ancien });
  });

  it("Stripe en panne : une erreur affichable qui dit que rien n'a été facturé, sans détail technique", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.demarrerEssai.mockRejectedValue(new Error("No such price: client@exemple.fr"));
    const r = await demarrerEssaiDuCompte(FORMULE, true);
    expect(r).toEqual({ status: "error", message: expect.stringMatching(/rien ne vous a été facturé/) });
    expect(JSON.stringify(r)).not.toContain("exemple.fr");
  });

  it("une formule sans prix ne crée ni compte, ni client", async () => {
    m.prixDesFormules.mockResolvedValue(new Map());
    expect(await demarrerEssaiDuCompte(FORMULE, true)).toMatchObject({ status: "error", message: expect.stringMatching(/pas disponible/) });
    expect(m.requireCompteDOnboarding).not.toHaveBeenCalled();
    expect(m.creerClientStripe).not.toHaveBeenCalled();
  });

  it("la relecture échoue après l'essai créé : pas d'échec annoncé, l'onboarding, le verrou gardé", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.synchroniserClientStripe.mockRejectedValue(new Error("panne"));
    expect(await redirigeVers(demarrerEssaiDuCompte(FORMULE, true))).toBe("/onboarding");
    expect(m.ordre).not.toContain("verrou rendu");
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
