// Ce qu'un DUERP a répondu à chaque question transverse — oui, non, ou rien.
//
// La règle vit ici une fois, pour trois lecteurs : l'écran des questions,
// l'action qui y répond, et la fiche d'un salarié qui en tire ses titres
// (ADR-038). Avant elle, l'écran lisait « oui » sur la présence d'un risque et
// ne pouvait rien lire d'autre : un « non » et une question jamais lue étaient
// le même état, et `QuestionTransverseRow` le disait lui-même.
//
// ## Deux sources, un état chacune
//
// - « oui » : un `Risque` de l'unité transverse porte le `risqueIdAssocie` de
//   la question. C'était la seule vérité de l'écran ; elle le reste.
// - « non » : `Duerp.reponsesTransverses[question.id] === false`.
// - tout le reste : sans réponse.
//
// Le risque prime : s'il est présent, la question vaut « oui » même si un
// « non » traîne dans la colonne (deux onglets, une écriture interrompue). Le
// risque est ce que le document imprime ; l'état ne peut pas le contredire.
//
// Un DUERP antérieur à la colonne garde sa lecture : ses risques valent
// « oui », et tout ce qui n'en a pas devient « sans réponse » — y compris les
// questions ajoutées depuis sa validation, qu'un repli sur « non » lui aurait
// fait refuser sans qu'on les lui ait jamais posées.

import { lireReponsesFermees } from "@/lib/duerps/reponses-fermees";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import type { QuestionDetection } from "@/lib/referentiels/types";

export type ReponseTransverse = "oui" | "non" | "sans_reponse";

export type QuestionTransverseRepondue = {
  question: QuestionDetection;
  reponse: ReponseTransverse;
};

/**
 * Les questions transverses, dans l'ordre du référentiel, avec la réponse que
 * le DUERP leur porte.
 *
 * `risquesActifs` : les `referentielId` des risques de l'unité transverse.
 * `reponsesBrutes` : la colonne `Duerp.reponsesTransverses`, telle quelle.
 */
export function repondreAuxQuestionsTransverses(
  risquesActifs: Iterable<string>,
  reponsesBrutes: unknown,
): QuestionTransverseRepondue[] {
  const actifs = new Set(risquesActifs);
  const reponses = lireReponsesFermees(reponsesBrutes);
  return questionsDetectionTransverses.map((question) => ({
    question,
    reponse: actifs.has(question.risqueIdAssocie)
      ? "oui"
      : reponses[question.id] === false
        ? "non"
        : "sans_reponse",
  }));
}

export function questionTransverseParId(
  id: string,
): QuestionDetection | undefined {
  return questionsDetectionTransverses.find((q) => q.id === id);
}
