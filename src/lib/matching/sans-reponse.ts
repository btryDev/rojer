// Ce qu'un écran dit d'une ligne retenue sur le silence d'une question à
// trois états (C45, contre-lecture M1). Une phrase par question, un seul
// endroit : `Record` exhaustif, une question neuve sans phrase ne compile pas.
//
// Un fait, pas une conclusion : la fiche ne dit pas, donc la ligne s'affiche.
// Jamais « vous êtes concerné » ni « vous ne l'êtes pas ».
//
// Module pur, sans dépendance au runtime.

import { QUESTION_MATIERES } from "@/lib/etablissements/questions";
import type { QuestionSansReponse } from "./types";

// [2026-10-24 : « par prudence » dit pourquoi la ligne reste, « vous n'avez
// pas répondu » dit que la réponse vous appartient.]
export const PHRASE_SANS_REPONSE: Record<QuestionSansReponse, string> = {
  manutention_manuelle:
    "Rojer ne sait pas si des travailleurs portent, poussent ou tirent des charges à la main : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».",
  travail_ecran:
    "Rojer ne sait pas si des travailleurs utilisent un écran de façon habituelle : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».",
  operations_electriques:
    "Rojer ne sait pas si des travailleurs effectuent des opérations sur les installations électriques ou dans leur voisinage : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».",
  conduite_engins:
    "Rojer ne sait pas si des travailleurs conduisent des équipements de travail mobiles automoteurs ou servant au levage : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».",
  exposition_cmr:
    "Rojer ne sait pas si des travailleurs sont exposés à des agents cancérogènes, mutagènes ou toxiques pour la reproduction : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».",
  epi_presents:
    "Rojer ne sait pas si vous fournissez des équipements de protection individuelle à vos salariés : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».",
  ssi_categorie_ab:
    "La fiche de l'établissement ne dit pas s'il dispose d'un système de sécurité incendie de catégorie A ou B : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».",
  locaux_sommeil_public:
    "La fiche de l'établissement ne dit pas s'il comporte des locaux à sommeil pour le public : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».",
  // Inatteignable en production depuis la contrainte CHECK
  // `Etablissement_erp_type_categorie_requis` (2026-09-27) : un ERP porte
  // toujours son type. Gardée parce que le moteur sait émettre la marque —
  // pour les projections de test et de simulation — et qu'une marque sans
  // phrase ne doit pas compiler.
  type_erp:
    "La fiche de l'établissement ne précise pas le type de l'établissement recevant du public : cette ligne s'affiche tant qu'il n'est pas renseigné, et peut changer ou disparaître une fois qu'il l'est.",
  personnes_presentes:
    "La fiche de l'établissement ne dit pas combien de personnes y sont habituellement présentes, public compris : cette ligne s'affiche tant que ce nombre n'est pas renseigné.",
  // ~~« La fiche de l'établissement ne dit pas si des matières explosives ou
  // inflammables y sont manipulées et mises en œuvre : […] »~~ [2026-10-13,
  // `lot/question-matieres` : la question reformulée est citée mot pour mot,
  // depuis son unique définition — la phrase voyage jusqu'au guide et au
  // MCP, qui la reconnaissent ainsi.]
  matieres_r4227_22: `La fiche de l'établissement ne répond pas encore à la question « ${QUESTION_MATIERES} » : par prudence, cette ligne reste affichée tant que vous n'avez pas répondu « non ».`,
};
