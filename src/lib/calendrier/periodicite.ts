// La prochaine échéance d'un rythme — calculée en CALENDRIER, jamais en jours.
//
// CE QUE CE MODULE REMPLACE. `generateur.ts` portait ses propres `ajouterJours`
// et `prochaineDate`, qui ajoutaient `PERIODICITE_EN_JOURS[p]` jours à la
// dernière réalisation. `annuelle = 365` dérivait d'un jour une fois sur quatre,
// `triennale = 1095` trois fois sur quatre, `quadriennale` et `quinquennale`
// TOUJOURS — tout intervalle de quatre ou cinq ans contient un 29 février. Un
// contrôle quinquennal fait le 1er juin 2025 tombait le 31 mai 2030 ; le texte
// dit cinq ans, donc le 1er juin. Constat n°3 de l'audit du 2026-09-09, lot 4
// du § 11.
//
// La règle 1 de l'ADR-011 — un seul module de dates, aucune arithmétique
// locale — existait déjà, et `lib/dates` portait déjà `ajouterMois` avec
// l'écrêtage de fin de mois. Le calendrier ne s'en servait pas. Ce fichier ne
// CORRIGE pas les fonctions locales : il les supprime, et compose les primitives
// partagées avec la table calendaire du référentiel.
//
// POURQUOI ICI ET PAS DANS `lib/dates`. `lib/dates/index.ts` n'a aucun import :
// c'est une feuille, testée sous trois fuseaux, qui ne connaît ni `Periodicite`
// ni le référentiel. Lui faire connaître une périodicité inverserait la
// dépendance. Ce module est la seule composition des deux, et il n'ajoute rien
// aux dates lui-même.

import { ajouterJours, ajouterMois } from "@/lib/dates";
import {
  PERIODICITE_CALENDAIRE,
  type Periodicite,
} from "@/lib/referentiels/types-communs";

/**
 * La périodicité produit-elle un rendez-vous suivant ?
 *
 * `false` pour `mise_en_service_uniquement` et `autre` : une obligation
 * ponctuelle ou un état permanent (ADR-026) n'a pas de cycle. Remplace le test
 * `PERIODICITE_EN_JOURS[p] != null` que deux lecteurs faisaient à la main.
 */
export function estCyclique(periodicite: Periodicite): boolean {
  return PERIODICITE_CALENDAIRE[periodicite] !== null;
}

/**
 * La prochaine échéance après `derniere`, ou `null` si le rythme n'en produit
 * pas.
 *
 * En MOIS pour les rythmes que les textes écrivent en mois ou en ans : le même
 * jour, n mois plus tard, écrêté en fin de mois quand il n'existe pas — 31 août
 * + 6 mois = 28 février, 29 février 2028 + 1 an = 28 février 2029. En JOURS pour
 * ceux que les textes écrivent en jours ou en semaines, où la conversion est
 * exacte. L'heure civile de `derniere` est conservée (`lib/dates`), donc une
 * réalisation à minuit reste à minuit et ne glisse pas d'un jour au changement
 * d'heure.
 */
export function prochaineEcheance(
  derniere: Date,
  periodicite: Periodicite,
): Date | null {
  const pas = PERIODICITE_CALENDAIRE[periodicite];
  if (pas === null) return null;
  return "mois" in pas
    ? ajouterMois(derniere, pas.mois)
    : ajouterJours(derniere, pas.jours);
}
