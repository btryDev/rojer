// Ce que l'abonnement d'un compte permet (ADR-053 § 3), seule lecture de la
// correspondance entre les états Stripe et la saisie. Fonction pure : la
// lecture de la ligne et du réglage est dans `saisie.ts`.
//
// - La lecture n'est JAMAIS fermée : seules les écritures passent par cette
//   règle (`verifierSaisie`). L'export des documents officiels demande d'avoir
//   payé une fois (ADR-053 § 15, `validation.ts`) : le bandeau le dit.
// - Tant que l'abonnement n'est pas exigé (`ABONNEMENT_EXIGE`, posé au
//   lancement de l'offre) ou que Stripe est désactivé, la saisie reste
//   ouverte pour tous, sans bandeau.
// - Exigé : l'essai en cours (compté chez Rojer : pas encore de copie Stripe,
//   `finEssai` à venir — ADR-053 § 9, amendé le 2026-11-16), `active` et
//   `past_due` ouvrent la saisie (`past_due` avec une alerte) ; tout autre
//   état, état inconnu compris, l'essai terminé et l'absence d'abonnement la
//   ferment. Un état que Stripe ajouterait demain ferme la saisie plutôt que
//   de l'ouvrir.

import { formaterDateLongueFr as jour } from "@/lib/dates";

export type LigneAbonnement = {
  statut: string | null;
  finEssai: Date | null;
  finPeriode: Date | null;
  resilieEnFinDePeriode: boolean;
  finPrevueLe: Date | null;
  /** Le premier paiement confirmé (ADR-053 § 15) : sans lui, pas d'export officiel. */
  debutPayantLe?: Date | null;
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

/** Les états Stripe qui ouvrent la saisie, et dont la période court. */
export const OUVRENT: ReadonlySet<string> = new Set(["active", "past_due"]);
/**
 * Les états où une facture attend d'être réglée : tous se règlent au portail
 * de Stripe, qui enregistre la carte, demande la confirmation de la banque et
 * relance la facture (répétition du 2026-11-17). `incomplete` n'arrive plus
 * par Checkout ; il reste ici pour qu'un tel état ne ferme pas sans issue.
 */
export const A_REGLER: ReadonlySet<string> = new Set(["past_due", "unpaid", "incomplete"]);

/**
 * Le même filtre en base : sans abonnement qui paie ou est à régler — `statut`
 * vide compris, que `notIn` écarterait (rappels, suppression).
 */
export const HORS_ABONNEMENT_OUVERT = { OR: [{ statut: null }, { statut: { notIn: [...OUVRENT] } }] };

/** Une fin d'essai s'annonce une semaine avant (bandeau, et rappel J-7). */
export const PREAVIS_ESSAI_MS = 7 * 24 * 60 * 60_000;

/**
 * Où en est un compte — LA lecture, dont tout le reste découle (droits,
 * libellé, limites de l'essai, page Abonnement ; relecture du 2026-11-17) :
 * - `abonne` : un abonnement Stripe qui paie ou est à régler (`OUVRENT`) ;
 * - `essai` : l'essai compté chez Rojer (ADR-053 § 9, amendé le
 *   2026-11-16) — une fin à venir, aucun paiement jamais confirmé ; une
 *   souscription abandonnée à la confirmation de la banque (`incomplete`,
 *   `incomplete_expired`) ne le coupe pas ;
 * - `facture-en-attente` : impayé, premier paiement non abouti, hors essai ;
 * - `sans-essai`, `essai-termine` (jamais payé), `abonnement-termine` (a payé).
 * Un état que Stripe ajouterait demain tombe dans un état fermé.
 */
export type Phase =
  | { type: "sans-essai" }
  | { type: "essai"; fin: Date }
  | { type: "abonne"; statut: string }
  | { type: "facture-en-attente" }
  | { type: "essai-termine" }
  | { type: "abonnement-termine" };

export function phaseDuCompte(
  l: Pick<LigneAbonnement, "statut" | "finEssai" | "debutPayantLe"> | null,
  maintenant: Date,
): Phase {
  if (!l) return { type: "sans-essai" };
  if (l.statut && OUVRENT.has(l.statut)) return { type: "abonne", statut: l.statut };
  if (!l.debutPayantLe && l.finEssai && l.finEssai.getTime() > maintenant.getTime()) return { type: "essai", fin: l.finEssai };
  if (l.statut && A_REGLER.has(l.statut)) return { type: "facture-en-attente" };
  if (!l.statut && !l.finEssai) return { type: "sans-essai" };
  return { type: l.debutPayantLe ? "abonnement-termine" : "essai-termine" };
}

/** L'essai court-il ? (`phaseDuCompte`) */
export const enEssai = (l: Pick<LigneAbonnement, "statut" | "finEssai" | "debutPayantLe"> | null, maintenant: Date) =>
  phaseDuCompte(l, maintenant).type === "essai";

/** Une fin est prévue (résiliation en fin de période, ou date posée) : sur la copie de Rojer… */
export const resiliationPrevue = (l: Pick<LigneAbonnement, "finPrevueLe" | "resilieEnFinDePeriode">) =>
  !!l.finPrevueLe || l.resilieEnFinDePeriode;
/** … et sur l'abonnement relu chez Stripe (`cancel_at_period_end`, `cancel_at`) : la même règle. */
export const resiliationDemandee = (s: { cancel_at_period_end: boolean; cancel_at: number | null }) =>
  s.cancel_at_period_end || !!s.cancel_at;

const consultables = (paye: boolean) => `Vos dossiers restent consultables${paye ? " et exportables" : ""}.`;

export function droitsDe(ligne: LigneAbonnement | null, ctx: ContexteDroits): Droits {
  if (!ctx.stripeActif || !ctx.exige) return { saisie: true, bandeau: null };
  const phase = phaseDuCompte(ligne, ctx.maintenant);
  const paye = !!ligne?.debutPayantLe;
  const ferme = (message: string): Droits => ({ saisie: false, bandeau: { ton: "ferme", message } });
  switch (phase.type) {
    case "essai": {
      const proche = phase.fin.getTime() - ctx.maintenant.getTime() <= PREAVIS_ESSAI_MS;
      return { saisie: true, bandeau: proche ? { ton: "info", message: `Votre essai se termine le ${jour(phase.fin)}.` } : null };
    }
    case "sans-essai":
      return ferme("Démarrez votre essai gratuit pour saisir dans Rojer : vos dossiers restent consultables.");
    case "facture-en-attente":
      return ferme(`Votre dernier paiement n'est pas passé : depuis la page Abonnement, changez de carte ou confirmez le paiement pour rouvrir la saisie. ${consultables(paye)}`);
    case "essai-termine":
      return ferme(`Votre essai est terminé : abonnez-vous pour reprendre la saisie. ${consultables(false)}`);
    case "abonnement-termine":
      return ferme("Votre abonnement n'est plus actif : vos dossiers restent consultables et exportables, la saisie est fermée.");
    case "abonne":
      break;
  }
  if (phase.statut === "past_due") {
    return {
      saisie: true,
      bandeau: {
        ton: "alerte",
        // Carte refusée ou confirmation demandée par la banque (3-D Secure) :
        // le portail de Stripe sert les deux (répétition du 2026-11-17).
        message: "Votre dernier paiement n'est pas passé : depuis la page Abonnement, changez de carte ou confirmez le paiement.",
      },
    };
  }
  const fin = ligne && resiliationPrevue(ligne) ? (ligne.finPrevueLe ?? ligne.finPeriode) : null;
  if (fin) {
    return { saisie: true, bandeau: { ton: "info", message: `Votre abonnement prend fin le ${jour(fin)}.` } };
  }
  return { saisie: true, bandeau: null };
}

const LIBELLES: Record<string, string> = {
  active: "Actif",
  past_due: "Paiement à régler",
  unpaid: "Impayé",
  canceled: "Résilié",
  incomplete: "Paiement en attente",
  incomplete_expired: "Paiement non abouti",
};

/**
 * L'état dit au dirigeant (`phaseDuCompte`) ; un état inconnu se dit comme
 * tel. Un compte qui n'a jamais payé n'a pas été « résilié » : son essai est
 * terminé.
 */
export function libelleStatut(ligne: Pick<LigneAbonnement, "statut" | "debutPayantLe" | "finEssai"> | null, maintenant: Date): string {
  const phase = phaseDuCompte(ligne, maintenant);
  if (phase.type === "essai") return "Essai en cours";
  if (phase.type === "essai-termine") return "Essai terminé";
  if (phase.type === "sans-essai") return "Aucun abonnement";
  return LIBELLES[ligne?.statut ?? ""] ?? "État inconnu";
}

/** Les états dont on ne revient pas : on souscrit un nouvel abonnement (Checkout). */
export const TERMINES: ReadonlySet<string> = new Set(["canceled", "incomplete_expired"]);
/** Un abonnement Stripe qui court encore (payé ou à régler) : on le gère au portail, on n'en ajoute pas. */
export const abonnementEnCours = (statut: string | null) => statut !== null && !TERMINES.has(statut);

/**
 * Le compte peut-il démarrer son essai ? Un seul par compte : la date de son
 * démarrage n'est jamais effacée (`essaiUtiliseLe`). Un compte qui s'est
 * abonné avant ce lot sans essai Rojer n'en a pas non plus (`statut`).
 */
export const essaiDisponible = (ligne: { essaiUtiliseLe: Date | null; statut: string | null } | null) =>
  !ligne?.essaiUtiliseLe && !ligne?.statut;

/** Le nom posé sur le client Stripe à sa création (au moment de s'abonner), avant que Checkout ne prenne le vrai. */
export const nomProvisoire = (email: string) => email;
/** Le client Stripe porte-t-il encore ce nom provisoire (ou aucun) ? */
export const aNomProvisoire = (c: { name?: string | null; email?: string | null }) =>
  !c.name || (!!c.email && c.name === nomProvisoire(c.email));


export type Geste = "membre" | "essai" | "abonner" | "portail";

/**
 * Le geste que la page de l'abonnement propose (ADR-053 § 9, amendé le
 * 2026-11-16) : l'essai tant qu'il est disponible — y compris sans compte
 * encore — ; le portail tant qu'un abonnement Stripe court (carte, factures,
 * résiliation) ; sinon « s'abonner » (Checkout), pendant l'essai, après lui
 * ou après une résiliation. Un membre voit l'état sans geste ; offre non
 * lancée, aucun.
 */
export function gesteAbonnement(o: {
  ouvert: boolean;
  role: string | null;
  ligne: { statut: string | null; essaiUtiliseLe: Date | null } | null;
}): Geste | null {
  if (!o.ouvert) return null;
  if (o.role !== null && o.role !== "owner") return "membre";
  if (essaiDisponible(o.ligne)) return "essai";
  return abonnementEnCours(o.ligne?.statut ?? null) ? "portail" : "abonner";
}
