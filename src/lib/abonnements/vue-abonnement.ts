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
import type { CleFormule, Periodicite } from "./formules";

type Choix = { formule: CleFormule; periodicite: Periodicite };

export type EntreeVue = {
  geste: Geste | null;
  statut: string | null;
  /** L'essai court encore (`enEssai`, droits.ts). */
  enEssai: boolean;
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

export type VueAbonnement =
  /** L'offre n'est pas lancée : rien à gérer, tout Rojer reste ouvert. */
  | { cas: "fermee" }
  /** Rien à proposer pour l'instant (retour de paiement, copie en retard). */
  | { cas: "aucune" }
  | { cas: "membre"; titre: string }
  | { cas: "essai"; titre: string }
  | { cas: "portail"; titre: string; situation: SituationPortail }
  | {
      cas: "formulaire";
      titre: string;
      /** Ce qui se passe ensuite, en une phrase. */
      quand: string;
      /** La phrase « un document officiel attend » (`?document=1`). */
      annoncerDocument: boolean;
    };

const STRIPE = "sur la page sécurisée de Stripe, notre prestataire de paiement";

export function vueAbonnement(e: EntreeVue): VueAbonnement {
  switch (e.geste) {
    case null:
      return { cas: "fermee" };
    case "membre":
      return { cas: "membre", titre: "Gérer" };
    case "essai":
      return { cas: "essai", titre: "Essai gratuit" };
    case "portail":
      return {
        cas: "portail",
        titre: "Gérer",
        situation: A_REGLER.has(e.statut ?? "") ? "a-regler" : e.finPrevue ? "fin-prevue" : "a-jour",
      };
    case "abonner":
      if (e.paiementTermine) return { cas: "aucune" };
      return {
        cas: "formulaire",
        titre: "S'abonner",
        quand: e.enEssai
          ? `Le paiement se fait ${STRIPE}. S'abonner met fin à votre essai et lève ses limites.`
          : `Le paiement se fait ${STRIPE}.`,
        annoncerDocument: e.documentAttend,
      };
  }
}

/**
 * La formule présélectionnée dans le formulaire : l'offre choisie sur la page
 * publique (2026-11-16), sinon celle d'un abonnement passé (résilié), qu'on
 * reprend le plus souvent telle quelle (répétition du 2026-11-16).
 */
export function preselection(
  vue: VueAbonnement,
  { abonnement, offreChoisie }: { abonnement: Choix | null; offreChoisie: Choix | null },
): Choix | null {
  if (vue.cas !== "formulaire") return null;
  return offreChoisie ?? abonnement;
}
