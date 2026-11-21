import { describe, expect, it } from "vitest";
import { connecteurOuvert } from "./connecteur";
import { lookupKey } from "./formules";

describe("connecteurOuvert — réservé à la formule Pro (ADR-062 § 4)", () => {
  it("Pro, abonnement actif ou impayé en cours : ouvert", () => {
    for (const statut of ["active", "past_due"]) {
      expect(connecteurOuvert({ statut, formule: lookupKey("pro", "mensuel") })).toBe(true);
      expect(connecteurOuvert({ statut, formule: lookupKey("pro", "annuel") })).toBe(true);
    }
  });

  it("Essentiel : fermé, quel que soit l'état", () => {
    expect(connecteurOuvert({ statut: "active", formule: lookupKey("essentiel", "mensuel") })).toBe(false);
  });

  it("Pro, abonnement clos, à régler ou inconnu : fermé", () => {
    for (const statut of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", "trialing", "nouveau"]) {
      expect(connecteurOuvert({ statut, formule: lookupKey("pro", "mensuel") })).toBe(false);
    }
  });

  it("sans abonnement, sans état, sans formule, formule inconnue : fermé (l'essai porte sur l'Essentiel)", () => {
    expect(connecteurOuvert(null)).toBe(false);
    expect(connecteurOuvert({ statut: null, formule: null })).toBe(false);
    expect(connecteurOuvert({ statut: "active", formule: null })).toBe(false);
    expect(connecteurOuvert({ statut: "active", formule: "rojer_entreprise_mensuel" })).toBe(false);
  });
});
