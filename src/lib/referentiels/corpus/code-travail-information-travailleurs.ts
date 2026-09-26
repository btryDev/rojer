// Corpus : code du travail — documents et affichages obligatoires.
//
// Étendue « articles_cites » : deux articles seulement, et ils viennent de deux
// endroits éloignés du code — le titre Ier du livre VII pour l'affichage des
// coordonnées, le chapitre Ier du livre Ier pour l'avis sur l'accès au document
// unique. Ce n'est pas une section qu'on dépouille, c'est une fonction qu'on
// rassemble : ce que l'employeur doit rendre visible sur un mur.
//
// CE QUE CE DÉPOUILLEMENT A ÉVITÉ. Le brief du lot 8 annonçait, sous
// « affichages », l'article `R. 4224-16` comme portant des « consignes de
// premiers secours affichées ». Ouvert sur Légifrance, cet article n'écrit ni
// « consignes » ni « affiche » : il impose des mesures d'organisation des
// secours CONSIGNÉES DANS UN DOCUMENT tenu à la disposition de l'inspection du
// travail. L'affichage des secours, lui, existe bien — c'est le 2° de
// `D. 4711-1`, l'adresse et le numéro des services de secours d'urgence.
// Encoder le brief tel quel aurait donc posé DEUX fois l'affichage et ZÉRO fois
// le document. Le document est encodé par le lot 7 sous
// `secours-etablissement-mesures` ; il n'appartient pas à ce corpus.
//
// NI L'UN NI L'AUTRE N'A DE PÉRIODICITÉ. Aucune des deux obligations ne se
// « refait » à date : un affichage se constitue puis se maintient à jour quand
// le nom de l'inspecteur ou l'adresse du service change. `periodicite: "autre"`
// pour les deux.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_INFORMATION_TRAVAILLEURS: Corpus = {
  id: "code-travail-information-travailleurs",
  intitule: "Code du travail — affichages obligatoires et avis d'accès au DUERP",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018493738/",
  etendue: "articles_cites",
  portee:
    "Ce que l'employeur doit rendre visible dans les lieux de travail : les coordonnées du service de santé au travail, des secours d'urgence et de l'inspection du travail (D. 4711-1), et l'avis indiquant les modalités d'accès des travailleurs au document unique (R. 4121-4, dernier alinéa). Le chapitre unique D. 4711-1 à D. 4711-3 n'est pas dépouillé en entier : le regroupement des registres de D. 4711-2 et D. 4711-3 relève du module « Registre de sécurité » et n'a pas été instruit dans ce lot.",
  articles: [
    {
      ref: "D. 4711-1",
      intitule:
        "Affichage de l'adresse et du numéro d'appel du service de santé au travail, des secours et de l'inspection du travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018527636",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur affiche, dans des locaux normalement accessibles aux travailleurs, trois coordonnées : service de santé au travail, secours d'urgence, inspection du travail avec le nom de l'inspecteur compétent.",
      citationCle:
        "L'employeur affiche, dans des locaux normalement accessibles aux travailleurs, l'adresse et le numéro d'appel : 1° Du médecin du travail ou du service de santé au travail compétent pour l'établissement ; 2° Des services de secours d'urgence ; 3° De l'inspection du travail compétente ainsi que le nom de l'inspecteur compétent.",
      statut: "retenu",
      obligations: ["information-etablissement-affichages-obligatoires"],
      reserve:
        "Le nom de l'inspecteur compétent et l'adresse du service de santé au travail changent, ce qui fait de cet affichage un état à maintenir et non un acte à solder une fois. Aucune durée n'étant écrite, aucune échéance n'est produite : la mise à jour est portée par la description de l'obligation, pas par le calendrier.",
    },
    {
      ref: "R. 4121-4",
      intitule:
        "Mise à disposition du document unique et avis d'accès des travailleurs",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045386451",
      versionEnVigueur: "2022-03-31",
      modifiePar: { texte: "Décret n° 2022-395 du 18 mars 2022 - art. 1" },
      // Relu en entier le 2026-09-26 (structure demandée d'abord : un chapeau,
      // les 1° à 7°, deux alinéas ; chapeau et items confirmés par une seconde
      // lecture). L'article entier est consigné depuis : le PDF du document
      // unique imprime la liste des destinataires, et la lit ici
      // (`pdf/mentions-r4121-4.ts`) au lieu de la paraphraser.
      luLe: "2026-09-26",
      lecture: "agent_verbatim",
      prescrit:
        "Le document unique et ses versions antérieures sont tenus quarante ans à la disposition de sept catégories de destinataires ; un avis indiquant les modalités d'accès des travailleurs est affiché à une place convenable et aisément accessible.",
      citationCle:
        "Le document unique d'évaluation des risques professionnels et ses versions antérieures sont tenus, pendant une durée de 40 ans à compter de leur élaboration, à la disposition : " +
        "1° Des travailleurs et des anciens travailleurs pour les versions en vigueur durant leur période d'activité dans l'entreprise. La communication des versions du document unique antérieures à celle en vigueur à la date de la demande peut être limitée aux seuls éléments afférents à l'activité du demandeur. Les travailleurs et anciens travailleurs peuvent communiquer les éléments mis à leur disposition aux professionnels de santé en charge de leur suivi médical ; " +
        "2° Des membres de la délégation du personnel du comité social et économique ; " +
        "3° Du service de prévention et de santé au travail mentionné à l'article L. 4622-1 ; " +
        "4° Des agents du système d'inspection du travail ; " +
        "5° Des agents des services de prévention des organismes de sécurité sociale ; " +
        "6° Des agents des organismes professionnels de santé, de sécurité et des conditions de travail mentionnés à l'article L. 4643-1 ; " +
        "7° Des inspecteurs de la radioprotection mentionnés à l'article L. 1333-29 du code de la santé publique et des agents mentionnés à l'article L. 1333-30 du même code, en ce qui concerne les résultats des évaluations liées à l'exposition des travailleurs aux rayonnements ionisants, pour les installations et activités dont ils ont respectivement la charge. " +
        "Jusqu'à l'entrée en vigueur de l'obligation de dépôt du document unique d'évaluation des risques professionnels sur un portail numérique selon les modalités prévues au B du V de l'article L. 4121-3-1 du code du travail, l'employeur conserve les versions successives du document unique au sein de l'entreprise sous la forme d'un document papier ou dématérialisé. " +
        "Un avis indiquant les modalités d'accès des travailleurs au document unique est affiché à une place convenable et aisément accessible dans les lieux de travail. Dans les entreprises ou établissements dotés d'un règlement intérieur, cet avis est affiché au même emplacement que celui réservé au règlement intérieur.",
      statut: "retenu",
      obligations: ["information-etablissement-avis-acces-duerp"],
      reserve:
        "SEUL LE DERNIER ALINÉA est porté par une obligation du référentiel. Les 1° à 7° organisent la mise à disposition du document unique pendant quarante ans à sept catégories de destinataires — travailleurs et anciens travailleurs, délégation du personnel du CSE, service de prévention et de santé au travail, inspection du travail, agents des caisses, organismes professionnels, inspecteurs de la radioprotection — et l'avant-dernier alinéa règle la conservation en attendant le portail numérique de L. 4121-3-1. Tout cela est servi par le module DUERP (versionnement, conservation quarante ans) et non par le référentiel de conformité. Le renvoi au portail national est par ailleurs hors périmètre déclaré du produit.",
    },
  ],
};
