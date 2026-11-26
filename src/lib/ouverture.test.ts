import { describe, expect, it } from "vitest";
import { lienInscription, OUVERT_AU_PUBLIC, PAGE_BIENTOT, versInvitation } from "./ouverture";

/**
 * L'interrupteur de l'ouverture au public (2026-11-23, décision de la
 * propriétaire : Stripe non validé). Le premier test casse le jour où on le
 * rouvre — c'est voulu : rouvrir passe par un commit qui le dit. [2026-11-26 :
 * rouvert, décision de la propriétaire.]
 */
describe("l'ouverture au public", () => {
  it("~~est fermée le temps des tests de la propriétaire (2026-11-26, après-midi)~~ est ouverte (2026-11-26, soir)", () => {
    expect(OUVERT_AU_PUBLIC).toBe(true);
  });

  it("fermée, un bouton d'inscription mène à /bientot, offre comprise", () => {
    expect(PAGE_BIENTOT).toBe("/bientot");
    expect(lienInscription("/signup", { ouvert: false })).toBe("/bientot");
    expect(lienInscription("/signup?offre=rojer_pro_annuel", { ouvert: false })).toBe("/bientot");
    expect(lienInscription("/signup?next=%2Fcompte", { next: "/compte", ouvert: false })).toBe("/bientot");
  });

  it("ouverte, le bouton garde son lien vers /signup", () => {
    expect(lienInscription("/signup", { ouvert: true })).toBe("/signup");
    expect(lienInscription("/signup?offre=rojer_pro_annuel", { ouvert: true })).toBe("/signup?offre=rojer_pro_annuel");
  });

  it("fermée, la personne invitée garde /signup pour revenir à son invitation (ADR-054 § 5)", () => {
    const signup = "/signup?next=%2Finvitation%2Finv-1";
    expect(lienInscription(signup, { next: "/invitation/inv-1", ouvert: false })).toBe(signup);
    for (const next of [undefined, null, "/", "/invitation", "/invitationx/1", "/compte"]) {
      expect(lienInscription("/signup", { next, ouvert: false }), String(next)).toBe("/bientot");
    }
    expect(versInvitation("/invitation/abc")).toBe(true);
    expect(versInvitation("/invitation")).toBe(false);
  });

  it("sans option, suit l'interrupteur", () => {
    expect(lienInscription("/signup")).toBe(OUVERT_AU_PUBLIC ? "/signup" : "/bientot");
  });
});
