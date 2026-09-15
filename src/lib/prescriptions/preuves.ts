import type { Prisma } from "@prisma/client";
import { PREFIXE_PRESCRIPTION } from "@/lib/matching/prescriptions";
import { estStatutRealise } from "@/lib/dates/retard";

/**
 * Ce qu'une prescription a produit de probant — la question que pose sa
 * suppression (ADR-012, ADR-035). Module pur : la lecture est faite par
 * l'appelant, la règle vit ici et se teste sans base.
 *
 * POURQUOI PLUS PAR `Verification.prescriptionId` (2026-09-15). Ce lien est
 * écrit et effacé par la RÉGÉNÉRATION, pas par l'histoire : la ligne le perd
 * dès que la prescription cesse de surcharger (levée, ou rattrapée par le
 * référentiel), et le reçoit dès sa création, rapports anciens compris. Le
 * compte qui s'y fiait se trompait dans les deux sens :
 *
 *  · une saisie ERRONÉE sur un portail contrôlé en 2025 comptait ces rapports
 *    dès la création — suppression refusée, « levez-la », puis refusée encore
 *    une fois levée : on tournait en rond ;
 *  · une prescription RATTRAPÉE par le référentiel, ou levée, ne marquait plus
 *    ses lignes — compte à zéro, suppression acceptée, et l'acte qui
 *    justifiait les rapports déposés à son rythme disparaissait.
 *
 * LA RÈGLE : une preuve compte si elle a été faite SOUS l'acte — sur les
 * lignes qu'il vise, par un rapport daté du jour de l'acte ou après. Rien n'est
 * deviné : un rapport antérieur à l'acte n'a pas pu être fait sous lui, et un
 * rapport postérieur l'a été, que le produit ait su ou non l'acte à cette date
 * (un arrêté saisi tard reste l'arrêté qui s'appliquait).
 *
 * `dateDocument` est la seule date d'effet du modèle : `appliquerPrescriptions`
 * n'en connaît pas d'autre que la fin, et une date d'acte est ce que la pièce
 * porte. Limite écrite : une saisie erronée DATÉE AVANT des rapports existants
 * les compte, et aucune action ne permet de corriger la date d'une
 * prescription — la suppression reste alors refusée, du côté de la
 * conservation. Elle se lève.
 */

export type PrescriptionAPreuver = {
  id: string;
  effet: "renforce_periodicite" | "obligation_sur_mesure";
  obligationId: string | null;
  equipementId: string | null;
  dateDocument: Date;
};

/** Ce que la lecture rend d'une ligne visée. */
export type LigneVisee = {
  statut: string;
  rapports: ReadonlyArray<{ dateRapport: Date }>;
  nbActions: number;
};

/**
 * Les lignes que la prescription vise, en clause Prisma — obligation × appareil
 * pour un renforcement, ses propres lignes pour une obligation sur mesure.
 * `null` : elle ne vise rien (renforcement sans obligation, ignoré par le
 * moteur), donc elle n'a rien produit.
 */
export function lignesVisees(
  etablissementId: string,
  p: PrescriptionAPreuver,
): Prisma.VerificationWhereInput | null {
  if (p.effet === "obligation_sur_mesure") {
    return { etablissementId, obligationId: `${PREFIXE_PRESCRIPTION}${p.id}` };
  }
  if (p.obligationId === null) return null;
  return {
    etablissementId,
    obligationId: p.obligationId,
    // Sans appareil désigné, la surcharge vise tous ceux qui déclenchent
    // l'obligation : toutes les lignes de l'obligation, archivées comprises —
    // un appareil retiré depuis a pu être contrôlé sous l'acte.
    ...(p.equipementId !== null ? { equipementId: p.equipementId } : {}),
  };
}

/** Le `select` qui rend une `LigneVisee`, partagé par les deux lecteurs. */
export const SELECT_LIGNE_VISEE = {
  statut: true,
  rapports: { select: { dateRapport: true } },
  _count: { select: { actions: true } },
} satisfies Prisma.VerificationSelect;

export function versLigneVisee(v: {
  statut: string;
  rapports: { dateRapport: Date }[];
  _count: { actions: number };
}): LigneVisee {
  return { statut: v.statut, rapports: v.rapports, nbActions: v._count.actions };
}

/**
 * Combien de lignes visées portent une preuve faite sous l'acte.
 *
 * Une obligation SUR MESURE n'existe que par la prescription : tout ce que ses
 * lignes portent — rapport, action, statut réalisé — a été fait sous elle.
 * Un RENFORCEMENT porte sur une obligation qui existait avant lui : seuls les
 * rapports datés de l'acte ou après comptent. Les actions n'y comptent pas :
 * elles naissent d'un rapport ou d'un constat, et ne disent rien du rythme
 * que l'acte imposait.
 */
export function compterLignesAvecPreuve(
  p: PrescriptionAPreuver,
  lignes: ReadonlyArray<LigneVisee>,
): number {
  if (p.effet === "obligation_sur_mesure") {
    return lignes.filter(
      (l) =>
        l.rapports.length > 0 ||
        l.nbActions > 0 ||
        estStatutRealise(l.statut),
    ).length;
  }
  const acte = p.dateDocument.getTime();
  return lignes.filter((l) =>
    l.rapports.some((r) => r.dateRapport.getTime() >= acte),
  ).length;
}
