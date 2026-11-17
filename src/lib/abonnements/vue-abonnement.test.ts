import { describe, expect, it } from "vitest";
import { vueAbonnement, type EntreeVue } from "./vue-abonnement";

// Ce que la page Abonnement montre, état par état (audit du 2026-11-16 ;
// ADR-053 § 9 amendé le même jour : un seul geste, « s'abonner »).

const entree = (o: Partial<EntreeVue>): EntreeVue => ({
  geste: "abonner",
  statut: null,
  finPrevue: false,
  documentAttend: false,
  paiementTermine: false,
  ...o,
});

describe("vueAbonnement", () => {
  it("sans offre, membre, essai à démarrer", () => {
    expect(vueAbonnement(entree({ geste: null }))).toEqual({ cas: "fermee" });
    expect(vueAbonnement(entree({ geste: "membre" }))).toMatchObject({ cas: "membre" });
    expect(vueAbonnement(entree({ geste: "essai" }))).toEqual({ cas: "essai" });
  });

  it("pendant l'essai, après lui, ou après une résiliation : s'abonner", () => {
    for (const statut of [null, "canceled"]) {
      expect(vueAbonnement(entree({ statut })), String(statut)).toEqual({ cas: "formulaire", annoncerDocument: false });
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
    expect(vueAbonnement(entree({ geste: "portail", statut: "active" }))).toEqual({ cas: "portail", situation: "a-jour" });
    for (const statut of ["past_due", "unpaid", "incomplete"]) {
      expect(vueAbonnement(entree({ geste: "portail", statut })), statut).toMatchObject({ situation: "a-regler" });
    }
  });

  it("une fin prévue se dit ; un paiement à régler passe avant elle (2026-11-17)", () => {
    expect(vueAbonnement(entree({ geste: "portail", statut: "active", finPrevue: true }))).toMatchObject({ situation: "fin-prevue" });
    expect(vueAbonnement(entree({ geste: "portail", statut: "past_due", finPrevue: true }))).toMatchObject({ situation: "a-regler" });
  });
});
