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
 * quitté cette liste pour `titres-du-duerp.ts`, où elle n'apparaît que si
 * l'établissement déclare que des travailleurs conduisent des engins (fait
 * d'activité, ADR-041). Ce qui reste ici est
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
 * Une obligation que le poste d'une personne rend due, avec ce que le dossier
 * en porte déjà.
 */
export type ObligationDeclenchee = {
  obligation: ObligationPorteeParSalarie;
  /**
   * Le titre le plus récemment délivré pour cette obligation, s'il en existe
   * un. `null` se lit « rien de déclaré », jamais « en retard » : aucune date
   * ne dit quand la formation était due.
   */
  dernierTitreLe: Date | null;
};

/** La forme minimale d'un titre déclaré que ce module a besoin de lire. */
export type TitreLu = { obligationId: string; delivreLe: Date };

/**
 * Les obligations événementielles du catalogue, jointes aux titres d'une
 * personne.
 *
 * Le sens de lecture est celui de `etats-permanents/queries.ts` : on part des
 * obligations et on y joint les déclarations, jamais l'inverse. Un titre dont
 * l'obligation a quitté le référentiel n'a plus rien à quoi se joindre, donc
 * il ne fabrique pas de ligne fantôme.
 *
 * L'ordre est celui du catalogue — alphabétique —, pas celui des titres : deux
 * fiches voisines doivent présenter les mêmes lignes dans le même ordre.
 */
export function obligationsDeclencheesParUnFait(
  titres: readonly TitreLu[] = [],
): ObligationDeclenchee[] {
  const gouvernes = titresGouvernesParUnFait();
  return cataloguerTitres()
    .filter((o) => estDeclencheeParUnFait(o) && !gouvernes.has(o.id))
    .map((obligation) => ({
      obligation,
      dernierTitreLe: dateDuDernierTitre(titres, obligation.id),
    }));
}

/** La délivrance la plus récente d'un titre parmi ceux d'une personne, ou `null`. */
export function dateDuDernierTitre(
  titres: readonly TitreLu[],
  obligationId: string,
): Date | null {
  const dates = titres
    .filter((t) => t.obligationId === obligationId)
    .map((t) => t.delivreLe);
  return dates.length === 0 ? null : dates.reduce((a, b) => (b > a ? b : a));
}
