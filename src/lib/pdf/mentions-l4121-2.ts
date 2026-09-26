// Ce que les PDF impriment de `L. 4121-2` — les principes généraux de
// prévention — lu au corpus, UNE fois.
//
// LE DÉFAUT (relecture du 2026-09-26). Le plan d'actions imprimait une
// « Hiérarchie des mesures de prévention (art. L. 4121-2 CT) » en six rangs —
// suppression, réduction, protection collective, EPI, formation,
// organisation — que l'article n'écrit pas ; le PDF du DUERP paraphrasait les
// neuf principes et annonçait « l'ordre imposé par l'article », alors que le
// code ne trie pas les mesures par ces principes. Relu sur Légifrance le même
// jour, deux fois : les neuf principes sont une liste, et le seul mot de
// priorité est celui du 8° — « Prendre des mesures de protection collective en
// leur donnant la priorité sur les mesures de protection individuelle ».

import { CORPUS } from "@/lib/referentiels/corpus";

function texte(): string {
  const corpus = CORPUS.find((c) => c.id === "code-travail-duerp-principes");
  const article = corpus?.articles.find((a) => a.ref === "L. 4121-2");
  if (!article?.citationCle)
    throw new Error("L. 4121-2 n'a plus de verbatim au corpus : les PDF n'ont rien à citer.");
  return article.citationCle;
}

/** L'article entier, tel que le corpus le consigne. */
export const TEXTE_L4121_2 = texte();

/** Ce que l'article dit d'un ordre entre les mesures — écrit une fois, dans un module sans dépendance. */
export { ORDRE_SELON_L4121_2 } from "@/lib/verbatim/l4121-2-ordre";
