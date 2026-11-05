// Ce que l'abonnement d'un compte permet (ADR-053 § 3), seule lecture de la
// correspondance entre les états Stripe et la saisie. Fonction pure : la
// lecture de la ligne et du réglage est dans `saisie.ts`.
//
// - La lecture et l'export ne sont JAMAIS fermés : seules les écritures
//   passent par cette règle (`verifierSaisie`).
// - Tant que l'abonnement n'est pas exigé (`ABONNEMENT_EXIGE`, posé au
//   lancement de l'offre) ou que Stripe est désactivé, la saisie reste
//   ouverte pour tous, sans bandeau.
// - Exigé : `trialing`, `active`, `past_due` ouvrent la saisie (`past_due`
//   avec une alerte) ; tout autre état, état inconnu compris, et l'absence
//   d'abonnement la ferment. Un état que Stripe ajouterait demain ferme la
//   saisie plutôt que de l'ouvrir.

import { formaterDateLongueFr as jour } from "@/lib/dates";

export type LigneAbonnement = {
  statut: string | null;
  finEssai: Date | null;
  finPeriode: Date | null;
  resilieEnFinDePeriode: boolean;
  finPrevueLe: Date | null;
};

export type Bandeau = { ton: "info" | "alerte" | "ferme"; message: string };

export type Droits = {
  saisie: boolean;
  /** Ce qu'il faut dire au compte, ou rien. */
  bandeau: Bandeau | null;
};

export type ContexteDroits = {
  /** Stripe configuré (`etatStripe().active`). */
  stripeActif: boolean;
  /** L'offre est lancée : sans abonnement valide, la saisie se ferme. */
  exige: boolean;
  maintenant: Date;
};

const OUVRENT = new Set(["trialing", "active", "past_due"]);
/** Une fin d'essai s'annonce une semaine avant. */
const PREAVIS_ESSAI_MS = 7 * 24 * 60 * 60_000;

export function droitsDe(ligne: LigneAbonnement | null, ctx: ContexteDroits): Droits {
  if (!ctx.stripeActif || !ctx.exige) return { saisie: true, bandeau: null };

  if (!ligne?.statut || !OUVRENT.has(ligne.statut)) {
    return {
      saisie: false,
      bandeau: {
        ton: "ferme",
        message: ligne?.statut
          ? "Votre abonnement n'est plus actif : vos dossiers restent consultables et exportables, la saisie est fermée."
          : "Choisissez une formule pour saisir dans Rojer : vos dossiers restent consultables et exportables.",
      },
    };
  }

  if (ligne.statut === "past_due") {
    return {
      saisie: true,
      bandeau: { ton: "alerte", message: "Le dernier paiement a échoué : mettez à jour votre moyen de paiement." },
    };
  }
  const fin = ligne.finPrevueLe ?? (ligne.resilieEnFinDePeriode ? ligne.finPeriode : null);
  if (fin) {
    return { saisie: true, bandeau: { ton: "info", message: `Votre abonnement prend fin le ${jour(fin)}.` } };
  }
  if (
    ligne.statut === "trialing" &&
    ligne.finEssai &&
    ligne.finEssai.getTime() - ctx.maintenant.getTime() <= PREAVIS_ESSAI_MS
  ) {
    return { saisie: true, bandeau: { ton: "info", message: `Votre essai se termine le ${jour(ligne.finEssai)}.` } };
  }
  return { saisie: true, bandeau: null };
}

const LIBELLES: Record<string, string> = {
  trialing: "Essai en cours",
  active: "Actif",
  past_due: "Paiement en échec",
  unpaid: "Impayé",
  canceled: "Résilié",
  paused: "Suspendu",
  incomplete: "Paiement en attente",
  incomplete_expired: "Paiement non abouti",
};

/** L'état Stripe dit au dirigeant ; un état inconnu se dit comme tel. */
export function libelleStatut(statut: string | null): string {
  if (!statut) return "Aucun abonnement";
  return LIBELLES[statut] ?? "État inconnu";
}

/** Les états dont on ne revient pas : on souscrit un nouvel abonnement (Checkout). */
const TERMINES = new Set(["canceled", "incomplete_expired"]);
export const abonnementTermine = (statut: string | null) => statut !== null && TERMINES.has(statut);

/** Le compte peut-il démarrer son essai ? Ni abonnement, ni essai déjà pris. */
export const essaiDisponible = (ligne: { stripeSubscriptionId: string | null; essaiUtiliseLe: Date | null } | null) =>
  !ligne?.stripeSubscriptionId && !ligne?.essaiUtiliseLe;

export type Geste = "membre" | "essai" | "portail" | "souscrire";

/**
 * Le geste que la page de l'abonnement propose (ADR-053 §§ 10, 12) : l'essai
 * tant qu'il est disponible — y compris sans compte encore —, le portail tant
 * qu'un abonnement court, Checkout après sa fin. Un membre voit l'état sans
 * geste ; offre non lancée, aucun.
 */
export function gesteAbonnement(o: {
  ouvert: boolean;
  role: string | null;
  ligne: { statut: string | null; stripeSubscriptionId: string | null; essaiUtiliseLe: Date | null } | null;
}): Geste | null {
  if (!o.ouvert) return null;
  if (o.role !== null && o.role !== "owner") return "membre";
  if (essaiDisponible(o.ligne)) return "essai";
  return o.ligne?.statut && !abonnementTermine(o.ligne.statut) ? "portail" : "souscrire";
}
