// Corpus : code du travail — éclairage des lieux de travail (section 1 du
// chapitre III, R. 4223-1 à R. 4223-12).
//
// POURQUOI CE FICHIER EXISTE. `R. 4223-4` est cité au dirigeant à deux
// endroits — l'aide du champ « dernières mesures physiques » de l'écran de
// cotation, et le PDF du DUERP, qui est remis à des tiers — sans qu'aucun
// corpus l'ait ouvert. La consigne était d'ouvrir le CHAPITRE et pas seulement
// l'article ; c'est ce qui a rendu `R. 4223-11`, que le référentiel ignorait.
//
// POURQUOI PAS DANS `arrete-2011-12-14-eclairage.ts`, QUI PORTE DÉJÀ LE MOT
// « ÉCLAIRAGE ». Parce que ce n'est pas le même objet. Cet arrêté-là régit
// l'ÉCLAIRAGE DE SÉCURITÉ — celui qui prend le relais quand le courant tombe,
// pris pour l'application de R. 4227-14, et sa portée le dit. La section 1 du
// chapitre III régit l'éclairage ORDINAIRE : combien de lux au plan de travail
// pendant que les gens travaillent. Y ranger ces douze articles aurait fait de
// sa portée un mensonge, pour la raison exacte que `code-travail-secours.ts`
// expose en tête.
//
// CE QUE LA LECTURE DU CHAPITRE A RENDU, ET QUE LA LECTURE DE L'ARTICLE SEUL
// AURAIT MANQUÉ. `R. 4223-11` fait FIXER PAR L'EMPLOYEUR des règles d'entretien
// périodique du matériel d'éclairage, consignées dans un document communiqué au
// comité social et économique. C'est un écrit permanent, exactement de la même
// espèce que la consigne de ventilation de `R. 4222-21`. `R. 4224-17`,
// dépouillé le 2026-09-01, l'agrège nommément au dossier de maintenance des
// lieux de travail (« la consigne et les documents prévus en matière
// d'aération, d'assainissement et d'éclairage aux articles R. 4222-21 et
// R. 4223-11 »), et sa réserve relevait le premier des deux sans voir le
// second.
//
// ÉTAT AU 2026-09-04, ET LES DEUX MOITIÉS ONT BOUGÉ. `R. 4223-11` EST ENCODÉ —
// `eclairage-etablissement-regles-entretien`, porteur établissement, état
// permanent, `pieceAttendue` nommée —, et la réserve de `R. 4224-17` est
// corrigée : elle nomme désormais les deux documents et dit lequel des deux
// reste dehors. C'est `R. 4222-21`, ~~toujours `obligation_manquante`~~ —
// [2026-09-20 : encodé, `aeration-etablissement-consigne-utilisation` ; la
// phrase qui suit ne vaut plus pour aucun des deux.] La phrase
// « trois textes le nomment, aucune obligation ne le réclame », qui tenait ici
// depuis le 2026-09-02, ne vaut plus que pour la consigne de ventilation.
//
// OÙ PASSE LA LIGNE ENTRE `sans_objet` ET `obligation_manquante` DANS CE
// FICHIER, parce qu'elle est discutable et qu'il vaut mieux l'écrire que la
// laisser deviner. Les articles qualitatifs — « éviter la fatigue visuelle »,
// « autant que possible », « dispositions appropriées », « adapté à la nature
// des travaux » — sont `sans_objet` : ils n'ont ni acte, ni pièce, ni seuil
// qu'un tiers puisse constater, et rien n'y entrerait dans un registre sans
// devenir une case cochée. Sortent du lot les deux articles qui exigent
// quelque chose de CONSTATABLE : `R. 4223-4`, qui chiffre des lux mesurés au
// plan de travail, et `R. 4223-11`, qui exige un document écrit. `R. 4223-6`
// chiffre lui aussi — un rapport de 1 à 5 —, et il reste `sans_objet` : sa
// justification est dans son entrée, et si on la juge mauvaise, c'est une
// troisième `obligation_manquante` qu'il faut inscrire, pas une des deux autres
// qu'il faut retirer.
//
// CE QUE CE CORPUS NE COUVRE PAS. Le chapitre III s'intitule « Éclairage,
// AMBIANCE THERMIQUE » et court jusqu'à R. 4223-15 ; sa section 2 (ambiance
// thermique) n'est pas ouverte ici. C'est la famille que le décret
// n° 2025-482 du 27 mai 2025 a remuée — celui dont `types.ts` raconte qu'il
// est entré dans le dépôt par la porte de R. 4225-2 et que personne n'avait
// ouvert. Il n'est toujours pas ouvert, et ce n'est pas ce lot qui s'en
// charge : le dire ici vaut mieux que de laisser croire que « chapitre III »
// est fait.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-02.

import type { Corpus } from "./types";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

export const CODE_TRAVAIL_ECLAIRAGE: Corpus = {
  id: "code-travail-eclairage",
  intitule: "Code du travail — éclairage des lieux de travail",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018488934/",
  etendue: "integral",
  portee:
    "Les douze articles de la section 1 « Éclairage » du chapitre III (éclairage, ambiance thermique) du titre II du livre II : le champ (R. 4223-1), les buts de l'éclairage (R. 4223-2), la lumière naturelle (R. 4223-3), le TABLEAU DES NIVEAUX D'ÉCLAIREMENT MINIMAUX en lux (R. 4223-4), l'adaptation au travail à exécuter (R. 4223-5), le rapport de 1 à 5 entre zones (R. 4223-6), la protection contre le rayonnement solaire (R. 4223-7), l'éblouissement et l'effet stroboscopique (R. 4223-8), les effets thermiques et le risque de brûlure (R. 4223-9), les organes de commande (R. 4223-10), l'ENTRETIEN PÉRIODIQUE DU MATÉRIEL et son document (R. 4223-11), et l'exclusion des opérations de bâtiment et de génie civil (R. 4223-12). Tous s'appliquent à tout employeur, sans condition d'effectif ni de classement ERP. « Integral » porte sur la SECTION 1 : la section 2 du même chapitre (ambiance thermique, R. 4223-13 à R. 4223-15) n'est pas ouverte. À ne pas confondre avec l'ÉCLAIRAGE DE SÉCURITÉ, qui relève de R. 4227-14 et de l'arrêté du 14 décembre 2011, dépouillés ailleurs.",
  articles: [
    {
      ref: "R. 4223-1",
      intitule: "Champ d'application des règles d'éclairage",
      url: ART("LEGIARTI000018532271"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Article de champ : il dit à quoi s'appliquent les onze suivants — les locaux de travail et leurs dépendances, passages et escaliers compris ; les espaces extérieurs où sont accomplis des travaux permanents ; les zones et voies de circulation extérieures empruntées habituellement pendant les heures de travail.",
      citationCle:
        "Les dispositions de la présente section fixent les règles relatives à l'éclairage et à l'éclairement : 1° Des locaux de travail et de leurs dépendances, notamment les passages et escaliers ; 2° Des espaces extérieurs où sont accomplis des travaux permanents ; 3° Des zones et voies de circulation extérieures empruntées de façon habituelle pendant les heures de travail.",
      statut: "sans_objet",
      motif:
        "Article de champ : il ne prescrit rien à personne. Il est ici parce que R. 4223-4 ne se lit pas sans lui — le tableau des lux ne vaut que « dans les lieux mentionnés à l'article R. 4223-1 », et ses trois lignes extérieures (10 et 40 lux) viennent de ses 2° et 3°.",
    },
    {
      ref: "R. 4223-2",
      intitule: "Buts assignés à l'éclairage",
      url: ART("LEGIARTI000018532269"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Assigne deux buts à l'éclairage : éviter la fatigue visuelle et les affections de la vue qui en résultent, et permettre de déceler les risques perceptibles par la vue.",
      citationCle:
        "L'éclairage est assuré de manière à : 1° Eviter la fatigue visuelle et les affections de la vue qui en résultent ; 2° Permettre de déceler les risques perceptibles par la vue.",
      statut: "sans_objet",
      motif:
        "Obligation de but, sans acte, sans pièce et sans valeur constatable. Ce qu'elle exige concrètement est chiffré par R. 4223-4 et R. 4223-6, qui sont les articles à regarder ; celui-ci en donne la raison, pas la mesure.",
    },
    {
      ref: "R. 4223-3",
      intitule: "Lumière naturelle",
      url: ART("LEGIARTI000018532267"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les locaux de travail disposent autant que possible d'une lumière naturelle suffisante.",
      citationCle:
        "Les locaux de travail disposent autant que possible d'une lumière naturelle suffisante.",
      statut: "sans_objet",
      motif:
        "« Autant que possible » : aucune exigence opposable n'en sort, et le tableau de R. 4223-4 prévoit expressément le cas des locaux aveugles affectés à un travail permanent (200 lux), ce qui confirme que l'absence de lumière naturelle n'est pas un manquement.",
    },
    {
      ref: "R. 4223-4",
      intitule: "Niveaux d'éclairement minimaux, en lux",
      url: ART("LEGIARTI000018532265"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Fixe, pendant la présence des travailleurs, des niveaux d'éclairement minimaux mesurés au plan de travail ou, à défaut, au sol : 40 lux pour les voies de circulation intérieures, 60 pour les escaliers et entrepôts, 120 pour les locaux de travail, vestiaires et sanitaires, 200 pour les locaux aveugles affectés à un travail permanent, 10 pour les zones et voies de circulation extérieures, 40 pour les espaces extérieurs où sont accomplis des travaux permanents.",
      citationCle:
        "Pendant la présence des travailleurs dans les lieux mentionnés à l'article R. 4223-1, les niveaux d'éclairement mesurés au plan de travail ou, à défaut, au sol, sont au moins égaux aux valeurs indiquées dans le tableau suivant : [voies de circulation intérieures 40 lux ; escaliers et entrepôts 60 lux ; locaux de travail, vestiaires, sanitaires 120 lux ; locaux aveugles affectés à un travail permanent 200 lux ; zones et voies de circulation extérieures 10 lux ; espaces extérieurs où sont accomplis des travaux permanents 40 lux].",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "L'ARTICLE EST CITÉ AU DIRIGEANT ET N'EST PORTÉ PAR RIEN. Il s'affiche sur l'écran de cotation du DUERP et il est IMPRIMÉ DANS LE PDF remis à des tiers, comme « texte de référence pour les mesures physiques » ; aucune obligation du référentiel ne s'y adosse. La citation est exacte — c'est bien lui qui porte les seuils d'éclairement — mais elle est présentée comme une aide à la cotation là où l'article impose une obligation de résultat à tout employeur, sans seuil d'effectif.\n\nCE QUI LE BLOQUE : il n'a ni périodicité, ni pièce, ni acte. Aucun texte n'impose de mesurer l'éclairement à intervalle, à la différence du bruit, où R. 4433-2 chiffre cinq ans. Le porter en état permanent auto-déclaré donnerait une case à cocher à vie sur une valeur que le dirigeant ne mesure pas et ne peut pas produire ; ce serait répondre en apparence. La voie qui l'ouvrirait n'est pas le calendrier de conformité mais le DUERP lui-même — le champ « dernières mesures physiques » existe déjà et n'est rattaché à aucune exigence.",
    },
    {
      ref: "R. 4223-5",
      intitule: "Adaptation de l'éclairement au travail à exécuter",
      url: ART("LEGIARTI000018532263"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Dans les zones de travail, le niveau d'éclairement est adapté à la nature et à la précision des travaux à exécuter.",
      citationCle:
        "Dans les zones de travail, le niveau d'éclairement est adapté à la nature et à la précision des travaux à exécuter.",
      statut: "sans_objet",
      motif:
        "Règle d'adaptation sans valeur chiffrée : elle rehausse le plancher de R. 4223-4 selon le travail, sans dire de combien. Rien à inscrire au calendrier, et rien qu'un tiers puisse constater sans qualifier lui-même la précision des travaux.",
    },
    {
      ref: "R. 4223-6",
      intitule: "Rapport des niveaux d'éclairement en éclairage artificiel",
      url: ART("LEGIARTI000018532261"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "En éclairage artificiel, le rapport entre l'éclairement de la zone de travail et l'éclairement général d'un même local est compris entre 1 et 5, et il en va de même entre locaux contigus en communication.",
      citationCle:
        "En éclairage artificiel, le rapport des niveaux d'éclairement, dans un même local, entre celui de la zone de travail et l'éclairement général est compris entre 1 et 5. Il en est de même pour le rapport des niveaux d'éclairement entre les locaux contigus en communication.",
      statut: "sans_objet",
      motif:
        "CHIFFRÉ COMME R. 4223-4, ET POURTANT CLASSÉ AUTREMENT : il faut donc dire pourquoi. Ce rapport est une propriété de l'INSTALLATION, arrêtée quand on décide où mettre les luminaires ; il ne se dégrade pas avec l'usage comme un niveau d'éclairement, et il ne se constate pas au plan de travail — il se calcule entre deux mesures. R. 4223-12 l'exclut d'ailleurs des opérations de bâtiment et de génie civil, ce que le tableau de R. 4223-4 ne subit pas : le législateur lui-même le range du côté des règles d'aménagement.\n\nLA FRONTIÈRE EST DISCUTABLE, et si on la juge mal placée, la conséquence est d'inscrire cet article comme TROISIÈME obligation manquante de ce corpus — pas de faire redescendre R. 4223-4 ou R. 4223-11.",
    },
    {
      ref: "R. 4223-7",
      intitule: "Protection contre le rayonnement solaire gênant",
      url: ART("LEGIARTI000018532259"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les postes de travail situés à l'intérieur des locaux sont protégés du rayonnement solaire gênant, soit par la conception des ouvertures, soit par des protections fixes ou mobiles appropriées.",
      citationCle:
        "Les postes de travail situés à l'intérieur des locaux de travail sont protégés du rayonnement solaire gênant soit par la conception des ouvertures, soit par des protections fixes ou mobiles appropriées.",
      statut: "sans_objet",
      motif:
        "Règle d'aménagement qualitative — « gênant », « appropriées » —, sans acte, sans pièce et sans rythme. À ne pas confondre avec la protection contre la CHALEUR, qui relève de la section 2 du même chapitre et du décret n° 2025-482 du 27 mai 2025, ni l'une ni l'autre ouvertes ici.",
    },
    {
      ref: "R. 4223-8",
      intitule: "Éblouissement, rendu des couleurs, effet stroboscopique",
      url: ART("LEGIARTI000018532257"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Trois exigences de qualité de l'éclairage : protéger contre l'éblouissement et la fatigue visuelle dus aux fortes luminances ou aux contrastes entre surfaces voisines, assurer un rendu des couleurs en rapport avec l'activité sans compromettre la sécurité, et éviter que les fluctuations de la lumière soient perceptibles ou produisent un effet stroboscopique.",
      citationCle:
        "Les dispositions appropriées sont prises pour protéger les travailleurs contre l'éblouissement et la fatigue visuelle provoqués par des surfaces à forte luminance ou par des rapports de luminance trop importants entre surfaces voisines. Les sources d'éclairage assurent une qualité de rendu des couleurs en rapport avec l'activité prévue et ne doivent pas compromettre la sécurité des travailleurs. Les phénomènes de fluctuation de la lumière ne doivent pas être perceptibles ni provoquer d'effet stroboscopique.",
      statut: "sans_objet",
      motif:
        "Trois exigences de qualité, toutes qualitatives : « dispositions appropriées », « en rapport avec l'activité », « ne doivent pas être perceptibles ». Aucune valeur, aucun acte daté, aucune pièce. Le troisième alinéa vise un risque réel sur machine tournante — l'effet stroboscopique —, mais aucun des trois secteurs cibles n'en exploite.",
    },
    {
      ref: "R. 4223-9",
      intitule: "Effets thermiques des sources d'éclairage et risque de brûlure",
      url: ART("LEGIARTI000018532255"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les travailleurs ne doivent pas être incommodés par les effets thermiques du rayonnement des sources d'éclairage, et ces sources sont aménagées ou installées de façon à éviter tout risque de brûlure.",
      citationCle:
        "Toutes dispositions sont prises afin que les travailleurs ne puissent se trouver incommodés par les effets thermiques dus au rayonnement des sources d'éclairage mises en œuvre. Les sources d'éclairage sont aménagées ou installées de façon à éviter tout risque de brûlure.",
      statut: "sans_objet",
      motif:
        "Règle d'installation qualitative, sans acte, sans pièce et sans rythme : elle se solde une fois pour toutes au montage du luminaire et rien n'y revient. Aucune échéance n'en sort.",
    },
    {
      ref: "R. 4223-10",
      intitule: "Organes de commande d'éclairage",
      url: ART("LEGIARTI000018532253"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les organes de commande d'éclairage sont facilement accessibles ; dans les locaux aveugles, ils sont munis de voyants lumineux.",
      citationCle:
        "Les organes de commande d'éclairage sont facilement accessibles. Dans les locaux aveugles, ils sont munis de voyants lumineux.",
      statut: "sans_objet",
      motif:
        "Règle d'aménagement ponctuelle, sans récurrence : un interrupteur accessible et, en local aveugle, un voyant. Elle se constate d'un regard et ne revient jamais. Rien à porter au calendrier ni à documenter.",
    },
    {
      ref: "R. 4223-11",
      intitule:
        "Entretien périodique du matériel d'éclairage et document communiqué au CSE",
      url: ART("LEGIARTI000036483672"),
      versionEnVigueur: "2018-01-01",
      modifiePar: {
        texte: "Décret n° 2017-1819 du 29 décembre 2017 - art. 3",
        url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036339771",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Trois choses : le matériel d'éclairage est installé de manière à pouvoir être entretenu aisément ; L'EMPLOYEUR FIXE LES RÈGLES D'ENTRETIEN PÉRIODIQUE de ce matériel en vue d'assurer le respect de la section ; ces règles sont consignées dans un document communiqué aux membres du comité social et économique.",
      citationCle:
        "Le matériel d'éclairage est installé de manière à pouvoir être entretenu aisément. L'employeur fixe les règles d'entretien périodique du matériel en vue d'assurer le respect des dispositions de la présente section. Les règles d'entretien sont consignées dans un document qui est communiqué aux membres du comité social et économique.",
      statut: "retenu",
      obligations: ["eclairage-etablissement-regles-entretien"],
      historique:
        "ENCODÉ LE 2026-09-04, DEUX JOURS APRÈS AVOIR ÉTÉ LU. L'entrée qui précédait celle-ci disait « Rien ne bloque techniquement : c'est un article qu'on n'avait pas lu » ; elle avait raison, et l'obligation a demandé une heure. `eclairage-etablissement-regles-entretien` porte le document : porteur établissement, `nature: \"etat_permanent\"`, `periodicite: \"autre\"`, `pieceAttendue` nommée. Elle a fallu créer un domaine — `eclairage` —, le référentiel n'en ayant aucun pour l'éclairage ORDINAIRE.\n\nLA RÉSERVE SUR LE CSE EST TRANCHÉE, ET DANS LE SENS LITTÉRAL QUE CETTE ENTRÉE ANNONÇAIT. L'article fait deux phrases distinctes : la deuxième impose de FIXER les règles, sans mentionner aucune instance ; la troisième impose de COMMUNIQUER le document aux membres du comité social et économique. Seule la troisième suppose un CSE, donc onze salariés. L'obligation encodée ne porte donc AUCUN `effectifMin` : le poser aurait retiré l'écrit à la quasi-totalité de la cible du produit sur la foi d'une phrase qui ne le dit pas. Même lecture que celle retenue pour `R. 4121-4`, dont la seconde phrase renvoie au règlement intérieur sans réserver l'obligation aux établissements qui en ont un.\n\nCE QUI RESTE DEHORS, ET IL FAUT LE SAVOIR : le RYTHME de l'entretien lui-même. L'article ne l'écrit pas — c'est l'employeur qui le fixe — et le produit ne l'invente pas. L'obligation encodée est l'ÉCRIT, pas l'entretien : un dirigeant qui déclare son document en place n'a pas déclaré avoir entretenu ses luminaires. La distinction est écrite dans le libellé et dans la description de la ligne.\n\n~~ET LE JUMEAU N'EST TOUJOURS PAS PORTÉ. `R. 4222-21` […] reste `obligation_manquante` […] le référentiel en porte un.~~ [2026-09-20 : il l'est — `aeration-etablissement-consigne-utilisation`. Des deux documents que `R. 4224-17` agrège nommément, le référentiel porte désormais les deux ; cette réserve n'a plus rien d'ouvert et passe en `historique`.] Sa réserve, corrigée le même jour, le dit désormais dans les deux sens.",
    },
    {
      ref: "R. 4223-12",
      intitule: "Exclusion des opérations de bâtiment et de génie civil",
      url: ART("LEGIARTI000018532249"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Écarte quatre dispositions de la section — R. 4223-6, R. 4223-7, R. 4223-8 premier alinéa et R. 4223-10 — pour les opérations de bâtiment et de génie civil définies à l'article R. 4534-1.",
      citationCle:
        "Les dispositions des articles R. 4223-6, R. 4223-7, R. 4223-8, premier alinéa, et R. 4223-10 ne sont pas applicables aux opérations de bâtiment et de génie civil définies à l'article R. 4534-1.",
      statut: "sans_objet",
      motif:
        "Article d'exclusion : il ne prescrit rien, il retire. Sans effet pour la cible, qui n'exploite pas de chantier de bâtiment ou de génie civil. Il est ici pour une raison de lecture : c'est lui qui montre que R. 4223-4 et R. 4223-11 ne souffrent AUCUNE exception, là où quatre autres articles de la section en souffrent une.",
    },
  ],
};
