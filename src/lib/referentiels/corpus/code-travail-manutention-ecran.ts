// Corpus : code du travail — manutention manuelle des charges et travail sur
// écran de visualisation.
//
// Étendue « articles_cites » : deux articles, un par chapitre. Le chapitre Ier
// du titre IV (manutention, R. 4541-1 à R. 4541-10) et le chapitre II
// (écrans, R. 4542-1 à R. 4542-19) ne sont dépouillés ni l'un ni l'autre : les
// obligations d'aménagement, d'évaluation des postes et d'examen
// ophtalmologique qu'ils portent aussi n'ont pas été ouvertes.
//
// CE QUE CE DÉPOUILLEMENT A CONFIRMÉ. Les deux références du brief du lot 8
// étaient exactes, ce qui n'a pas été le cas partout : `R. 4541-8` porte bien
// l'information et la formation à la manutention manuelle, `R. 4542-16` bien
// l'information et la formation au travail sur écran. Les vérifier n'était pas
// perdu — c'est en les ouvrant qu'on constate ce que les deux articles ne
// disent PAS.
//
// AUCUN DES DEUX N'ÉCRIT DE DURÉE DE VALIDITÉ NI DE RECYCLAGE. On lit
// couramment que la formation « gestes et postures » se renouvelle tous les
// deux ou cinq ans. Aucun de ces rythmes n'est dans le Code : ce sont des
// pratiques d'organismes de formation. Les deux obligations portent
// `periodicite: "autre"`.
//
// AUCUN DES DEUX NE PRODUIT DE TITRE NOMINATIF, et c'est ce qui a décidé de
// leur porteur. Le critère appliqué est celui du lot 7 : une formation devient
// un titre de salarié quand le texte la date par personne ET lui fait produire
// une pièce nominative. `R. 4541-8` ne fait ni l'un ni l'autre ; `R. 4542-16`
// date bien par personne — « avant sa première affectation » — mais ne produit
// aucune pièce. Surtout, ni l'un ni l'autre ne désigne des personnes que le
// produit sait nommer : « les travailleurs dont l'activité comporte des
// manutentions manuelles » est une qualification que ni le parc d'équipements
// ni le code NAF ne donnent. Un titre que personne ne sait attribuer ne produit
// aucune ligne (ADR-023). Les deux obligations sont donc portées par
// l'établissement.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_MANUTENTION_ECRAN: Corpus = {
  id: "code-travail-manutention-ecran",
  intitule:
    "Code du travail — formation à la manutention manuelle et au travail sur écran",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018492445/",
  etendue: "articles_cites",
  portee:
    "Deux formations que le titre IV impose sans condition d'équipement : l'information et la formation à la manutention manuelle (R. 4541-8) et l'information et la formation au travail sur écran de visualisation (R. 4542-16). Ce sont les deux plus universelles dans les trois secteurs cibles du produit. Le reste des deux chapitres — évaluation des postes, aménagement, ambiances, examen ophtalmologique, arrêté sur les facteurs individuels de risque — n'est pas dépouillé.",
  articles: [
    {
      ref: "R. 4541-8",
      intitule:
        "Information et formation des travailleurs dont l'activité comporte des manutentions manuelles",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528891",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur fait bénéficier les travailleurs dont l'activité comporte des manutentions manuelles d'une information sur les risques encourus et d'une formation adéquate à la sécurité, essentiellement pratique, portant sur les gestes et postures.",
      citationCle:
        "2° D'une formation adéquate à la sécurité relative à l'exécution de ces opérations. Au cours de cette formation, essentiellement à caractère pratique, les travailleurs sont informés sur les gestes et postures à adopter pour accomplir en sécurité les manutentions manuelles.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-manutention"],
      reserve:
        "L'arrêté prévu à R. 4541-6, qui définit les « facteurs individuels de risque » auxquels le 1° renvoie, n'a pas été recherché : aucune obligation ne s'y appuie et son contenu n'est pas encodé. Le porteur établissement fait par ailleurs perdre la traçabilité nominative — l'outil ne saura pas QUI a été formé. C'est un coût assumé, préféré au faux négatif d'un titre que personne ne sait attribuer.",
    },
    {
      ref: "R. 4542-16",
      intitule:
        "Information et formation des travailleurs sur écran de visualisation",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528838",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "L'employeur assure l'information et la formation des travailleurs sur les modalités d'utilisation de l'écran et de l'équipement dans lequel il est intégré, avant la première affectation et à chaque modification substantielle du poste.",
      citationCle:
        "L'employeur assure l'information et la formation des travailleurs sur les modalités d'utilisation de l'écran et de l'équipement de travail dans lequel cet écran est intégré. Chaque travailleur en bénéficie avant sa première affectation à un travail sur écran de visualisation et chaque fois que l'organisation du poste de travail est modifiée de manière substantielle.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-travail-sur-ecran"],
      reserve:
        "Le second déclenchement — « chaque fois que l'organisation du poste de travail est modifiée de manière substantielle » — est un événement non daté et non détectable par le produit. Il est porté par la description de l'obligation, jamais par une échéance : c'est la position de `.claude/CLAUDE.md` sur l'absence de sixième déclencheur. Le reste du chapitre II, dont l'analyse des postes (R. 4542-3) et l'examen ophtalmologique approprié (R. 4542-17), n'est pas dépouillé.",
    },
  ],
};
