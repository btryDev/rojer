import { describe, expect, it } from "vitest";
import { preselection, vueAbonnement, type EntreeVue } from "./vue-abonnement";

// Ce que la page Abonnement montre, état par état (audit du 2026-11-16 ;
// ADR-053 § 9 amendé le même jour : un seul geste, « s'abonner »).

const entree = (o: Partial<EntreeVue>): EntreeVue => ({
  geste: "abonner",
  statut: null,
  enEssai: true,
  documentAttend: false,
  paiementTermine: false,
  ...o,
});

describe("vueAbonnement", () => {
  it("sans offre, membre, essai à démarrer", () => {
    expect(vueAbonnement(entree({ geste: null }))).toEqual({ cas: "aucune" });
    expect(vueAbonnement(entree({ geste: "membre" }))).toMatchObject({ cas: "membre" });
    expect(vueAbonnement(entree({ geste: "essai" }))).toMatchObject({ cas: "essai", titre: "Essai gratuit" });
  });

  it("pendant l'essai : s'abonner, et la phrase dit que l'essai s'arrête et ses limites tombent", () => {
    const v = vueAbonnement(entree({}));
    expect(v).toMatchObject({ cas: "formulaire", titre: "S'abonner", annoncerDocument: false });
    expect(v.cas === "formulaire" && v.quand).toMatch(/page sécurisée de Stripe.*met fin à votre essai/);
  });

  it("après l'essai, ou après une résiliation : s'abonner, sans parler d'essai", () => {
    for (const statut of [null, "canceled"]) {
      const v = vueAbonnement(entree({ statut, enEssai: false }));
      expect(v, String(statut)).toMatchObject({ cas: "formulaire", titre: "S'abonner" });
      expect(v.cas === "formulaire" && v.quand, String(statut)).not.toMatch(/essai/);
    }
  });

  it("retour de Checkout, copie encore en retard : rien à proposer, jamais un second paiement", () => {
    expect(vueAbonnement(entree({ paiementTermine: true }))).toEqual({ cas: "aucune" });
    expect(vueAbonnement(entree({ geste: "portail", statut: "active", paiementTermine: true }))).toMatchObject({ cas: "portail" });
  });

  it("un document officiel attend (`?document=1`) : la page dit pourquoi", () => {
    expect(vueAbonnement(entree({ documentAttend: true }))).toMatchObject({ cas: "formulaire", annoncerDocument: true });
  });

  it("abonné : la gestion ; tout paiement à régler se règle au portail", () => {
    expect(vueAbonnement(entree({ geste: "portail", statut: "active" }))).toEqual({ cas: "portail", titre: "Gérer", aRegler: false });
    for (const statut of ["past_due", "unpaid", "incomplete"]) {
      expect(vueAbonnement(entree({ geste: "portail", statut })), statut).toMatchObject({ aRegler: true });
    }
  });
});

describe("preselection", () => {
  const formulaire = vueAbonnement(entree({}));
  const pro = { formule: "pro" as const, periodicite: "annuel" as const };
  const essentiel = { formule: "essentiel" as const, periodicite: "mensuel" as const };

  it("l'offre choisie sur la page publique d'abord, sinon l'abonnement passé", () => {
    expect(preselection(formulaire, { abonnement: essentiel, offreChoisie: pro })).toEqual(pro);
    expect(preselection(formulaire, { abonnement: essentiel, offreChoisie: null })).toEqual(essentiel);
    expect(preselection(formulaire, { abonnement: null, offreChoisie: null })).toBeNull();
  });

  it("hors formulaire : rien", () => {
    expect(preselection(vueAbonnement(entree({ geste: "portail", statut: "active" })), { abonnement: essentiel, offreChoisie: pro })).toBeNull();
  });
});
