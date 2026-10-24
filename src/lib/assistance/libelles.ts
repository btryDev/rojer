import type { CategorieAssistance } from "@prisma/client";

/**
 * Les mots de « Besoin d'aide ? » (décision de la propriétaire du
 * 2026-10-24). Le bouton ne nomme personne ; le formulaire, lui, dit qui
 * répond. Module pur : composants clients et action serveur le lisent.
 */

export const CATEGORIES_ASSISTANCE = [
  "diagnostic",
  "commission_securite",
  "duerp",
  "prestataire",
  "rapport",
  "hors_couverture",
  "autre",
] as const satisfies readonly CategorieAssistance[];

export const LABEL_CATEGORIE_ASSISTANCE: Record<CategorieAssistance, string> = {
  diagnostic: "Diagnostic ou audit sur place",
  commission_securite: "Préparer une commission de sécurité",
  duerp: "Évaluer les risques (DUERP)",
  prestataire: "Trouver un prestataire, faire corriger",
  rapport: "Comprendre un rapport de contrôle",
  hors_couverture: "Un sujet que Rojer ne suit pas",
  autre: "Autre question",
};

export const LIBELLE_BESOIN_AIDE = "Besoin d'aide ?";

/** Ce que le formulaire dit de qui répond. */
export const QUI_REPOND =
  "Nos experts de BTRY Solution — bureau d'études en sécurité incendie, exploitation des bâtiments et prévention — étudient votre demande et vous recontactent.";
export const LIEN_BTRY = "https://www.btry.fr/solution/";

export const MESSAGE_MAX = 2000;
export const TELEPHONE_MAX = 30;
export const CONTEXTE_MAX = 300;
/** Au-delà, la demande est refusée : une main qui insiste, ou un robot. */
export const DEMANDES_PAR_JOUR_MAX = 10;
