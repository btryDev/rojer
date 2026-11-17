import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { redirigeVers } from "@/test/redirection";

// S'abonner (ADR-053 § 9, amendé le 2026-11-16) : jamais un second
// abonnement ; pendant l'essai, après lui ou après une résiliation, Checkout
// en mode abonnement ; le client Stripe naît à ce moment s'il manque.

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
  ligne: { stripeCustomerId: "cus_1" as string | null, statut: "canceled" as string | null },
  abonnementsDuClient: vi.fn(),
  ouvrirCheckout: vi.fn(),
  prixDesFormules: vi.fn(),
  tauxDeTva: vi.fn(),
  synchroniser: vi.fn(async () => ({ issue: "ecrit" })),
  clientStripeDuCompte: vi.fn(),
  ouvrirAuGel: vi.fn(),
  monterDeFormule: vi.fn(),
  planifierBaisse: vi.fn(),
  annulerBaisse: vi.fn(),
  depassements: vi.fn(),
  factureARegler: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/lib/email", () => ({ publicAppUrl: () => "https://rojer.test" }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: () => ({}) }));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: () => ({ active: true }) }));
vi.mock("@/lib/stripe/parcours", () => ({
  abonnementsDuClient: m.abonnementsDuClient,
  factureARegler: m.factureARegler,
  monterDeFormule: m.monterDeFormule,
  planifierBaisse: m.planifierBaisse,
  annulerBaisse: m.annulerBaisse,
  ouvrirCheckout: m.ouvrirCheckout,
  ouvrirPortail: vi.fn(),
  prixDesFormules: m.prixDesFormules,
  tauxDeTva: m.tauxDeTva,
}));
vi.mock("@/lib/stripe/synchronisation", async (reel) => ({
  ...(await reel<typeof import("@/lib/stripe/synchronisation")>()),
  synchroniserClientStripe: m.synchroniser,
}));
vi.mock("./client-stripe", () => ({ clientStripeDuCompte: m.clientStripeDuCompte }));
vi.mock("./quotas", () => ({ depassements: m.depassements }));
vi.mock("./essai", () => ({ PAGE_ESSAI: "/essai", demarrerEssaiDuCompte: vi.fn() }));
// `ouvrirAuGel` (l'essai) : sans la chaîne de la session, que ce test remplace par ./saisie.
vi.mock("./gel-saisie", () => ({ ouvrirAuGel: m.ouvrirAuGel }));
vi.mock("./saisie", () => ({
  PAGE_ABONNEMENT: "/compte/abonnement",
  verifierProprietaire: async () => ({
    user: { id: "u1", email: "a@b.fr" },
    compte: { compteId: "c1" },
    db: { abonnement: { findUnique: async () => m.ligne } },
  }),
  verifierRole: async () => {},
}));

import {
  annulerBaisseAction,
  changerFormuleAction,
  ouvrirPortailAction,
  reglerFactureAction,
  sAbonnerAction,
} from "./actions";
import { CHAMP_COMPTE_ATTENDU } from "@/lib/auth/compte-attendu";

/** Un formulaire posté depuis une page qui montrait `c1`, le compte vérifié des tests. */
const formulaire = (formule = "rojer_pro_annuel") => {
  const f = new FormData();
  f.set(CHAMP_COMPTE_ATTENDU, "c1");
  f.set("formule", formule);
  return f;
};
const abonnement = (status: string, created = 1, autres: object = {}) => ({
  id: `sub_${status}`,
  status,
  created,
  items: { data: [] },
  latest_invoice: `in_${status}`,
  metadata: {},
  ...autres,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.ligne.statut = "canceled";
  m.ligne.stripeCustomerId = "cus_1";
  m.clientStripeDuCompte.mockImplementation(async (_s: unknown, _d: unknown, o: { enregistre: string | null }) => o.enregistre ?? "cus_neuf");
  m.abonnementsDuClient.mockResolvedValue([abonnement("canceled")]);
  m.prixDesFormules.mockResolvedValue(new Map([["rojer_pro_annuel", { priceId: "price_pa" }], ["rojer_essentiel_mensuel", { priceId: "price_em" }]]));
  m.tauxDeTva.mockResolvedValue("txr_tva");
  m.ouvrirCheckout.mockResolvedValue("https://checkout.stripe.test/abonnement");
  m.monterDeFormule.mockResolvedValue(null);
  m.depassements.mockResolvedValue([]);
  m.factureARegler.mockResolvedValue(null);
});

describe("sAbonnerAction", () => {
  it("pendant l'essai (aucun client Stripe encore) : le client naît, puis Checkout en mode abonnement, paiement immédiat", async () => {
    m.ligne.statut = null;
    m.ligne.stripeCustomerId = null;
    m.abonnementsDuClient.mockResolvedValue([]);
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://checkout.stripe.test/abonnement");
    expect(m.clientStripeDuCompte).toHaveBeenCalledWith(expect.anything(), expect.anything(), { compteId: "c1", email: "a@b.fr", enregistre: null });
    // La saisie est fermée après l'essai : s'abonner écrit quand même (répétition du 2026-11-17).
    expect(m.ouvrirAuGel).toHaveBeenCalled();
    expect(m.ouvrirCheckout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ customerId: "cus_neuf", priceId: "price_pa", tauxTva: "txr_tva", succes: "https://rojer.test/compte/abonnement?paiement=termine" }),
    );
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
    expect(m.synchroniser).toHaveBeenCalledWith(expect.anything(), "cus_1");
  });

  it("Stripe injoignable : page d'erreur, rien d'ouvert", async () => {
    m.abonnementsDuClient.mockRejectedValue(new Error("injoignable"));
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("/compte/abonnement?stripe=indisponible");
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
  });

  it("deux onglets : le second refusé par Stripe (idempotence, 409) n'annonce pas d'échec, la page relit l'état", async () => {
    for (const e of [
      new Stripe.errors.StripeIdempotencyError({ message: "Keys for idempotent requests can only be used with the same parameters" }),
      Object.assign(new Error("en cours"), { statusCode: 409 }),
    ]) {
      m.ouvrirCheckout.mockRejectedValueOnce(e);
      expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("/compte/abonnement");
    }
  });

  it("premier paiement resté en attente (incomplete) : vers sa facture, ni Checkout ni « déjà en cours »", async () => {
    m.abonnementsDuClient.mockResolvedValue([abonnement("incomplete"), abonnement("canceled", 0)]);
    m.factureARegler.mockResolvedValue("https://invoice.stripe.com/i/2");
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("https://invoice.stripe.com/i/2");
    expect(m.factureARegler).toHaveBeenCalledWith(expect.anything(), "in_incomplete");
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
    // Plus de facture ouverte (expirée entre-temps) : la page le dit, rien n'est ouvert.
    m.factureARegler.mockResolvedValue(null);
    expect(await redirigeVers(sAbonnerAction(formulaire()))).toBe("/compte/abonnement?facture=introuvable");
  });

  it("une formule hors catalogue : rien", async () => {
    expect(await redirigeVers(sAbonnerAction(formulaire("rojer_surmesure_mensuel")))).toBe("/compte/abonnement");
    expect(m.abonnementsDuClient).not.toHaveBeenCalled();
  });
});

describe("reglerFactureAction", () => {
  const poste = () => {
    const f = new FormData();
    f.set(CHAMP_COMPTE_ATTENDU, "c1");
    return f;
  };

  it("premier paiement à confirmer : vers sa facture", async () => {
    m.factureARegler.mockResolvedValue("https://invoice.stripe.com/i/3");
    m.abonnementsDuClient.mockResolvedValue([abonnement("incomplete")]);
    expect(await redirigeVers(reglerFactureAction(poste()))).toBe("https://invoice.stripe.com/i/3");
  });

  it("un impayé arrivé ici (onglet resté sur l'ancien bouton) : la page, jamais « à jour »", async () => {
    for (const statut of ["past_due", "unpaid"]) {
      m.abonnementsDuClient.mockResolvedValue([abonnement(statut)]);
      expect(await redirigeVers(reglerFactureAction(poste()))).toBe("/compte/abonnement");
    }
  });

  it("rien à confirmer (à jour, terminé) : la page le dit", async () => {
    for (const statut of ["active", "canceled"]) {
      m.abonnementsDuClient.mockResolvedValue([abonnement(statut)]);
      expect(await redirigeVers(reglerFactureAction(poste()))).toBe("/compte/abonnement?facture=aucune");
    }
    expect(m.factureARegler).not.toHaveBeenCalled();
  });

  it("premier paiement sans facture payable trouvée : la page ne dit pas « à jour »", async () => {
    m.abonnementsDuClient.mockResolvedValue([abonnement("incomplete")]);
    expect(await redirigeVers(reglerFactureAction(poste()))).toBe("/compte/abonnement?facture=introuvable");
  });

  it("Stripe injoignable : page d'erreur", async () => {
    m.abonnementsDuClient.mockRejectedValue(new Error("injoignable"));
    expect(await redirigeVers(reglerFactureAction(poste()))).toBe("/compte/abonnement?stripe=indisponible");
  });
});

describe("changerFormuleAction", () => {
  const actif = (lookup: string) => ({ id: "sub_actif", status: "active", created: 1, items: { data: [{ id: "si_1", price: { id: "p", lookup_key: lookup } }] } });

  it("montée : tout de suite ; une facture à régler renvoie vers elle", async () => {
    m.abonnementsDuClient.mockResolvedValue([actif("rojer_essentiel_mensuel")]);
    expect(await redirigeVers(changerFormuleAction(formulaire("rojer_pro_annuel")))).toBe("/compte/abonnement?formule=changee");
    expect(m.monterDeFormule).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "sub_actif" }), { priceId: "price_pa", intervalle: "year" });
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

  it("hors d'un abonnement à jour (impayé, premier paiement en attente) : rien ; formule hors catalogue : rien", async () => {
    for (const status of ["incomplete", "past_due"]) {
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
    ["régler la facture", reglerFactureAction],
  ])("%s : rien chez Stripe, la page rendue sur le compte actif le dit", async (_geste, action) => {
    expect(await redirigeVers(action(dUnAutreCompte()))).toBe("/compte/abonnement?compte=change");
    expect(m.abonnementsDuClient).not.toHaveBeenCalled();
    for (const f of [m.ouvrirCheckout, m.clientStripeDuCompte, m.monterDeFormule, m.planifierBaisse, m.annulerBaisse])
      expect(f).not.toHaveBeenCalled();
  });

  it("un formulaire sans le compte de sa page (onglet d'avant le déploiement) est refusé de même", async () => {
    const f = new FormData();
    f.set("formule", "rojer_pro_annuel");
    expect(await redirigeVers(sAbonnerAction(f))).toBe("/compte/abonnement?compte=change");
    expect(m.ouvrirCheckout).not.toHaveBeenCalled();
  });
});

describe("sans client Stripe (essai) : les gestes sur un abonnement n'ont rien à gérer", () => {
  it.each([
    ["changer de formule", changerFormuleAction],
    ["garder sa formule", annulerBaisseAction],
    ["ouvrir le portail", ouvrirPortailAction],
    ["régler la facture", reglerFactureAction],
  ])("%s : la page de l'abonnement, rien chez Stripe", async (_geste, action) => {
    m.ligne.stripeCustomerId = null;
    m.ligne.statut = null;
    expect(await redirigeVers(action(formulaire()))).toBe("/compte/abonnement");
    expect(m.abonnementsDuClient).not.toHaveBeenCalled();
  });
});
