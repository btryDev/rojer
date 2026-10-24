/**
 * Ce qui est dû à une personne sans jamais tomber à une date.
 *
 * Deux obligations du catalogue des titres sont `nature: "evenementielle"` et
 * `periodicite: "autre"` : la formation à la sécurité de `R. 4141-20` et la
 * formation à la conduite de `R. 4323-55`. Le générateur ne leur ouvre aucune
 * occurrence — aucun texte n'en écrit le rythme —, et l'écran « Ce qui doit
 * être en place » les refuse, parce qu'une case cochée à vie mentirait au
 * prochain changement de poste. Elles n'atteignaient donc **aucune surface qui
 * les présente comme dues** : elles n'existaient que dans le `<select>` du
 * formulaire « Déclarer un titre », c'est-à-dire comme une option de saisie.
 *
 * L'ADR-022 dit où elles vivent : une obligation se porte sur un sujet, et le
 * sujet est ici la personne. Ce module rend ce que la fiche d'un salarié doit
 * montrer, et **rien d'autre** — pas de date, pas d'état, pas de retard.
 *
 * ## Pourquoi la liste ne dépend pas du salarié
 *
 * ~~Deux obligations~~ — depuis l'ADR-038 (2026-10-05), seules celles qu'AUCUNE
 * question transverse du DUERP ne gouverne : la formation à la conduite a
 * quitté cette liste : elle est gouvernée par un fait d'activité (ADR-041),
 * celui de la conduite d'engins. ~~Elle apparaissait dans `titres-du-duerp.ts`~~
 * [2026-10-24 : module retiré avec la carte « Formations liées aux risques du
 * poste », refonte de la fiche salarié.] Ce qui reste ici est
 * dû à tout l'effectif.
 *
 * Elle est la même pour tout le monde, et c'est exact plutôt que grossier.
 * `evaluerObligation` rend `null` pour le porteur `salarie` (ADR-023) : le
 * moteur reçoit un établissement et des équipements, jamais ce qu'une personne
 * fait réellement. Restreindre la liste demanderait de deviner qui conduit un
 * engin — le cinquième déclencheur, « activité réellement exercée », que le
 * produit n'a pas. La formation à la sécurité, elle, est due à **tous** les
 * travailleurs sans exception (`L. 4141-2`).
 *
 * ## Pourquoi un titre déclaré ne retire pas la ligne
 *
 * C'est la définition même de `evenementielle` (ADR-026) : l'obligation
 * redevient due au fait suivant. Les `notesInternes` des deux obligations le
 * disent en toutes lettres — « un titre déclaré une fois ne vaut donc pas pour
 * la carrière ». La ligne reste donc affichée, et le titre déclaré s'y lit
 * comme un fait daté, pas comme un solde.
 */

import { estDeclencheeParUnFait } from "@/lib/etats-permanents/regle";
import type { ObligationPorteeParSalarie } from "@/lib/referentiels/conformite";
import { titresGouvernesParUnFait } from "@/lib/etablissements/faits-activite";
import { cataloguerTitres } from "./catalogue";

/**
 * Une obligation qu'un fait redéclenche. ~~Avec la date du dernier titre de la
 * personne (`dernierTitreLe`)~~ [2026-10-24, revue qualité : la carte « Ce qui
 * se déclenche » qui la lisait est retirée de la fiche ; la fiche ne garde que
 * la liste, pour dire sous le titre déclaré qu'il redeviendra dû.]
 */
export type ObligationDeclenchee = {
  obligation: ObligationPorteeParSalarie;
};

export function obligationsDeclencheesParUnFait(): ObligationDeclenchee[] {
  const gouvernes = titresGouvernesParUnFait();
  return cataloguerTitres()
    .filter((o) => estDeclencheeParUnFait(o) && !gouvernes.has(o.id))
    .map((obligation) => ({ obligation }));
}
