import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirigeVers } from "@/test/redirection";

// S'abonner : jamais un second abonnement payant ; la carte d'un essai ou
// d'une pause passe par Checkout « setup », avec la formule choisie ; après
// une résiliation, Checkout souscrit.

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
  ligne: { stripeCustomerId: "cus_1", statut: "canceled" as string | null },
  abonnementsDuClient: vi.fn(),
  ouvrirCheckout: vi.fn(),
  ouvrirCheckoutCarte: vi.fn(),
  prixDesFormules: vi.fn(),
  synchroniser: vi.fn(async () => ({ issue: "ecrit" })),
  finaliserCarte: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/lib/auth/compte", () => ({
  requireCompte: async () => ({
    compte: { compteId: "c1" },
    db: { abonnement: { findUnique: async () => m.ligne } },
  }),
}));
vi.mock("@/lib/email", () => ({ publicAppUrl: () => "https://rojer.test" }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: () => ({}) }));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: () => ({ active: true }) }));
vi.mock("@/lib/stripe/parcours", () => ({
  abonnementsDuClient: m.abonnementsDuClient,
  ouvrirCheckout: m.ouvrirCheckout,
  ouvrirCheckoutCarte: m.ouvrirCheckoutCarte,
  ouvrirPortail: vi.fn(),
  prixDesFormules: m.prixDesFormules,
}));
vi.mock("@/lib/stripe/synchronisation", async (reel) => ({
  ...(await reel<typeof import("@/lib/stripe/synchronisation")>()),
  synchroniserClientStripe: m.synchroniser,
}));
vi.mock("./souscription", () => ({ finaliserCarte: m.finaliserCarte }));
vi.mock("./essai", () => ({ PAGE_ESSAI: "/essai", demarrerEssaiDuCompte: vi.fn() }));
vi.mock("./saisie", () => ({
  PAGE_ABONNEMENT: "/compte/abonnement",
  verifierProprietaire: async () => {},
  verifierRole: async () => {},
}));

import { finaliserCarteAction, sAbonnerAction } from "./actions";

const formulaire = (formule = "rojer_pro_annuel", immediat = false) => {
  const f = new FormData();
  f.set("formule", formule);
  if (immediat) f.set("immediat", "oui");
  return f;
};
const abonnement = (status: string, created = 1) => ({ id: `sub_${status}`, status, created, items: { data: [] } });

beforeEach(() => {
  vi.clearAllMocks();
  m.ligne.statut = "canceled";
  m.abonnementsDuClient.mockResolvedValue([abonnement("canceled")]);
  m.prixDesFormules.mockResolvedValue(new Map([["rojer_pro_annuel", { priceId: "price_pa" }]]));
  m.ouvrirCheckout.mockResolvedValue("https://checkout.stripe.test/abonnement");
  m.ouvrirCheckoutCarte.mockResolvedValue("https://checkout.stripe.test/carte");
});

describe("sAbonnerAction", () => {
  it("pendant l'essai : la carte par Checkout « setup », la formule choisie dans les métadonnées, retour avec la session", async () => {
    m.abonnementsDuClient.mockResolvedValue([abonnement("trialing")]);
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://checkout.stripe.test/carte");
    expect(m.ouvrirCheckoutCarte).toHaveBeenCalledWith(expect.anything(), {
      customerId: "cus_1",
      metadata: { compteId: "c1", formule: "rojer_pro_annuel", immediat: "non" },
      succes: "https://rojer.test/compte/abonnement?carte={CHECKOUT_SESSION_ID}",
      annulation: "https://rojer.test/compte/abonnement",
    });
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
  });

  it("immédiat (un document attend) et pause : la carte aussi, avec `immediat` pour la première", async () => {
    m.abonnementsDuClient.mockResolvedValue([abonnement("trialing")]);
    await redirigeVers(sAbonnerAction(formulaire("rojer_pro_annuel", true)));
    expect(m.ouvrirCheckoutCarte.mock.calls[0][1].metadata.immediat).toBe("oui");
    m.abonnementsDuClient.mockResolvedValue([abonnement("paused")]);
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://checkout.stripe.test/carte");
  });

  it("abonnement terminé partout : Checkout souscrit, au nom du compte", async () => {
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://checkout.stripe.test/abonnement");
    expect(m.ouvrirCheckout).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "cus_1", priceId: "price_pa", metadata: { compteId: "c1" } }));
  });

  it("Stripe a déjà un abonnement payant (notre copie retarde) : ni Checkout ni carte, la copie relue, la page le dit", async () => {
    for (const statut of ["active", "past_due"]) {
      m.abonnementsDuClient.mockResolvedValue([abonnement(statut), abonnement("canceled", 0)]);
      expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("/compte/abonnement?abonnement=en-cours");
    }
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
    expect(m.ouvrirCheckoutCarte).not.toHaveBeenCalled();
    expect(m.synchroniser).toHaveBeenCalledWith(expect.anything(), "cus_1");
  });

  it("Stripe injoignable : page d'erreur, rien d'ouvert", async () => {
    m.abonnementsDuClient.mockRejectedValue(new Error("injoignable"));
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("/compte/abonnement?stripe=indisponible");
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
  });

  it("une formule hors catalogue : rien", async () => {
    expect(await redirigeVers(sAbonnerAction(formulaire("rojer_surmesure_mensuel")))).toBe("/compte/abonnement");
    expect(m.abonnementsDuClient).not.toHaveBeenCalled();
  });
});

describe("finaliserCarteAction", () => {
  it("applique la session du client du compte, puis la page dit le paiement", async () => {
    m.finaliserCarte.mockResolvedValue("appliquee");
    expect(await redirigeVers(finaliserCarteAction("cs_test_123"))).toBe("/compte/abonnement?paiement=termine");
    expect(m.finaliserCarte).toHaveBeenCalledWith(expect.anything(), "cs_test_123", { customerId: "cus_1" });
  });

  it("un identifiant qui n'est pas une session Checkout : rien n'est appelé", async () => {
    expect(await redirigeVers(finaliserCarteAction("../evil"))).toBe("/compte/abonnement");
    expect(m.finaliserCarte).not.toHaveBeenCalled();
  });
});
