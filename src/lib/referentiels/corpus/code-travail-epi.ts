// Corpus : code du travail — équipements de protection individuelle, section 9
// du chapitre III (R. 4323-91 à R. 4323-106), et les deux articles d'amont dont
// elle dépend.
//
// ── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
//
// La catégorie `EPI` est entrée dans `CategorieEquipement` le 2026-09-04, sans
// aucune obligation, avec un commentaire qui disait pourquoi : « il ne faut PAS
// en attacher une avant d'avoir lu R. 4323-95 à R. 4323-99 et l'arrêté qui fixe
// la liste des EPI soumis à vérification ». `etablissements/parametrage.ts`
// disait la même chose de la question `epiPresents` : « R. 4323-95 à
// R. 4323-106 CT et l'arrêté du 19 mars 1993 n'ont jamais été ouverts dans ce
// dépôt, et un guide commercial a déjà fait croire à une périodicité annuelle
// générale des EPI qui n'existe pas ».
//
// Voici la lecture. Le guide commercial avait le bon chiffre et la mauvaise
// assiette, et c'est le résultat principal du lot : **douze mois, oui ; « les
// EPI », non**. La périodicité n'est pas dans le Code — `R. 4323-99` est un
// article d'HABILITATION qui ne chiffre rien — mais dans l'arrêté du 19 mars
// 1993 (corpus `arrete-1993-03-19-epi`), et cet arrêté procède par liste
// NOMINATIVE et FERMÉE de cinq familles. Un casque, des gants, des chaussures
// de sécurité, des lunettes, des protections auditives n'y figurent pas et ne
// sont soumis à AUCUNE vérification générale périodique.
//
// ── CE QUE LA SECTION 9 PORTE, ET CE QU'ELLE NE PORTE PAS ──────────────────
//
// Trois sous-sections, et la ligne de partage passe entre la première et la
// deuxième :
//
//   sous-section 1 (R. 4323-91 à -98) — caractéristiques et conditions
//     d'utilisation. S'applique à TOUS les EPI sans exception, gants compris.
//     Aucune périodicité, aucune pièce datée : des exigences de fond et un
//     entretien continu (`R. 4323-95` : « bon fonctionnement », « état
//     hygiénique satisfaisant », « entretiens, réparations et remplacements
//     nécessaires »). Rien à inscrire à un calendrier.
//   sous-section 2 (R. 4323-99 à -103) — vérifications périodiques. S'applique
//     aux SEULS équipements que des arrêtés désignent. C'est ici que se joue le
//     rendez-vous, et l'article qui l'ouvre ne dit ni lesquels ni à quel rythme.
//   sous-section 3 (R. 4323-104 à -106) — information et formation. S'applique
//     à tous les EPI, et porte un DOCUMENT (`R. 4323-105`, consigne
//     d'utilisation) que ni le référentiel ni la liste des documents
//     obligatoires ne connaissent.
//
// ── CE QUE CE LOT N'A PAS FAIT, ET IL FAUT LE DIRE ─────────────────────────
//
// `R. 4323-92` est un second article d'habilitation — « des arrêtés conjoints
// […] déterminent, en tant que de besoin, la valeur de l'exposition quotidienne
// admissible que l'équipement de protection individuelle peut laisser
// subsister ». Les arrêtés pris sur son fondement N'ONT PAS ÉTÉ ÉNUMÉRÉS. C'est
// exactement la troisième famille de manques listée en tête de `types.ts` (« un
// article d'habilitation lu sans énumérer les arrêtés qu'il habilite »), et
// elle est nommée ici plutôt que passée sous silence : les panneaux « textes
// d'application » de Légifrance sont chargés en JavaScript et `WebFetch` ne les
// rend pas, la recherche plein texte n'a rien rendu qui s'y rattache, et
// affirmer « il n'y en a pas » sur cette base serait une lecture incertaine
// annoncée comme sûre. La question reste ouverte.
//
// De même, l'énumération des arrêtés pris sur `R. 4323-99` n'est pas garantie
// exhaustive. Un seul a été établi et lu à la source — celui du 19 mars 1993 —,
// plus un texte voisin ouvert et écarté (arrêté du 22 octobre 2009, voir
// l'en-tête de `arrete-1993-03-19-epi.ts`). L'article vise « les ministres
// chargés du travail OU de l'agriculture » : un jumeau agricole existe
// peut-être, comme il existe pour `R. 4323-23`, et il n'a pas été trouvé.
//
// Lecture : `premiere_main`, Légifrance le 2026-09-04, sur les pages d'article
// (`article_lc`) et sur la page de section 9, rendues côté serveur. Les dates
// de version et les mentions « Création / Modifié par » sont relevées une par
// une sur ces pages.

import type { Corpus } from "./types";

/**
 * La section 9 du chapitre III, en entier : seize articles sur seize.
 *
 * `integral` — y compris les quatre articles de la sous-section 1 qui ne
 * concernent le produit par aucun bout (rayonnements non ionisants, exposition
 * quotidienne admissible), parce qu'un corpus qui n'énumérerait que ce qui
 * l'intéresse ne prouverait rien sur ce que la section contient d'autre.
 */
export const CODE_TRAVAIL_EPI: Corpus = {
  id: "code-travail-epi",
  intitule:
    "Code du travail — utilisation des équipements de protection individuelle (section 9 du chapitre III)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489942/",
  etendue: "integral",
  portee:
    "Chemin : partie réglementaire, quatrième partie (santé et sécurité au travail), livre III (équipements de travail et moyens de protection), titre II (utilisation des équipements de travail et des moyens de protection), chapitre III (mesures d'organisation et conditions d'utilisation), section 9 « Dispositions particulières pour l'utilisation des équipements de protection individuelle ». Seize articles, trois sous-sections : caractéristiques et conditions d'utilisation (R. 4323-91 à -98), vérifications périodiques (R. 4323-99 à -103), information et formation des travailleurs (R. 4323-104 à -106). S'applique à tout employeur, sans condition d'effectif, de régime ERP ni d'activité. AUCUN de ces seize articles ne pose de périodicité : la seule de la section est renvoyée par R. 4323-99 à des arrêtés, et l'arrêté lu ne soumet que cinq familles d'équipements nommément désignées (corpus `arrete-1993-03-19-epi`). Quatorze articles sont en vigueur depuis le 1er mai 2008 (décret n° 2008-244 du 7 mars 2008) ; R. 4323-97 depuis le 2 juin 2025 (décret n° 2025-482 du 27 mai 2025, dit « chaleur ») et R. 4323-105 depuis le 1er janvier 2018 (décret n° 2017-1819 du 29 décembre 2017, comité social et économique). Aucune version future programmée. Deux articles restent `obligation_manquante` : R. 4323-105, la consigne d'utilisation, qui est un DOCUMENT que la liste des documents obligatoires ne porte pas ; et R. 4323-106, la formation au port, dont le texte ne chiffre aucun rythme (« renouvelée aussi souvent que nécessaire »).",
  articles: [
    /* ── Sous-section 1 : caractéristiques et conditions d'utilisation ───── */
    {
      ref: "R. 4323-91",
      intitule: "Adéquation de l'équipement au risque et à l'ergonomie",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531314",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Trois exigences de fond sur le CHOIX de l'équipement, qui pèsent sur l'employeur au moment où il l'achète et le remet : l'équipement est approprié aux risques à prévenir et aux conditions de travail ; il n'est pas lui-même à l'origine de risques supplémentaires ; il peut être porté, le cas échéant après ajustement, dans des conditions compatibles avec le travail et avec les principes de l'ergonomie. Aucune récurrence, aucune pièce, aucun tiers.",
      citationCle:
        "Les équipements de protection individuelle sont appropriés aux risques à prévenir et aux conditions dans lesquelles le travail est accompli. Ils ne sont pas eux-mêmes à l'origine de risques supplémentaires. Ils doivent pouvoir être portés, le cas échéant, après ajustement, dans des conditions compatibles avec le travail à accomplir et avec les principes de l'ergonomie.",
      statut: "sans_objet",
      motif:
        "Règle de fond sans récurrence : elle qualifie l'équipement, elle ne fixe aucun rendez-vous et ne demande aucun écrit. Même partage que R. 4323-59 et R. 4323-60 en travail en hauteur, classés sans objet pour la même raison — le produit inscrit des échéances et des pièces, pas des exigences de conformité intrinsèque. Ce que le référentiel porte déjà de cette matière est ailleurs et par un autre chemin : la hiérarchie des mesures de prévention de L. 4121-2 (8°), qui met la protection collective avant l'individuelle, et l'alerte de sous-cotation qui la traduit à l'écran.",
    },
    {
      ref: "R. 4323-92",
      intitule:
        "Habilitation : valeur de l'exposition quotidienne admissible résiduelle",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531312",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Second article d'habilitation de la section, distinct de R. 4323-99 et souvent confondu avec lui : il renvoie à des arrêtés CONJOINTS des ministres chargés du travail et de l'agriculture le soin de fixer, « en tant que de besoin », la valeur de l'exposition quotidienne admissible qu'un équipement de protection individuelle peut laisser subsister. C'est une exigence de PERFORMANCE résiduelle, pas de vérification : rien dans l'article ne parle de contrôle périodique.",
      citationCle:
        "Des arrêtés conjoints des ministres chargés du travail et de l'agriculture déterminent, en tant que de besoin, la valeur de l'exposition quotidienne admissible que l'équipement de protection individuelle peut laisser subsister.",
      statut: "sans_objet",
      motif:
        "Article d'habilitation qui ne prescrit rien par lui-même : aucune valeur, aucun équipement, aucune échéance. ⚠ ET IL EST LU À MOITIÉ, CE QUI SE DÉCLARE PLUTÔT QUE DE SE TAIRE. Les arrêtés pris sur son fondement n'ont PAS été énumérés par ce lot — c'est la faute type nommée en tête de `types.ts` (« un article d'habilitation lu sans énumérer les arrêtés qu'il habilite »), celle qui avait laissé une moitié entière de R. 4323-23 hors du dépôt pendant des mois. Deux raisons de fait, aucune bonne : les panneaux « textes d'application » de Légifrance sont chargés en JavaScript et l'outil de lecture ne les rend pas, et la recherche plein texte n'a rendu aucun arrêté rattaché. Conclure « il n'y en a pas » sur cette base serait une lecture incertaine annoncée comme sûre. La formule « en tant que de besoin » laisse d'ailleurs ouverte l'hypothèse qu'aucun n'ait jamais été pris. La question reste ouverte, et le motif est ici pour qu'elle se retrouve.",
    },
    {
      ref: "R. 4323-93",
      intitule: "Compatibilité des équipements portés simultanément",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531310",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Quand plusieurs risques imposent le port simultané de plusieurs équipements, ceux-ci doivent être compatibles entre eux et conserver chacun son efficacité. Exigence de fond sur la combinaison, sans récurrence ni écrit.",
      citationCle:
        "En cas de risques multiples exigeant le port simultané de plusieurs équipements de protection individuelle, ces équipements doivent être compatibles entre eux et maintenir leur efficacité par rapport aux risques correspondants.",
      statut: "sans_objet",
      motif:
        "Règle de fond sans récurrence, comme R. 4323-91 : elle porte sur le choix et la combinaison des équipements, pas sur un rendez-vous ni sur une pièce à produire. Rien n'en découle pour un calendrier.",
    },
    {
      ref: "R. 4323-94",
      intitule:
        "Protection oculaire contre les rayonnements non ionisants",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531308",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Exigence de performance sur une famille précise : les équipements protégeant l'œil des rayonnements non ionisants doivent être tels que la densité d'éclairement énergétique susceptible d'atteindre les yeux ne présente pas de dangers. Aucune vérification, aucune périodicité.",
      citationCle:
        "Les équipements de protection individuelle contre les effets aigus ou chroniques des sources de rayonnements non ionisants sur l'œil sont tels que la densité d'éclairement énergétique du rayonnement susceptible d'atteindre les yeux de l'utilisateur ne présente pas de dangers.",
      statut: "sans_objet",
      motif:
        "Exigence de performance intrinsèque de l'équipement, qui se satisfait à l'achat et se prouve par la notice du fabricant. Aucune échéance n'en découle. Relevé parce que le corpus est déclaré `integral` : un article que le produit n'utilise pas se compte quand même.",
    },
    {
      ref: "R. 4323-95",
      intitule:
        "Fourniture gratuite, entretien et maintien en état par l'employeur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531306",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "L'ARTICLE QUE LE BRIEF NOMMAIT EN PREMIER, ET IL NE PARLE PAS DE VÉRIFICATION PÉRIODIQUE. Il met à la charge de l'employeur quatre choses sur les équipements de protection individuelle ET les vêtements de travail mentionnés à R. 4321-4 : les fournir GRATUITEMENT, en assurer le bon fonctionnement, en assurer le maintien dans un état hygiénique satisfaisant, et faire pour cela « les entretiens, réparations et remplacements nécessaires ». Un dernier alinéa réserve le cas des salariés temporaires (L. 1251-23). Le champ est TOTAL — tous les EPI, gants et casques compris — et c'est précisément pourquoi il n'y a aucune périodicité : le texte exige un ÉTAT continu, pas un rendez-vous. « Nécessaires » est le mot qui porte tout le régime, et il ne se chiffre pas. Chemin : section 9, sous-section 1.",
      citationCle:
        "Les équipements de protection individuelle et les vêtements de travail mentionnés à l'article R. 4321-4 sont fournis gratuitement par l'employeur qui assure leur bon fonctionnement et leur maintien dans un état hygiénique satisfaisant par les entretiens, réparations et remplacements nécessaires. Ces dispositions ne font pas obstacle aux conditions de fournitures des équipements de protection individuelle prévues par l'article L. 1251-23, pour les salariés temporaires.",
      statut: "sans_objet",
      motif:
        "AUCUNE PÉRIODICITÉ, ET C'EST LA MOITIÉ DU RÉSULTAT DU LOT. L'article oblige à un entretien permanent, dont la fréquence est « nécessaire » — le texte ne la chiffre pas, ne renvoie à aucun arrêté pour la chiffrer, et ne mentionne aucune vérification générale périodique. En tirer un rendez-vous annuel serait dériver une règle par analogie avec la sous-section 2, qui est le contraire de ce que ce corpus existe pour empêcher. Ce que l'article crée est un état permanent de fait — un stock d'équipements propres et fonctionnels — qu'aucune pièce datée ne constate et qu'aucun tiers ne délivre : il n'y a rien à porter au calendrier ni à la liste des documents obligatoires. Le produit consigne déjà la présence d'EPI par la question `epiPresents` de la fiche établissement, sans en dériver quoi que ce soit ; cette lecture confirme que rien ne doit en dériver de ce chef.",
    },
    {
      ref: "R. 4323-96",
      intitule: "Usage personnel de l'équipement, et usage successif",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531304",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Pose l'usage personnel comme principe — l'équipement est réservé à son attributaire, dans le cadre de ses activités professionnelles — et l'assortit d'une exception encadrée : si la nature de l'équipement et les circonstances exigent un usage successif par plusieurs personnes, des mesures appropriées sont prises pour que cela ne pose « aucun problème de santé ou d'hygiène ». Ni périodicité, ni pièce.",
      citationCle:
        "Les équipements de protection individuelle sont réservés à un usage personnel dans le cadre des activités professionnelles de leur attributaire. Toutefois, si la nature de l'équipement ainsi que les circonstances exigent l'utilisation successive de cet équipement de protection individuelle par plusieurs personnes, les mesures appropriées sont prises pour qu'une telle utilisation ne pose aucun problème de santé ou d'hygiène aux différents utilisateurs.",
      statut: "sans_objet",
      motif:
        "Règle d'attribution et d'hygiène, sans récurrence ni écrit. Les « mesures appropriées » de la seconde phrase ne sont ni datées ni décrites : le texte ne dit pas lesquelles, ne renvoie à aucun arrêté, et n'en fait pas une pièce. Rien à inscrire au calendrier.",
    },
    {
      ref: "R. 4323-97",
      intitule:
        "Conditions de mise à disposition et d'utilisation, déterminées par l'employeur après consultation du CSE",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051679302",
      versionEnVigueur: "2025-06-02",
      // Mention relevée sur la page de l'article : « Modifié par Décret
      // n°2025-482 du 27 mai 2025 - art. 2 ». C'EST LE DÉCRET « CHALEUR », ET
      // IL A DÉJÀ ÉTÉ OUVERT EN ENTIER DANS CE DÉPÔT — le 2026-09-02, par le
      // lot du socle DUERP, dont l'en-tête de `code-travail-duerp.ts` liste ce
      // qu'il touche : « R. 4223-13, R. 4225-1, R. 4225-2, R. 4323-97,
      // R. 4534-143, R. 4721-5, crée les articles R. 4463-1 à R. 4463-8 et
      // R. 4535-14 ». Le présent article est DANS cette liste : la chaîne
      // « article modifié → texte modificateur → ce qu'il touche d'autre » est
      // donc close, et la rouvrir ici ne rendrait rien de neuf. Ce que le
      // décret ajoute à cet article se lit dans son verbatim : la fin de la
      // seconde phrase, « ainsi que les conditions atmosphériques ».
      modifiePar: {
        texte: "Décret n° 2025-482 du 27 mai 2025 - art. 2",
        url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000051676074",
      },
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "L'employeur DÉTERMINE, après consultation du comité social et économique, les conditions dans lesquelles les équipements de protection individuelle sont mis à disposition et utilisés, « notamment celles concernant la durée de leur port ». Cinq facteurs à prendre en compte, énumérés : la gravité du risque, la fréquence de l'exposition, les caractéristiques du poste de travail de chaque travailleur, les performances des équipements, et — depuis le décret « chaleur » du 27 mai 2025 — les conditions atmosphériques. L'article n'exige AUCUN écrit : « détermine » n'est pas « consigne », et le document de la section est ailleurs (R. 4323-105, consigne d'utilisation). C'est cet article que R. 4323-99 vise nommément comme référence des « conditions de mise à disposition ou d'utilisation » dont le défaut d'accessibilité doit être décelé.",
      citationCle:
        "L'employeur détermine, après consultation du comité social et économique, les conditions dans lesquelles les équipements de protection individuelle sont mis à disposition et utilisés, notamment celles concernant la durée de leur port. Il prend en compte la gravité du risque, la fréquence de l'exposition au risque, les caractéristiques du poste de travail de chaque travailleur, les performances des équipements de protection individuelle en cause ainsi que les conditions atmosphériques.",
      statut: "sans_objet",
      motif:
        "Aucune périodicité et aucune pièce : l'article prescrit une DÉCISION de l'employeur, prise une fois et révisée quand les conditions changent, sans forme écrite imposée et sans date. Il se distingue en cela de R. 4223-11 et R. 4222-21, qui font eux aussi « fixer par l'employeur » des règles mais les font CONSIGNER DANS UN DOCUMENT communiqué au CSE — c'est le document qui les rend constatables, et il n'y en a pas ici. La consultation du CSE est une obligation de représentation du personnel, hors du périmètre santé-sécurité que le référentiel instruit, et le produit ne modélise pas les instances. ⚠ NE PAS LE CONFONDRE AVEC R. 4323-105 : celui-là exige bien un écrit — la consigne d'utilisation — et il est classé `obligation_manquante` ci-dessous.",
    },
    {
      ref: "R. 4323-98",
      intitule: "Utilisation conforme à la destination",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531300",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Une phrase, et le dernier article de la sous-section 1 : les équipements sont utilisés conformément à leur destination. Règle de geste, adressée à l'usage.",
      citationCle:
        "Les équipements de protection individuelle sont utilisés conformément à leur destination.",
      statut: "sans_objet",
      motif:
        "Règle de geste sans récurrence, sans pièce et sans destinataire datable. Une phrase de principe qui ne se constate ni par un rapport ni par une échéance.",
    },

    /* ── Sous-section 2 : vérifications périodiques ──────────────────────── */
    {
      ref: "R. 4323-99",
      intitule:
        "Habilitation : les arrêtés qui désignent les EPI soumis à vérification générale périodique et en fixent le rythme",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531296",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "L'ARTICLE PIVOT DU LOT, ET IL NE CHIFFRE RIEN. Article d'habilitation, jumeau exact de R. 4323-23 pour les équipements de travail : il renvoie à « des arrêtés des ministres chargés du travail ou de l'agriculture » le soin de désigner les équipements de protection individuelle ET catégories d'équipement de protection individuelle soumis à vérifications générales périodiques, et précise que ces arrêtés fixent « la périodicité des vérifications et, en tant que de besoin, leur nature et leur contenu ». Il donne en revanche l'OBJET de la vérification, et il est double : déceler en temps utile toute défectuosité susceptible d'être à l'origine de situations dangereuses, ET tout défaut d'accessibilité contraire aux conditions de mise à disposition ou d'utilisation déterminées en application de R. 4323-97. Aucune liste d'équipements, aucune périodicité, aucun contenu de vérification ne figure dans l'article. Chemin : section 9, sous-section 2 « Vérifications périodiques ».",
      citationCle:
        "Des arrêtés des ministres chargés du travail ou de l'agriculture déterminent les équipements de protection individuelle et catégories d'équipement de protection individuelle pour lesquels l'employeur procède ou fait procéder à des vérifications générales périodiques afin que soit décelé en temps utile toute défectuosité susceptible d'être à l'origine de situations dangereuses ou tout défaut d'accessibilité contraire aux conditions de mise à disposition ou d'utilisation déterminées en application de l'article R. 4323-97. Ces arrêtés précisent la périodicité des vérifications et, en tant que de besoin, leur nature et leur contenu.",
      statut: "sans_objet",
      motif:
        "RENVOI, ET RIEN D'AUTRE — le statut est celui d'un article qui ne produit aucune échéance par lui-même. Toute la substance est dans l'arrêté : c'est lui qui nomme les équipements et pose les douze mois, et c'est là que le manque est compté, une fois et pas deux (`arrete-1993-03-19-epi`, art. 1er, `obligation_manquante`). Le même partage qu'entre R. 4323-23 et l'arrêté du 5 mars 1993, à ceci près que R. 4323-23 est `retenu` parce que des obligations existent, et que celui-ci n'en a aucune. ⚠ L'ÉNUMÉRATION DES ARRÊTÉS N'EST PAS GARANTIE EXHAUSTIVE, et c'est la faute type nommée en tête de `types.ts` : un seul arrêté a été établi et lu à la source, celui du 19 mars 1993. L'article vise « les ministres chargés du travail OU de l'agriculture » — un jumeau agricole existe peut-être, comme pour R. 4323-23 (arrêté du 24 juin 1993), et il n'a pas été trouvé ; les panneaux « textes d'application » de Légifrance sont chargés en JavaScript et l'outil de lecture ne les rend pas. Un texte voisin a été ouvert et écarté, l'arrêté du 22 octobre 2009 : voir l'en-tête de `arrete-1993-03-19-epi.ts`.",
    },
    {
      ref: "R. 4323-100",
      intitule:
        "Qui réalise la vérification périodique des EPI, et la liste tenue à disposition de l'inspection",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531294",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Le RÉALISATEUR, et il est le même qu'en équipements de travail : des « personnes qualifiées, appartenant ou non à l'établissement ». Un organisme extérieur accrédité n'est donc jamais exigé par le Code — à la différence du régime des équipements sous pression. Deux exigences suivent : leur LISTE est tenue à la disposition de l'inspection du travail, et elles ont « la compétence nécessaire pour exercer leur mission en ce qui concerne les équipements de protection individuelle soumis à vérification et connaître les dispositions réglementaires correspondantes ». Noter la restriction de champ, écrite au texte : « les équipements de protection individuelle SOUMIS À VÉRIFICATION » — l'article ne vise pas les autres.",
      citationCle:
        "Les vérifications périodiques sont réalisées par des personnes qualifiées, appartenant ou non à l'établissement, dont la liste est tenue à la disposition de l'inspection du travail. Ces personnes ont la compétence nécessaire pour exercer leur mission en ce qui concerne les équipements de protection individuelle soumis à vérification et connaître les dispositions réglementaires correspondantes.",
      statut: "sans_objet",
      motif:
        "Aucune échéance : l'article qualifie le vérificateur, il ne fixe pas de rendez-vous. Il fonderait la valeur `personne_qualifiee` de `realisateurs` sur une obligation de vérification d'EPI, s'il en existait une — et il n'en existe aucune, le manque étant compté sur l'arrêté. UN CONSTAT QUI SORT DE CETTE LECTURE ET QUE CE LOT NE CORRIGE PAS : la liste de personnes qualifiées EST portée par le référentiel, sous `prevention-etablissement-liste-personnes-qualifiees` (porteur établissement, `etat_permanent`, encodée le 2026-09-04), mais cette obligation est fondée sur R. 4323-23 et R. 4323-24 — les équipements de TRAVAIL. R. 4323-100 est son jumeau pour les EPI, et aucune référence ne le nomme. Ce n'est pas une obligation manquante : la pièce attendue est la même, et une seconde ligne « tenir une liste » ferait doublon à l'écran. C'est une citation manquante, qui se solderait en ajoutant R. 4323-100 aux `referencesLegales` de cette obligation et en passant cette entrée à `retenu`. Modifier une obligation livrée sort du périmètre d'un lot de dépouillement ; le constat est donc écrit ici plutôt qu'exécuté.",
    },
    {
      ref: "R. 4323-101",
      intitule: "Consignation du résultat au registre de sécurité",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531292",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Une phrase : le résultat des vérifications périodiques est consigné sur le ou les registres de sécurité de L. 4711-5. Obligation de traçabilité, sans périodicité propre — elle suit celle de la vérification, qui n'est pas dans le Code.",
      citationCle:
        "Le résultat des vérifications périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5.",
      statut: "sans_objet",
      motif:
        "Traçabilité sans rythme propre : la consignation naît de la vérification et n'existe pas sans elle. Aucune vérification d'EPI n'étant encodée, il n'y a rien à consigner que le produit sache dater. L'article est cité au dirigeant par la liste des documents obligatoires (`verifications-epi`), qui dit exactement cela : le registre de sécurité existe dans Rojer, aucune échéance d'EPI n'y est engendrée, et la consignation se tient à part. Le registre lui-même est porté ailleurs, par L. 4711-5.",
    },
    {
      ref: "R. 4323-102",
      intitule:
        "Rapports du vérificateur extérieur, annexés au registre de sécurité",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531290",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Quand le vérificateur n'appartient pas à l'établissement, ses rapports sont annexés au registre de sécurité. À DÉFAUT, une solution de repli est expressément ouverte par le texte : porter au registre les indications précises de la date des vérifications, de la date de remise des rapports et de leur archivage dans l'établissement. Le texte admet donc que le rapport vive ailleurs, à condition que le registre dise où.",
      citationCle:
        "Lorsque les vérifications périodiques sont réalisées par des personnes n'appartenant pas à l'établissement, les rapports établis à la suite de ces vérifications sont annexés au registre de sécurité. A défaut, les indications précises relatives à la date des vérifications, à la date de remise des rapports correspondants et à leur archivage dans l'établissement sont portées sur le registre de sécurité.",
      statut: "sans_objet",
      motif:
        "Modalité d'archivage, sans périodicité propre — elle suit la vérification comme R. 4323-101. Aucune vérification d'EPI n'étant encodée, aucune pièce n'est attendue de ce chef.",
    },
    {
      ref: "R. 4323-103",
      intitule: "Support du registre et des rapports",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531288",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Le registre de sécurité et les rapports peuvent être tenus et conservés sur TOUT SUPPORT, dans les conditions de L. 8113-6. C'est la base légale de la tenue dématérialisée, celle qui autorise un outil comme Rojer à porter le registre.",
      citationCle:
        "Le registre de sécurité et les rapports peuvent être tenus et conservés sur tout support dans les conditions prévues par l'article L. 8113-6.",
      statut: "sans_objet",
      motif:
        "Règle de forme, permissive et non prescriptive : elle autorise un support, elle n'impose rien et ne date rien. Elle vaut pour le produit comme fondement de la dématérialisation, pas comme obligation à porter — et cette matière est déjà instruite ailleurs, au registre de sécurité (L. 4711-5, corpus `cch-registre-securite` et `code-travail-incendie`).",
    },

    /* ── Sous-section 3 : information et formation des travailleurs ──────── */
    {
      ref: "R. 4323-104",
      intitule: "Information des travailleurs sur l'équipement remis",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531284",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "L'employeur informe « de manière appropriée » les travailleurs devant utiliser un équipement de protection individuelle, sur quatre points énumérés : 1° les risques contre lesquels l'équipement protège ; 2° les conditions d'utilisation, notamment les usages auxquels il est réservé ; 3° les instructions ou consignes ; 4° les conditions de mise à disposition. L'article n'impose ici aucune forme écrite ni aucun rythme — c'est R. 4323-105 qui transforme les 1° et 2° en un document.",
      citationCle:
        "L'employeur informe de manière appropriée les travailleurs devant utiliser des équipements de protection individuelle : 1° Des risques contre lesquels l'équipement de protection individuelle les protège ; 2° Des conditions d'utilisation de cet équipement, notamment les usages auxquels il est réservé ; 3° Des instructions ou consignes concernant les équipements de protection individuelle ; 4° Des conditions de mise à disposition des équipements de protection individuelle.",
      statut: "sans_objet",
      motif:
        "Obligation d'information sans forme et sans rythme : « de manière appropriée » ne se date pas et ne se constate par aucune pièce. Ce qui en devient constatable est le document de R. 4323-105, qui reprend les 1° et 2° — c'est là que le manque est compté, une fois et pas deux. Relevé ici pour que la lecture du couple soit lisible : l'un dit ce qu'il faut dire, l'autre dit qu'il faut l'écrire.",
    },
    {
      ref: "R. 4323-105",
      intitule:
        "Consigne d'utilisation écrite, et documentation réglementaire tenue à disposition du CSE",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483581",
      versionEnVigueur: "2018-01-01",
      // Mention relevée sur la page de l'article : « Modifié par Décret
      // n°2017-1819 du 29 décembre 2017 - art. 3 », intitulé « relatif au
      // comité social et économique ». ⚠ CE DÉCRET N'A PAS ÉTÉ OUVERT EN
      // ENTIER par ce lot, et le dire vaut mieux que le laisser croire : la
      // règle en tête de `types.ts` le demande, et elle n'a pas été tenue ici.
      // Ce qui est établi est ce que la page de l'article montre — la version
      // du 1er janvier 2018 et le texte qui l'a produite. Ce qui ne l'est pas
      // est ce que ce décret touche d'AUTRE dans le dépôt. Le risque est
      // toutefois d'une autre nature que celui du décret « chaleur » : ce
      // texte est le décret d'application de l'ordonnance CSE, et son effet
      // visible ici est la substitution de « comité social et économique » aux
      // anciennes instances. Il reste à ouvrir.
      modifiePar: {
        texte: "Décret n° 2017-1819 du 29 décembre 2017 - art. 3",
        url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036336033",
      },
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "LE SEUL DOCUMENT ÉCRIT DE TOUTE LA SECTION 9, et le référentiel ne le connaît pas. L'employeur ÉLABORE une consigne d'utilisation qui reprend « de manière compréhensible » les informations des 1° et 2° de R. 4323-104 — les risques contre lesquels l'équipement protège, et ses conditions d'utilisation. Il tient cette consigne à la disposition des membres du comité social et économique, « ainsi qu'une documentation relative à la réglementation applicable à la mise à disposition et à l'utilisation des équipements de protection individuelle concernant les travailleurs de l'établissement ». Deux pièces, donc, pas une. Aucun rythme : la consigne s'élabore et se tient, elle ne se renouvelle pas à date.",
      citationCle:
        "L'employeur élabore une consigne d'utilisation reprenant de manière compréhensible les informations mentionnées aux 1° et 2° de l'article R. 4323-104. Il tient cette consigne à la disposition des membres du comité social et économique, ainsi qu'une documentation relative à la réglementation applicable à la mise à disposition et à l'utilisation des équipements de protection individuelle concernant les travailleurs de l'établissement.",
      statut: "retenu",
      obligations: ["epi-etablissement-consigne-utilisation"],
      reserve:
        "LA SECONDE PIÈCE DE L'ARTICLE N'EST PAS PORTÉE. Il impose DEUX choses : la consigne d'utilisation, encodée, ET « une documentation relative à la réglementation applicable à la mise à disposition et à l'utilisation des équipements de protection individuelle », tenue elle aussi à la disposition du CSE. La seconde est une étagère documentaire, pas un acte daté : lui donner sa propre obligation aurait produit une ligne que rien ne permet de constater faite. Elle est nommée dans la description de `epi-etablissement-consigne-utilisation` pour que le dirigeant sache qu'elle existe, et comptée ici pour qu'on ne la croie pas couverte.\n\nLe produit n'a jamais tranché s'il porte ce genre de pièce — une documentation réglementaire tenue à disposition, sans date ni renouvellement. La question dépasse cet article.",
    },
    {
      ref: "R. 4323-106",
      intitule: "Formation au port de l'équipement, et son renouvellement",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531280",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "L'employeur fait bénéficier les travailleurs devant utiliser un équipement de protection individuelle d'une « formation adéquate », comportant « en tant que de besoin » un ENTRAÎNEMENT AU PORT. Le renouvellement est prescrit mais non chiffré : « aussi souvent que nécessaire pour que l'équipement soit utilisé conformément à la consigne d'utilisation » — c'est-à-dire par référence à la consigne de R. 4323-105, et non à une durée.",
      citationCle:
        "L'employeur fait bénéficier les travailleurs devant utiliser un équipement de protection individuelle d'une formation adéquate comportant, en tant que de besoin, un entraînement au port de cet équipement. Cette formation est renouvelée aussi souvent que nécessaire pour que l'équipement soit utilisé conformément à la consigne d'utilisation.",
      statut: "obligation_manquante",
      motif:
        "Une formation que le référentiel ne porte pas : aucune obligation du domaine `formation_securite` ne cite cet article, et aucune ne vise le port d'un équipement de protection individuelle. ⚠ ET LE TEXTE NE POSE AUCUNE PÉRIODICITÉ — c'est le point à ne pas franchir. « Aussi souvent que nécessaire » n'est pas un rythme : le renouvellement est indexé sur un RÉSULTAT (que l'équipement soit utilisé conformément à la consigne), pas sur une durée. Lui donner trois ans par analogie avec une formation voisine, ou un an par analogie avec la vérification de l'arrêté, fabriquerait une échéance que personne ne peut opposer. Ce que le texte permet d'affirmer sans le forcer : la formation est due, elle vise des personnes nommées, et son renouvellement n'a pas de terme légal.",
      bloquePar:
        "Deux choses, dont une seule est technique. (1) LE PORTEUR. C'est une obligation de PERSONNE — « les travailleurs devant utiliser un équipement » —, donc porteur `salarie` au sens de l'ADR-023, avec un `TitreSalarie` déclaré. Le porteur existe et sait le faire. (2) LA PÉRIODICITÉ, qui n'existe pas. `periodicite: \"autre\"` la porterait sans mentir, mais produirait un état permanent nominatif — « formation au port des EPI » — dont rien ne dirait quand il expire, et l'ADR-027 interdit la déclaration qui ressemble à une preuve. Trancher entre « une ligne sans terme » et « pas de ligne » est une décision de produit, pas une lecture de texte, et elle n'appartient pas à ce lot.",
    },
  ],
};

/**
 * Les deux articles d'AMONT que la section 9 et l'arrêté désignent nommément.
 *
 * `articles_cites`, et volontairement : ce ne sont pas des sections entières
 * mais deux articles isolés, ouverts parce qu'un article lu en dépend et qu'on
 * ne peut pas dire ce que dit `R. 4323-95` sans savoir ce que sont « les
 * équipements […] mentionnés à l'article R. 4321-4 », ni ce que l'arrêté
 * réserve par son « sans préjudice de la vérification à chaque utilisation ».
 *
 * ILS APPARTIENNENT À DEUX CHAPITRES DIFFÉRENTS DE CELUI DE LA SECTION 9, et
 * c'est pourquoi ils ne sont pas dans le corpus ci-dessus : y ajouter des
 * articles d'un autre chapitre ferait mentir son `integral`.
 */
export const CODE_TRAVAIL_EPI_AMONT: Corpus = {
  id: "code-travail-epi-amont",
  intitule:
    "Code du travail — mise à disposition des EPI et maintien en état de conformité (articles d'amont de la section 9)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489672/",
  etendue: "articles_cites",
  portee:
    "Les deux articles du titre II auxquels la section 9 et l'arrêté du 19 mars 1993 renvoient nommément. R. 4321-4 (chapitre Ier, section 1 « Principes ») est l'article de la MISE À DISPOSITION, celui que R. 4323-95 vise pour dire ce qui doit être fourni gratuitement. R. 4322-1 (chapitre II « Maintien en état de conformité ») est l'article que l'arrêté du 19 mars 1993 réserve dans sa première ligne, sous son ancienne numérotation R. 233-1-1 : c'est le régime qui s'applique à TOUS les moyens de protection, y compris ceux qu'aucun arrêté ne soumet à vérification périodique. Les deux sont en vigueur depuis le 1er mai 2008 (décret n° 2008-244 du 7 mars 2008). Ni l'un ni l'autre ne pose de périodicité. Corpus PARTIEL : les chapitres dont ils sont tirés ne sont pas dépouillés — R. 4321-1 à -3, R. 4321-5 et R. 4322-2 à -3 n'ont pas été ouverts.",
  articles: [
    {
      ref: "R. 4321-4",
      intitule:
        "Mise à disposition des équipements de protection individuelle et des vêtements de travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531553",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "L'article de la MISE À DISPOSITION, et il porte trois choses en deux phrases : l'employeur met à disposition les équipements de protection individuelle appropriés « en tant que de besoin » ; il met à disposition les vêtements de travail appropriés « lorsque le caractère particulièrement insalubre ou salissant des travaux l'exige » ; et il veille à leur UTILISATION EFFECTIVE. Les deux conditions ne sont pas de même nature — « en tant que de besoin » renvoie à l'évaluation des risques, « particulièrement insalubre ou salissant » est un critère écrit. Chemin : livre III, titre II, chapitre Ier « Règles générales », section 1 « Principes ».",
      citationCle:
        "L'employeur met à la disposition des travailleurs, en tant que de besoin, les équipements de protection individuelle appropriés et, lorsque le caractère particulièrement insalubre ou salissant des travaux l'exige, les vêtements de travail appropriés. Il veille à leur utilisation effective.",
      statut: "sans_objet",
      motif:
        "Aucune périodicité et aucune pièce : l'article commande une fourniture et une surveillance continues, dont rien ne dit quand elles s'exercent. Il est lu ici parce que R. 4323-95 le vise nommément — sans lui, « les équipements de protection individuelle et les vêtements de travail mentionnés à l'article R. 4321-4 » serait une formule creuse —, et ce qu'il rend est utile au lot : le champ de R. 4323-95 est celui-ci, c'est-à-dire TOUS les EPI, sans la moindre liste. La veille sur l'utilisation effective, en particulier, est une exigence de fond qu'aucune déclaration ne constate.",
    },
    {
      ref: "R. 4322-1",
      intitule:
        "Maintien en état de conformité des équipements de travail et moyens de protection",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531543",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 -
      // art. (V) », aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "L'AUTRE RÉGIME, celui qui s'applique quand aucun arrêté ne soumet l'équipement à vérification périodique — et il est PERMANENT, pas périodique. Les équipements de travail et moyens de protection, « quel que soit leur utilisateur », sont maintenus en état de conformité avec les règles techniques de conception et de construction applicables lors de leur mise en service dans l'établissement, « y compris au regard de la notice d'instructions ». Un second alinéa réserve les règles d'utilisation du chapitre IV. C'est l'article que l'arrêté du 19 mars 1993 réserve dans sa première ligne, sous son ancienne numérotation R. 233-1-1 : « sans préjudice de la vérification à chaque utilisation du maintien en état de conformité ». Chemin : livre III, titre II, chapitre II « Maintien en état de conformité ».",
      citationCle:
        "Les équipements de travail et moyens de protection, quel que soit leur utilisateur, sont maintenus en état de conformité avec les règles techniques de conception et de construction applicables lors de leur mise en service dans l'établissement, y compris au regard de la notice d'instructions. Ces dispositions ne font pas obstacle à l'application des règles d'utilisation prévues au chapitre IV.",
      statut: "sans_objet",
      motif:
        "AUCUNE PÉRIODICITÉ, ET C'EST LA RÉPONSE À « ET LES GANTS, ALORS ? ». Un casque, des gants, des chaussures de sécurité ne sortent pas du droit parce que l'arrêté ne les nomme pas : ils relèvent de cet article, qui exige un ÉTAT — la conformité maintenue — et non un rendez-vous. La différence est celle qui gouverne tout le lot : un état se constate à tout moment et se corrige par le remplacement (R. 4323-95), un rendez-vous se date et se prouve par un rapport (arrêté du 19 mars 1993, art. 1er). Le confondre reviendrait à réclamer un vérificateur pour une paire de gants. Rien à porter au calendrier : le produit n'a aucun moyen de constater qu'un équipement est resté conforme, et une case qui l'affirmerait serait la déclaration-qui-ressemble-à-une-preuve que l'ADR-027 interdit.",
    },
  ],
};
