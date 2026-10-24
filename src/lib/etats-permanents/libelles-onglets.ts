/**
 * Les noms des onglets de « Ce qui doit être en place » (2026-10-24), en un
 * seul endroit : l'écran, la fiche salarié et le PDF de relecture les lisent.
 * Module pur, sans React — le PDF l'importe.
 */

/** Le nom de l'onglet des obligations nées d'un événement. */
export const LABEL_ONGLET_EN_CAS_DE = "En cas de…";

/** L'écran et son onglet, quand on les nomme ailleurs (PDF, fiche salarié). */
export const LABEL_SURFACE_EN_CAS_DE = `Ce qui doit être en place › ${LABEL_ONGLET_EN_CAS_DE}`;
