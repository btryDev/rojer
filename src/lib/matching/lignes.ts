/**
 * Les LIGNES de calendrier d'un établissement, telles que le moteur les sert
 * (ADR-057) — la seule voie qui réunit les obligations d'un même geste.
 *
 * L'ordre est la décision, et il n'est écrit qu'ici :
 *
 *  1. le moteur rend ce qui s'applique, chaque obligation pour soi
 *     (`determineObligationsApplicables`) ;
 *  2. les prescriptions particulières renforcent chaque obligation
 *     (`appliquerPrescriptions`, ADR-035) ;
 *  3. les obligations du même geste se réunissent par appareil, la plus
 *     exigeante — prescription comprise — titulaire (`fusionnerGestes`).
 *
 * Une prescription que la fusion rend sans effet — l'obligation qu'elle
 * renforçait est absorbée par une ligne déjà plus stricte — rejoint
 * `ignorees`, avec son motif : la page des prescriptions dit ce que le
 * calendrier fait.
 *
 * Module pur : ni base, ni session.
 */

import { determineObligationsApplicables, fusionnerGestes } from "./engine";
import {
  appliquerPrescriptions,
  MOTIF_PRESCRIPTION_SANS_EFFET,
  prescriptionsSansEffet,
  type ResultatPrescriptions,
} from "./prescriptions";
import type {
  EquipementMatching,
  EtablissementMatching,
  ObligationApplicable,
  PrescriptionMatching,
} from "./types";

export type LignesDuCalendrier = ResultatPrescriptions & {
  /** Ce qui s'applique, prescriptions comprises, AVANT la fusion : chaque
   *  obligation pour soi — ce qu'une prescription peut viser. */
  obligations: ObligationApplicable[];
};

export function lignesDuCalendrier(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  prescriptions: PrescriptionMatching[],
  now: Date,
): LignesDuCalendrier {
  const prescrites = appliquerPrescriptions(
    determineObligationsApplicables(etab, equipements),
    prescriptions,
    equipements,
    now,
  );
  const applicables = fusionnerGestes(prescrites.applicables);
  const dejaIgnorees = new Set(prescrites.ignorees.map((i) => i.prescription.id));
  const sansEffet = prescriptionsSansEffet(prescrites.applicables, applicables);
  return {
    obligations: prescrites.applicables,
    applicables,
    surMesure: prescrites.surMesure,
    ignorees: [
      ...prescrites.ignorees,
      ...prescriptions
        .filter((p) => sansEffet.has(p.id) && !dejaIgnorees.has(p.id))
        .map((prescription) => ({ prescription, raison: MOTIF_PRESCRIPTION_SANS_EFFET })),
    ],
  };
}
