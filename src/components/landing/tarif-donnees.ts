// Les offres affichées sur la page publique : grille tarifaire du 2026-11-05
// (PDF `docs/marketing/rojer-offres-abonnement-2026-11.pdf`, branche
// `docs/offres-abonnement`, ab9caea3), prix HT.
//
// ⚠︎ Les quotas de la grille vivent aussi dans `src/lib/abonnements/
// formules.ts` (branche `cc`, ADR-053), qui les applique ; les prix, eux,
// sont chez Stripe. Quand `cc` deviendra la production, ce fichier lira ses
// volumes dans `FORMULES` au lieu de les recopier.

export type Periode = "mois" | "an";

export type Offre = {
  cle: "essentiel" | "pro" | "sur-mesure";
  nom: string;
  pourQui: string;
  /** Une étiquette au coin de la carte. */
  badge?: string;
  /** `null` : sur devis. */
  prix: { mois: number; an: number } | null;
  points: string[];
  cta: string;
};

export const OFFRES: Offre[] = [
  {
    cle: "essentiel",
    nom: "Essentiel",
    pourQui: "Un commerce, un restaurant, un cabinet : un seul site",
    badge: "30 jours d'essai",
    prix: { mois: 29, an: 295 },
    points: [
      "1 établissement, 1 utilisateur",
      "Tous les modules : DUERP, vérifications et calendrier, registre de sécurité, plan d'actions, équipe, carnet sanitaire, accessibilité, relances email…",
      "10 permis de feu et 5 plans de prévention par an",
      "20 signatures par an, 2 Go de documents",
    ],
    cta: "Essayer 30 jours",
  },
  {
    cle: "pro",
    nom: "Pro",
    pourQui: "Plusieurs sites ou plusieurs personnes",
    badge: "Avec un expert",
    prix: { mois: 89, an: 899 },
    points: [
      "Jusqu'à 5 établissements et 5 utilisateurs",
      "Tous les modules d'Essentiel, volumes triplés",
      "Poser une question technique à l'expert",
      "Un rendez-vous d'1 h par an avec l'expert",
      "Connecter un assistant IA",
    ],
    cta: "Choisir Pro",
  },
  {
    cle: "sur-mesure",
    nom: "Sur mesure",
    pourQui: "Réseaux, groupes de sociétés, administrations",
    prix: null,
    points: [
      "Au-delà de 5 établissements, utilisateurs illimités",
      "Tout Pro, volumes sur mesure",
      "Un expert en sécurité à la demande",
      "Reprise de l'historique, formation, déploiement accompagné",
    ],
    cta: "Nous écrire",
  },
];

/** Une ligne de la grille : un libellé et quatre cases (Essai, Essentiel, Pro, Sur mesure). */
export type LigneGrille = { libelle: string; cases: [string, string, string, string] };
export type GroupeGrille = { titre: string; lignes: LigneGrille[] };

/** « ✓ » : inclus ; « — » : non inclus ; « s'abonner » : demande un abonnement. */
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
        cases: ["✓", "✓", "✓", "✓"],
      },
      { libelle: "Relances email des échéances", cases: ["✓", "✓", "✓", "✓"] },
      { libelle: "Export de ses données, y compris après résiliation", cases: ["✓", "✓", "✓", "✓"] },
    ],
  },
  {
    titre: "Valider : documents définitifs",
    lignes: [
      { libelle: "DUERP validé et figé (aperçu « Projet » pendant l'essai)", cases: ["s'abonner", "✓", "✓", "✓"] },
      { libelle: "Dossier de contrôle, registre consolidé", cases: ["s'abonner", "✓", "✓", "✓"] },
      { libelle: "Registre d'accessibilité publié et affiche QR", cases: ["s'abonner", "✓", "✓", "✓"] },
      { libelle: "Signatures électroniques", cases: ["1 test", "20 par an", "60 par an", "sur mesure"] },
      { libelle: "Liens d'accès prestataires actifs", cases: ["envoi à soi-même", "5", "15", "illimité"] },
    ],
  },
  {
    titre: "Usage à volonté",
    lignes: [
      { libelle: "Permis de feu (brouillons imprimables pendant l'essai)", cases: ["10", "10 par an", "30 par an", "illimité"] },
      { libelle: "Plans de prévention (idem)", cases: ["5", "5 par an", "15 par an", "illimité"] },
      { libelle: "Prestataires suivis (attestations, vigilance)", cases: ["10", "10", "30", "illimité"] },
      { libelle: "Stockage des documents", cases: ["2 Go", "2 Go", "6 Go", "sur mesure"] },
      { libelle: "Import d'un DUERP existant", cases: ["1", "1", "3", "reprise faite par nous"] },
      { libelle: "Connecter un assistant IA", cases: ["—", "—", "✓", "✓"] },
    ],
  },
  {
    titre: "Humain : l'expert en sécurité",
    lignes: [
      { libelle: "Aide en ligne, contact pour un problème technique", cases: ["✓", "✓", "✓", "✓"] },
      { libelle: "Poser une question technique à l'expert", cases: ["—", "—", "✓", "✓"] },
      { libelle: "Rendez-vous avec l'expert", cases: ["—", "—", "1 h par an", "à la demande"] },
      { libelle: "Formation, reprise de l'historique, déploiement accompagné", cases: ["—", "—", "—", "✓"] },
    ],
  },
];

/** Le prix mensuel équivalent d'un abonnement annuel, arrondi au centime. */
export function parMoisSurUnAn(an: number) {
  return (Math.round((an / 12) * 100) / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
