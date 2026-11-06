import { describe, expect, it } from "vitest";
import { droitsDe, gesteAbonnement, type ContexteDroits, type LigneAbonnement } from "./droits";

const MAINTENANT = new Date("2026-11-03T10:00:00Z");
const EXIGE: ContexteDroits = { stripeActif: true, exige: true, maintenant: MAINTENANT };
const jours = (n: number) => new Date(MAINTENANT.getTime() + n * 24 * 60 * 60_000);

const ligne = (o: Partial<LigneAbonnement>): LigneAbonnement => ({
  statut: "active",
  finEssai: null,
  finPeriode: jours(30),
  resilieEnFinDePeriode: false,
  finPrevueLe: null,
  ...o,
});

describe("droitsDe", () => {
  it("abonnement non exigé ou Stripe désactivé : saisie ouverte à tous, sans bandeau, quel que soit l'état", () => {
    for (const ctx of [
      { ...EXIGE, exige: false },
      { ...EXIGE, stripeActif: false },
    ]) {
      for (const l of [null, ligne({ statut: "canceled" }), ligne({ statut: "unpaid" })]) {
        expect(droitsDe(l, ctx)).toEqual({ saisie: true, bandeau: null });
      }
    }
  });

  it("exigé : seuls trialing, active et past_due ouvrent la saisie", () => {
    const ouvre = (statut: string) => droitsDe(ligne({ statut }), EXIGE).saisie;
    for (const s of ["trialing", "active", "past_due"]) expect(ouvre(s), s).toBe(true);
    for (const s of ["unpaid", "canceled", "paused", "incomplete", "incomplete_expired"]) expect(ouvre(s), s).toBe(false);
  });

  it("exigé : un état inconnu de Stripe ferme la saisie plutôt que de l'ouvrir", () => {
    expect(droitsDe(ligne({ statut: "nouvel_etat" }), EXIGE)).toMatchObject({ saisie: false, bandeau: { ton: "ferme" } });
  });

  it("exigé, sans abonnement : saisie fermée, la lecture reste ouverte ; l'export, seulement à qui a payé (ADR-053 § 15)", () => {
    for (const l of [null, ligne({ statut: null })]) {
      const d = droitsDe(l, EXIGE);
      expect(d.saisie).toBe(false);
      expect(d.bandeau?.message).toMatch(/restent consultables\./);
    }
    expect(droitsDe(ligne({ statut: "canceled", debutPayantLe: new Date("2026-01-01") }), EXIGE).bandeau?.message).toMatch(
      /consultables et exportables/,
    );
    expect(droitsDe(ligne({ statut: "paused" }), EXIGE).bandeau?.message).not.toMatch(/exportables/);
  });

  it("paiement échoué : saisie ouverte, alerte", () => {
    expect(droitsDe(ligne({ statut: "past_due" }), EXIGE)).toEqual({
      saisie: true,
      bandeau: { ton: "alerte", message: expect.stringMatching(/paiement a échoué/) },
    });
  });

  it("résiliation programmée : annoncée, par cancel_at ou en fin de période", () => {
    expect(droitsDe(ligne({ finPrevueLe: jours(10) }), EXIGE).bandeau?.message).toMatch(/prend fin le 13 novembre 2026/);
    expect(droitsDe(ligne({ resilieEnFinDePeriode: true, finPeriode: jours(20) }), EXIGE).bandeau?.message).toMatch(
      /prend fin le 23 novembre 2026/,
    );
  });

  it("essai : annoncé dans la semaine qui précède sa fin, pas avant", () => {
    expect(droitsDe(ligne({ statut: "trialing", finEssai: jours(5) }), EXIGE).bandeau?.message).toMatch(
      /essai se termine le 08 novembre 2026/,
    );
    expect(droitsDe(ligne({ statut: "trialing", finEssai: jours(10) }), EXIGE)).toEqual({ saisie: true, bandeau: null });
  });

  it("abonnement actif sans échéance particulière : rien à dire", () => {
    expect(droitsDe(ligne({}), EXIGE)).toEqual({ saisie: true, bandeau: null });
  });
});

describe("gesteAbonnement", () => {
  const ligne = (o: Partial<{ statut: string | null; stripeSubscriptionId: string | null; essaiUtiliseLe: Date | null }>) => ({
    statut: null,
    stripeSubscriptionId: null,
    essaiUtiliseLe: null,
    ...o,
  });

  it("offre non lancée : aucun geste", () => {
    expect(gesteAbonnement({ ouvert: false, role: "owner", ligne: null })).toBeNull();
  });

  it("sans compte encore : l'essai (pas « réservé au propriétaire »)", () => {
    expect(gesteAbonnement({ ouvert: true, role: null, ligne: null })).toBe("essai");
  });

  it("un membre ou un lecteur : l'état seul", () => {
    for (const role of ["member", "lecture"]) expect(gesteAbonnement({ ouvert: true, role, ligne: null })).toBe("membre");
  });

  it("propriétaire : l'essai tant qu'il est disponible, le portail tant qu'un abonnement court, sinon Checkout", () => {
    const g = (l: ReturnType<typeof ligne> | null) => gesteAbonnement({ ouvert: true, role: "owner", ligne: l });
    expect(g(null)).toBe("essai");
    expect(g(ligne({}))).toBe("essai");
    for (const statut of ["trialing", "paused"]) {
      expect(g(ligne({ statut, stripeSubscriptionId: "sub_1", essaiUtiliseLe: new Date() })), statut).toBe("abonner");
    }
    for (const statut of ["active", "past_due", "unpaid", "incomplete"]) {
      expect(g(ligne({ statut, stripeSubscriptionId: "sub_1", essaiUtiliseLe: new Date() })), statut).toBe("portail");
    }
    for (const statut of ["canceled", "incomplete_expired"]) {
      expect(g(ligne({ statut, stripeSubscriptionId: "sub_1", essaiUtiliseLe: new Date() })), statut).toBe("souscrire");
    }
    // Un démarrage en cours ou interrompu (verrou, pas d'abonnement) se tranche
    // sur l'écran d'essai, qui relit Stripe — jamais par un Checkout.
    expect(g(ligne({ essaiUtiliseLe: new Date() }))).toBe("essai");
  });
});
