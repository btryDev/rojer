/**
 * Trois phrases du Code du travail sur le document unique que le produit ne
 * PORTE pas, mais qu'il DIT — une seule écriture chacune, lue par toutes les
 * surfaces, et confrontée au verbatim du corpus par `textes-duerp.test.ts`.
 *
 * POURQUOI ICI. Ces deux obligations sont au corpus en `obligation_manquante`,
 * `cause: "module"` (`L. 4121-3-1`, `R. 4121-1-1`) : le produit n'a ni la
 * trace d'une transmission, ni l'annexe d'exposition. Le 2026-09-26, une
 * instruction a constaté que rien ne les disait à qui tient son document
 * unique : la transmission n'apparaissait nulle part, et la phrase « ce n'est
 * pas l'annexe de R. 4121-1-1 » ne s'imprimait que si un risque portait une
 * saisie d'exposition — un document sans saisie n'en disait rien.
 *
 * Module sans dépendance : importable par un composant client.
 */

/**
 * `L. 4121-3-1`, VI — version en vigueur depuis le 31 mars 2022, relue le
 * 2026-09-26. Sans son point final : la phrase se cite entre guillemets suivis
 * de la référence, et continue une liste dans le PDF (« il est : … »).
 */
export const TRANSMISSION_DUERP_SUITE =
  "transmis par l'employeur à chaque mise à jour au service de prévention et de santé au travail auquel il adhère";
export const TRANSMISSION_DUERP_SPST =
  `Le document unique d'évaluation des risques professionnels est ${TRANSMISSION_DUERP_SUITE}`;

/** `R. 4121-1-1`, 1° : ce que l'annexe consigne d'abord (extrait). */
export const ANNEXE_EXPOSITION_DONNEES =
  "Les données collectives utiles à l'évaluation des expositions individuelles aux facteurs de risques mentionnés à l'article L. 4161-1";

/**
 * Ce que le PDF du document unique imprime, TOUJOURS — et non plus seulement
 * quand un risque porte une saisie d'exposition : l'annexe n'est pas
 * produite. Un fait, sans qualification.
 */
export const ANNEXE_EXPOSITION_NON_PRODUITE =
  "Ce document ne comprend pas l'annexe prévue par l'article R. 4121-1-1 du Code du travail, où l'employeur consigne «\u00a0" +
  ANNEXE_EXPOSITION_DONNEES.charAt(0).toLowerCase() +
  ANNEXE_EXPOSITION_DONNEES.slice(1) +
  "\u00a0» et la proportion de salariés exposés à ces facteurs au-delà des seuils : Rojer ne la produit pas.";

/** `R. 4433-2`, dernier alinéa — version en vigueur depuis le 1er mai 2008. */
export const RENOUVELLEMENT_MESURAGE_BRUIT =
  "En cas de mesurage, celui-ci est renouvelé au moins tous les cinq ans.";
