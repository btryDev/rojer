// L'échéance d'un titre de salarié — UNE définition, que le calendrier et
// l'écran Équipe lisent tous les deux.
//
// CE QUE CE MODULE FERME. L'échéance d'un titre vivait en deux endroits, avec
// deux règles. Le générateur écrivait `echeanceLe ?? delivreLe + périodicité`
// dans `Verification.datePrevue`, que lisent le calendrier, le score et le
// badge « À faire » ; `salaries/queries.ts` classait sur `echeanceLe` seul, que
// lisent la page Équipe et le badge du rail. Une visite d'information et de
// prévention (quinquennale) délivrée le 1er juin 2020 sans « valable
// jusqu'au » était donc EN RETARD depuis le 1er juin 2025 au calendrier et au
// score, et « sans terme écrit » sur la fiche de la personne, avec un badge à
// zéro. Deux écrans du même produit se contredisaient sur la même personne, et
// celui qui se taisait était celui qui la nomme. Relecture système du
// 2026-09-14.
//
// POURQUOI ICI ET PAS DANS `calendrier/`. Le fait appartient au titre : c'est
// une propriété de ce que l'employeur a déclaré, pas d'une ligne de calendrier.
// Le générateur en est un lecteur parmi d'autres. Ce module n'importe que la
// composition des dates et des rythmes (`calendrier/periodicite.ts`) — ni
// Prisma, ni le référentiel —, donc il reste pur, testable sans faux client,
// et le générateur peut l'importer sans cycle.

import { prochaineEcheance } from "@/lib/calendrier/periodicite";
import type { Periodicite } from "@/lib/referentiels/types-communs";

/** Les deux dates d'un titre, telles que l'employeur les a déclarées. */
export type DatesDuTitre = {
  /** Date de délivrance — le point de départ du cycle. */
  delivreLe: Date;
  /** « Valable jusqu'au », quand la pièce le porte. */
  echeanceLe: Date | null;
};

/**
 * L'échéance d'un titre, ou `null` s'il n'en a pas.
 *
 * La règle, dans cet ordre :
 *
 *  1. **`echeanceLe` saisie prime sur tout calcul.** C'est la date de la pièce
 *     — un fait que l'employeur tient en main. Sur une VIP, les cinq ans du
 *     référentiel sont un PLAFOND ; le médecin du travail a pu fixer trois ans,
 *     et c'est cette primauté, et elle seule, qui rend l'encodage d'un plafond
 *     acceptable (`notesInternes` de `sante-travail-salarie-vip`).
 *  2. Sinon, **`delivreLe` + la périodicité de l'obligation**, par
 *     `prochaineEcheance` : en mois calendaires, écrêtés en fin de mois, heure
 *     civile conservée (ADR-011). Jamais une arithmétique en jours ici — c'est
 *     ce qui faisait tomber un quinquennal la veille de son anniversaire.
 *  3. Sinon, **aucune échéance** : `autre`, `mise_en_service_uniquement`, ou
 *     une obligation que l'appelant n'a pas su résoudre (`undefined`). Un titre
 *     sans durée écrite n'a pas de rendez-vous manqué, et en inventer un
 *     peindrait en rouge une non-conformité que le texte ne pose pas
 *     (l'habilitation électrique, ADR-023 § 6).
 *
 * `periodicite` accepte `undefined` parce que deux lecteurs sur trois
 * résolvent l'obligation par `titreParId`, qui peut ne rien rendre — un titre
 * déclaré sur une obligation retirée depuis du référentiel. Une date saisie y
 * reste une date : la pièce n'a pas changé parce que le catalogue a changé.
 */
export function echeanceDuTitre(
  titre: DatesDuTitre,
  periodicite: Periodicite | undefined,
): Date | null {
  if (titre.echeanceLe !== null) return titre.echeanceLe;
  if (periodicite === undefined) return null;
  return prochaineEcheance(titre.delivreLe, periodicite);
}
