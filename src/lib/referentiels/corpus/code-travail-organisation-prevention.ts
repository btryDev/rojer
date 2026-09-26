// Corpus : code du travail — organisation de la prévention dans l'entreprise.
//
// Étendue « articles_cites » : huit articles, ceux sur lesquels s'appuient les
// obligations du domaine `organisation_prevention` et les deux formations
// santé-sécurité du domaine `formation_securite`. Ils viennent de trois livres
// différents — la quatrième partie pour le salarié désigné, la deuxième pour le
// CSE, la première pour le règlement intérieur — et aucun de ces trois
// ensembles n'est dépouillé de bout en bout.
//
// CE QUE CE DÉPOUILLEMENT A CORRIGÉ DANS LE BRIEF DU LOT 8. Une référence sur
// deux y était approximative, et deux l'étaient assez pour changer
// l'obligation :
//
//   * `L. 1311-2` était donné comme le fondement du « règlement intérieur —
//     volet hygiène et sécurité ». Ouvert, il ne dit rien du contenu : il pose
//     le seuil de cinquante salariés et le délai de douze mois, rien d'autre.
//     C'est `L. 1321-1` 1° qui fait entrer le règlement intérieur dans le
//     périmètre santé-sécurité de Rojer. Le fondateur a été déplacé.
//
//   * `L. 2315-18` était présenté comme portant, seul, la formation du membre
//     du CSE ET celle du salarié désigné, `L. 4644-1` y renvoyant. Ce sont deux
//     actes sous un même régime : voir la réserve de `L. 4644-1` et celle de
//     `L. 2315-17`, qui porte l'indice décisif.
//
// CE QUE CE CORPUS A CORRIGÉ DANS LE LOT LUI-MÊME, APRÈS COUP. Sa première
// version ne comptait que cinq articles et affirmait qu'aucun n'écrivait de
// périodicité. C'était faux : `L. 4644-1` renvoie aux articles `L. 2315-16` À
// `L. 2315-18`, et seul le dernier avait été ouvert. `L. 2315-17`, lu depuis,
// écrit un renouvellement au bout de quatre ans de mandat exercé — et il change
// à la fois la périodicité de la formation du CSE et le découpage des deux
// obligations. Un renvoi ne se lit pas par son dernier terme.
//
// UN SEUL DES HUIT ARTICLES ÉCRIT UNE DURÉE DE RENOUVELLEMENT, `L. 2315-17`.
// Les autres chiffres du corpus sont des seuils d'effectif (onze, cinquante),
// des délais d'entrée en obligation (douze mois) et des durées de stage (cinq
// jours, trois jours) — aucun n'est un rythme.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_ORGANISATION_PREVENTION: Corpus = {
  id: "code-travail-organisation-prevention",
  intitule:
    "Code du travail — salarié désigné compétent, comité social et économique, règlement intérieur",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000024391542/",
  etendue: "articles_cites",
  portee:
    "Ce qui organise la prévention avant qu'il soit question d'un équipement : la désignation d'un salarié compétent et sa formation (L. 4644-1, R. 4644-1), la mise en place du CSE au seuil de onze salariés (L. 2311-2), le régime de la formation santé-sécurité — temps de travail, organisme, renouvellement, durée, financement (L. 2315-16 à L. 2315-18) —, et l'obligation d'un règlement intérieur au seuil de cinquante (L. 1311-2) avec son volet santé-sécurité (L. 1321-1). Ni le livre VI de la quatrième partie, ni le titre Ier du livre III de la deuxième partie, ni le titre II du livre III de la première partie ne sont dépouillés en entier.",
  articles: [
    {
      ref: "L. 4644-1",
      intitule:
        "Désignation d'un ou plusieurs salariés compétents en protection et prévention",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043893856",
      versionEnVigueur: "2022-03-31",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur désigne un ou plusieurs salariés compétents pour s'occuper des activités de protection et de prévention des risques professionnels ; à défaut de compétences internes, il peut faire appel à un intervenant extérieur.",
      citationCle:
        "I.-L'employeur désigne un ou plusieurs salariés compétents pour s'occuper des activités de protection et de prévention des risques professionnels de l'entreprise.",
      statut: "retenu",
      obligations: [
        "prevention-etablissement-salarie-designe",
        "formation-securite-salarie-designe-competent",
      ],
      reserve:
        "DEUX ALINÉAS, DEUX OBLIGATIONS. Le I alinéa 1 impose de désigner (porteur établissement), le I alinéa 2 fait bénéficier le désigné d'une formation (porteur salarié). La première rédaction de ce corpus rattachait la seconde à la ligne de catalogue du CSE, par lecture du renvoi « dans les conditions prévues aux articles L. 2315-16 à L. 2315-18 » ; l'ouverture des trois articles du renvoi a montré que le renvoi porte sur les CONDITIONS et non sur l'acte. Le recours aux intervenants extérieurs des alinéas 3 à 5 n'est porté par aucune obligation : c'est une faculté conditionnée à l'absence de compétences internes, pas un acte dû. Aucun texte ne fixe de délai à la désignation elle-même.",
    },
    {
      ref: "L. 2311-2",
      intitule: "Champ d'application du comité social et économique",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035609353",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Un CSE est mis en place dans les entreprises d'au moins onze salariés, l'obligation ne naissant que si l'effectif est atteint pendant douze mois consécutifs.",
      citationCle:
        "Un comité social et économique est mis en place dans les entreprises d'au moins onze salariés. Sa mise en place n'est obligatoire que si l'effectif d'au moins onze salariés est atteint pendant douze mois consécutifs.",
      statut: "retenu",
      obligations: ["prevention-etablissement-cse"],
      reserve:
        "Les douze mois consécutifs ne sont pas calculés : le modèle ne porte que l'effectif courant, sans historique. La ligne apparaît au franchissement constaté, donc en avance sur l'échéance légale. L'article compte par ENTREPRISE, le moteur évalue par établissement (`effectifSurSite`) : une entreprise multi-sites dont aucun site n'atteint onze ne verra pas la ligne.",
    },
    {
      ref: "L. 1111-3",
      intitule: "Salariés non pris en compte dans le calcul des effectifs",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019869554",
      versionEnVigueur: "2016-01-01",
      modifiePar: {
        texte: "Ordonnance n° 2015-1578 du 3 décembre 2015 — art. 1.",
      },
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "Écarte du calcul des effectifs de l'entreprise plusieurs catégories de salariés, en tête desquelles les apprentis.",
      citationCle:
        "Ne sont pas pris en compte dans le calcul des effectifs de l'entreprise : 1° Les apprentis",
      statut: "sans_objet",
      motif:
        "Règle de calcul, sans échéance : elle sert les seuils des obligations (L. 2311-2 renvoie à L. 1111-2, que cet article complète), elle n'en crée aucune — même traitement que les définitions qui servent une obligation (précédent R. 4624-28-1). Consignée le 2026-09-26 parce que le repère d'effectif de l'onboarding la cite : le champ « Effectif travailleur » demande « Salariés + apprentis » et le repère comparait ce nombre aux seuils de onze salariés sans dire que ceux-ci se comptent sur l'entreprise et sans les apprentis. Relu de première main : seules la phrase d'ouverture et le 1° ont été lus mot pour mot ; les autres catégories et l'alinéa final ne sont pas recopiés ici. La page lue se dit « version en vigueur depuis le 01/01/2016 ».",
    },
    {
      ref: "L. 2315-18",
      intitule:
        "Formation en santé, sécurité et conditions de travail des membres de la délégation du personnel",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036761949",
      versionEnVigueur: "2022-03-31",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Les membres de la délégation du personnel du CSE et le référent harcèlement bénéficient d'une formation en santé, sécurité et conditions de travail, d'une durée minimale de cinq jours au premier mandat et de trois jours au renouvellement ; l'employeur la finance.",
      citationCle:
        "La formation est d'une durée minimale de cinq jours lors du premier mandat des membres de la délégation du personnel. En cas de renouvellement de ce mandat, la formation est d'une durée minimale : 1° De trois jours pour chaque membre de la délégation du personnel, quelle que soit la taille de l'entreprise ; 2° De cinq jours pour les membres de la commission santé, sécurité et conditions de travail dans les entreprises d'au moins trois cents salariés.",
      statut: "retenu",
      obligations: ["formation-securite-salarie-cse-sst"],
      reserve:
        "Cinq jours et trois jours sont des DURÉES DE STAGE, pas des périodicités — c'est L. 2315-17 qui porte le renouvellement. Le 2° (cinq jours pour la CSSCT à partir de trois cents salariés) est hors cible et n'est pas encodé. La prise en charge du financement par l'employeur n'est pas une obligation distincte : c'est une règle de financement d'un acte unique. L'article est cité en CONTEXTE par `formation-securite-salarie-designe-competent`, dont il fournit les conditions sans en être le fondateur.",
    },
    {
      ref: "L. 2315-17",
      intitule:
        "Organismes habilités à dispenser la formation et renouvellement après quatre ans de mandat",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035621181",
      versionEnVigueur: "2026-05-28",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Les formations sont dispensées par un organisme enregistré auprès de l'autorité administrative ou par un organisme de formation syndicale, et sont renouvelées lorsque les représentants ont exercé leur mandat pendant quatre ans, consécutifs ou non.",
      citationCle:
        "Ces formations sont renouvelées lorsque les représentants ont exercé leur mandat pendant quatre ans, consécutifs ou non.",
      statut: "retenu",
      obligations: [
        "formation-securite-salarie-cse-sst",
        "formation-securite-salarie-designe-competent",
      ],
      reserve:
        "C'EST L'ARTICLE QUI A CORRIGÉ CE LOT APRÈS COUP, et il n'avait pas été ouvert au premier passage — L. 4644-1 renvoie aux articles L. 2315-16 À L. 2315-18, et seul le dernier avait été lu. Le rapport du lot annonçait « aucun des textes lus n'écrit de durée » : c'était faux, celui-ci en écrit une. La ligne CSE passe de `autre` à `quadriennale`.\n\nDEUX RÉSERVES SUR CE CHIFFRE. D'abord, les quatre ans comptent du MANDAT EXERCÉ, « consécutifs ou non », et non du temps calendaire : le produit ne modélisant aucun mandat, l'échéance calculée est juste pour un mandat continu et arrive en avance pour un mandat interrompu. Ensuite, cette condition est écrite en termes de « représentants » ayant « exercé leur mandat » — elle est donc INAPPLICABLE au salarié désigné compétent, qui est désigné et non élu (R. 4644-1). C'est pourquoi `formation-securite-salarie-designe-competent` cite cet article tout en portant `autre` : le même renvoi produit deux périodicités, parce que le texte le dit ainsi.\n\nVersion en vigueur depuis le 2026-05-28, soit trois mois avant ce lot : à surveiller de près.\n\nCET ARTICLE PORTE LUI-MÊME UN RENVOI D'INTERVALLE, ET IL EST NOMMÉ PLUTÔT QUE TU. Sa première phrase renvoie aux articles `L. 6351-1 à L. 6351-8` pour l'enregistrement de l'organisme de formation. Ces huit articles N'ONT PAS ÉTÉ OUVERTS. Ils règlent le régime de déclaration d'activité des organismes de formation, s'adressent à eux et non à l'employeur, et aucune obligation du référentiel ne s'y appuie — mais c'est un constat de portée, pas une lecture, et c'est exactement la nuance que ce lot a appris à ne pas confondre : c'est en ne lisant qu'un terme du renvoi de L. 4644-1 qu'il avait effacé une périodicité.",
    },
    {
      ref: "L. 2315-16",
      intitule: "Temps de formation pris sur le temps de travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035621179",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le temps consacré aux formations du chapitre est pris sur le temps de travail, rémunéré comme tel, et n'est pas déduit des heures de délégation.",
      citationCle:
        "Le temps consacré aux formations prévues au présent chapitre est pris sur le temps de travail et est rémunéré comme tel. Il n'est pas déduit des heures de délégation.",
      statut: "sans_objet",
      motif:
        "Règle de rémunération du temps de formation, non un acte à porter au calendrier. Lu et consigné parce qu'il fait partie du renvoi de L. 4644-1 et qu'il fallait vérifier ce que ce renvoi emportait exactement : la réponse est qu'il emporte des conditions, pas un acte.",
    },
    {
      ref: "R. 4644-1",
      intitule:
        "Modalités de désignation du salarié compétent et moyens dont il dispose",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483822",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Les salariés désignés le sont après avis du comité social et économique s'il existe, disposent du temps nécessaire et des moyens requis pour exercer leurs missions, et ne peuvent subir de discrimination en raison de leurs activités de prévention.",
      citationCle:
        "Les personnes mentionnées au premier alinéa de l'article L. 4644-1 sont désignées après avis du comité social et économique s'il existe.",
      statut: "retenu",
      obligations: [
        "prevention-etablissement-salarie-designe",
        "formation-securite-salarie-designe-competent",
      ],
      reserve:
        "C'est cet article qui établit que le salarié compétent est DÉSIGNÉ et non élu — le point qui rend la condition de renouvellement de L. 2315-17, écrite pour des « représentants » exerçant un « mandat », inapplicable à lui. Le temps et les moyens dont il doit disposer, comme la protection contre la discrimination, ne sont portés par aucune obligation : ce sont des conditions d'exercice que l'outil ne trace pas, au même titre que « après avis du médecin du travail » ailleurs.",
    },
    {
      ref: "L. 1321-1",
      intitule: "Contenu du règlement intérieur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006901432",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le règlement intérieur est un document écrit par lequel l'employeur fixe exclusivement les mesures d'application de la réglementation en santé et sécurité, les conditions de participation des salariés au rétablissement de conditions de travail protectrices, et les règles générales de discipline.",
      citationCle:
        "1° Les mesures d'application de la réglementation en matière de santé et de sécurité dans l'entreprise ou l'établissement, notamment les instructions prévues à l'article L. 4122-1 ;",
      statut: "retenu",
      obligations: ["prevention-etablissement-reglement-interieur"],
      reserve:
        "Le 3° — discipline, nature et échelle des sanctions — relève du droit du travail non-SST, hors périmètre déclaré du produit. L'obligation encodée porte le seul volet santé-sécurité, et son libellé le dit.",
    },
    {
      ref: "L. 1311-2",
      intitule: "Établissement obligatoire du règlement intérieur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038610176",
      versionEnVigueur: "2020-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'établissement d'un règlement intérieur est obligatoire à partir de cinquante salariés, au terme d'un délai de douze mois à compter du franchissement du seuil.",
      citationCle:
        "L'établissement d'un règlement intérieur est obligatoire dans les entreprises ou établissements employant au moins cinquante salariés. L'obligation prévue au premier alinéa s'applique au terme d'un délai de douze mois à compter de la date à laquelle le seuil de cinquante salariés a été atteint, conformément à l'article L. 2312-2.",
      statut: "retenu",
      obligations: ["prevention-etablissement-reglement-interieur"],
      reserve:
        "Cet article porte le SEUIL, pas le contenu : il ne suffirait pas à fonder une obligation dans un produit qui ne couvre que la santé-sécurité. Il est cité en contexte derrière L. 1321-1. Le délai de douze mois n'est pas calculé, pour la même raison que sur L. 2311-2 : le modèle ne porte pas la date de franchissement.",
    },
  ],
};
