// Ce que l'abonnement d'un compte permet (ADR-053 § 3), seule lecture de la
// correspondance entre les états Stripe et la saisie. Fonction pure : la
// lecture de la ligne et du réglage est dans `droits-du-compte.ts`.
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

  const statut = ligne?.statut ?? null;
  if (!statut || !OUVRENT.has(statut)) {
    return {
      saisie: false,
      bandeau: {
        ton: "ferme",
        message: statut
          ? "Votre abonnement n'est plus actif : vos dossiers restent consultables et exportables, la saisie est fermée."
          : "Choisissez une formule pour saisir dans Rojer : vos dossiers restent consultables et exportables.",
      },
    };
  }

  if (statut === "past_due") {
    return {
      saisie: true,
      bandeau: { ton: "alerte", message: "Le dernier paiement a échoué : mettez à jour votre moyen de paiement." },
    };
  }
  const fin = ligne!.finPrevueLe ?? (ligne!.resilieEnFinDePeriode ? ligne!.finPeriode : null);
  if (fin) {
    return { saisie: true, bandeau: { ton: "info", message: `Votre abonnement prend fin le ${jour(fin)}.` } };
  }
  if (statut === "trialing" && ligne!.finEssai && ligne!.finEssai.getTime() - ctx.maintenant.getTime() <= PREAVIS_ESSAI_MS) {
    return { saisie: true, bandeau: { ton: "info", message: `Votre essai se termine le ${jour(ligne!.finEssai)}.` } };
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
