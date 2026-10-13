/**
 * UN APPAREIL RETIRÉ DU PARC EST EN LECTURE SEULE (décision de la
 * propriétaire, 2026-10-12).
 *
 * Retirer un appareil qui porte une trace le passe `actif = false` (ADR-012) :
 * sa fiche et ses rapports restent consultables, au registre comme ailleurs.
 * ~~Un bouton permettait de le remettre dans le parc (`reactiverEquipement`).~~
 * Il n'y a plus de remise en service : la réactivation blanchissait le retard
 * des lignes sans preuve, supprimées au retrait et recréées au retour avec une
 * origine de suivi neuve (`calendrier/generateur.ts`, chantiers-ouverts § 11).
 * Un appareil qui revient se déclare comme un nouvel appareil.
 *
 * Ce module porte la règle et sa phrase, pour que chaque action serveur qui
 * écrit sur un appareil — modifier, répondre à une question, retirer, déposer
 * un rapport — refuse avec les mêmes mots, et que les écrans qui retirent
 * leurs boutons lisent le même prédicat. Hors du fichier `"use server"`, qui
 * ne peut exporter que des fonctions asynchrones.
 */

export const MESSAGE_APPAREIL_RETIRE =
  "Cet appareil a été retiré du parc : sa fiche et ses rapports restent " +
  "consultables, mais il ne peut plus être modifié ni remis en service. " +
  "S'il revient, déclarez-le comme un nouvel appareil.";

/** Le seul prédicat : un appareil hors service n'accepte plus d'écriture. */
export function estAppareilRetire(eq: { actif: boolean }): boolean {
  return !eq.actif;
}
