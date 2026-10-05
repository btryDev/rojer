// Lecture des réponses aux questions d'activités hors couverture (ADR-020).
//
// Ce module s'arrête volontairement à deux gestes : lire la colonne JSON, et
// apparier chaque question du référentiel avec la réponse qui lui correspond,
// dans l'ordre du référentiel. C'est ce dont l'écran a besoin pour dessiner
// trois états, et le snapshot pour les figer.
//
// Trier ensuite en « déclarée / écartée / sans réponse » n'est **pas** ici :
// c'est `evaluerCouverture` (`src/lib/duerps/couverture.ts`) qui le fait, et
// lui seul, unités hors référentiel comprises. Deux façons de dire le même
// tri finiraient par ne plus dire la même chose.

import { trouverReferentielParId } from "@/lib/referentiels";
import type { ActiviteNonCouverte } from "@/lib/referentiels/types";
import {
  lireReponsesFermees,
  type ReponsesFermees,
} from "@/lib/duerps/reponses-fermees";

/**
 * Les réponses aux questions d'activités hors couverture, telles qu'elles
 * vivent dans `Duerp.reponsesActivitesNonCouvertes` (ADR-020). Le format et sa
 * lecture tolérante sont communs aux réponses fermées du DUERP
 * (`duerps/reponses-fermees.ts`) ; les deux noms restent pour les appelants.
 */
export type ReponsesActivites = ReponsesFermees;
export const lireReponsesActivites = lireReponsesFermees;

/**
 * Les activités hors couverture déclarées par le référentiel du secteur
 * retenu. Une liste vide signifie soit qu'aucun secteur n'a encore été
 * confirmé, soit que ce secteur n'a pas (encore) d'activité instruite : dans
 * les deux cas aucune question n'est posée, et le document reste muet.
 */
export function activitesDuSecteur(
  referentielSecteurId: string | null | undefined,
): ActiviteNonCouverte[] {
  if (!referentielSecteurId) return [];
  return trouverReferentielParId(referentielSecteurId)?.activitesNonCouvertes ?? [];
}

/** Une question posée à l'écran, avec la réponse connue — ou son absence. */
export type QuestionActivite = {
  activite: ActiviteNonCouverte;
  /** `undefined` = pas de réponse. Cf. `ReponsesActivites`. */
  exercee: boolean | undefined;
};

/**
 * Assemble les questions du secteur et les réponses enregistrées. L'ordre est
 * celui du référentiel : c'est lui qui décide de ce qui se demande en premier,
 * pas l'ordre d'arrivée des réponses.
 */
export function questionsActivites(
  referentielSecteurId: string | null | undefined,
  reponsesBrutes: unknown,
): QuestionActivite[] {
  const reponses = lireReponsesActivites(reponsesBrutes);
  return activitesDuSecteur(referentielSecteurId).map((activite) => ({
    activite,
    exercee: activite.id in reponses ? reponses[activite.id] : undefined,
  }));
}
