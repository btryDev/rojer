// Les cartes d'offres de la page publique : grille tarifaire du 2026-11-05
// (PDF `docs/marketing/rojer-offres-abonnement-2026-11.pdf`, branche
// `docs/offres-abonnement`, ab9caea3), prix HT.
//
// ⚠︎ Les quotas de la grille vivent aussi dans `src/lib/abonnements/
// formules.ts` (branche `cc`, ADR-053), qui les applique ; les prix, eux,
// sont chez Stripe. À la fusion dans `cc`, ce fichier et `tarif-grille.ts`
// liront leurs volumes dans `FORMULES` au lieu de les recopier — ou un test
// les y comparera.
//
// « Choisir Pro » mène, comme « Essayer 30 jours », à la création de compte
// (l'essai se fait sur Essentiel) : quand l'abonnement en libre-service
// existera (`cc`), le lien devra porter l'offre choisie.

import { ESPACE_UNITE, formaterNombreFr } from "@/lib/rendu/mesures";

export type Periode = "mois" | "an";

export type Offre = {
  nom: string;
  /** La carte d'encre : l'offre mise en avant. */
  misEnAvant?: boolean;
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
    nom: "Pro",
    misEnAvant: true,
    pourQui: "Plusieurs sites ou plusieurs personnes",
    badge: "Avec un expert",
    prix: { mois: 89, an: 899 },
    points: [
      "Jusqu'à 5 établissements et 5 utilisateurs",
      "Tous les modules d'Essentiel, volumes d'usage triplés",
      "Poser une question technique à l'expert",
      "Un rendez-vous d'1 h par an avec l'expert",
      "Connecter un assistant IA",
    ],
    cta: "Choisir Pro",
  },
  {
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

/** Le prix mensuel équivalent d'un abonnement annuel : « 74,92 € ». */
export function parMoisSurUnAn(an: number) {
  return `${formaterNombreFr(an / 12, 2)}${ESPACE_UNITE}€`;
}

/** Un prix en euros, l'unité tenue par une espace insécable : « 29 € ». */
export function enEuros(montant: number) {
  return `${montant}${ESPACE_UNITE}€`;
}
