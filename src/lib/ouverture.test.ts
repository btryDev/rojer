import { describe, expect, it } from "vitest";
import { INSCRIPTIONS_OUVERTES, inscriptionAffichee, lienInscription, PAGE_BIENTOT, versInvitation } from "./ouverture";

/**
 * L'interrupteur des inscriptions (2026-11-23, décision de la propriétaire :
 * Stripe non validé). Le premier test casse le jour où on le rouvre — c'est
 * voulu : rouvrir passe par un commit qui le dit.
 */
describe("l'ouverture des inscriptions", () => {
  it("est fermée (Stripe non validé, 2026-11-23)", () => {
    expect(INSCRIPTIONS_OUVERTES).toBe(false);
  });

  it("fermée, un bouton d'inscription mène à /bientot, offre comprise", () => {
    expect(PAGE_BIENTOT).toBe("/bientot");
    expect(lienInscription("/signup", { ouvertes: false })).toBe("/bientot");
    expect(lienInscription("/signup?offre=rojer_pro_annuel", { ouvertes: false })).toBe("/bientot");
    expect(lienInscription("/signup?next=%2Fcompte", { next: "/compte", ouvertes: false })).toBe("/bientot");
  });

  it("ouverte, le bouton garde son lien vers /signup", () => {
    expect(lienInscription("/signup", { ouvertes: true })).toBe("/signup");
    expect(lienInscription("/signup?offre=rojer_pro_annuel", { ouvertes: true })).toBe(
      "/signup?offre=rojer_pro_annuel",
    );
    expect(inscriptionAffichee({ ouvertes: true })).toBe(true);
  });

  it("fermée, la personne invitée garde /signup pour revenir à son invitation (ADR-054 § 5)", () => {
    const signup = "/signup?next=%2Finvitation%2Finv-1";
    expect(lienInscription(signup, { next: "/invitation/inv-1", ouvertes: false })).toBe(signup);
    expect(inscriptionAffichee({ next: "/invitation/inv-1", ouvertes: false })).toBe(true);
  });

  it("fermée, rien d'autre n'affiche /signup", () => {
    for (const next of [undefined, null, "/", "/invitation", "/invitationx/1", "/compte"]) {
      expect(inscriptionAffichee({ next, ouvertes: false }), String(next)).toBe(false);
    }
    expect(versInvitation("/invitation/abc")).toBe(true);
    expect(versInvitation("/invitation")).toBe(false);
  });

  it("sans option, suit l'interrupteur", () => {
    expect(inscriptionAffichee()).toBe(INSCRIPTIONS_OUVERTES);
    expect(lienInscription("/signup")).toBe(INSCRIPTIONS_OUVERTES ? "/signup" : "/bientot");
  });
});
