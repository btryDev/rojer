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

/**
 * Les titres du catalogue salarié dont la question répond « non » : ceux que
 * le dirigeant a déclaré, dans les mots de l'article, ne concerner personne.
 * Un silence n'y entre jamais.
 */
export function titresDontLaQuestionRepondNon(
  repondues: readonly QuestionTransverseRepondue[],
): ReadonlySet<string> {
  return new Set(
    repondues
      .filter((x) => x.reponse === "non")
      .flatMap((x) => x.question.declencheTitres ?? []),
  );
}

/**
 * Les `referentielId` des risques portés par les unités transverses d'un
 * DUERP — TOUTES, pas la première : le schéma n'interdit pas d'en avoir deux.
 * Un seul chemin pour l'écran des questions, la fiche salarié et le tableau
 * de bord : trois copies de cette ligne avaient fini par lire des unités
 * différentes (relecture du 2026-10-05, C2).
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
