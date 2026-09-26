// Corpus : code du travail — prévention des risques biologiques (titre II du
// livre IV), les deux articles que le référentiel de risques du DUERP cite.
//
// Étendue « articles_cites ». Lus le 2026-09-26 pour la description du risque
// transverse `trv-biologique` (`referentiels/commun.ts`), qui résumait
// `R. 4421-1` sans sa seconde condition cumulative : les articles qu'il écarte
// ne le sont que si l'activité n'implique pas l'utilisation délibérée d'un
// agent biologique ET si l'évaluation ne met pas en évidence de risque
// spécifique. Les articles écartés (R. 4424-2, R. 4424-3, R. 4424-7 à
// R. 4424-10, R. 4425-6, R. 4425-7) NE SONT PAS LUS : la description cite
// l'alinéa entier au lieu de dire ce qu'ils imposent.

import type { Corpus } from "./types";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

export const CODE_TRAVAIL_AGENTS_BIOLOGIQUES: Corpus = {
  id: "code-travail-agents-biologiques",
  intitule: "Code du travail — prévention des risques biologiques",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018490782/",
  etendue: "articles_cites",
  portee:
    "Le champ du titre II (R. 4421-1) et l'évaluation des risques biologiques (R. 4423-1), cités par le risque transverse `trv-biologique`. Le reste du titre n'est pas dépouillé.",
  articles: [
    {
      ref: "R. 4421-1",
      intitule: "Champ d'application du titre, et articles écartés sous deux conditions",
      url: ART("LEGIARTI000018530512"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "Le titre s'applique là où l'activité peut exposer à des agents biologiques. Une liste d'articles n'est pas applicable quand l'activité n'implique pas normalement l'utilisation délibérée d'un agent biologique ET que l'évaluation ne met pas en évidence de risque spécifique.",
      citationCle:
        "Les dispositions du présent titre sont applicables dans les établissements dans lesquels la nature de l'activité peut conduire à exposer les travailleurs à des agents biologiques. Toutefois, les dispositions des articles R. 4424-2, R. 4424-3, R. 4424-7 à R. 4424-10, R. 4425-6 et R. 4425-7 ne sont pas applicables lorsque l'activité, bien qu'elle puisse conduire à exposer des travailleurs, n'implique pas normalement l'utilisation délibérée d'un agent biologique et que l'évaluation des risques prévue au chapitre III ne met pas en évidence de risque spécifique.",
      statut: "sans_objet",
      motif:
        "Article de champ, sans échéance. La seconde condition (« et que l'évaluation des risques prévue au chapitre III ne met pas en évidence de risque spécifique ») a été confirmée par une seconde lecture ciblée ; c'est elle que la description de `trv-biologique` omettait jusqu'au 2026-09-26.",
    },
    {
      ref: "R. 4423-1",
      intitule: "Évaluation des risques biologiques",
      url: ART("LEGIARTI000018530498"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "L'employeur détermine la nature, la durée et les conditions de l'exposition des travailleurs pour toute activité susceptible d'y exposer.",
      citationCle:
        "Pour toute activité susceptible de présenter un risque d'exposition à des agents biologiques, l'employeur détermine la nature, la durée et les conditions de l'exposition des travailleurs.",
      statut: "sans_objet",
      motif:
        "La déclinaison aux agents biologiques de l'évaluation des risques, que le DUERP porte comme son objet : aucune échéance propre. Seul le premier alinéa est relevé ; le second (agents de plusieurs groupes) n'est pas repris.",
    },
  ],
};
