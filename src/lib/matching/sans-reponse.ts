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
  manutention_manuelle:
    "Rojer ne sait pas si des travailleurs portent, poussent ou tirent des charges à la main : cette ligne s'affiche tant que la réponse n'est pas « non ».",
  travail_ecran:
    "Rojer ne sait pas si des travailleurs utilisent un écran de façon habituelle : cette ligne s'affiche tant que la réponse n'est pas « non ».",
  operations_electriques:
    "Rojer ne sait pas si des travailleurs effectuent des opérations sur les installations électriques ou dans leur voisinage : cette ligne s'affiche tant que la réponse n'est pas « non ».",
  conduite_engins:
    "Rojer ne sait pas si des travailleurs conduisent des équipements de travail mobiles automoteurs ou servant au levage : cette ligne s'affiche tant que la réponse n'est pas « non ».",
  exposition_cmr:
    "Rojer ne sait pas si des travailleurs sont exposés à des agents cancérogènes, mutagènes ou toxiques pour la reproduction : cette ligne s'affiche tant que la réponse n'est pas « non ».",
  epi_presents:
    "La fiche de l'établissement ne dit pas si des équipements de protection individuelle y sont portés : cette ligne s'affiche tant que la réponse n'est pas « non ».",
  locaux_sommeil_public:
    "La fiche de l'établissement ne dit pas s'il comporte des locaux à sommeil pour le public : cette ligne s'affiche tant que la réponse n'est pas « non ».",
  // Inatteignable en production depuis la contrainte CHECK
  // `Etablissement_erp_type_categorie_requis` (2026-09-27) : un ERP porte
  // toujours son type. Gardée parce que le moteur sait émettre la marque —
  // pour les projections de test et de simulation — et qu'une marque sans
  // phrase ne doit pas compiler.
  type_erp:
    "La fiche de l'établissement ne précise pas le type de l'établissement recevant du public : cette ligne s'affiche tant qu'il n'est pas renseigné, et peut changer ou disparaître une fois qu'il l'est.",
  personnes_presentes:
    "La fiche de l'établissement ne dit pas combien de personnes y sont habituellement présentes, public compris : cette ligne s'affiche tant que ce nombre n'est pas renseigné.",
  matieres_r4227_22:
    "La fiche de l'établissement ne dit pas si des matières explosives ou inflammables y sont manipulées et mises en œuvre : cette ligne s'affiche tant que la réponse n'est pas « non ».",
};
