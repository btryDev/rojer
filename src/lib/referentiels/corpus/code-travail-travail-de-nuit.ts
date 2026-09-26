// Corpus : code du travail — travail de nuit (L. 3122-1 et L. 3122-2), cités
// par la description du risque transverse `trv-travail-nuit`
// (`referentiels/commun.ts`).
//
// Étendue « articles_cites ». Lus le 2026-09-26 : la description écrivait que
// le recours au travail de nuit « doit être justifié » ; l'article dit qu'il
// « est justifié par la nécessité d'assurer la continuité de l'activité
// économique ou des services d'utilité sociale ». Il est désormais cité en
// entier. `L. 3122-11`, cité par la mesure `trv-nuit-suivi`, a été ouvert le
// même jour mais n'est pas consigné : le texte qui a produit sa version n'a
// pas pu être relevé sur la page.

import type { Corpus } from "./types";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

const LOI_2016_1088 = { texte: "Loi n° 2016-1088 du 8 août 2016, art. 8" };

export const CODE_TRAVAIL_TRAVAIL_DE_NUIT: Corpus = {
  id: "code-travail-travail-de-nuit",
  intitule: "Code du travail — travail de nuit (ordre public)",
  url: "https://www.legifrance.gouv.fr/codes/id/LEGISCTA000033020193/",
  etendue: "articles_cites",
  portee:
    "Le caractère exceptionnel du recours au travail de nuit (L. 3122-1) et sa définition (L. 3122-2), cités par le risque transverse `trv-travail-nuit`. Le reste du chapitre n'est pas dépouillé.",
  articles: [
    {
      ref: "L. 3122-1",
      intitule: "Caractère exceptionnel du recours au travail de nuit",
      url: ART("LEGIARTI000033020190"),
      versionEnVigueur: "2016-08-10",
      modifiePar: LOI_2016_1088,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "Le recours au travail de nuit est exceptionnel, prend en compte la protection de la santé et de la sécurité, et est justifié par la continuité de l'activité économique ou des services d'utilité sociale.",
      citationCle:
        "Le recours au travail de nuit est exceptionnel. Il prend en compte les impératifs de protection de la santé et de la sécurité des travailleurs et est justifié par la nécessité d'assurer la continuité de l'activité économique ou des services d'utilité sociale.",
      statut: "sans_objet",
      motif:
        "Une règle de temps de travail, sans échéance. L'article ne contient pas « doit » (seconde lecture ciblée) : la description de `trv-travail-nuit` le citait en « doit être justifié », elle le cite désormais en entier.",
    },
    {
      ref: "L. 3122-2",
      intitule: "Définition du travail de nuit",
      url: ART("LEGIARTI000033020186"),
      versionEnVigueur: "2016-08-10",
      modifiePar: LOI_2016_1088,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "Est du travail de nuit tout travail sur au moins neuf heures consécutives comprenant minuit-5 heures ; la période commence au plus tôt à 21 heures et s'achève au plus tard à 7 heures.",
      citationCle:
        "Tout travail effectué au cours d'une période d'au moins neuf heures consécutives comprenant l'intervalle entre minuit et 5 heures est considéré comme du travail de nuit. La période de travail de nuit commence au plus tôt à 21 heures et s'achève au plus tard à 7 heures.",
      statut: "sans_objet",
      motif:
        "Définition, sans échéance. Elle fonde la question de détection `q-travail-nuit` (« entre minuit et 5 heures »).",
    },
  ],
};
