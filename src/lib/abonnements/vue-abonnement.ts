// Ce que la page Abonnement montre au propriétaire, décidé en un seul endroit
// (audit du 2026-11-16, passe « altitude ») : la page ne recombine plus ses
// booléens bloc par bloc — elle lit une variante et l'affiche. Fonction pure,
// testée état par état (`vue-abonnement.test.ts`).
//
// Les gestes viennent de `gesteAbonnement` (droits.ts) ; cette fonction en
// précise la présentation : titre, mode du formulaire, phrase « quand »,
// libellé du bouton, présence du portail et de « Payer maintenant ».

import { A_REGLER, type Geste } from "./droits";

export type EntreeVue = {
  geste: Geste | null;
  statut: string | null;
  /** Une fin est prévue (`resiliationPrevue`). */
  resiliationPrevue: boolean;
  /** Une carte par défaut chez Stripe (lue seulement quand `besoinDeLaCarte`). */
  carteEnregistree: boolean;
  /** `?immediat=1` : un document officiel attend un paiement. */
  immediat: boolean;
  /** `?carte=` : retour de Checkout « carte », la finalisation s'affiche. */
  retourCarte: boolean;
  /** « , le 16 décembre 2026 », ou vide. */
  finEssai: string;
};

/**
 * `payer` : le bouton principal paie tout de suite (paiement imposé, pause,
 * nouvelle souscription) ; `changer` : essai avec carte, la formule de fin
 * d'essai se change ; `enregistrer` : essai sans carte, la carte et la
 * formule s'enregistrent pour la fin de l'essai.
 */
export type ModeFormulaire = "payer" | "changer" | "enregistrer";

export type VueAbonnement =
  | { cas: "aucune" }
  | { cas: "membre"; titre: string }
  | { cas: "essai"; titre: string }
  | { cas: "finalisation"; titre: string }
  | { cas: "essai-resilie"; titre: string }
  | { cas: "portail"; titre: string; factureEnAttente: boolean }
  | {
      cas: "formulaire";
      titre: string;
      mode: ModeFormulaire;
      libelle: string;
      quand: string;
      proposerPayerMaintenant: boolean;
      /** La phrase « un document officiel attend » (`?immediat=1`). */
      annoncerDocument: boolean;
      /** Le rappel « Après l'essai : Pro, facturation mensuelle ». */
      rappelApresEssai: boolean;
      /** Le portail en second geste (carte, factures, résiliation), avec sa phrase ; `null` : pas de portail. */
      portail: string | null;
    };

const STRIPE = "sur la page sécurisée de Stripe";

/** La carte du compte ne sert qu'au formulaire d'un abonnement qui court sans payer. */
export const besoinDeLaCarte = (e: Pick<EntreeVue, "geste" | "statut" | "resiliationPrevue" | "retourCarte">) =>
  e.geste === "abonner" && !e.retourCarte && !(e.statut === "trialing" && e.resiliationPrevue);

export function vueAbonnement(e: EntreeVue): VueAbonnement {
  switch (e.geste) {
    case null:
      return { cas: "aucune" };
    case "membre":
      return { cas: "membre", titre: "Gérer" };
    case "essai":
      return { cas: "essai", titre: "Essai gratuit" };
    case "portail":
      return { cas: "portail", titre: "Gérer", factureEnAttente: A_REGLER.has(e.statut ?? "") };
    case "abonner":
      if (e.retourCarte) return { cas: "finalisation", titre: "S'abonner" };
      if (e.statut === "trialing" && e.resiliationPrevue) return { cas: "essai-resilie", titre: "Fin de l'essai" };
      return formulaire(e);
    case "souscrire":
      return formulaire(e);
  }
}

function formulaire(e: EntreeVue): Extract<VueAbonnement, { cas: "formulaire" }> {
  const enEssai = e.statut === "trialing";
  const souscrire = e.geste === "souscrire";
  const mode: ModeFormulaire = souscrire || e.immediat || e.statut === "paused" ? "payer" : e.carteEnregistree ? "changer" : "enregistrer";
  const carte = e.carteEnregistree && !souscrire;
  const parMode = {
    payer: {
      titre: "S'abonner",
      libelle: carte ? "Payer et m'abonner" : "Continuer vers le paiement",
      quand: souscrire
        ? `Le paiement se fait ${STRIPE}, notre prestataire de paiement.`
        : carte
          ? "Le premier paiement est prélevé aussitôt sur votre carte enregistrée, et votre abonnement démarre."
          : `Votre carte s'enregistre ${STRIPE} ; le premier paiement est prélevé aussitôt et votre abonnement démarre.`,
    },
    changer: {
      titre: "Changer de formule",
      libelle: "Changer de formule",
      quand: `La formule choisie s'applique à la fin de votre essai${e.finEssai}, et rien n'est prélevé avant ; d'ici là, les limites de l'essai restent.`,
    },
    enregistrer: {
      titre: "Après l'essai",
      libelle: "Enregistrer ma formule",
      quand: `Votre carte s'enregistre ${STRIPE}. Rien n'est prélevé avant la fin de votre essai${e.finEssai}.`,
    },
  }[mode];
  return {
    cas: "formulaire",
    ...parMode,
    mode,
    proposerPayerMaintenant: enEssai && mode !== "payer",
    annoncerDocument: e.immediat && mode === "payer",
    rappelApresEssai: mode === "changer",
    portail: carte
      ? `Carte, factures, résiliation${enEssai ? " avant la fin de l'essai" : ""} : ${STRIPE}.`
      : null,
  };
}
