import { describe, expect, it } from "vitest";
import { assistanceProOuverte, libelleFormuleDuCompte } from "./assistance";

describe("l'assistance de prévention : formule Pro, abonnement ouvert (2026-11-24)", () => {
  it("ouverte en Pro, mensuel ou annuel, impayé en cours compris", () => {
    expect(assistanceProOuverte({ statut: "active", formule: "rojer_pro_mensuel" })).toBe(true);
    expect(assistanceProOuverte({ statut: "active", formule: "rojer_pro_annuel" })).toBe(true);
    expect(assistanceProOuverte({ statut: "past_due", formule: "rojer_pro_annuel" })).toBe(true);
  });

  it("fermée en Essentiel, pendant l'essai, sans abonnement ou abonnement fermé", () => {
    expect(assistanceProOuverte({ statut: "active", formule: "rojer_essentiel_annuel" })).toBe(false);
    expect(assistanceProOuverte({ statut: null, formule: null })).toBe(false);
    expect(assistanceProOuverte(null)).toBe(false);
    expect(assistanceProOuverte({ statut: "canceled", formule: "rojer_pro_annuel" })).toBe(false);
    expect(assistanceProOuverte({ statut: "unpaid", formule: "rojer_pro_annuel" })).toBe(false);
    expect(assistanceProOuverte({ statut: "active", formule: "inconnue" })).toBe(false);
  });

  it("l'e-mail à l'équipe nomme la formule", () => {
    expect(libelleFormuleDuCompte({ statut: "active", formule: "rojer_pro_annuel" })).toBe("Pro");
    expect(libelleFormuleDuCompte({ statut: "active", formule: "rojer_essentiel_mensuel" })).toBe("Essentiel");
    expect(libelleFormuleDuCompte(null)).toBe("Essai ou sans abonnement");
  });
});
