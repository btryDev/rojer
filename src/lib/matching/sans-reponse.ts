// Ce qu'un écran dit d'une ligne retenue sur le silence d'une question à
// trois états (C45, contre-lecture M1). Une phrase par question, un seul
// endroit : `Record` exhaustif, une question neuve sans phrase ne compile pas.
//
// Un fait, pas une conclusion : la fiche ne dit pas, donc la ligne s'affiche.
// Jamais « vous êtes concerné » ni « vous ne l'êtes pas ».
//
// Module pur, sans dépendance au runtime.

import type { QuestionSansReponse } from "./types";

export const PHRASE_SANS_REPONSE: Record<QuestionSansReponse, string> = {
  chiffons_impregnes:
    "La fiche de l'établissement ne dit pas si des chiffons, cotons ou papiers imprégnés y sont utilisés : cette ligne s'affiche tant que la réponse n'est pas « non ».",
  locaux_sommeil_public:
    "La fiche de l'établissement ne dit pas s'il comporte des locaux à sommeil pour le public : cette ligne s'affiche tant que la réponse n'est pas « non ».",
};
