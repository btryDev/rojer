// Les colonnes du schéma qui portent une clé de stockage ÉCRITE par le code.
// La règle et sa garde vivent dans `./fichiers.ts` et `./fichiers.test.ts` ;
// ce module ne porte que la table, sans dépendance, pour que la sonde des clés
// croisées (`auth/portee/sonde-cles-croisees.ts`) la lise sans charger le
// stockage.

/** Modèle → colonnes qui portent une clé de stockage. */
export const CLES_STOCKEES = {
  RapportVerification: ["fichierCle"],
  Prestataire: ["attestationUrssafCle", "assuranceRcProCle", "kbisCle"],
  AnalyseLegionelle: ["rapportCle"],
  // Les pièces de prestataire remplacées (2026-10-12).
  PiecePrestataire: ["fichierCle"],
  // La pièce qui prouve la correction d'un point (ADR-048).
  Action: ["leveeFichierCle"],
  // La photo du lieu, dans le hero du tableau de bord (2026-10-25).
  Etablissement: ["photoCle"],
  // Les écrits annexés au registre, en cours et précédent (ADR-056).
  PieceEtatPermanent: ["fichierCle"],
} as const;
