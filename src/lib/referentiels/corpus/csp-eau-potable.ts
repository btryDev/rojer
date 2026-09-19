// Corpus : code de la santé publique — protection du réseau d'eau potable
// contre les retours d'eau, et l'arrêté qui la chiffre.
//
// POURQUOI CE FICHIER EXISTE. Un guide professionnel (Qualiconsult, janvier
// 2022) annonce un « contrôle annuel des disconnecteurs » fondé sur
// `R. 1321-57` du code de la santé publique. Le dépôt n'en avait aucune trace :
// zéro occurrence de « disconnecteur » et de « 1321-57 » dans tout `src/` au
// 2026-09-02. Le texte a donc été ouvert à la source pour établir ce qu'il dit,
// et il ne dit pas ça.
//
// **`R. 1321-57` NE PORTE AUCUNE PÉRIODICITÉ, ET NE S'ADRESSE PAS À
// L'EXPLOITANT.** Il interdit qu'un réseau intérieur perturbe le réseau
// auquel il est raccordé, renvoie à un arrêté le soin de dire où placer des
// dispositifs de protection, et conclut : « Il appartient aux propriétaires
// des installations de mettre en place et d'entretenir ces dispositifs. » Ni
// « annuel », ni « disconnecteur » n'y figurent. Le guide a cité l'article du
// principe pour une périodicité qui vit deux articles plus loin et dans un
// arrêté — exactement le piège du renvoi que ce dépôt a déjà rencontré.
//
// OÙ EST LE RYTHME, RÉELLEMENT. `R. 1321-61` pose que les dispositifs de
// protection « doivent être vérifiés et entretenus » et renvoie, lui aussi, à
// un arrêté. Cet arrêté existe depuis le 10 septembre 2021 et il est entré en
// vigueur le 1er janvier 2023 : ses articles 9 et 10 chiffrent une vérification
// ET un entretien « a minima à fréquence annuelle », et l'article 10 nomme
// expressément les disconnecteurs. C'est là, et seulement là, que « annuel »
// est écrit.
//
// LA CLAUSE QUI CHANGE TOUT, ET QUE LA LITTÉRATURE PROFESSIONNELLE OMET.
// L'article 2 de cet arrêté borne tout le reste : il ne s'applique qu'aux
// bâtiments « dont les réseaux de distribution d'eau sont mis en place ou
// rénovés totalement à compter du 1er janvier 2023 ». Un restaurant, un
// commerce ou un bureau dont la plomberie est antérieure et n'a pas été
// intégralement refaite depuis n'entre donc pas dans le champ de l'obligation
// annuelle — `R. 1321-61` continue d'exiger que les dispositifs soient
// « vérifiés et entretenus », sans qu'aucun texte national ne dise à quel
// rythme. Aucune disposition transitoire ne rattrape les réseaux existants :
// l'article 13 fixe l'entrée en vigueur, l'article 14 la publication, et il n'y
// a pas d'article d'abrogation — aucun arrêté antérieur n'avait été pris sur le
// fondement de `R. 1321-61`.
//
// À QUI, ALORS ? Au « propriétaire des réseaux intérieurs de distribution »,
// que l'article 1er III de l'arrêté définit comme « le responsable juridique du
// fonctionnement des réseaux intérieurs » et qui, pour un bâtiment existant,
// « peut s'agir du propriétaire du bâtiment, du responsable d'établissement ou
// de l'exploitant SI CETTE RESPONSABILITÉ LUI A ÉTÉ CONTRACTUELLEMENT
// DÉLÉGUÉE ». L'exploitant est donc un destinataire possible, jamais un
// destinataire de plein droit — et le produit ne détient aucun attribut de bail
// qui permette de trancher.
//
// CE QUE CE CORPUS NE COUVRE PAS. La sous-section 3 du chapitre « Eaux
// potables » compte une soixantaine d'articles ; seul son paragraphe 4
// (« Entretien et fonctionnement des installations ») est ici, intégralement,
// plus les deux articles qu'il cite et sans lesquels il ne se lit pas
// (`R. 1321-43`, qui définit les trois types d'installations, et `R. 1321-53`,
// que `R. 1321-61` vise à côté de `R. 1321-57`). Le contrôle sanitaire de
// l'eau (paragraphe 3), les matériaux au contact de l'eau et le régime des
// légionelles ne sont pas ouverts. Le carnet sanitaire du produit traite les
// légionelles par un autre chemin.
//
// LE RÈGLEMENT SANITAIRE DÉPARTEMENTAL N'EST PAS DANS CE CORPUS, et c'est une
// limite à connaître. Son article 16.3 impose historiquement un contrôle des
// dispositifs anti-retour ; c'est un arrêté préfectoral, il varie d'un
// département à l'autre et ne figure pas sur Légifrance. Il ne peut donc pas
// fonder une entrée du référentiel, et le produit ne saurait pas lequel
// appliquer sans connaître le département. Rien n'a été supposé de son contenu.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-02.

import type { Corpus } from "./types";

const URL_PARAGRAPHE_4 =
  "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072665/LEGISCTA000006198950/";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

export const CSP_EAU_POTABLE: Corpus = {
  id: "csp-eau-potable",
  intitule:
    "Code de la santé publique — entretien et fonctionnement des installations de distribution d'eau",
  url: URL_PARAGRAPHE_4,
  etendue: "integral",
  portee:
    "Les HUIT articles du paragraphe 4 « Entretien et fonctionnement des installations » (R. 1321-55 à R. 1321-61, R. 1321-55-1 compris) y sont tous, plus UN TROISIÈME VOISIN AJOUTÉ LE 2026-09-02 POUR UNE AUTRE RAISON QUE LES DEUX SUIVANTS — R. 1321-23, qui n'appartient pas au paragraphe 4 mais que l'écran « carnet sanitaire » cite au dirigeant : ouvert, il s'adresse à la personne responsable de la production ou de la distribution d'eau et non à l'exploitant, et son entrée est là pour clore la question plutôt que pour couvrir un texte —, plus les deux articles voisins sans lesquels le paragraphe ne se lit pas : R. 1321-43, qui distingue le réseau PUBLIC (1° et 2°) du réseau INTÉRIEUR (3°) — la distinction dont dépend tout le reste —, et R. 1321-53, que R. 1321-61 vise à côté de R. 1321-57. « Integral » porte sur le paragraphe 4, pas sur le chapitre « Eaux potables » : le contrôle sanitaire de l'eau, les matériaux au contact de l'eau et le régime des légionelles ne sont pas ouverts. Deux articles seulement chiffrent un rythme, et aucun n'est celui que le guide professionnel désigne : R. 1321-56 (réservoirs vidés, nettoyés et désinfectés au moins une fois par an) vise les réseaux PUBLICS et s'adresse à la personne responsable de la production ou de la distribution d'eau ; R. 1321-60 (entretien des réservoirs et bâches de stockage, au moins une fois par an) vise bien le réseau intérieur. La périodicité des DISPOSITIFS DE PROTECTION, elle, n'est dans aucun article du Code : R. 1321-61 la renvoie à un arrêté, dépouillé à part.",
  articles: [
    {
      ref: "R. 1321-23",
      intitule:
        "Surveillance permanente de la qualité de l'eau par la personne responsable de la production ou de la distribution",
      url: ART("LEGIARTI000043182358"),
      versionEnVigueur: "2023-01-01",
      modifiePar: {
        texte: "Décret n° 2022-1720 du 29 décembre 2022, art. 1er",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046839457",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Impose à la PERSONNE RESPONSABLE DE LA PRODUCTION OU DE LA DISTRIBUTION D'EAU une surveillance permanente de la qualité des eaux destinées à la consommation humaine, comprenant notamment la vérification régulière des mesures de protection de la ressource et du fonctionnement des installations, un programme de tests et d'analyses sur points critiques, et LA TENUE D'UN FICHIER SANITAIRE recueillant l'ensemble des informations collectées. S'y ajoutent la vérification de l'efficacité du traitement de désinfection et, au-dessus de 10 000 habitants desservis, une étude de vulnérabilité transmise au préfet.",
      citationCle:
        "la personne responsable de la production ou de la distribution d'eau est tenue de mettre en œuvre une surveillance permanente afin de garantir la qualité des eaux destinées à la consommation humaine. Cette surveillance comprend notamment : 1° Une vérification régulière des mesures prises pour la protection de la ressource utilisée et du fonctionnement des installations ; 2° Un programme de tests et d'analyses effectués sur des points jugés critiques déterminés en fonction des dangers et des risques identifiés [...] ; 3° La tenue d'un fichier sanitaire recueillant l'ensemble des informations collectées à ce titre.",
      statut: "sans_objet",
      motif:
        "RÉFÉRENCE ÉCARTÉE APRÈS LECTURE, ET C'EST L'USAGE MÊME DE CE STATUT. L'écran « carnet sanitaire » affiche ce numéro au dirigeant, en badge, à côté de l'arrêté du 1er février 2010. Ouvert, l'article ne s'adresse pas à lui : son destinataire est la « personne responsable de la production ou de la distribution d'eau », c'est-à-dire l'exploitant du réseau PUBLIC au sens du 1° de R. 1321-43 — la distinction que ce corpus a été écrit pour tenir. Un restaurant, un commerce ou un bureau raccordé au réseau public tient un réseau INTÉRIEUR (3° du même article) et n'est pas cette personne.\n\nCE QUI A VRAISEMBLABLEMENT PRODUIT LA CITATION EST UN HOMONYME, et il vaut d'être nommé pour que le détour ne se refasse pas. Le 3° de cet article impose « un fichier sanitaire » ; l'article 3 de l'arrêté du 1er février 2010, affiché juste au-dessus sur le même écran, impose « un fichier sanitaire des installations ». Deux documents différents, deux destinataires différents : celui-ci recueille les analyses de qualité de l'eau distribuée, celui-là consigne la surveillance des températures et des légionelles des réseaux d'eau chaude sanitaire du bâtiment. C'est le second que le module « carnet sanitaire » du produit sert. Le badge peut donc être retiré sans rien perdre — la référence utile de cet écran est l'arrêté, et elle y est déjà.\n\nLE CAS QUI RESTE, ET QUI N'EST PAS TRANCHÉ ICI : un établissement alimenté par sa propre ressource — un puits, un forage — EST la personne responsable de la production, et l'article lui devient alors pleinement opposable. Le produit ne détient aucun attribut disant d'où vient l'eau, et le régime d'autorisation de ces installations (R. 1321-6 et suivants) n'est pas ouvert. Ce n'est pas un manque de couverture déclaré : c'est une question laissée ouverte, écrite ici pour qu'elle se voie.",
    },
    {
      ref: "R. 1321-43",
      intitule:
        "Installations de production, de distribution et de conditionnement — les trois types",
      url: ART("LEGIARTI000046840708"),
      versionEnVigueur: "2023-01-01",
      modifiePar: {
        texte: "Décret n° 2022-1720 du 29 décembre 2022, art. 1er",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046839457",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Article de définition : il range les installations d'eau destinée à la consommation humaine en trois catégories — 1° les réseaux publics de distribution, 2° les installations non raccordées à un réseau public, 3° le réseau intérieur de distribution équipant les immeubles desservis.",
      citationCle:
        "3° Le réseau intérieur de distribution comprenant l'installation privée de distribution, constituée des canalisations et des appareillages installés entre les robinets normalement utilisés pour la consommation humaine et le réseau public de distribution, lorsqu'ils ne relèvent pas de la personne responsable de la production ou de la distribution d'eau.",
      statut: "sans_objet",
      motif:
        "Définition pure : il ne prescrit rien à personne. Il est ici parce que tout le paragraphe 4 s'écrit par renvoi à ses trois alinéas, et que confondre le 1° (réseau public, à la charge du distributeur) avec le 3° (réseau intérieur, à la charge de celui qui tient le bâtiment) suffit à attribuer une obligation au mauvais destinataire — c'est très exactement l'erreur que le guide professionnel a commise.",
    },
    {
      ref: "R. 1321-53",
      intitule: "Dispositif de traitement complémentaire du réseau intérieur",
      url: ART("LEGIARTI000042292821"),
      versionEnVigueur: "2020-08-30",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Un réseau intérieur peut comporter un dispositif de traitement complémentaire de la qualité de l'eau, à condition que le consommateur final dispose aussi d'une eau froide non traitée ; un arrêté règle le sort des installations réalisées avant le 22 décembre 2001.",
      citationCle:
        "Le réseau intérieur de distribution mentionné au 3° de l'article R. 1321-43 peut comporter un dispositif de traitement complémentaire de la qualité de l'eau, sous réserve que le consommateur final dispose également d'une eau froide non soumise à ce traitement complémentaire.",
      statut: "sans_objet",
      motif:
        "Faculté, pas obligation : « peut comporter ». Il est au corpus parce que R. 1321-61 le vise à côté de R. 1321-57 — l'obligation de vérification et d'entretien porte sur les dispositifs de PROTECTION (R. 1321-57) ET de TRAITEMENT (R. 1321-53) —, et qu'un lecteur qui s'arrêterait au premier croirait le champ plus étroit qu'il n'est.",
    },
    {
      ref: "R. 1321-55",
      intitule:
        "Conception, réalisation et entretien des installations de distribution",
      url: ART("LEGIARTI000023860335"),
      versionEnVigueur: "2011-04-14",
      modifiePar: {
        texte: "Décret n° 2011-385 du 11 avril 2011, art. 1er",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les installations de distribution sont conçues, réalisées et entretenues de manière à empêcher l'introduction ou l'accumulation de tout ce qui dégraderait la qualité de l'eau ; elles doivent pouvoir être entièrement nettoyées, rincées, vidangées et désinfectées, et les parties réservées à un autre usage que la consommation humaine doivent être distinguées par des signes particuliers.",
      citationCle:
        "Les parties de réseau de distribution d'eau réservées à un autre usage que la consommation humaine doivent être distinguées de celles déterminées par la présente section au moyen de signes particuliers. Sur tout point de puisage accessible au public et délivrant une eau réservée à un autre usage que la consommation humaine, une information doit être apposée afin de signaler le danger encouru.",
      statut: "sans_objet",
      motif:
        "Obligation de résultat écrite au passif, sans destinataire nommé et sans aucun rythme : « conçues, réalisées et entretenues ». Elle n'ouvre aucun rendez-vous et ne se distingue pas, pour un exploitant, de l'obligation générale d'entretien du bâtiment. Son quatrième alinéa — signaler les points de puisage d'eau non potable accessibles au public — est repris et détaillé par l'article 8 de l'arrêté du 10 septembre 2021, où il est consigné.",
    },
    {
      ref: "R. 1321-55-1",
      intitule:
        "Évaluation des risques et surveillance des réseaux intérieurs par leur propriétaire",
      url: ART("LEGIARTI000046839690"),
      versionEnVigueur: "2023-01-01",
      modifiePar: {
        texte: "Décret n° 2022-1720 du 29 décembre 2022, art. 1er",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046839457",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le propriétaire du réseau intérieur élabore à sa charge une évaluation des risques et une surveillance des installations (programme de tests et d'analyses, vérification régulière des mesures prises, tenue à jour d'un fichier sanitaire), et prend sans délai les mesures de gestion si un risque pour la santé est mis en évidence.",
      citationCle:
        "Le présent article n'est pas applicable aux propriétaires du réseau intérieur de distribution d'eau fournissant moins de dix mètres cubes par jour en moyenne ou approvisionnant moins de cinquante personnes dans l'exercice d'une activité commerciale ou publique.",
      statut: "sans_objet",
      motif:
        "Obligation réelle, mais son dernier alinéa — cité ci-dessus — l'écarte pour les réseaux fournissant moins de dix mètres cubes par jour en moyenne OU approvisionnant moins de cinquante personnes, ce qui recouvre la quasi-totalité des restaurants, commerces et bureaux que le produit sert. La conjonction est « ou » : une seule des deux conditions suffit à écarter, et un bureau ou un commerce est sous le seuil de volume même quand il reçoit plus de cinquante personnes. Cette lecture du « ou » est une lecture — le verbatim est cité en entier pour qu'elle se conteste. Là où l'article s'applique, il ne chiffre aucun rythme (« vérification régulière ») et vise le propriétaire du réseau intérieur.",
    },
    {
      ref: "R. 1321-56",
      intitule:
        "Nettoyage et désinfection des réseaux publics — réservoirs, au moins une fois par an",
      url: ART("LEGIARTI000042293064"),
      versionEnVigueur: "2020-08-30",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les réseaux et installations des 1° et 2° de R. 1321-43 sont nettoyés, rincés et désinfectés avant toute mise ou remise en service, et leurs réservoirs vidés, nettoyés, rincés et désinfectés au moins une fois par an ; c'est la personne responsable de la production ou de la distribution d'eau qui en répond.",
      citationCle:
        "Les réservoirs équipant ces réseaux et installations doivent être vidés, nettoyés, rincés et désinfectés au moins une fois par an.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "Le seul « au moins une fois par an » du paragraphe 4 qui saute aux yeux, et il ne nous concerne pas : son champ est expressément « les réseaux et installations définis aux 1° et 2° de l'article R. 1321-43 », c'est-à-dire le réseau public et les installations non raccordées, et son destinataire est nommé trois fois — « la personne responsable de la production ou de la distribution d'eau », soit le service des eaux. RÉSERVE SUR L'EXCLUSION CHOISIE : le motif de `sans_destinataire_exploitant` énumère l'administration, la commission de sécurité, le maire et le préfet ; un distributeur d'eau n'est aucun des quatre. C'est son libellé — « ne s'adresse pas à l'exploitant » — qui est retenu, pas son énumération, et il faudra soit élargir le motif de l'exclusion, soit en ajouter une pour les destinataires privés tiers.",
    },
    {
      ref: "R. 1321-57",
      intitule:
        "Réseaux intérieurs et retours d'eau — l'article que le guide professionnel invoque",
      url: ART("LEGIARTI000046840694"),
      versionEnVigueur: "2023-01-01",
      modifiePar: {
        texte: "Décret n° 2022-1720 du 29 décembre 2022, art. 1er",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046839457",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Un réseau intérieur ne peut pas être alimenté par une ressource non autorisée, sauf dérogation du préfet, et ne doit pas pouvoir perturber le réseau auquel il est raccordé ni contaminer l'eau distribuée, notamment par retour d'eau ; un arrêté dit où placer des dispositifs de protection, et c'est aux propriétaires des installations de les mettre en place et de les entretenir.",
      citationCle:
        "Un arrêté des ministres chargés de la santé et de la construction, pris après avis de l'Agence nationale de sécurité sanitaire de l'alimentation, de l'environnement et du travail, définit les cas où il y a lieu de mettre en place des dispositifs de protection et les prescriptions techniques applicables à ces dispositifs. Il appartient aux propriétaires des installations de mettre en place et d'entretenir ces dispositifs.",
      statut: "sans_objet",
      motif:
        "RÉFÉRENCE ÉCARTÉE APRÈS LECTURE, et c'est le motif d'être de ce fichier. Un guide professionnel de janvier 2022 fonde sur cet article un « contrôle annuel des disconnecteurs ». Ouvert, il ne porte NI périodicité, NI le mot « disconnecteur », NI le mot « annuel » : c'est une règle de principe suivie d'un renvoi, et son unique phrase impérative désigne « les propriétaires des installations », pas l'exploitant. Le rythme vit deux articles plus loin (R. 1321-61) et, chiffré, dans l'arrêté du 10 septembre 2021 dépouillé à part. Six lignes ici épargnent le détour au prochain lecteur qui rencontrera la même citation.",
    },
    {
      ref: "R. 1321-58",
      intitule: "Hauteur piézométrique des réseaux intérieurs",
      url: ART("LEGIARTI000006909593"),
      versionEnVigueur: "2007-01-12",
      modifiePar: {
        texte: "Décret n° 2007-49 du 11 janvier 2007",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "La hauteur piézométrique de l'eau distribuée par un réseau intérieur doit être d'au moins trois mètres en tout point de mise à disposition à l'heure de pointe ; des surpresseurs et réservoirs de mise sous pression peuvent équiper les immeubles de plus de six étages. Ne s'applique pas aux installations existant avant le 7 avril 1995.",
      citationCle:
        "La hauteur piézométrique de l'eau distribuée par les réseaux intérieurs mentionnés au 3° de l'article R. 1321-43 doit, pour chaque réseau et en tout point de mise à disposition, être au moins égale à trois mètres, à l'heure de pointe de consommation.",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif:
        "Règle de dimensionnement du réseau, vérifiable à la conception et non exploitable en échéance : aucune opération périodique n'en découle. Sa clause de non-rétroactivité (installations antérieures au 7 avril 1995) et son alinéa sur les surpresseurs ont été lus en résumé, leur verbatim n'a pas été relevé ; la phrase citée est celle qui porte la règle.",
    },
    {
      ref: "R. 1321-59",
      intitule: "Interdiction de la mise à la terre par les canalisations d'eau",
      url: ART("LEGIARTI000042292806"),
      versionEnVigueur: "2020-08-30",
      modifiePar: {
        texte: "Décret n° 2020-1094 du 27 août 2020, art. 2",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Il est interdit d'utiliser les canalisations intérieures d'eau pour la mise à la terre des appareils électriques.",
      citationCle:
        "L'utilisation des canalisations intérieures d'eau pour la mise à la terre des appareils électriques est interdite.",
      statut: "sans_objet",
      motif:
        "Interdiction absolue, d'une seule phrase et sans exception : elle se constate lors de la vérification périodique des installations électriques et ne crée aucun rendez-vous propre. Le corpus électricité porte déjà cette vérification-là.",
    },
    {
      ref: "R. 1321-60",
      intitule:
        "Entretien des réservoirs et bâches de stockage du réseau intérieur — au moins une fois par an",
      url: ART("LEGIARTI000006909599"),
      versionEnVigueur: "2007-01-12",
      modifiePar: {
        texte: "Décret n° 2007-49 du 11 janvier 2007, art. 1er XXV et XXVI",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'entretien des réservoirs et des bâches de stockage équipant les réseaux intérieurs doit être réalisé et vérifié aussi souvent que nécessaire et au moins une fois par an.",
      citationCle:
        "L'entretien des réservoirs et des bâches de stockage équipant les réseaux intérieurs mentionnés au 3° de l'article R. 1321-43 doit être réalisé et vérifié aussi souvent que nécessaire et au moins une fois par an.",
      statut: "obligation_manquante",
      motif:
        "LA SEULE PÉRIODICITÉ ANNUELLE DU CODE QUI PORTE SUR LE RÉSEAU INTÉRIEUR, et elle n'est pas celle qu'on cherchait : elle vise les réservoirs et bâches de stockage, pas les dispositifs de protection. Elle est en vigueur depuis 2007, ne dépend d'aucun arrêté d'application et ne connaît pas la clause de date de l'arrêté du 10 septembre 2021 — donc elle vaut pour les bâtiments existants, contrairement à l'obligation annuelle de vérification des disconnecteurs. Rien ne l'encode : le produit n'a pas de catégorie d'équipement « réservoir ou bâche de stockage d'eau », et l'article est écrit au passif, ce qui laisse le porteur à déterminer. Le cas est rare dans les trois secteurs cibles — un réservoir tampon est une affaire d'immeuble haut ou de site à forte pointe —, rare n'est pas inexistant, et la conséquence d'un manque d'entretien est sanitaire.",
      bloquePar:
        "Aucune catégorie d'équipement « réservoir ou bâche de stockage d'eau » au référentiel ; et le porteur n'est pas déterminable — voir le blocage commun décrit sur l'article 9 de l'arrêté du 10 septembre 2021.",
    },
    {
      ref: "R. 1321-61",
      intitule:
        "Vérification et entretien des dispositifs de protection et de traitement",
      url: ART("LEGIARTI000023860325"),
      versionEnVigueur: "2011-04-14",
      modifiePar: {
        texte: "Décret n° 2011-385 du 11 avril 2011, art. 1er",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les dispositifs de protection et de traitement mentionnés aux articles R. 1321-53 et R. 1321-57 équipant les installations collectives de distribution doivent être vérifiés et entretenus ; un arrêté en définit les fréquences et les modalités.",
      citationCle:
        "Les dispositifs de protection et de traitement mentionnés aux articles R. 1321-53 et R. 1321-57 équipant les installations collectives de distribution doivent être vérifiés et entretenus. Un arrêté des ministres chargés de la santé et de la construction, pris après avis de l'Agence nationale de sécurité sanitaire de l'alimentation, de l'environnement et du travail, définit les fréquences et les modalités de la vérification et de l'entretien des dispositifs de protection.",
      statut: "sans_objet",
      motif:
        "L'ARTICLE QUI FONDE VRAIMENT LE CONTRÔLE — mais il ne le chiffre pas : « doivent être vérifiés et entretenus », puis renvoi exprès à un arrêté pour « les fréquences et les modalités ». C'est le renvoi type, celui que `sans_objet` est fait pour consigner. La dette correspondante est portée une seule fois, sur les articles 9 et 10 de l'arrêté du 10 septembre 2021 ; la doubler ici compterait deux fois la même obligation. À retenir : rien dans CET article ne limite l'obligation aux réseaux posés après 2023 — c'est l'arrêté qui introduit cette borne, et pour les réseaux antérieurs l'obligation subsiste donc sans fréquence écrite.",
    },
  ],
};

const URL_ARRETE =
  "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000044060748";

export const ARRETE_2021_09_10_RETOURS_EAU: Corpus = {
  id: "arrete-2021-09-10-retours-eau",
  intitule:
    "Arrêté du 10 septembre 2021 relatif à la protection des réseaux d'adduction et de distribution d'eau destinée à la consommation humaine contre les pollutions par retours d'eau",
  url: URL_ARRETE,
  etendue: "integral",
  portee:
    "Les quatorze articles de l'arrêté sont énumérés, CINQ ne sont pas dépouillés et se comptent comme tels : les articles 4 à 8, qui disent OÙ placer les dispositifs de protection et comment repérer les canalisations. Ils ont été parcourus, leur verbatim n'a pas été relevé, et deux au moins portent des obligations permanentes réelles — l'article 5 (protection au point de livraison de tout réseau intérieur raccordé) et l'article 8 (repérage des canalisations et signalisation « eau non potable » des points de puisage). Les neuf autres sont lus à la source. C'est le texte pris pour l'application de R. 1321-61 du code de la santé publique, et le seul de tout le dossier à écrire une périodicité : « a minima à fréquence annuelle », pour la vérification (art. 9) comme pour l'entretien (art. 10), l'article 10 nommant expressément les disconnecteurs. Son article 2 en borne la portée aux bâtiments dont les réseaux d'eau sont mis en place ou rénovés totalement à compter du 1er janvier 2023, et ses articles 9 V, 10 V et 12 II en écartent les parties privatives d'habitation. Aucun arrêté antérieur n'avait été pris sur le fondement de R. 1321-61 ; il n'y a donc rien à abroger et rien de transitoire, ce que confirment ses articles 13 et 14.",
  articles: [
    {
      ref: "Arrêté 10-09-2021 art. 1",
      intitule: "Définitions — dont celle du « propriétaire des réseaux intérieurs »",
      url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000044060763",
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Définit les types d'eaux, les cinq types de réseaux (RT1 à RT5), le retour d'eau, le point de livraison, le piquage, les dispositifs de protection, les équipements — et le destinataire de tout l'arrêté, le « propriétaire des réseaux intérieurs de distribution ».",
      citationCle:
        "propriétaire des réseaux intérieurs de distribution, le responsable juridique du fonctionnement des réseaux intérieurs de distribution et de leurs impacts sur la santé et la sécurité des usagers et des consommateurs. Le propriétaire des réseaux intérieurs peut notamment être le maître d'ouvrage dans le cas des bâtiments en cours de construction ou, pour les bâtiments existants, il peut s'agir du propriétaire du bâtiment, du responsable d'établissement ou de l'exploitant si cette responsabilité lui a été contractuellement déléguée.",
      statut: "sans_objet",
      motif:
        "Article de définitions, qui ne prescrit rien — mais c'est LUI qui décide si Rojer a quoi que ce soit à afficher. L'exploitant y est un destinataire possible, à deux conditions alternatives : être « responsable d'établissement », ou s'être vu déléguer la responsabilité par contrat. Le produit ne détient ni clause de bail ni qualification de ce genre, et la déduire du seul fait d'exploiter serait décider à la place du texte.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 2",
      intitule: "Champ d'application — la clause de date qui borne tout le reste",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'arrêté s'applique aux lieux ouverts au public, aux ERP, aux lieux de travail, aux bâtiments d'habitation collective et aux maisons individuelles, dont les réseaux d'eau sont mis en place ou rénovés totalement à compter du 1er janvier 2023 et raccordés au réseau d'eau destinée à la consommation humaine.",
      citationCle:
        "Sauf disposition contraire, le présent arrêté s'applique aux lieux ouverts au public, aux établissements recevant du public, aux lieux de travail, aux bâtiments d'habitation collective et aux maisons individuelles, dont les réseaux de distribution d'eau sont mis en place ou rénovés totalement à compter du 1er janvier 2023 et sont raccordés de façon permanente ou temporaire aux réseaux de distribution d'eau destinée à la consommation humaine.",
      statut: "sans_objet",
      motif:
        "Article de champ, donc sans prescription propre — et la phrase la plus importante du dossier. La littérature professionnelle annonce un contrôle annuel des disconnecteurs pour tout le monde ; cet article le réserve aux réseaux « mis en place ou rénovés totalement à compter du 1er janvier 2023 ». Un restaurant, un commerce ou un bureau à la plomberie antérieure et non intégralement refaite n'est pas dans le champ. La lecture a été poussée jusqu'aux articles 13 et 14 pour chercher une disposition transitoire qui rattraperait l'existant : il n'y en a pas.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 3",
      intitule: "Séparation d'avec les réseaux alimentés en eaux non potables",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le propriétaire des réseaux intérieurs conçoit, installe et exploite les réseaux d'eaux non potables de façon à ne pas perturber le réseau d'eau potable ; la séparation doit être totale en permanence, et tout appoint se fait par surverse totale avec garde d'air visible.",
      citationCle:
        "La séparation entre le réseau de distribution d'eau destinée à la consommation humaine et les réseaux intérieurs de distribution alimentés par des eaux non potables doit être totale en permanence.",
      statut: "sans_objet",
      motif:
        "État permanent de l'installation, sans rendez-vous ni rythme : « en permanence », vérifié le cas échéant à l'occasion des opérations des articles 9 et 10. Il ne concerne d'ailleurs que les établissements qui distribuent des eaux non potables (eaux de pluie, puits, forage) — un attribut que le produit ne détient pas, et qui ne se devine pas.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 4",
      intitule: "Les trois niveaux de protection",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Pose les trois niveaux de protection — point de livraison (art. 5), piquages (art. 6), équipements (art. 7) — et met leur mise en œuvre à la charge du PROPRIÉTAIRE DES RÉSEAUX INTÉRIEURS, mise en œuvre qui comprend expressément le choix, l'installation ET LA VÉRIFICATION INITIALE du bon fonctionnement dans les conditions de l'article 9 (III). Lui impose en outre d'ADAPTER la protection en cas de modification des réseaux susceptible de générer des risques supplémentaires de retour d'eau (IV), et de TENIR À LA DISPOSITION DE L'AUTORITÉ SANITAIRE les preuves d'efficacité des dispositifs — marquage NF ou certificat de conformité à une norme publiée au Journal officiel (V).",
      citationCle:
        "En application de l'article R.1321-57 du code de la santé publique, les dispositifs de protection mentionnés aux articles 5, 6 et 7 sont mis en œuvre par le propriétaire des réseaux intérieurs de distribution des bâtiments. Cette mise en œuvre comprend notamment le choix et l'installation du dispositif de protection ainsi que la vérification initiale de son bon fonctionnement dans les conditions prévues à l'article 9. […] En cas de modification des réseaux intérieurs de distribution susceptible de générer des risques supplémentaires de retour d'eau (création de nouveaux piquages notamment), le propriétaire des réseaux intérieurs adapte la protection […] Ces preuves sont tenues à la disposition de l'autorité sanitaire par le propriétaire des réseaux intérieurs de distribution.",
      statut: "obligation_manquante",
      motif:
        "TROIS OBLIGATIONS D'EXPLOITATION, ET AUCUNE N'EST PORTÉE. La vérification INITIALE (III) est un acte daté par un fait que le produit connaîtrait — la mise en place du dispositif ; l'adaptation en cas de modification (IV) est une obligation événementielle ; les preuves tenues à disposition de l'autorité sanitaire (V) sont une pièce à conserver, de la même famille que les rapports que le registre porte déjà.\n\nCE QUI A ÉTÉ CORRIGÉ EN L'OUVRANT, ET QUI VAUT D'ÊTRE GARDÉ. Cet article a été classé `non_depouille` le 2026-09-02 sur la foi de son intitulé, « Les trois niveaux de protection », et une passe du 2026-09-20 s'apprêtait à le ranger hors périmètre au motif « règle de construction » — sans l'ouvrir. Le texte dit l'inverse : son III nomme une vérification, son IV un fait générateur, son V une pièce. Un intitulé de tableau ne dit pas à qui un article s'adresse.",
      bloquePar:
        "LE MÊME BLOCAGE QUE LES ARTICLES 9 ET 10, ET IL EST DOUBLE. D'abord l'article 2 : tout l'arrêté est borné aux bâtiments « dont les réseaux de distribution d'eau sont mis en place ou rénovés totalement à compter du 1er janvier 2023 », et le produit ne détient aucun attribut disant l'âge de la plomberie ni si elle a été intégralement refaite. Ensuite le destinataire : l'article 1er III définit le propriétaire des réseaux intérieurs comme « le responsable juridique du fonctionnement des réseaux intérieurs », qui pour un bâtiment existant « peut s'agir du propriétaire du bâtiment, du responsable d'établissement ou de l'exploitant SI CETTE RESPONSABILITÉ LUI A ÉTÉ CONTRACTUELLEMENT DÉLÉGUÉE » — aucun attribut de bail ne permet de trancher. Porter l'obligation sans ces deux réponses la réclamerait à des exploitants qu'elle ne vise pas.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 5",
      intitule: "Protection au point de livraison",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Dit QUELS réseaux sont équipés d'une protection au point de livraison — tout réseau intérieur raccordé à un réseau public, et tout réseau intérieur raccordé à un réseau privé d'adduction au sens du 2° de R. 1321-43 — et à quel NIVEAU : le dispositif doit être au moins équivalent au niveau correspondant au fluide le plus dangereux circulant en aval, un avis du ministre chargé de la santé publié au Journal officiel listant les dispositifs réputés satisfaire l'exigence.",
      citationCle:
        "En présence de plusieurs fluides de catégories différentes dans le bâtiment, le dispositif de protection équipant le point de livraison est de niveau au moins équivalent au niveau de protection correspondant au fluide le plus dangereux circulant en son aval.",
      statut: "sans_objet",
      motif:
        "Article d'ÉQUIPEMENT et de niveau, sans rendez-vous ni rythme : il dit ce qui doit être en place, jamais quand le refaire. Le seul rendez-vous que le dispositif engendre est aux articles 9 et 10 — vérification et entretien a minima annuels —, tous deux déjà au corpus et tous deux `obligation_manquante`. Même traitement que l'article 3, état permanent de l'installation.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 6",
      intitule: "Protection aux piquages",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Impose un dispositif de protection à chaque piquage d'un réseau à usage autre qu'alimentaire ou sanitaire (RT1e, RT2 à RT5) sur un réseau alimentaire ou sanitaire (RT1a à RT1d), et à chaque piquage des parties privatives sur les parties collectives. Le dispositif est installé au plus près du piquage, à moins de trois mètres. Le IV écarte les parties privatives des bâtiments d'habitation collective et les maisons individuelles.",
      citationCle:
        "Le dispositif de protection est installé au plus près du piquage et dans tous les cas à une distance inférieure à 3 mètres.",
      statut: "sans_objet",
      motif:
        "Règle de POSE — où, et à quelle distance —, sans récurrence. Comme l'article 5, le seul rendez-vous qu'elle engendre est aux articles 9 et 10. À noter pour la suite : le vocabulaire RT1a à RT5 que cet article manipule n'existe nulle part dans le modèle, et l'encodage des articles 9 et 10 aura à décider s'il a besoin de le porter.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 7",
      intitule: "Protection des équipements",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Étend la protection aux équipements susceptibles d'être à l'origine d'une pollution par retour d'eau — production d'eau chaude sanitaire, traitement complémentaire de l'eau au sens de R. 1321-53 —, le dispositif étant intégré à l'équipement ou posé à son point d'alimentation. Le V impose au PROPRIÉTAIRE DES RÉSEAUX INTÉRIEURS de n'employer, dans les équipements de traitement thermique de l'eau destinée à la consommation humaine, que des eaux issues d'un réseau d'eau potable ou des produits satisfaisant l'arrêté du 14 janvier 2019, et exige une séparation permanente entre ces fluides et l'eau potable. Le VI écarte les parties privatives d'habitation collective et les maisons individuelles.",
      citationCle:
        "Le propriétaire des réseaux intérieurs de distribution emploie dans les équipements utilisés pour le traitement thermique de l'eau destinée à la consommation humaine, les fluides correspondant, soit aux eaux directement issues d'un réseau d'adduction ou de distribution d'eau destinée à la consommation humaine, soit aux produits satisfaisant aux exigences définies par l'arrêté du 14 janvier 2019 susvisé.",
      statut: "sans_objet",
      motif:
        "Le V est bien une obligation d'exploitation — quels fluides employer —, mais c'est un ÉTAT PERMANENT : « permettent, dans des conditions normales d'utilisation, de séparer en permanence ». Ni rendez-vous, ni rythme, ni pièce à produire ; son constat se fait, le cas échéant, aux opérations des articles 9 et 10. Même raisonnement que l'article 3, dont le motif a servi de patron. La condition d'application est de surcroît un équipement de traitement thermique de l'eau, que le produit ne sait pas déclarer.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 8",
      intitule:
        "Repérage des canalisations et signalisation des points d'eau non potable",
      url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000044060788",
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Impose de repérer les canalisations d'eaux non potables et des réseaux RT1e, RT2 à RT5 de façon explicite et distincte, notamment à l'entrée et à la sortie des vannes, des appareils et aux passages de cloisons et de murs. Impose en outre que les points de soutirage correspondants ne soient pas à proximité d'un robinet d'eau potable, portent à proximité immédiate une plaque « eau non potable » avec un pictogramme compréhensible par les personnes malvoyantes ou ne maîtrisant pas le français, et soient SOIT placés dans un local fermé non accessible au public, SOIT équipés d'un robinet verrouillable par un outil spécifique non lié au robinet. Le III écarte les parties privatives des bâtiments d'habitation collective et les maisons individuelles.",
      citationCle:
        "Ils sont associés à leur proximité immédiate, à une plaque signalétique comportant la mention « eau non potable » accompagnée d'un pictogramme explicite, compréhensible par les personnes malvoyantes ou ne maîtrisant pas l'usage du français. Ils respectent a minima l'une des conditions suivantes : - ils sont placés dans un local fermé non accessible au public ; - ils sont équipés d'un robinet verrouillable dont l'ouverture est faite à l'aide d'un outil spécifique qui ne lui est pas lié.",
      statut: "sans_objet",
      motif:
        "C'EST BIEN DE L'EXPLOITATION, ET POURTANT IL N'Y A RIEN À INSCRIRE AU CALENDRIER. Une plaque signalétique, un repérage de canalisation, un robinet verrouillable : l'obligation est de les avoir et de les maintenir, en permanence, sans que le texte nomme un rendez-vous, un rythme ni un contrôle périodique. C'est la définition même de ce statut, et le patron est l'article 3 du même arrêté.\n\nLa condition d'application est en outre un attribut que le produit ne détient pas : il faut distribuer des eaux non potables ou tenir un réseau RT1e, RT2 à RT5. Le même motif écarte déjà l'article 3.\n\nSI CET ARTICLE DEVAIT ÊTRE PORTÉ UN JOUR, ce serait comme état permanent au sens de l'ADR-026 et de l'ADR-027 — une déclaration n'étant pas une preuve —, et non comme une vérification périodique. Ce n'est pas le cas aujourd'hui, et ce paragraphe est là pour que la question ne se rouvre pas à l'aveugle.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 9",
      intitule: "Vérification des dispositifs de protection — a minima annuelle",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "La vérification prévue par R. 1321-61 (examen visuel, manœuvre des vannes et organes de purge, contrôle de la présence du fichier sanitaire) est réalisée à la demande et à la charge du propriétaire des réseaux intérieurs, lors de la mise en place initiale puis périodiquement, a minima chaque année.",
      citationCle:
        "Les opérations de vérification sont réalisées lors de la mise en place initiale des dispositifs de protection, puis de façon périodique selon la fréquence définie par le propriétaire des réseaux intérieurs de distribution, en fonction du niveau de risque que présentent ses installations, des préconisations du fabricant des dispositifs de protection et a minima à fréquence annuelle.",
      statut: "obligation_manquante",
      motif:
        "VOICI LA PÉRIODICITÉ ANNUELLE, ET ELLE EST ICI — pas dans R. 1321-57. La formulation est un plancher, pas un rythme fixe : le propriétaire fixe lui-même la fréquence selon le risque et les préconisations du fabricant, l'annuel étant le minimum. Rien ne l'encode, et deux choses distinctes l'en empêchent. UN : le destinataire n'est pas déterminable — l'article 1er III fait de l'exploitant un « propriétaire des réseaux intérieurs » seulement s'il est responsable d'établissement ou si la responsabilité lui a été contractuellement déléguée, et le produit ne détient aucun attribut de bail. DEUX : l'article 2 réserve tout l'arrêté aux réseaux mis en place ou rénovés totalement depuis le 1er janvier 2023, et le produit ne connaît pas la date de la plomberie. Afficher la ligne pour tous sur-appliquerait de façon massive et muette ; ne rien afficher la manque pour les établissements récemment aménagés, ce qui est fréquent en restauration.",
      bloquePar:
        "Aucun attribut d'établissement ne dit qui est le « propriétaire des réseaux intérieurs de distribution » au sens de l'art. 1er III, ni si le réseau d'eau a été mis en place ou rénové totalement depuis le 1er janvier 2023 (art. 2) ; et aucune catégorie d'équipement « dispositif de protection contre les retours d'eau / disconnecteur ».",
    },
    {
      ref: "Arrêté 10-09-2021 art. 10",
      intitule:
        "Entretien des dispositifs de protection — a minima annuel, les disconnecteurs nommés",
      url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000044060791",
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'entretien prévu par R. 1321-61 est effectué par un opérateur qualifié au sens de l'article 16 de la loi du 5 juillet 1996 ; il porte au minimum sur les dispositifs installés aux points de livraison et sur les disconnecteurs, et il est réalisé a minima à une fréquence annuelle.",
      citationCle:
        "Les opérations d'entretien prennent en compte les préconisations des fabricants et concernent au minimum les dispositifs de protection installés aux points de livraison des bâtiments et les disconnecteurs. Elles sont réalisées a minima à une fréquence annuelle, sans préjudice de dispositions plus contraignantes qui pourraient s'appliquer aux réseaux intérieurs de distribution.",
      statut: "obligation_manquante",
      motif:
        "LE SEUL TEXTE DE TOUT LE DOSSIER QUI ÉCRIVE LE MOT « DISCONNECTEUR », et il l'écrit à propos de l'ENTRETIEN, pas de la vérification. Deux opérations distinctes, deux articles, deux régimes : la vérification de l'article 9 se fait par « un opérateur relevant du choix » du propriétaire, l'entretien de l'article 10 exige un opérateur qualifié au sens de la loi du 5 juillet 1996, qui tient ses justificatifs à disposition. Les fondre en une ligne « contrôle annuel du disconnecteur » ferait disparaître l'exigence de qualification, qui est la seule chose opposable à un prestataire. Les mêmes deux blocages que l'article 9 s'y appliquent.",
      bloquePar:
        "Mêmes blocages que l'article 9 : destinataire non déterminable (art. 1er III), date de mise en place ou de rénovation du réseau inconnue (art. 2), et aucune catégorie d'équipement « disconnecteur ».",
    },
    {
      ref: "Arrêté 10-09-2021 art. 11",
      intitule:
        "Compte-rendu d'intervention et signalement d'un dysfonctionnement sous 24 heures",
      url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000044060794",
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "À l'issue de chaque vérification ou entretien, l'opérateur remet un compte-rendu au propriétaire des réseaux intérieurs, qui le conserve et le tient à disposition de l'autorité sanitaire et du service des eaux ; en cas de dysfonctionnement, l'opérateur informe le propriétaire et le service des eaux sous 24 heures et le propriétaire prend sans délai les mesures correctives.",
      citationCle:
        "Le propriétaire des réseaux intérieurs conserve et tient ces documents à disposition de l'autorité sanitaire et du service des eaux.",
      statut: "sans_objet",
      motif:
        "Corollaire documentaire des articles 9 et 10, sans échéance propre : le compte-rendu naît de l'opération et se rattacherait à son occurrence, comme tout rapport de vérification. Les 24 heures sont un délai de réaction à un dysfonctionnement constaté, pas un intervalle qui revient — la distinction est la même que celle qui range les obligations événementielles à part des obligations récurrentes.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 12",
      intitule: "Fichier sanitaire des réseaux intérieurs de distribution",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le propriétaire des réseaux intérieurs assure la traçabilité de toutes les opérations et consigne dans un fichier sanitaire le schéma de principe des réseaux, la liste et la localisation des dispositifs de protection, les informations du fabricant, les types d'eaux et les opérations de vérification et d'entretien ; le fichier est tenu à disposition de l'autorité sanitaire, du service des eaux et des opérateurs.",
      citationCle:
        "Il consigne dans un fichier sanitaire le schéma de principe des réseaux intérieurs comprenant la liste et la localisation des dispositifs de protection du bâtiment, les informations du fabricant relatives aux dispositifs de protection, les types d'eaux alimentant les réseaux intérieurs de distribution, les informations relatives à l'exploitation des réseaux, y compris celles relatives aux opérations de vérification et d'entretien des dispositifs de protection mentionnées aux articles 9 et 10 du présent arrêté.",
      statut: "obligation_manquante",
      motif:
        "Registre à constituer puis à maintenir, tenu à disposition de l'autorité sanitaire et du service des eaux : c'est un état permanent au sens de l'ADR-026, et le produit en sert déjà de même nature (registre de sécurité, carnet sanitaire eau/légionelles). CE N'EST PAS LE CARNET SANITAIRE DU PRODUIT, et la ressemblance des noms est un piège : celui du module suit des relevés de température d'ECS et des analyses de légionelles, celui-ci est un plan des réseaux et un journal d'interventions sur les dispositifs anti-retour. Les articles 9 et 10 en font par ailleurs un point de contrôle — l'opérateur vérifie sa présence et l'actualise —, ce qui le rend opposable indépendamment de toute échéance. Bloqué par les mêmes deux inconnues que les articles 9 et 10.",
      bloquePar:
        "Mêmes blocages que l'article 9 : destinataire non déterminable (art. 1er III) et champ d'application borné à la date de mise en place ou de rénovation totale du réseau (art. 2).",
    },
    {
      ref: "Arrêté 10-09-2021 art. 13",
      intitule: "Entrée en vigueur",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les dispositions de l'arrêté entrent en vigueur à compter du 1er janvier 2023.",
      citationCle:
        "Les dispositions du présent arrêté entrent en vigueur à compter du 1er janvier 2023.",
      statut: "sans_objet",
      motif:
        "Article d'entrée en vigueur. Lu expressément pour y chercher une disposition transitoire qui étendrait les articles 9 et 10 aux réseaux existants : il n'y en a aucune, et l'arrêté ne comporte pas d'article d'abrogation — aucun texte n'avait été pris avant lui sur le fondement de R. 1321-61.",
    },
    {
      ref: "Arrêté 10-09-2021 art. 14",
      intitule: "Publication",
      url: URL_ARRETE,
      versionEnVigueur: "2023-01-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'arrêté sera publié au Journal officiel de la République française.",
      citationCle:
        "Le présent arrêté sera publié au Journal officiel de la République française.",
      statut: "sans_objet",
      motif:
        "Clause de publication, sans contenu normatif. Consignée parce que le corpus se déclare intégral : un article passé sous silence ferait de « quatorze articles sur quatorze » une affirmation invérifiable.",
    },
  ],
};
