// La grille complète des offres (volet « Voir le détail des offres ») :
// grille tarifaire du 2026-11-05, colonne « Essai » comprise. Séparée des
// cartes (`tarif-donnees.ts`) : seul le composant serveur `Tarif` la lit.

/** Ce qu'une case dit, hors valeur chiffrée : inclus, non inclus, abonnement requis. */
export const INCLUS = "✓";
export const NON_INCLUS = "—";
export const ABONNEMENT = "s'abonner";

/** Une ligne de la grille : un libellé et quatre cases (Essai, Essentiel, Pro, Sur mesure). */
export type LigneGrille = { libelle: string; cases: [string, string, string, string] };
export type GroupeGrille = { titre: string; lignes: LigneGrille[] };

export const GRILLE: GroupeGrille[] = [
  {
    titre: "Taille du dossier",
    lignes: [
      { libelle: "Établissements", cases: ["1", "1", "jusqu'à 5", "au-delà de 5"] },
      { libelle: "Utilisateurs", cases: ["1", "1", "jusqu'à 5", "illimités"] },
      { libelle: "Unités de travail du DUERP", cases: ["3", "5", "5", "5"] },
      { libelle: "Zones", cases: ["1", "3", "3", "3"] },
      { libelle: "Équipements", cases: ["5", "illimité", "illimité", "illimité"] },
      { libelle: "Prescriptions particulières", cases: ["1", "illimité", "illimité", "illimité"] },
    ],
  },
  {
    titre: "Savoir et suivre : jamais limité",
    lignes: [
      {
        libelle: "Obligations, calendrier, registre de sécurité, plan d'actions, équipe, carnet sanitaire",
        cases: [INCLUS, INCLUS, INCLUS, INCLUS],
      },
      { libelle: "Relances email des échéances", cases: [INCLUS, INCLUS, INCLUS, INCLUS] },
      { libelle: "Export de ses données, y compris après résiliation", cases: [INCLUS, INCLUS, INCLUS, INCLUS] },
    ],
  },
  {
    titre: "Valider : documents définitifs",
    lignes: [
      { libelle: "DUERP validé et figé (aperçu « Projet » pendant l'essai)", cases: [ABONNEMENT, INCLUS, INCLUS, INCLUS] },
      { libelle: "Dossier de contrôle, registre consolidé", cases: [ABONNEMENT, INCLUS, INCLUS, INCLUS] },
      { libelle: "Registre d'accessibilité publié et affiche QR", cases: [ABONNEMENT, INCLUS, INCLUS, INCLUS] },
      { libelle: "Signatures électroniques", cases: ["1 test", "20 par an", "60 par an", "sur mesure"] },
      { libelle: "Liens d'accès prestataires actifs", cases: ["envoi à soi-même", "5", "15", "illimité"] },
    ],
  },
  {
    titre: "Usage, selon l'offre",
    lignes: [
      { libelle: "Permis de feu (brouillons imprimables pendant l'essai)", cases: ["10", "10 par an", "30 par an", "illimité"] },
      { libelle: "Plans de prévention (idem)", cases: ["5", "5 par an", "15 par an", "illimité"] },
      { libelle: "Prestataires suivis (attestations, vigilance)", cases: ["10", "10", "30", "illimité"] },
      { libelle: "Stockage des documents", cases: ["2 Go", "2 Go", "6 Go", "sur mesure"] },
      { libelle: "Import d'un DUERP existant", cases: ["1", "1", "3", "reprise faite par nous"] },
      { libelle: "Connecter un assistant IA", cases: [NON_INCLUS, NON_INCLUS, INCLUS, INCLUS] },
    ],
  },
  {
    titre: "Humain : l'expert en sécurité",
    lignes: [
      { libelle: "Aide en ligne, contact pour un problème technique", cases: [INCLUS, INCLUS, INCLUS, INCLUS] },
      { libelle: "Poser une question technique à l'expert", cases: [NON_INCLUS, NON_INCLUS, INCLUS, INCLUS] },
      { libelle: "Rendez-vous avec l'expert", cases: [NON_INCLUS, NON_INCLUS, "1 h par an", "à la demande"] },
      { libelle: "Formation, reprise de l'historique, déploiement accompagné", cases: [NON_INCLUS, NON_INCLUS, NON_INCLUS, INCLUS] },
    ],
  },
];
