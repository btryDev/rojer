import { describe, expect, it } from "vitest";
import { droitsDe, gesteAbonnement, libelleStatut, type ContexteDroits, type LigneAbonnement } from "./droits";

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

  it("exigé : l'essai en cours, active et past_due ouvrent la saisie ; l'essai fini la ferme (2026-11-16)", () => {
    const ouvre = (statut: string) => droitsDe(ligne({ statut }), EXIGE).saisie;
    for (const s of ["active", "past_due"]) expect(ouvre(s), s).toBe(true);
    for (const s of ["unpaid", "canceled", "incomplete", "incomplete_expired", "trialing", "paused"]) expect(ouvre(s), s).toBe(false);
    // L'essai se compte chez Rojer : jamais abonné (statut vide) et fin à venir.
    expect(droitsDe(ligne({ statut: null, finEssai: jours(20) }), EXIGE).saisie).toBe(true);
    expect(droitsDe(ligne({ statut: null, finEssai: jours(-1) }), EXIGE)).toMatchObject({
      saisie: false,
      bandeau: { message: expect.stringMatching(/^Votre essai est terminé : abonnez-vous/) },
    });
  });

  it("une souscription abandonnée pendant l'essai (confirmation de la banque) ne coupe pas l'essai ; un paiement confirmé, si (relecture du 2026-11-17)", () => {
    for (const statut of ["incomplete", "incomplete_expired", "canceled"]) {
      const l = ligne({ statut, finEssai: jours(20), debutPayantLe: null });
      expect(droitsDe(l, EXIGE).saisie, statut).toBe(true);
      expect(libelleStatut(l, MAINTENANT), statut).toBe("Essai en cours");
    }
    expect(droitsDe(ligne({ statut: "canceled", finEssai: jours(20), debutPayantLe: jours(-5) }), EXIGE).saisie).toBe(false);
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
    expect(droitsDe(ligne({ statut: null, finEssai: jours(-1) }), EXIGE).bandeau?.message).not.toMatch(/exportables/);
  });

  it("saisie fermée : la phrase dit le cas — jamais d'essai, essai fini, abonnement cessé (audit du 2026-11-16)", () => {
    const message = (l: LigneAbonnement | null) => droitsDe(l, EXIGE).bandeau?.message;
    expect(message(null)).toMatch(/^Démarrez votre essai gratuit/);
    expect(message(ligne({ statut: null }))).toMatch(/^Démarrez votre essai gratuit/);
    for (const statut of ["unpaid", "incomplete"]) {
      expect(message(ligne({ statut })), statut).toMatch(/^Une facture attend son paiement.*consultables\.$/);
      expect(message(ligne({ statut, debutPayantLe: new Date("2026-01-01") })), statut).toMatch(/et exportables\.$/);
    }
    for (const statut of ["canceled", "incomplete_expired"]) {
      expect(message(ligne({ statut })), statut).toMatch(/^Votre essai est terminé/);
    }
    expect(message(ligne({ statut: null, finEssai: jours(-1) }))).toMatch(/^Votre essai est terminé/);
    expect(message(ligne({ statut: "canceled", debutPayantLe: new Date("2026-01-01") }))).toMatch(/^Votre abonnement n'est plus actif/);
  });

  it("l'état dit au dirigeant : un compte qui n'a jamais payé a un essai terminé, pas un abonnement suspendu", () => {
    const paye = new Date("2026-01-01");
    const l = (statut: string | null, o: { debutPayantLe?: Date | null; finEssai?: Date | null } = {}) => ({
      statut,
      debutPayantLe: o.debutPayantLe ?? null,
      finEssai: o.finEssai ?? null,
    });
    expect(libelleStatut(null, MAINTENANT)).toBe("Aucun abonnement");
    expect(libelleStatut(l(null), MAINTENANT)).toBe("Aucun abonnement");
    expect(libelleStatut(l(null, { finEssai: jours(3) }), MAINTENANT)).toBe("Essai en cours");
    expect(libelleStatut(l(null, { finEssai: jours(-3) }), MAINTENANT)).toBe("Essai terminé");
    for (const statut of ["canceled", "incomplete_expired"]) {
      expect(libelleStatut(l(statut), MAINTENANT), statut).toBe("Essai terminé");
    }
    expect(libelleStatut(l("canceled", { debutPayantLe: paye }), MAINTENANT)).toBe("Résilié");
    // Une facture attend : l'état le dit, comme le bandeau.
    expect(libelleStatut(l("unpaid"), MAINTENANT)).toBe("Impayé");
  });

  it("paiement à régler (refus ou confirmation de la banque) : saisie ouverte, alerte", () => {
    expect(droitsDe(ligne({ statut: "past_due" }), EXIGE)).toEqual({
      saisie: true,
      bandeau: { ton: "alerte", message: expect.stringMatching(/paiement n.a pas abouti.*confirmation/) },
    });
  });

  it("résiliation programmée : annoncée, par cancel_at ou en fin de période", () => {
    expect(droitsDe(ligne({ finPrevueLe: jours(10) }), EXIGE).bandeau?.message).toMatch(/prend fin le 13 novembre 2026/);
    expect(droitsDe(ligne({ resilieEnFinDePeriode: true, finPeriode: jours(20) }), EXIGE).bandeau?.message).toMatch(
      /prend fin le 23 novembre 2026/,
    );
  });

  it("essai : annoncé dans la semaine qui précède sa fin, pas avant", () => {
    expect(droitsDe(ligne({ statut: null, finEssai: jours(5) }), EXIGE).bandeau?.message).toMatch(
      /essai se termine le 08 novembre 2026/,
    );
    expect(droitsDe(ligne({ statut: null, finEssai: jours(10) }), EXIGE)).toEqual({ saisie: true, bandeau: null });
  });

  it("abonnement actif sans échéance particulière : rien à dire", () => {
    expect(droitsDe(ligne({}), EXIGE)).toEqual({ saisie: true, bandeau: null });
  });
});

describe("gesteAbonnement", () => {
  const ligne = (o: Partial<{ statut: string | null; essaiUtiliseLe: Date | null }>) => ({
    statut: null,
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

  it("propriétaire : l'essai tant qu'il est disponible, le portail tant qu'un abonnement court, sinon « s'abonner » (2026-11-16)", () => {
    const g = (l: ReturnType<typeof ligne> | null) => gesteAbonnement({ ouvert: true, role: "owner", ligne: l });
    expect(g(null)).toBe("essai");
    expect(g(ligne({}))).toBe("essai");
    // Essai pris (en cours ou fini), jamais abonné : s'abonner.
    expect(g(ligne({ essaiUtiliseLe: new Date() }))).toBe("abonner");
    for (const statut of ["active", "past_due", "unpaid", "incomplete"]) {
      expect(g(ligne({ statut, essaiUtiliseLe: new Date() })), statut).toBe("portail");
    }
    for (const statut of ["canceled", "incomplete_expired"]) {
      expect(g(ligne({ statut, essaiUtiliseLe: new Date() })), statut).toBe("abonner");
      // Abonné sans essai Rojer (d'avant ce lot) : pas d'essai offert pour autant.
      expect(g(ligne({ statut })), statut).toBe("abonner");
    }
  });
});
