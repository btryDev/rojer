// Ce qu'un DUERP a répondu à chaque question transverse — oui, non, ou rien.
//
// La règle vit ici une fois, pour l'écran des questions et l'action qui y
// répond (ADR-038). La fiche salarié et le tableau de bord lisent depuis
// l'ADR-041 les faits d'activité de l'établissement, plus le DUERP. Avant elle, l'écran lisait « oui » sur la présence d'un risque et
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
//
// ## Les questions qui posent un fait d'activité (ADR-041)
//
// q-charges, q-ecran, q-operations-electriques et q-conduite-engins posent un
// fait qui vit sur l'ÉTABLISSEMENT (`etablissements/faits-activite.ts`). Leur
// réponse se lit sur la colonne, et nulle part ailleurs : le DUERP en est une
// vue. Le risque reste la conséquence d'un « oui », pas sa preuve — un risque
// travaillé peut survivre à un « non » donné depuis Équipe, et l'écran le dit.

import { lireReponsesFermees } from "@/lib/duerps/reponses-fermees";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import type { QuestionDetection } from "@/lib/referentiels/types";
import {
  faitDeLaQuestion,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";

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
  /** Les faits d'activité de l'établissement — requis : un oubli ne doit pas lire « sans réponse ». */
  faits: ReponsesFaitsActivite,
): QuestionTransverseRepondue[] {
  const actifs = new Set(risquesActifs);
  const reponses = lireReponsesFermees(reponsesBrutes);
  return questionsDetectionTransverses.map((question) => {
    const fait = faitDeLaQuestion(question.id);
    if (fait) return { question, reponse: reponseDuFait(faits[fait.champ]) };
    return {
      question,
      reponse: actifs.has(question.risqueIdAssocie)
        ? "oui"
        : reponses[question.id] === false
          ? "non"
          : "sans_reponse",
    };
  });
}

/** Une colonne à trois états, lue comme une réponse. */
export function reponseDuFait(v: boolean | null): ReponseTransverse {
  return v === true ? "oui" : v === false ? "non" : "sans_reponse";
}

export function questionTransverseParId(
  id: string,
): QuestionDetection | undefined {
  return questionsDetectionTransverses.find((q) => q.id === id);
}

/**
 * Les `referentielId` des risques portés par les unités transverses d'un
 * DUERP — TOUTES, pas la première : le schéma n'interdit pas d'en avoir deux.
 * Lu par l'écran des questions transverses. Trois copies de cette ligne
 * avaient fini par lire des unités différentes (relecture du 2026-10-05, C2) ;
 * depuis l'ADR-041, la fiche et le tableau de bord ne lisent plus le DUERP.
 */
export function risquesTransversesActifs(
  unites: readonly {
    estTransverse?: boolean;
    risques: readonly { referentielId: string | null }[];
  }[],
): string[] {
  return unites
    .filter((u) => u.estTransverse !== false)
    .flatMap((u) => u.risques.map((r) => r.referentielId))
    .filter((x): x is string => x !== null);
}
