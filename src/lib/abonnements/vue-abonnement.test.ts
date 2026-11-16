import { describe, expect, it } from "vitest";
import { besoinDeLaCarte, preselection, vueAbonnement, type EntreeVue } from "./vue-abonnement";

// Ce que la page Abonnement montre, état par état (audit du 2026-11-16).

const entree = (o: Partial<EntreeVue>): EntreeVue => ({
  geste: "abonner",
  statut: "trialing",
  resiliationPrevue: false,
  carteEnregistree: false,
  immediat: false,
  retourCarte: false,
  finEssai: ", le 16 décembre 2026",
  ...o,
});

describe("vueAbonnement", () => {
  it("sans offre, membre, essai à démarrer", () => {
    expect(vueAbonnement(entree({ geste: null }))).toEqual({ cas: "aucune" });
    expect(vueAbonnement(entree({ geste: "membre" }))).toMatchObject({ cas: "membre" });
    expect(vueAbonnement(entree({ geste: "essai", statut: null }))).toMatchObject({ cas: "essai", titre: "Essai gratuit" });
  });

  it("essai sans carte : enregistrer la formule pour la fin de l'essai, ou payer maintenant ; pas de portail", () => {
    expect(vueAbonnement(entree({}))).toMatchObject({
      cas: "formulaire",
      titre: "Après l'essai",
      mode: "enregistrer",
      libelle: "Enregistrer ma formule",
      proposerPayerMaintenant: true,
      annoncerDocument: false,
      rappelApresEssai: false,
      portail: null,
    });
  });

  it("essai avec carte : changer la formule de fin d'essai, payer maintenant, le portail pour résilier avant la fin", () => {
    const v = vueAbonnement(entree({ carteEnregistree: true }));
    expect(v).toMatchObject({ cas: "formulaire", titre: "Changer de formule", mode: "changer", proposerPayerMaintenant: true, rappelApresEssai: true });
    expect(v.cas === "formulaire" && v.portail).toMatch(/résiliation avant la fin de l'essai/);
    expect(v.cas === "formulaire" && v.quand).toMatch(/le 16 décembre 2026/);
  });

  it("un document attend (?immediat=1) : le bouton principal paie, l'annonce s'affiche, pas de second bouton", () => {
    expect(vueAbonnement(entree({ immediat: true }))).toMatchObject({
      mode: "payer",
      titre: "S'abonner",
      libelle: "Continuer vers le paiement",
      annoncerDocument: true,
      proposerPayerMaintenant: false,
      rappelApresEssai: false,
    });
    expect(vueAbonnement(entree({ immediat: true, carteEnregistree: true }))).toMatchObject({ mode: "payer", libelle: "Payer et m'abonner" });
  });

  it("essai résilié : « Fin de l'essai », même avec ?immediat=1 ; la carte n'est pas lue", () => {
    for (const immediat of [false, true]) {
      expect(vueAbonnement(entree({ resiliationPrevue: true, immediat }))).toMatchObject({ cas: "essai-resilie", titre: "Fin de l'essai" });
    }
    expect(besoinDeLaCarte(entree({ resiliationPrevue: true }))).toBe(false);
  });

  it("retour de Checkout « carte » : la finalisation, jamais sous le titre « Fin de l'essai »", () => {
    expect(vueAbonnement(entree({ retourCarte: true, resiliationPrevue: true }))).toMatchObject({ cas: "finalisation", titre: "S'abonner" });
    expect(besoinDeLaCarte(entree({ retourCarte: true }))).toBe(false);
  });

  it("pause : la reprise se paie tout de suite ; carte enregistrée, prélevée directement, portail sans mention d'essai", () => {
    const v = vueAbonnement(entree({ statut: "paused", carteEnregistree: true }));
    expect(v).toMatchObject({ mode: "payer", libelle: "Payer et m'abonner", proposerPayerMaintenant: false });
    expect(v.cas === "formulaire" && v.quand).toMatch(/carte enregistrée/);
    expect(v.cas === "formulaire" && v.portail).not.toMatch(/essai/);
    expect(besoinDeLaCarte(entree({ statut: "paused" }))).toBe(true);
  });

  it("après une résiliation (souscrire) : on paie sur Stripe, le bouton le dit — jamais « Enregistrer ma formule »", () => {
    const v = vueAbonnement(entree({ geste: "souscrire", statut: "canceled", carteEnregistree: true }));
    expect(v).toMatchObject({ mode: "payer", libelle: "Continuer vers le paiement", portail: null, proposerPayerMaintenant: false });
    expect(v.cas === "formulaire" && v.quand).toMatch(/Le paiement se fait/);
  });

  it("abonnement qui court : le portail ; une facture en attente pour past_due, unpaid, incomplete", () => {
    expect(vueAbonnement(entree({ geste: "portail", statut: "active" }))).toEqual({ cas: "portail", titre: "Gérer", factureEnAttente: false });
    for (const statut of ["past_due", "unpaid", "incomplete"]) {
      expect(vueAbonnement(entree({ geste: "portail", statut }))).toMatchObject({ factureEnAttente: true });
    }
  });
});

describe("preselection", () => {
  const pro = { formule: "pro", periodicite: "annuel" } as const;
  const essentiel = { formule: "essentiel", periodicite: "mensuel" } as const;

  it("changer de formule : celle de l'abonnement, l'offre de la page publique ignorée", () => {
    const v = vueAbonnement(entree({ carteEnregistree: true }));
    expect(preselection(v, { abonnement: essentiel, offreChoisie: pro, geste: "abonner" })).toEqual(essentiel);
  });

  it("enregistrer ou payer : l'offre choisie sur la page publique d'abord, sinon l'abonnement", () => {
    const v = vueAbonnement(entree({}));
    expect(preselection(v, { abonnement: essentiel, offreChoisie: pro, geste: "abonner" })).toEqual(pro);
    expect(preselection(v, { abonnement: essentiel, offreChoisie: null, geste: "abonner" })).toEqual(essentiel);
  });

  it("souscrire après une résiliation : l'offre choisie, sinon rien (l'ancienne formule ne se ressert pas d'office)", () => {
    const v = vueAbonnement(entree({ geste: "souscrire", statut: "canceled" }));
    expect(preselection(v, { abonnement: pro, offreChoisie: null, geste: "souscrire" })).toBeNull();
    expect(preselection(v, { abonnement: pro, offreChoisie: essentiel, geste: "souscrire" })).toEqual(essentiel);
  });

  it("hors formulaire : rien", () => {
    expect(preselection(vueAbonnement(entree({ geste: "portail", statut: "active" })), { abonnement: pro, offreChoisie: pro, geste: "portail" })).toBeNull();
  });
});
