// Ce que le PDF du document unique imprime de `R. 4121-4` : l'article entier,
// lu au corpus.
//
// Le PDF l'écrivait en paraphrase — « du CSE le cas échéant, du médecin du
// travail, […] des agents des services de prévention de la Carsat » — et
// attribuait les quarante ans à la loi du 2 août 2021. Relu le 2026-09-26 :
// la durée de 40 ans « à compter de leur élaboration » est dans ce décret ;
// les destinataires sont sept, anciens travailleurs compris, et deux alinéas
// suivent (la conservation dans l'entreprise, l'avis d'accès). Une paraphrase
// qui en retient quatre se lit comme la liste.
//
// Le verbatim n'est écrit qu'une fois, au corpus. Ce module le lit.

import { CODE_TRAVAIL_INFORMATION_TRAVAILLEURS } from "@/lib/referentiels/corpus/code-travail-information-travailleurs";

function texte(): string {
  // Le fichier du corpus, pas l'index : l'index charge tout le référentiel,
  // qui n'a rien à faire dans le fil des PDF (lot pdf-b1).
  const corpus = CODE_TRAVAIL_INFORMATION_TRAVAILLEURS;
  const article = corpus.articles.find((a) => a.ref === "R. 4121-4");
  if (!article?.citationCle)
    throw new Error("R. 4121-4 n'a plus de verbatim au corpus : le PDF n'a rien à citer.");
  return article.citationCle;
}

/** L'article entier, tel que le corpus le consigne. */
export const TEXTE_R4121_4 = texte();
