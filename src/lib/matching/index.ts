export {
  determineObligationsApplicables,
  evaluerObligation,
  matchTypologie,
  type DetermineOptions,
  type ResultatTypologie,
} from "./engine";
export {
  appliquerPrescriptions,
  PREFIXE_PRESCRIPTION,
  estObligationSurMesure,
  estPeriodicitePlusStricte,
  prescriptionEnVigueur,
  estPrescriptionLevee,
  type ResultatPrescriptions,
} from "./prescriptions";
export { projeterEtablissement, type SourceEtablissement } from "./projection";
export type {
  EquipementMatching,
  EtablissementMatching,
  ObligationApplicable,
  ObligationSurMesureApplicable,
  PrescriptionIgnoree,
  PrescriptionMatching,
  SurchargePeriodicite,
} from "./types";
