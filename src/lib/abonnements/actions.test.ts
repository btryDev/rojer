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
  tauxDeTva: vi.fn(),
  synchroniser: vi.fn(async () => ({ issue: "ecrit" })),
  finaliserCarte: vi.fn(),
  carteParDefaut: vi.fn(),
  appliquerFormule: vi.fn(),
  monterDeFormule: vi.fn(),
  planifierBaisse: vi.fn(),
  annulerBaisse: vi.fn(),
  depassements: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/lib/email", () => ({ publicAppUrl: () => "https://rojer.test" }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: () => ({}) }));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: () => ({ active: true }) }));
vi.mock("@/lib/stripe/parcours", () => ({
  abonnementsDuClient: m.abonnementsDuClient,
  appliquerFormule: m.appliquerFormule,
  monterDeFormule: m.monterDeFormule,
  planifierBaisse: m.planifierBaisse,
  annulerBaisse: m.annulerBaisse,
  ouvrirCheckout: m.ouvrirCheckout,
  ouvrirCheckoutCarte: m.ouvrirCheckoutCarte,
  ouvrirPortail: vi.fn(),
  prixDesFormules: m.prixDesFormules,
  tauxDeTva: m.tauxDeTva,
}));
vi.mock("@/lib/stripe/synchronisation", async (reel) => ({
  ...(await reel<typeof import("@/lib/stripe/synchronisation")>()),
  synchroniserClientStripe: m.synchroniser,
}));
vi.mock("./souscription", () => ({ finaliserCarte: m.finaliserCarte, carteParDefaut: m.carteParDefaut }));
vi.mock("./quotas", () => ({ depassements: m.depassements }));
vi.mock("./essai", () => ({ PAGE_ESSAI: "/essai", demarrerEssaiDuCompte: vi.fn() }));
// `ouvrirAuGel` (l'essai) : sans la chaîne de la session, que ce test remplace par ./saisie.
vi.mock("./gel-saisie", () => ({ ouvrirAuGel: vi.fn() }));
vi.mock("./saisie", () => ({
  PAGE_ABONNEMENT: "/compte/abonnement",
  verifierProprietaire: async () => ({
    compte: { compteId: "c1" },
    db: { abonnement: { findUnique: async () => m.ligne } },
  }),
  verifierRole: async () => {},
}));

import {
  annulerBaisseAction,
  changerFormuleAction,
  finaliserCarteAction,
  ouvrirPortailAction,
  sAbonnerAction,
} from "./actions";
import { CHAMP_COMPTE_ATTENDU } from "@/lib/auth/compte-attendu";

/** Un formulaire posté depuis une page qui montrait `c1`, le compte vérifié des tests. */
const formulaire = (formule = "rojer_pro_annuel", immediat = false) => {
  const f = new FormData();
  f.set(CHAMP_COMPTE_ATTENDU, "c1");
  f.set("formule", formule);
  if (immediat) f.set("immediat", "oui");
  return f;
};
const abonnement = (status: string, created = 1) => ({ id: `sub_${status}`, status, created, items: { data: [] } });

beforeEach(() => {
  vi.clearAllMocks();
  m.ligne.statut = "canceled";
  m.abonnementsDuClient.mockResolvedValue([abonnement("canceled")]);
  m.prixDesFormules.mockResolvedValue(new Map([["rojer_pro_annuel", { priceId: "price_pa" }], ["rojer_essentiel_mensuel", { priceId: "price_em" }]]));
  m.tauxDeTva.mockResolvedValue("txr_tva");
  m.ouvrirCheckout.mockResolvedValue("https://checkout.stripe.test/abonnement");
  m.ouvrirCheckoutCarte.mockResolvedValue("https://checkout.stripe.test/carte");
  m.carteParDefaut.mockResolvedValue(null);
  m.appliquerFormule.mockResolvedValue(null);
  m.monterDeFormule.mockResolvedValue(null);
  m.depassements.mockResolvedValue([]);
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

  it("essai avec une carte déjà enregistrée : la formule s'applique sans repasser par Stripe, l'essai continue", async () => {
    m.abonnementsDuClient.mockResolvedValue([abonnement("trialing")]);
    m.carteParDefaut.mockResolvedValue("pm_1");
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://rojer.test/compte/abonnement?abonnement=formule-choisie");
    expect(m.appliquerFormule).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "sub_trialing" }), expect.objectContaining({ priceId: "price_pa", paymentMethodId: "pm_1", immediat: false }));
    expect(m.ouvrirCheckoutCarte).not.toHaveBeenCalled();
  });

  it("pause avec une carte : reprise payée tout de suite ; une facture à régler renvoie vers elle", async () => {
    m.abonnementsDuClient.mockResolvedValue([abonnement("paused")]);
    m.carteParDefaut.mockResolvedValue("pm_1");
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://rojer.test/compte/abonnement?paiement=termine");
    expect(m.appliquerFormule.mock.calls[0][2].immediat).toBe(true);
    m.appliquerFormule.mockResolvedValue("https://invoice.stripe.com/i/1");
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://invoice.stripe.com/i/1");
  });

  it("abonnement terminé partout : Checkout souscrit, au nom du compte", async () => {
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://checkout.stripe.test/abonnement");
    expect(m.ouvrirCheckout).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "cus_1", priceId: "price_pa", tauxTva: "txr_tva", metadata: { compteId: "c1" } }));
  });

  it("sans taux de TVA chez Stripe : pas de Checkout, page d'erreur — aucun abonnement sans TVA", async () => {
    m.tauxDeTva.mockResolvedValue(null);
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("/compte/abonnement?stripe=indisponible");
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
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
  it("applique la session du client du compte ; la page dit « enregistré » ou « payé » selon le cas", async () => {
    m.finaliserCarte.mockResolvedValue({ issue: "appliquee", immediat: false });
    expect(await redirigeVers(finaliserCarteAction("cs_test_123"))).toBe("/compte/abonnement?abonnement=formule-choisie");
    expect(m.finaliserCarte).toHaveBeenCalledWith(expect.anything(), "cs_test_123", { customerId: "cus_1" });
    m.finaliserCarte.mockResolvedValue({ issue: "appliquee", immediat: true });
    expect(await redirigeVers(finaliserCarteAction("cs_test_123"))).toBe("/compte/abonnement?paiement=termine");
    m.finaliserCarte.mockResolvedValue({ issue: "aRegler", url: "https://invoice.stripe.com/i/1" });
    expect(await redirigeVers(finaliserCarteAction("cs_test_123"))).toBe("https://invoice.stripe.com/i/1");
  });

  it("le webhook applique la même session au même instant (409) : pas d'erreur affichée", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.finaliserCarte.mockRejectedValue(Object.assign(new Error("en cours"), { statusCode: 409 }));
    expect(await redirigeVers(finaliserCarteAction("cs_test_123"))).toBe("/compte/abonnement");
    m.finaliserCarte.mockRejectedValue(new Error("panne"));
    expect(await redirigeVers(finaliserCarteAction("cs_test_123"))).toBe("/compte/abonnement?stripe=indisponible");
  });

  it("un identifiant qui n'est pas une session Checkout : rien n'est appelé", async () => {
    expect(await redirigeVers(finaliserCarteAction("../evil"))).toBe("/compte/abonnement");
    expect(m.finaliserCarte).not.toHaveBeenCalled();
  });
});

describe("changerFormuleAction", () => {
  const actif = (lookup: string) => ({ id: "sub_actif", status: "active", created: 1, items: { data: [{ id: "si_1", price: { id: "p", lookup_key: lookup } }] } });

  it("montée : tout de suite ; une facture à régler renvoie vers elle", async () => {
    m.abonnementsDuClient.mockResolvedValue([actif("rojer_essentiel_mensuel")]);
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_pro_annuel")))).toBe("/compte/abonnement?formule=changee");
    expect(m.monterDeFormule).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "sub_actif" }), "price_pa");
    m.monterDeFormule.mockResolvedValue("https://invoice.stripe.com/i/3");
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_pro_annuel")))).toBe("https://invoice.stripe.com/i/3");
    expect(m.planifierBaisse).not.toHaveBeenCalled();
  });

  it("baisse : planifiée en fin de période ; refusée tant qu'il y a trop d'utilisateurs ; l'excédent d'établissements ne la bloque pas", async () => {
    m.abonnementsDuClient.mockResolvedValue([actif("rojer_pro_annuel")]);
    m.depassements.mockResolvedValue([{ quota: "etablissements", utilise: 3, plafond: 1 }]);
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_essentiel_mensuel")))).toBe("/compte/abonnement?formule=prevue");
    expect(m.planifierBaisse).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "sub_actif" }), { priceId: "price_em", intervalle: "month" });
    m.planifierBaisse.mockClear();
    m.depassements.mockResolvedValue([{ quota: "membres", utilise: 3, plafond: 1 }]);
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_essentiel_mensuel")))).toBe("/compte/abonnement?formule=trop-d-utilisateurs");
    expect(m.planifierBaisse).not.toHaveBeenCalled();
    expect(m.monterDeFormule).not.toHaveBeenCalled();
  });

  it("une résiliation déjà prévue : pas de changement de formule", async () => {
    m.abonnementsDuClient.mockResolvedValue([{ ...actif("rojer_essentiel_mensuel"), cancel_at_period_end: true }]);
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_pro_annuel")))).toBe("/compte/abonnement?formule=resiliation-prevue");
    expect(m.monterDeFormule).not.toHaveBeenCalled();
  });

  it("course avec une invitation : revérifié après le planning, la baisse est rendue si elle ne tient plus", async () => {
    m.abonnementsDuClient.mockResolvedValue([actif("rojer_pro_annuel")]);
    m.depassements.mockResolvedValueOnce([]).mockResolvedValueOnce([{ quota: "membres", utilise: 2, plafond: 1 }]);
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_essentiel_mensuel")))).toBe("/compte/abonnement?formule=trop-d-utilisateurs");
    expect(m.planifierBaisse).toHaveBeenCalled();
    expect(m.annulerBaisse).toHaveBeenCalled();
  });

  it("double clic : un 409 de Stripe n'affiche pas d'erreur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.abonnementsDuClient.mockResolvedValue([actif("rojer_essentiel_mensuel")]);
    m.monterDeFormule.mockRejectedValueOnce(Object.assign(new Error("en cours"), { statusCode: 409 }));
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_pro_annuel")))).toBe("/compte/abonnement");
  });

  it("hors d'un abonnement à jour (essai, impayé) : rien ; formule hors catalogue : rien", async () => {
    for (const status of ["trialing", "past_due"]) {
      m.abonnementsDuClient.mockResolvedValue([{ ...actif("rojer_essentiel_mensuel"), status }]);
      expect(await redirigeVers(changerFormuleAction(formulaire("rojer_pro_annuel"))), status).toBe("/compte/abonnement?formule=impossible");
    }
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_surmesure_mensuel")))).toBe("/compte/abonnement");
    expect(m.monterDeFormule).not.toHaveBeenCalled();
  });

  it("garder sa formule : le planning est rendu", async () => {
    m.abonnementsDuClient.mockResolvedValue([actif("rojer_pro_annuel")]);
    expect(await redirigeVers(annulerBaisseAction(formulaire()))).toBe("/compte/abonnement?formule=gardee");
    expect(m.annulerBaisse).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "sub_actif" }));
  });
});

describe("un autre onglet a changé de compte (audit du 2026-11-10)", () => {
  // La page montrait c2 ; `verifierProprietaire` a vérifié c1, le compte actif.
  const dUnAutreCompte = () => {
    const f = formulaire();
    f.set(CHAMP_COMPTE_ATTENDU, "c2");
    return f;
  };
  it.each([
    ["s'abonner", sAbonnerAction],
    ["changer de formule", changerFormuleAction],
    ["garder sa formule", annulerBaisseAction],
    ["ouvrir le portail", ouvrirPortailAction],
  ])("%s : rien chez Stripe, la page rendue sur le compte actif le dit", async (_geste, action) => {
    m.abonnementsDuClient.mockResolvedValue([abonnement("trialing")]);
    expect(await redirigeVers(action(dUnAutreCompte()))).toBe("/compte/abonnement?compte=change");
    expect(m.abonnementsDuClient).not.toHaveBeenCalled();
    for (const f of [m.ouvrirCheckout, m.ouvrirCheckoutCarte, m.appliquerFormule, m.monterDeFormule, m.planifierBaisse, m.annulerBaisse])
      expect(f).not.toHaveBeenCalled();
  });

  it("un formulaire sans le compte de sa page (onglet d'avant le déploiement) est refusé de même", async () => {
    const f = new FormData();
    f.set("formule", "rojer_pro_annuel");
    expect(await redirigeVers(sAbonnerAction(f))).toBe("/compte/abonnement?compte=change");
    expect(m.ouvrirCheckoutCarte).not.toHaveBeenCalled();
  });
});
