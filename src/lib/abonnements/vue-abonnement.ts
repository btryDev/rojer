// Ce que la page Abonnement montre au propriétaire, décidé en un seul endroit
// (audit du 2026-11-16, passe « altitude ») : la page ne recombine plus ses
// booléens bloc par bloc — elle lit une variante et l'affiche. Fonction pure,
// testée état par état (`vue-abonnement.test.ts`).
//
// Les gestes viennent de `gesteAbonnement` (droits.ts). Depuis l'ADR-053 § 9
// amendé (2026-11-16), « s'abonner » est un seul geste — Checkout, paiement
// immédiat — pendant l'essai, après lui, ou après une résiliation.

import { A_REGLER, type Geste } from "./droits";
import type { CleFormule, Periodicite } from "./formules";

type Choix = { formule: CleFormule; periodicite: Periodicite };

export type EntreeVue = {
  geste: Geste | null;
  statut: string | null;
  /** L'essai court encore (`enEssai`, droits.ts). */
  enEssai: boolean;
  /** `?document=1` : un document officiel attend l'abonnement. */
  documentAttend: boolean;
};

export type VueAbonnement =
  | { cas: "aucune" }
  | { cas: "membre"; titre: string }
  | { cas: "essai"; titre: string }
  | {
      cas: "portail";
      titre: string;
      /**
       * Un paiement à régler : un impayé (`past_due`, `unpaid`) se règle au
       * portail de Stripe, qui enregistre la nouvelle carte et relance la
       * facture ; un premier paiement à confirmer (`incomplete`), sur la page
       * de sa facture (répétition du 2026-11-17).
       */
      aRegler: "impaye" | "premier-paiement" | null;
    }
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
      return { cas: "aucune" };
    case "membre":
      return { cas: "membre", titre: "Gérer" };
    case "essai":
      return { cas: "essai", titre: "Essai gratuit" };
    case "portail":
      return {
        cas: "portail",
        titre: "Gérer",
        aRegler: e.statut === "incomplete" ? "premier-paiement" : A_REGLER.has(e.statut ?? "") ? "impaye" : null,
      };
    case "abonner":
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
