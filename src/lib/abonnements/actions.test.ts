import { beforeEach, describe, expect, it, vi } from "vitest";

// Le réabonnement (Checkout) : jamais un second abonnement tant qu'un autre
// court — ni d'après notre copie, ni d'après Stripe, qui fait foi.

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
  ligne: { stripeCustomerId: "cus_1", statut: "canceled" as string | null },
  abonnementsDuClient: vi.fn(),
  ouvrirCheckout: vi.fn(),
  prixDesFormules: vi.fn(),
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
  ouvrirPortail: vi.fn(),
  prixDesFormules: m.prixDesFormules,
}));
vi.mock("./essai", () => ({ PAGE_ESSAI: "/essai", demarrerEssaiDuCompte: vi.fn() }));
vi.mock("./saisie", () => ({
  PAGE_ABONNEMENT: "/compte/abonnement",
  verifierProprietaire: async () => {},
  verifierRole: async () => {},
}));

import { souscrireAction } from "./actions";

const formulaire = (formule = "rojer_essentiel_mensuel") => {
  const f = new FormData();
  f.set("formule", formule);
  return f;
};
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
  m.ligne.statut = "canceled";
  m.abonnementsDuClient.mockResolvedValue([{ status: "canceled" }]);
  m.prixDesFormules.mockResolvedValue(new Map([["rojer_essentiel_mensuel", { priceId: "price_e" }]]));
  m.ouvrirCheckout.mockResolvedValue("https://checkout.stripe.test/s");
});

describe("souscrireAction", () => {
  it("abonnement terminé partout : Checkout, au nom du compte", async () => {
    expect(await redirigeVers(souscrireAction(formulaire()))).toBe("https://checkout.stripe.test/s");
    expect(m.ouvrirCheckout).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "cus_1", priceId: "price_e", metadata: { compteId: "c1" } }));
  });

  it("notre copie dit qu'un abonnement court : pas de Checkout", async () => {
    m.ligne.statut = "trialing";
    expect(await redirigeVers(souscrireAction(formulaire()))).toBe("/compte/abonnement");
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
  });

  it("notre copie retarde (statut vide ou terminé) mais Stripe a un abonnement en cours : pas de Checkout", async () => {
    for (const statut of [null, "canceled"]) {
      m.ligne.statut = statut;
      m.abonnementsDuClient.mockResolvedValue([{ status: "trialing" }, { status: "canceled" }]);
      expect(await redirigeVers(souscrireAction(formulaire()))).toBe("/compte/abonnement");
    }
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
  });

  it("Stripe injoignable : on ne parie pas, page d'erreur sans Checkout", async () => {
    m.abonnementsDuClient.mockRejectedValue(new Error("injoignable"));
    expect(await redirigeVers(souscrireAction(formulaire()))).toBe("/compte/abonnement?stripe=indisponible");
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
  });

  it("une formule hors catalogue : rien", async () => {
    expect(await redirigeVers(souscrireAction(formulaire("rojer_surmesure_mensuel")))).toBe("/compte/abonnement");
    expect(m.abonnementsDuClient).not.toHaveBeenCalled();
  });
});
