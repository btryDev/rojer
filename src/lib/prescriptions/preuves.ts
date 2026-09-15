import type { Prisma } from "@prisma/client";
import { PREFIXE_PRESCRIPTION } from "@/lib/matching/prescriptions";
import { estStatutRealise } from "@/lib/dates/retard";
import { cleJourCivil } from "@/lib/dates";

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
 * LA RÈGLE : une preuve compte si elle a été faite SOUS l'acte ET PILOTÉE PAR
 * LUI dans Rojer — sur les lignes qu'il vise, par un rapport daté entre le
 * jour de l'acte et celui de sa levée, et ENREGISTRÉ après la saisie de la
 * prescription (`rapport.createdAt ≥ prescription.createdAt`). Rien n'est
 * deviné : un rapport antérieur à l'acte n'a pas pu être fait sous lui, et un
 * rapport déposé avant la saisie a roulé au rythme du référentiel, puisque la
 * ligne ne connaissait pas encore la prescription.
 *
 * LE SECOND CRITÈRE EST UNE DÉCISION DE LA PROPRIÉTAIRE (2026-09-15, option B).
 * Sans lui, une saisie erronée DATÉE AVANT des rapports existants les comptait,
 * et aucune action ne corrigeant la date d'une prescription, elle restait
 * insupprimable. Le prix, accepté : un arrêté réel saisi tard — acte de 2020,
 * saisi en 2026, rapports de 2021 à 2025 déposés avant — devient supprimable ;
 * seule la confirmation « saisie par erreur » le protège. Les rapports, eux, ne
 * sont jamais supprimés (ADR-012) : ce qui part, c'est l'explication de leur
 * rythme dans le dossier.
 *
 * `dateDocument` est la seule date d'effet du modèle : `appliquerPrescriptions`
 * n'en connaît pas d'autre que la fin, et une date d'acte est ce que la pièce
 * porte. Limite, théorique à ce jour : les lignes
 * visées se trouvent par leur `obligationId`. Une succession qui renomme
 * l'obligation ciblée (`succedeA`, `absorbePar`) déplace les lignes sous un
 * autre identifiant, et le compte tombe à zéro sans que rien n'ait été
 * supprimé — le même lien fragile que `prescriptionId`, en plus rare.
 */

export type PrescriptionAPreuver = {
  id: string;
  effet: "renforce_periodicite" | "obligation_sur_mesure";
  obligationId: string | null;
  equipementId: string | null;
  dateDocument: Date;
  /** La levée : un rapport daté APRÈS n'a pas été fait sous l'acte. */
  dateFin: Date | null;
  /** La saisie dans Rojer : un rapport enregistré avant n'a pas roulé à son
   *  rythme. */
  createdAt: Date;
};

/** Ce que la lecture rend d'une ligne visée. */
export type LigneVisee = {
  statut: string;
  rapports: ReadonlyArray<{ dateRapport: Date; createdAt: Date }>;
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
  rapports: { select: { dateRapport: true, createdAt: true } },
  _count: { select: { actions: true } },
} satisfies Prisma.VerificationSelect;

export function versLigneVisee(v: {
  statut: string;
  rapports: { dateRapport: Date; createdAt: Date }[];
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
 * rapports datés du jour de l'acte à la VEILLE de sa levée comptent. Les dates
 * se comparent en JOUR CIVIL de Paris (ADR-011), comme la vigueur elle-même
 * (`prescriptionEnVigueur`) : le jour de la levée, l'acte ne produit plus
 * d'effet. ~~Un rapport daté du jour de la levée a été fait sous l'acte~~ — la
 * phrase contredisait le moteur, qui tient la prescription levée ce jour-là
 * (relecture du 2026-09-15).
 * Les actions n'y comptent pas :
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
  return lignes.filter((l) => l.rapports.some((r) => faitSousLActe(p, r))).length;
}

/**
 * Un rapport a-t-il été fait sous l'acte d'un renforcement ? La règle, écrite
 * une fois : le compte des preuves et la garde de la levée la partagent.
 */
function faitSousLActe(
  p: PrescriptionAPreuver,
  r: { dateRapport: Date; createdAt: Date },
): boolean {
  const jour = cleJourCivil(r.dateRapport);
  if (jour < cleJourCivil(p.dateDocument)) return false;
  if (p.dateFin !== null && jour >= cleJourCivil(p.dateFin)) return false;
  // En INSTANTS, et c'est voulu : deux horodatages d'enregistrement, pas des
  // dates civiles saisies. Un rapport déposé le jour même de la saisie, avant
  // elle, n'a pas roulé à son rythme.
  return r.createdAt.getTime() >= p.createdAt.getTime();
}

/**
 * La date du dernier rapport fait sous l'acte, SANS borne de levée — ce qu'une
 * levée ne peut pas précéder (2026-09-15). Levée « au 01/06/2024 » après deux
 * rapports déposés en 2025 au rythme de l'acte, la prescription ne comptait
 * plus aucune preuve et se laissait supprimer : l'antidate effaçait ce que
 * l'acte avait fait faire. `null` : rien n'a été fait sous lui.
 */
export function dernierRapportSousLActe(
  p: PrescriptionAPreuver,
  lignes: ReadonlyArray<LigneVisee>,
): Date | null {
  const ouverte = { ...p, dateFin: null };
  let dernier: Date | null = null;
  for (const l of lignes) {
    for (const r of l.rapports) {
      if (p.effet === "renforce_periodicite" && !faitSousLActe(ouverte, r)) continue;
      if (dernier === null || r.dateRapport.getTime() > dernier.getTime()) {
        dernier = r.dateRapport;
      }
    }
  }
  return dernier;
}
