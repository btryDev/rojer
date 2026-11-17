// Ce que la page Abonnement montre au propriétaire, décidé en un seul endroit
// (audit du 2026-11-16, passe « altitude ») : les pages ne recombinent plus
// leurs booléens bloc par bloc — elles lisent une variante et l'affichent.
// Fonction pure, testée état par état (`vue-abonnement.test.ts`).
//
// Les gestes viennent de `gesteAbonnement` (droits.ts). Depuis l'ADR-053 § 9
// amendé (2026-11-16), « s'abonner » est un seul geste — Checkout, paiement
// immédiat — pendant l'essai, après lui, ou après une résiliation.
//
// 2026-11-17 : l'abonnement se découpe en quatre sous-pages ; toutes lisent
// cette variante, y compris l'offre pas encore lancée (`fermee`) et la
// situation d'un abonnement qui court (`situation`), décidées ici une fois.

import { A_REGLER, type Geste } from "./droits";

export type EntreeVue = {
  geste: Geste | null;
  statut: string | null;
  /** Une fin est prévue sur l'abonnement qui court (`resiliationPrevue`, droits.ts). */
  finPrevue: boolean;
  /** `?document=1` : un document officiel attend l'abonnement. */
  documentAttend: boolean;
  /**
   * `?paiement=termine` : retour de Checkout. Si la copie de l'abonnement
   * retarde encore, rien à proposer — jamais un second paiement
   * (répétitions des 2026-11-16 et 17 : bouton de paiement, puis carte vide,
   * à côté de « Paiement terminé »).
   */
  paiementTermine: boolean;
};

/**
 * Un abonnement qui court, au portail de Stripe : un paiement à régler
 * (`A_REGLER`), une fin prévue (à reprendre avant de changer de formule), ou
 * à jour — le seul cas où la formule se change.
 */
export type SituationPortail = "a-regler" | "fin-prevue" | "a-jour";

/** Le geste du portail de Stripe, nommé de la même façon sur toutes les sous-pages. */
export const GESTE_DU_PORTAIL: Record<SituationPortail, string> = {
  "a-regler": "Changer de carte et payer",
  "fin-prevue": "Reprendre mon abonnement",
  "a-jour": "Gérer le paiement",
};

/** Ce que fait le portail, dit avant le clic, de la même façon sur toutes les sous-pages. */
export const CE_QUE_FAIT_LE_PORTAIL: Record<SituationPortail, string> = {
  "a-regler": "Changez de carte, ou confirmez le paiement si votre banque le demande : il est relancé aussitôt.",
  "fin-prevue": "Reprendre l'abonnement annule la fin prévue ; rien n'est prélevé avant la date de renouvellement.",
  "a-jour": "Changer de carte, télécharger vos factures, modifier l'adresse de facturation ou résilier.",
};

export type VueAbonnement =
  /** L'offre n'est pas lancée : rien à gérer, tout Rojer reste ouvert. */
  | { cas: "fermee" }
  /** Rien à proposer pour l'instant (retour de paiement, copie en retard). */
  | { cas: "aucune" }
  | { cas: "membre" }
  | { cas: "essai" }
  | { cas: "portail"; situation: SituationPortail }
  /** S'abonner ; `annoncerDocument` : un document officiel attend (`?document=1`). */
  | { cas: "formulaire"; annoncerDocument: boolean };

export function vueAbonnement(e: EntreeVue): VueAbonnement {
  switch (e.geste) {
    case null:
      return { cas: "fermee" };
    case "membre":
      return { cas: "membre" };
    case "essai":
      return { cas: "essai" };
    case "portail":
      return {
        cas: "portail",
        situation: A_REGLER.has(e.statut ?? "") ? "a-regler" : e.finPrevue ? "fin-prevue" : "a-jour",
      };
    case "abonner":
      if (e.paiementTermine) return { cas: "aucune" };
      return { cas: "formulaire", annoncerDocument: e.documentAttend };
  }
}
