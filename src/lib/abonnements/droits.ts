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
 * L'essai, compté chez Rojer (ADR-053 § 9, amendé le 2026-11-16) : une ligne
 * sans copie d'abonnement Stripe (`statut` vide : jamais abonné) et une fin
 * d'essai posée au démarrage. S'abonner pendant l'essai le termine (le
 * `statut` arrive avec l'abonnement).
 */
export const enEssai = (l: Pick<LigneAbonnement, "statut" | "finEssai"> | null, maintenant: Date) =>
  !!l && l.statut === null && !!l.finEssai && l.finEssai.getTime() > maintenant.getTime();
/** Une fin d'essai s'annonce une semaine avant. */
const PREAVIS_ESSAI_MS = 7 * 24 * 60 * 60_000;

/** Une fin est prévue (résiliation en fin de période, ou date posée) : sur la copie de Rojer… */
export const resiliationPrevue = (l: Pick<LigneAbonnement, "finPrevueLe" | "resilieEnFinDePeriode">) =>
  !!l.finPrevueLe || l.resilieEnFinDePeriode;
/** … et sur l'abonnement relu chez Stripe (`cancel_at_period_end`, `cancel_at`) : la même règle. */
export const resiliationDemandee = (s: { cancel_at_period_end: boolean; cancel_at: number | null }) =>
  s.cancel_at_period_end || !!s.cancel_at;

/**
 * Où en est un compte dont la saisie est fermée — une seule classification,
 * lue par le bandeau et par le libellé d'état (audit du 2026-11-16) :
 * jamais d'essai ; une facture attend ; un essai fini sans jamais payer ;
 * un abonnement qui a cessé.
 */
export type SituationFermee = "sans-essai" | "facture-en-attente" | "essai-termine" | "abonnement-termine";
export function situationFermee(ligne: Pick<LigneAbonnement, "statut" | "debutPayantLe" | "finEssai"> | null): SituationFermee {
  if (!ligne || (!ligne.statut && !ligne.finEssai)) return "sans-essai";
  if (!ligne.statut) return "essai-termine";
  if (A_REGLER.has(ligne.statut)) return "facture-en-attente";
  return ligne.debutPayantLe ? "abonnement-termine" : "essai-termine";
}

const consultables = (paye: boolean) => `Vos dossiers restent consultables${paye ? " et exportables" : ""}.`;

export function droitsDe(ligne: LigneAbonnement | null, ctx: ContexteDroits): Droits {
  if (!ctx.stripeActif || !ctx.exige) return { saisie: true, bandeau: null };

  if (ligne && enEssai(ligne, ctx.maintenant)) {
    const fin = ligne.finEssai!;
    const proche = fin.getTime() - ctx.maintenant.getTime() <= PREAVIS_ESSAI_MS;
    return { saisie: true, bandeau: proche ? { ton: "info", message: `Votre essai se termine le ${jour(fin)}.` } : null };
  }

  if (!ligne?.statut || !OUVRENT.has(ligne.statut)) {
    const paye = !!ligne?.debutPayantLe;
    const message = {
      "sans-essai": "Démarrez votre essai gratuit pour saisir dans Rojer : vos dossiers restent consultables.",
      "facture-en-attente": `Une facture attend son paiement : réglez-la depuis la page Abonnement pour rouvrir la saisie. ${consultables(paye)}`,
      "essai-termine": `Votre essai est terminé : abonnez-vous pour reprendre la saisie. ${consultables(false)}`,
      "abonnement-termine": "Votre abonnement n'est plus actif : vos dossiers restent consultables et exportables, la saisie est fermée.",
    }[situationFermee(ligne)];
    return { saisie: false, bandeau: { ton: "ferme", message } };
  }

  if (ligne.statut === "past_due") {
    return {
      saisie: true,
      bandeau: {
        ton: "alerte",
        // Refus de la carte ou confirmation demandée par la banque (3-D
        // Secure) : la page de la facture chez Stripe sert les deux.
        message: "Un paiement n'a pas abouti : réglez la facture en attente depuis la page Abonnement. Votre banque peut vous y demander une confirmation.",
      },
    };
  }
  const fin = resiliationPrevue(ligne) ? (ligne.finPrevueLe ?? ligne.finPeriode) : null;
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
 * L'état Stripe dit au dirigeant ; un état inconnu se dit comme tel. Un
 * compte qui n'a jamais payé n'a été ni « suspendu » ni « résilié » : son
 * essai est terminé (`situationFermee`, comme le bandeau).
 */
export function libelleStatut(ligne: Pick<LigneAbonnement, "statut" | "debutPayantLe" | "finEssai"> | null, maintenant: Date): string {
  const statut = ligne?.statut ?? null;
  if (enEssai(ligne, maintenant)) return "Essai en cours";
  if (!statut) return ligne?.finEssai ? "Essai terminé" : "Aucun abonnement";
  if (!OUVRENT.has(statut) && situationFermee(ligne) === "essai-termine") return "Essai terminé";
  return LIBELLES[statut] ?? "État inconnu";
}

/** Les états dont on ne revient pas : on souscrit un nouvel abonnement (Checkout). */
const TERMINES = new Set(["canceled", "incomplete_expired"]);
/** Un abonnement Stripe qui court encore (payé, impayé, premier paiement en attente) : on le gère, on n'en ajoute pas. */
export const abonnementEnCours = (statut: string | null) => statut !== null && !TERMINES.has(statut);

/**
 * Le compte peut-il démarrer son essai ? Un seul par compte : la date de son
 * démarrage n'est jamais effacée (`essaiUtiliseLe`). Un compte qui s'est
 * abonné avant ce lot sans essai Rojer n'en a pas non plus (`statut`).
 */
export const essaiDisponible = (ligne: { essaiUtiliseLe: Date | null; statut: string | null } | null) =>
  !ligne?.essaiUtiliseLe && !ligne?.statut;

/** Le nom posé sur le client Stripe à l'essai, avant de connaître l'entreprise. */
export const nomProvisoire = (email: string) => email;
/** Le client Stripe porte-t-il encore ce nom provisoire (ou aucun) ? */
export const aNomProvisoire = (c: { name?: string | null; email?: string | null }) =>
  !c.name || (!!c.email && c.name === nomProvisoire(c.email));

/** Les états où une facture attend d'être réglée : impayé, premier paiement non abouti. */
export const A_REGLER: ReadonlySet<string> = new Set(["past_due", "unpaid", "incomplete"]);

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
