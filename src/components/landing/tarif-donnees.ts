// Les cartes d'offres de la page publique : grille tarifaire du 2026-11-05
// (PDF `docs/marketing/rojer-offres-abonnement-2026-11.pdf`, branche
// `docs/offres-abonnement`, ab9caea3), prix ~~HT~~ TTC (2026-11-14).
//
// ⚠︎ Les quotas de la grille vivent aussi dans `src/lib/abonnements/
// formules.ts` (branche `cc`, ADR-053), qui les applique ; les prix, eux,
// sont chez Stripe. À la fusion dans `cc`, ce fichier et `tarif-grille.ts`
// liront leurs volumes dans `FORMULES` au lieu de les recopier — ou un test
// les y comparera.
//
// « Choisir Pro » mène, comme « Essayer 30 jours », à la création de compte
// (l'essai se fait sur Essentiel) ; ~~quand l'abonnement en libre-service
// existera (`cc`), le lien devra porter l'offre choisie~~ [2026-11-16 : le
// lien porte l'offre et la période (`/signup?offre=rojer_pro_annuel`),
// gardées pour l'écran d'essai et la page Abonnement — `offre-choisie.ts`].

import { ESPACE_UNITE, formaterNombreFr } from "@/lib/rendu/mesures";
import type { CleFormule, Periodicite } from "@/lib/abonnements/formules";

export type Periode = "mois" | "an";

/** La période de la page tarifs, dans le vocabulaire des abonnements (`formules.ts`). */
export const PERIODICITE_DE: Record<Periode, Periodicite> = { mois: "mensuel", an: "annuel" };

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
  /** La formule que la carte vend en libre-service ; absente : sur devis. */
  formule?: CleFormule;
};

export const OFFRES: Offre[] = [
  {
    nom: "Essentiel",
    pourQui: "Un commerce, un restaurant, un cabinet : un seul établissement",
    badge: "30 jours d'essai",
    prix: { mois: 29, an: 295 },
    points: [
      "1 établissement, 1 utilisateur",
      "Tous les modules : DUERP, vérifications et calendrier, registre de sécurité, plan d'actions, équipe, carnet sanitaire, accessibilité, relances email…",
      "10 permis de feu et 5 plans de prévention par an",
      "20 signatures par an (une re-signature après correction d'un plan ne compte pas), 2 Go de documents",
    ],
    cta: "Essayer 30 jours",
    formule: "essentiel",
  },
  {
    nom: "Pro",
    misEnAvant: true,
    pourQui: "Plusieurs établissements ou plusieurs personnes",
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
    formule: "pro",
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
  return `${formaterNombreFr(montant)}${ESPACE_UNITE}€`;
}
