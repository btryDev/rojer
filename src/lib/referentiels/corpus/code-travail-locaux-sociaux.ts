// Corpus : code du travail — installations sanitaires, boissons, restauration.
//
// Étendue « articles_cites » : cinq articles sur les trente-cinq du chapitre
// VIII et des huit du chapitre V. C'est peu, et c'est délibéré : la plupart des
// articles de ces chapitres règlent l'AMÉNAGEMENT d'une installation — surface,
// isolement, nombre de sièges, température de l'eau — et non un acte à porter
// au calendrier. Ils ne sont pas lus, et ce corpus ne prétend pas le contraire.
//
// AUCUN DES CINQ N'ÉCRIT DE PÉRIODICITÉ, et c'est le résultat qui comptait.
// Deux tentations étaient à écarter :
//
//   * un contrôle périodique des installations sanitaires — R. 4228-1 n'en
//     écrit aucun ;
//   * une analyse périodique de l'eau — R. 4225-2 n'en écrit aucune. Les
//     rythmes d'analyse qu'on trouve partout viennent du Code de la santé
//     publique et du carnet sanitaire, que ce produit sert par un module
//     dédié, sur d'autres textes.
//
// LE SEUIL DE LA RESTAURATION EST À CINQUANTE, PAS À VINGT-CINQ. Le seuil de
// vingt-cinq personnes « désirant prendre habituellement leur repas sur les
// lieux de travail » se cite encore couramment ; il a été remplacé par le
// décret n° 2019-1586 du 31 décembre 2019. Les deux articles lus le
// 2026-08-31 portent « cinquante ».

import type { Corpus } from "./types";

export const CODE_TRAVAIL_LOCAUX_SOCIAUX: Corpus = {
  id: "code-travail-locaux-sociaux",
  intitule:
    "Code du travail — installations sanitaires, eau potable et restauration",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489203/",
  etendue: "articles_cites",
  portee:
    "Ce que le Code impose au bénéfice des personnes et non au titre d'une machine : les moyens d'assurer la propreté individuelle (R. 4228-1), l'eau potable et fraîche (R. 4225-2), le local de restauration à partir de cinquante salariés et l'emplacement en deçà (R. 4228-22 et R. 4228-23). Les articles d'aménagement — R. 4228-2 à R. 4228-18 pour les sanitaires, R. 4228-19 à R. 4228-21 et R. 4228-24 à R. 4228-25 pour la restauration, R. 4228-26 et suivants pour l'hébergement — ne sont PAS dépouillés.",
  articles: [
    {
      ref: "R. 4228-1",
      intitule: "Moyens d'assurer la propreté individuelle",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532006",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur met à la disposition des travailleurs des vestiaires, des lavabos, des cabinets d'aisance et, le cas échéant, des douches.",
      citationCle:
        "L'employeur met à la disposition des travailleurs les moyens d'assurer leur propreté individuelle, notamment des vestiaires, des lavabos, des cabinets d'aisance et, le cas échéant, des douches.",
      statut: "retenu",
      obligations: ["locaux-etablissement-installations-sanitaires"],
      reserve:
        "Les dix-sept articles suivants de la section — R. 4228-2 à R. 4228-18, vestiaires collectifs, lavabos, cabinets d'aisance, douches — N'ONT PAS ÉTÉ OUVERTS. Ils règlent l'aménagement et non un acte distinct, et l'obligation encodée ne les cite pas. Le nettoyage quotidien qu'on attribue couramment à R. 4228-13 n'est donc ni vérifié ni encodé : ce serait une échéance fondée sur une lecture indirecte. Un lot qui voudrait affiner l'aménagement devra les dépouiller.",
    },
    {
      ref: "R. 4225-2",
      intitule: "Mise à disposition d'eau potable et fraîche",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051679293",
      versionEnVigueur: "2025-06-02",
      // La seule valeur écrite à l'ouverture du champ, et c'est l'article de
      // l'incident : ce décret est entré dans le dépôt par cette porte-ci, la
      // porte s'est refermée, et son chapitre chaleur — qui mord sur la
      // cuisine de restaurant — n'a jamais été ouvert. Le fait était déjà
      // relevé en prose dans la `reserve` ci-dessous ; il devient
      // interrogeable. Ce n'est pas une reprise rétroactive du corpus (voir
      // `types.ts`), c'est le cas d'école qui montre à quoi le champ sert.
      //
      // CE QUE CETTE VALEUR NE DIT PAS : que le décret ait été lu. Il ne l'est
      // toujours pas. Le champ enregistre le renvoi, la règle de lecture en
      // tête de `types.ts` est ce qui obligera à le suivre.
      //
      // PAS D'`url`, ET C'EST DÉLIBÉRÉ. Aucune source du dépôt ne porte le
      // lien Légifrance de ce décret — vérifié —, et une URL fabriquée à
      // partir d'un identifiant plausible est une référence inventée : elle a
      // l'apparence d'un lien vérifié, elle ouvre autre chose ou rien.
      // `url` est optionnel exactement pour ce cas. Le prochain qui ouvrira
      // le décret la posera.
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025" },
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur met à disposition des travailleurs de l'eau potable et fraîche pour se désaltérer et se rafraîchir.",
      citationCle:
        "L'employeur met à disposition des travailleurs de l'eau potable et fraîche pour leur permettre de se désaltérer et de se rafraîchir.",
      statut: "retenu",
      obligations: ["locaux-etablissement-eau-potable"],
      reserve:
        "Article réécrit par le décret n° 2025-482 du 27 mai 2025, dont c'est la version en vigueur ; la rédaction antérieure ne portait pas « et se rafraîchir ». Aucune analyse ni aucun contrôle périodique de l'eau n'est écrit ici ; les rythmes d'analyse relèvent du Code de la santé publique et du carnet sanitaire, servis ailleurs dans le produit.",
    },
    {
      ref: "R. 4225-3",
      intitule: "Boisson non alcoolisée gratuite en conditions particulières",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483598",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Lorsque des conditions particulières de travail conduisent les travailleurs à se désaltérer fréquemment, l'employeur met gratuitement à leur disposition au moins une boisson non alcoolisée ; la liste des postes concernés est établie après avis du médecin du travail et du CSE.",
      statut: "obligation_manquante",
      cause: "activite_exercee",
      toucheLaCible: true,
      motif:
        "L'article impose une mise à disposition gratuite de boisson, et une liste de postes tenue par l'employeur — deux actes réels, qu'aucune obligation du référentiel ne porte. Il n'est pas encodé parce que son champ dépend de « conditions particulières de travail » que le produit ne sait pas qualifier : ni le parc d'équipements ni le code NAF ne les donnent. Le déduire serait le cinquième déclencheur, l'activité réellement exercée, non implémenté. Encodé sans condition, l'article se serait affiché à tout dossier, y compris un bureau où il ne s'applique pas ; encodé sur une condition inventée, il n'aurait plus rien signifié. Il est décrit dans la description de `locaux-etablissement-eau-potable`, où il informe sans produire de ligne.",
      bloquePar:
        "cinquième déclencheur (activité réellement exercée) non implémenté — ADR-022",
    },
    {
      ref: "R. 4228-22",
      intitule: "Local de restauration — cinquante salariés et plus",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041455665",
      versionEnVigueur: "2020-01-02",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Dans les établissements d'au moins cinquante salariés, l'employeur met à disposition un local de restauration pourvu de sièges et de tables, d'un robinet d'eau potable fraîche et chaude pour dix usagers, d'un moyen de conservation ou de réfrigération et d'une installation pour réchauffer les plats.",
      citationCle:
        "Dans les établissements d'au moins cinquante salariés, l'employeur, après avis du comité social et économique, met à leur disposition un local de restauration.",
      statut: "retenu",
      obligations: ["locaux-etablissement-local-restauration"],
      reserve:
        "L'effectif se décompte selon L. 130-1 du code de la sécurité sociale — moyenne sur l'année civile précédente — là où le moteur évalue `effectifSurSite`, un effectif courant déclaré. Autour du seuil, les deux peuvent diverger : l'une ou l'autre des deux lignes de restauration s'affichera, jamais aucune.",
    },
    {
      ref: "R. 4228-23",
      intitule: "Emplacement de restauration — moins de cinquante salariés",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041455662",
      versionEnVigueur: "2020-01-02",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Dans les établissements de moins de cinquante salariés, l'employeur met à disposition un emplacement permettant de se restaurer dans de bonnes conditions de santé et de sécurité ; par dérogation et après déclaration, cet emplacement peut être aménagé dans les locaux de travail si l'activité n'y comporte ni emploi ni stockage de substances dangereuses.",
      citationCle:
        "Dans les établissements de moins de cinquante salariés, l'employeur met à leur disposition un emplacement leur permettant de se restaurer dans de bonnes conditions de santé et de sécurité.",
      statut: "retenu",
      obligations: ["locaux-etablissement-emplacement-restauration"],
      reserve:
        "C'est l'article qui concerne la quasi-totalité de la cible du produit. La dérogation du troisième alinéa — aménagement dans les locaux de travail, après déclaration à l'inspection et au médecin du travail — n'est pas modélisée : le produit ne sait pas si le dirigeant en use, et le critère « substances ou mélanges dangereux » ne conditionne pas cette obligation. L'arrêté qui doit définir le contenu de la déclaration n'a pas été recherché.",
    },
  ],
};
