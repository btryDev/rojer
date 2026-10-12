/**
 * Ce qu'une mesure du DUERP appelle salarié par salarié (PR 2, « ce qui est
 * dû à une personne », 2026-10-12).
 *
 * Une `Action` née d'une mesure de formation — « habilitation délivrée par
 * l'employeur », « formation adéquate à la conduite » — ne disait rien de
 * l'endroit où cela se déclare : le dirigeant pouvait lever l'action sans
 * savoir que le titre se porte, personne par personne, dans Équipe. Cette
 * table le lui dit. Elle ne fait rien d'autre :
 *
 * - lever l'action ne déclare aucun titre, et ne le doit pas — une mesure
 *   collective (« former les conducteurs ») ne dit pas QUI a été formé, et
 *   l'ADR-023 § 1 bis interdit de le déduire ;
 * - aucun lien n'est écrit en base : la correspondance se lit à l'affichage
 *   depuis `Action.referentielMesureId`, qui existe déjà.
 *
 * TABLE FIXE, TENUE À LA MAIN — et c'est assumé, à l'inverse du catalogue
 * (`cataloguerTitres`), qui se dérive. Rien dans le référentiel DUERP ne
 * relie une mesure à une obligation : la relation est une LECTURE, du texte
 * de la mesure et de la description du titre, et une lecture ne se dérive
 * pas. N'y entre qu'une correspondance que les deux textes fondent sans
 * ambiguïté — en pratique, la mesure cite l'article même qui fonde le
 * titre. Une mesure qui ne correspond à aucun titre n'y est pas ; une mesure
 * dont la correspondance se discute n'y est pas non plus, et son cas est
 * écrit plus bas plutôt que tranché ici.
 *
 * Les garde-fous sont dans `titres-des-mesures.test.ts` : chaque cible
 * résout dans le catalogue (donc ni retirée ni au niveau audit, ADR-042),
 * chaque clé est une mesure du référentiel DUERP.
 *
 * ÉCARTÉES, AVEC LEUR RAISON (2026-10-12) :
 * - `trv-nuit-suivi` (« suivi individuel régulier […] des travailleurs de
 *   nuit », L. 3122-11) : la visite adaptée `sante-travail-salarie-vip-adaptee`
 *   cite le travailleur de nuit (R. 4624-17), mais un travailleur de nuit au
 *   suivi renforcé relève de `sante-travail-salarie-sir`, qui SE SUBSTITUE à
 *   la VIP (R. 4624-24). La mesure ne dit pas lequel ; la question du travail
 *   de nuit a déjà été refusée comme déclencheur de la VIP adaptée
 *   (`commun.ts`, `q-travail-nuit`, relecture du 2026-10-05). Non tranché.
 * - `trv-ecran-medic`, `bur-vue-medic` (« visites de médecine du travail
 *   dédiées ») : aucun titre « visite dédiée à l'écran » n'existe en droit ;
 *   la VIP est due à tous, pas à cause de l'écran.
 * - Les formations Prap / gestes et postures, conflits, RPS, extincteurs,
 *   cuisson, forte chaleur, FDS : soit l'obligation est portée par
 *   l'établissement (R. 4541-8, `formationsDuFait`), soit aucun titre
 *   nominatif ne lui correspond au catalogue.
 */

import type { ObligationPorteeParSalarie } from "@/lib/referentiels/conformite";
import { titreParId } from "./catalogue";

export type CorrespondanceMesureTitre = {
  /** Identifiant d'obligation portée par un salarié (`cataloguerTitres()`). */
  titre: string;
  /** Une phrase : ce qui, dans les deux textes, fonde la correspondance. */
  motif: string;
};

export const TITRE_DE_LA_MESURE: Readonly<Record<string, CorrespondanceMesureTitre>> = {
  "trv-elec-habilitation": {
    titre: "elec-salarie-habilitation",
    motif:
      "La mesure cite R. 4544-10 et l'habilitation « délivrée par l'employeur » ; le titre est cette habilitation, délivrée à un travailleur désigné, sur le même article.",
  },
  "trv-engins-formation": {
    titre: "conduite-salarie-formation",
    motif:
      "La mesure cite la « formation adéquate » de R. 4323-55 ; le titre est cette formation, réservant la conduite aux travailleurs qui l'ont reçue, sur le même article.",
  },
  "trv-engins-autorisation": {
    titre: "conduite-salarie-autorisation",
    motif:
      "La mesure cite l'« autorisation de conduite délivrée par l'employeur » de R. 4323-56, alinéa 1 ; le titre est cette autorisation, sur le même article.",
  },
};

/**
 * Le titre qu'une mesure du DUERP appelle, s'il y en a un.
 *
 * `undefined` pour une mesure personnalisée (`null`), une mesure sans
 * correspondance, ou une cible que le catalogue ne propose plus — retirée ou
 * passée au niveau audit : le test l'interdit, mais taire la ligne vaut
 * mieux qu'un renvoi vers un titre qu'Équipe ne laisse pas déclarer.
 */
export function titreAppeleParLaMesure(
  referentielMesureId: string | null | undefined,
): ObligationPorteeParSalarie | undefined {
  if (!referentielMesureId) return undefined;
  const c = TITRE_DE_LA_MESURE[referentielMesureId];
  return c ? titreParId(c.titre) : undefined;
}
