// Corpus : code du travail — le socle du document unique.
//
// DEUX CORPUS DANS UN FICHIER, et il ne pouvait pas y en avoir un seul. Le
// DUERP est écrit à deux étages du Code : le chapitre Ier du titre II de la
// partie LÉGISLATIVE (`L. 4121-1` à `L. 4121-5` — l'obligation de sécurité,
// les neuf principes généraux, l'évaluation, le contenu du document unique) et
// la section 1 du chapitre Ier du même titre en partie RÉGLEMENTAIRE
// (`R. 4121-1` à `R. 4121-4` — la transcription, l'annexe d'exposition, la
// mise à jour, la conservation). Les fondre aurait produit un corpus dont
// l'`etendue` ne pouvait plus être qu'`articles_cites`, alors que chacun des
// deux est ici **intégral** : six articles sur six, cinq articles sur cinq.
// C'est le découpage de `csp-eau-potable.ts`, pour la même raison.
//
// POURQUOI CE LOT EXISTE. Le socle historique du produit était cité partout à
// l'écran — dix-neuf surfaces, du bandeau de synthèse au pied de page du PDF —
// et le corpus n'en portait qu'un seul article, `R. 4121-4`, entré par la
// porte de l'affichage. Le cliquet de `citations-ecran.ts` a mesuré le trou le
// 2026-09-02 : sept des vingt-trois citations orphelines venaient d'ici. Les
// citations n'étaient pas fausses ; rien dans le dépôt ne les fondait.
//
// ── CE QUE LA LECTURE A ÉTABLI, ET QUI NE SE DEVINAIT PAS ────────────────
//
// 1. LE SEUIL DE ONZE AFFICHÉ SUR L'ÉCRAN DE SYNTHÈSE EST JUSTE, et il se lit
//    en deux textes, pas un. `R. 4121-2` 1° : « Au moins chaque année dans les
//    entreprises d'au moins onze salariés ». Il ne prescrit rien d'autre en
//    deçà — c'est `L. 4121-3`, dernier alinéa, qui l'autorise (« celle-ci peut
//    être moins fréquente dans les entreprises de moins de onze salariés […]
//    dans des conditions fixées par décret en Conseil d'Etat »), et
//    `R. 4121-2` EST ce décret (n° 2022-395 du 18 mars 2022). La chaîne est
//    complète et `EFFECTIF_MAJ_ANNUELLE = 11` (`src/lib/dashboard/duerp.ts`)
//    tombe juste.
//
// 2. MAIS L'ANNUEL N'EST QUE LE 1° DE TROIS. Les 2° et 3° — décision
//    d'aménagement important, information supplémentaire portée à la
//    connaissance de l'employeur — s'appliquent SANS condition d'effectif, et
//    sont donc les seules règles de mise à jour pour toute la part de la cible
//    en dessous de onze salariés. Le produit n'en porte rien. Voir l'entrée
//    `R. 4121-2`.
//
// 3. `R. 4121-1` NE S'ARRÊTE PAS OÙ LE DÉPÔT LE COUPE. Cinq surfaces citent
//    l'article entre guillemets, et toutes s'arrêtent à « … en application de
//    l'article L. 4121-3. » La phrase suivante est celle qui fonde le modèle
//    de données du produit — « un inventaire des risques identifiés dans
//    chaque UNITÉ DE TRAVAIL » — et elle se termine par « y compris ceux liés
//    aux ambiances thermiques », dans la version en vigueur depuis le
//    2011-04-01. L'extrait n'est pas faux, il est tronqué juste avant ce qui
//    justifie l'écran. Le verbatim intégral est ci-dessous ; c'est ici sa
//    place, et non dans un `.md`.
//
// 4. LE PDF IMPRIME UNE ANNEXE `R. 4121-1-1` QUI NE REND PAS CE QUE
//    L'ARTICLE DEMANDE. Voir l'entrée, qui est l'une des quatre obligations
//    manquantes de ce lot.
//
// ── SUR LE CHAMP `modifiePar` ────────────────────────────────────────────
//
// Renseigné article par article depuis la mention affichée sous le titre sur
// Légifrance. `null` y signifie ce que le type dit qu'il signifie : la
// question a été posée et **Légifrance n'affiche aucune mention de texte
// modificateur** pour cette version. C'est le cas de `R. 4121-1`,
// `L. 4121-4` et `L. 4121-5`, dont les versions sont anciennes (2011 et 2008)
// et n'ont pas bougé depuis. Ne pas lire ce `null` comme « article jamais
// modifié depuis sa création ».
//
// Le décret n° 2025-482 du 27 mai 2025 (chaleur) a été ouvert pour cette
// raison, et le résultat est négatif : il modifie `R. 4223-13`, `R. 4225-1`,
// `R. 4225-2`, `R. 4323-97`, `R. 4534-143`, `R. 4721-5`, crée les articles
// `R. 4463-1` à `R. 4463-8` et `R. 4535-14`, et ne touche AUCUN article
// `R. 4121-*`. La phrase « y compris ceux liés aux ambiances thermiques » de
// `R. 4121-1` lui est donc antérieure de quatorze ans — vérifié en relisant
// l'article à la date du 2012-01-01, où elle figure déjà. C'est exactement le
// genre de coïncidence qu'on aurait recopiée de mémoire dans le mauvais sens.
//
// En revanche `R. 4463-2`, créé par ce décret, renvoie expressément « au III
// de l'article L. 4121-3-1 » pour les mesures ou actions de prévention à
// définir quand l'évaluation identifie un risque de chaleur intense. Le III
// devient donc l'ancre d'un domaine de plus, et c'est une raison de le lire
// avec attention — voir l'entrée `L. 4121-3-1`.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-02, sur les
// pages de section (rendues côté serveur) recoupées article par article.
//
// AUCUNE OBLIGATION N'EST ENCODÉE PAR CE LOT. `obligations: []` partout sauf
// `R. 4121-4`, repris d'un corpus voisin — voir son entrée.

import type { Corpus } from "./types";

/**
 * Le chapitre Ier du titre II de la quatrième partie, partie législative.
 *
 * `integral` : le chapitre compte exactement six articles — `L. 4121-1`,
 * `L. 4121-2`, `L. 4121-3`, `L. 4121-3-1`, `L. 4121-4`, `L. 4121-5` —, et les
 * six sont ici. Rien n'y est retenu au sens du référentiel de conformité :
 * quatre articles posent des principes qui ne produisent aucun rendez-vous, et
 * les deux autres imposent des choses que le produit ne porte pas.
 */
export const CODE_TRAVAIL_DUERP_PRINCIPES: Corpus = {
  id: "code-travail-duerp-principes",
  intitule:
    "Code du travail — obligations de l'employeur et document unique (partie législative)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178066/",
  etendue: "integral",
  portee:
    "Chapitre Ier « Obligations de l'employeur » du titre II (principes généraux de prévention), partie législative : l'obligation générale de sécurité (L. 4121-1), les neuf principes généraux de prévention (L. 4121-2), l'évaluation des risques et son dernier alinéa qui autorise une mise à jour moins fréquente en deçà de onze salariés (L. 4121-3), le contenu et le régime du document unique (L. 4121-3-1), la prise en compte des capacités du travailleur (L. 4121-4) et la coopération entre employeurs présents sur un même lieu de travail (L. 4121-5). Ce chapitre ne porte AUCUNE périodicité : la seule du domaine est réglementaire (R. 4121-2). Il porte en revanche deux obligations d'employeur que le référentiel ne sert pas — la prise en compte de l'impact différencié de l'exposition selon le sexe (L. 4121-3) et la transmission du document unique au service de prévention et de santé au travail à chaque mise à jour (L. 4121-3-1 VI).",
  articles: [
    {
      ref: "L. 4121-1",
      intitule: "Obligation générale de sécurité de l'employeur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035640828",
      versionEnVigueur: "2017-10-01",
      modifiePar: {
        texte: "Ordonnance n° 2017-1389 du 22 septembre 2017 - art. 2",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur prend les mesures nécessaires pour assurer la sécurité et protéger la santé physique et mentale des travailleurs : actions de prévention, actions d'information et de formation, organisation et moyens adaptés — et il veille à les adapter au changement des circonstances.",
      citationCle:
        "L'employeur prend les mesures nécessaires pour assurer la sécurité et protéger la santé physique et mentale des travailleurs. Ces mesures comprennent : 1° Des actions de prévention des risques professionnels, y compris ceux mentionnés à l'article L. 4161-1 ; 2° Des actions d'information et de formation ; 3° La mise en place d'une organisation et de moyens adaptés. L'employeur veille à l'adaptation de ces mesures pour tenir compte du changement des circonstances et tendre à l'amélioration des situations existantes.",
      statut: "sans_objet",
      motif:
        "C'est la matrice de tout le référentiel, et c'est précisément ce qui la rend inencodable : elle n'a ni destinataire particulier, ni pièce, ni rendez-vous. Les trois catégories de mesures qu'elle énumère sont servies par des articles spéciaux déjà dépouillés — la formation à la sécurité par L. 4141-2 et R. 4141-*, l'information par L. 4141-1 et R. 4141-3-1, l'organisation par L. 4644-1 et L. 4622-1. En tirer une ligne « assurer la sécurité » produirait un item que rien ne solde et que rien ne date : c'est le contraire de ce que le calendrier sait faire. Le 1° renvoie par ailleurs aux facteurs de risques de L. 4161-1, qui sont l'assiette de l'annexe de R. 4121-1-1 — voir cette entrée.",
    },
    {
      ref: "L. 4121-2",
      intitule: "Principes généraux de prévention",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033019913",
      versionEnVigueur: "2016-08-10",
      modifiePar: { texte: "LOI n° 2016-1088 du 8 août 2016 - art. 5" },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur met en œuvre les mesures de L. 4121-1 sur le fondement de neuf principes généraux de prévention, dont l'évitement des risques, la lutte à la source et la priorité de la protection collective sur la protection individuelle.",
      citationCle:
        "L'employeur met en oeuvre les mesures prévues à l'article L. 4121-1 sur le fondement des principes généraux de prévention suivants : 1° Eviter les risques ; 2° Evaluer les risques qui ne peuvent pas être évités ; 3° Combattre les risques à la source ; 4° Adapter le travail à l'homme, en particulier en ce qui concerne la conception des postes de travail ainsi que le choix des équipements de travail et des méthodes de travail et de production, en vue notamment de limiter le travail monotone et le travail cadencé et de réduire les effets de ceux-ci sur la santé ; 5° Tenir compte de l'état d'évolution de la technique ; 6° Remplacer ce qui est dangereux par ce qui n'est pas dangereux ou par ce qui est moins dangereux ; 7° Planifier la prévention en y intégrant, dans un ensemble cohérent, la technique, l'organisation du travail, les conditions de travail, les relations sociales et l'influence des facteurs ambiants, notamment les risques liés au harcèlement moral et au harcèlement sexuel, tels qu'ils sont définis aux articles L. 1152-1 et L. 1153-1, ainsi que ceux liés aux agissements sexistes définis à l'article L. 1142-2-1 ; 8° Prendre des mesures de protection collective en leur donnant la priorité sur les mesures de protection individuelle ; 9° Donner les instructions appropriées aux travailleurs.",
      statut: "sans_objet",
      motif:
        "L'article le plus cité du produit — six surfaces le nomment, du tri des mesures de prévention au garde-fou « seulement des EPI » — et il ne fonde aucune obligation datée : c'est une règle de HIÉRARCHIE, pas une échéance. Le produit l'applique déjà là où elle vaut, dans l'enum `TypeAction` (suppression, réduction à la source, protection collective, protection individuelle, formation, organisationnelle) qui reprend l'ordre des 1° à 9°, et dans l'alerte de sous-cotation. L'inscrire au référentiel de conformité créerait une ligne « respecter les principes généraux » qu'aucun contrôle ne peut fermer. Sa place est celle qu'elle occupe : un tri et un avertissement, pas un rendez-vous. Le 7° porte en outre le harcèlement moral, le harcèlement sexuel et les agissements sexistes, qui ne sont pas des risques que le référentiel sectoriel du DUERP instruit — constat, non traité par ce lot.",
    },
    {
      ref: "L. 4121-3",
      intitule: "Évaluation des risques professionnels",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043893923",
      versionEnVigueur: "2022-03-31",
      modifiePar: { texte: "LOI n° 2021-1018 du 2 août 2021 - art. 3" },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur évalue les risques pour la santé et la sécurité des travailleurs, en tenant compte de l'impact différencié de l'exposition selon le sexe, avec le concours du CSE, du salarié désigné compétent et du service de prévention et de santé au travail ; le dernier alinéa autorise une mise à jour moins fréquente en deçà de onze salariés.",
      citationCle:
        "Cette évaluation des risques tient compte de l'impact différencié de l'exposition au risque en fonction du sexe. […] Lorsque les documents prévus pour l'application du présent article doivent faire l'objet d'une mise à jour, celle-ci peut être moins fréquente dans les entreprises de moins de onze salariés, sous réserve que soit garanti un niveau équivalent de protection de la santé et de la sécurité des travailleurs, dans des conditions fixées par décret en Conseil d'Etat après avis des organisations professionnelles concernées.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "CE QUI EST SERVI : l'évaluation elle-même est le module DUERP, et le dernier alinéa est le fondement du seuil de onze — c'est lui qui renvoie au décret en Conseil d'État, et ce décret est R. 4121-2. La chaîne « la loi autorise la moindre fréquence, le décret dit à partir de quel effectif l'annuel est dû » est complète et l'écran de synthèse la restitue correctement. CE QUI NE L'EST PAS : la phrase « Cette évaluation des risques tient compte de l'impact différencié de l'exposition au risque en fonction du sexe », insérée par la loi n° 2021-1018 et en vigueur depuis le 2022-03-31. Elle n'a AUCUNE occurrence dans le dépôt — ni dans le référentiel sectoriel, ni dans le modèle `Risque`, ni dans les écrans de cotation, ni dans le PDF —, vérifié par balayage de `src/` et de `docs/` le 2026-09-02. Ce n'est pas une nuance rédactionnelle : c'est une exigence de contenu de l'évaluation, opposable depuis quatre ans, sur un document à valeur légale que le produit imprime. Bloquée non par le modèle d'obligations — un état permanent d'établissement conviendrait — mais par une question de conception qui n'est pas tranchée : la porter comme une ligne de conformité (« avoir tenu compte de… ») produirait une case à cocher sans contenu, alors que le texte demande que l'ÉVALUATION en tienne compte, c'est-à-dire une modification du questionnaire et du modèle de risque. Nommé ici, non comblé.",
    },
    {
      ref: "L. 4121-3-1",
      intitule:
        "Document unique d'évaluation des risques professionnels : contenu, suites, conservation, transmission",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043893919",
      versionEnVigueur: "2022-03-31",
      modifiePar: { texte: "LOI n° 2021-1018 du 2 août 2021 - art. 3" },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le document unique répertorie l'ensemble des risques et assure la traçabilité collective des expositions ; ses résultats débouchent sur un programme annuel de prévention à cinquante salariés et plus, ou sur une liste d'actions consignée au document en deçà ; il est conservé quarante ans, déposé sur un portail numérique national, et transmis au service de prévention et de santé au travail à chaque mise à jour.",
      citationCle:
        "III.-Les résultats de cette évaluation débouchent : 1° Pour les entreprises dont l'effectif est supérieur ou égal à cinquante salariés, sur un programme annuel de prévention des risques professionnels et d'amélioration des conditions de travail qui : a) Fixe la liste détaillée des mesures devant être prises au cours de l'année à venir, qui comprennent les mesures de prévention des effets de l'exposition aux facteurs de risques professionnels ainsi que, pour chaque mesure, ses conditions d'exécution, des indicateurs de résultat et l'estimation de son coût ; b) Identifie les ressources de l'entreprise pouvant être mobilisées ; c) Comprend un calendrier de mise en œuvre ; 2° Pour les entreprises dont l'effectif est inférieur à cinquante salariés, sur la définition d'actions de prévention des risques et de protection des salariés. La liste de ces actions est consignée dans le document unique d'évaluation des risques professionnels et ses mises à jour. […] VI.-Le document unique d'évaluation des risques professionnels est transmis par l'employeur à chaque mise à jour au service de prévention et de santé au travail auquel il adhère.",
      statut: "obligation_manquante",
      cause: "module",
      toucheLaCible: true,
      motif:
        "DEUX MANQUES, ET LE SECOND VAUT POUR TOUTE LA CIBLE. (1) Le VI : « Le document unique est transmis par l'employeur à chaque mise à jour au service de prévention et de santé au travail auquel il adhère. » Aucun seuil d'effectif, aucune condition — l'obligation est due par tout employeur adhérent, c'est-à-dire tous, l'adhésion étant elle-même obligatoire (L. 4622-1, encodé sous `sante-travail-etablissement-adhesion-spst`). Le référentiel ne porte rien : zéro occurrence d'une transmission du DUERP au SPST, vérifié le 2026-09-02. C'est une obligation événementielle — elle se date sur la validation d'une version, que le produit connaît pourtant à la seconde près —, et il n'y a pas de déclencheur « événement » au modèle (ADR-022). C'est le même blocage que R. 4141-8 et R. 4141-12, à une différence près qui la rend plus frustrante : ici, l'événement déclencheur est un acte de l'outil lui-même. (2) Le III 1° : le programme annuel de prévention est dû « pour les entreprises dont l'effectif est supérieur ou égal à cinquante salariés ». L'ADR-031 refuse au-delà de cinquante travailleurs, donc cinquante pile est DANS la cible, et l'établissement qui franchit le seuil en cours de vie garde son dossier. Or ce programme n'est pas la liste d'actions du 2° : il exige pour chaque mesure ses conditions d'exécution, des indicateurs de résultat et l'estimation de son coût, plus les ressources mobilisables et un calendrier. Le modèle `Action` (prisma/schema.prisma) porte libellé, description, type, statut, criticité, échéance et responsable — ni coût, ni indicateur, ni ressource. Le produit sert le 2° et pas le 1°, et rien ne le dit à l'utilisateur qui atteint cinquante. Le V B (dépôt sur le portail national) est, lui, déjà déclaré non produit dans `documents-obligatoires.ts` et hors périmètre assumé — il n'est pas compté ici.",
    },
    {
      ref: "L. 4121-4",
      intitule: "Prise en compte des capacités du travailleur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903150",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Lorsqu'il confie des tâches à un travailleur, l'employeur prend en considération les capacités de l'intéressé à mettre en œuvre les précautions nécessaires pour la santé et la sécurité.",
      citationCle:
        "Lorsqu'il confie des tâches à un travailleur, l'employeur, compte tenu de la nature des activités de l'établissement, prend en considération les capacités de l'intéressé à mettre en oeuvre les précautions nécessaires pour la santé et la sécurité.",
      statut: "sans_objet",
      motif:
        "Règle d'appréciation au moment d'une affectation : ni périodicité, ni pièce, ni destinataire de contrôle. Elle se manifeste dans le référentiel par les obligations qui la mettent en œuvre au cas par cas — l'autorisation de conduite de R. 4323-56, l'habilitation électrique de R. 4544-10, l'aptitude médicale — et n'ajoute rien qui puisse se dater. L'encoder produirait une ligne dont personne ne pourrait dire si elle est satisfaite.",
    },
    {
      ref: "L. 4121-5",
      intitule: "Coopération des employeurs sur un même lieu de travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903151",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Lorsque les travailleurs de plusieurs entreprises sont présents dans un même lieu de travail, les employeurs coopèrent à la mise en œuvre des dispositions relatives à la santé et à la sécurité au travail.",
      citationCle:
        "Lorsque dans un même lieu de travail les travailleurs de plusieurs entreprises sont présents, les employeurs coopèrent à la mise en oeuvre des dispositions relatives à la santé et à la sécurité au travail.",
      statut: "sans_objet",
      motif:
        "Le principe dont le titre V du livre V tire ses obligations concrètes — inspection commune préalable, plan de prévention écrit au-delà de quatre cents heures ou pour les travaux dangereux, protocole de sécurité de chargement. Ces articles sont dépouillés au corpus `code-travail-co-activite` (R. 4515-1 à R. 4515-11) et servis par le module `PlanPrevention`. L'article lui-même n'ajoute aucune formalité : il énonce le devoir de coopération que les autres organisent. Consigné pour que le prochain lecteur ne le rouvre pas en croyant y trouver le fondement du plan de prévention — il n'y est pas.",
    },
  ],
};

/**
 * La section 1 du chapitre Ier, partie réglementaire.
 *
 * `integral` : la section compte exactement cinq articles — `R. 4121-1`,
 * `R. 4121-1-1`, `R. 4121-2`, `R. 4121-3`, `R. 4121-4` —, et les cinq sont
 * ici. C'est la section qui porte la SEULE périodicité du domaine, et c'est
 * elle que l'écran de synthèse cite au dirigeant.
 */
export const CODE_TRAVAIL_DUERP: Corpus = {
  id: "code-travail-duerp",
  intitule:
    "Code du travail — document unique d'évaluation des risques (partie réglementaire)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000023793886/",
  etendue: "integral",
  portee:
    "Section 1 « Document unique d'évaluation des risques » du chapitre Ier du titre II, partie réglementaire : la transcription et l'inventaire par unité de travail (R. 4121-1), l'annexe des expositions aux facteurs de risques de L. 4161-1 (R. 4121-1-1), les trois déclencheurs de mise à jour dont l'annuel à onze salariés (R. 4121-2), l'usage du document pour le rapport annuel présenté au CSE (R. 4121-3) et la conservation quarante ans avec l'avis d'accès affiché (R. 4121-4). Une seule périodicité dans toute la section, et elle est conditionnée à l'effectif : R. 4121-2 1°. Les deux autres déclencheurs du même article ne le sont pas et ne sont portés par rien.",
  articles: [
    {
      ref: "R. 4121-1",
      intitule: "Transcription des résultats de l'évaluation",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023795562",
      versionEnVigueur: "2011-04-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques ; cette évaluation comporte un inventaire des risques identifiés dans chaque unité de travail, y compris ceux liés aux ambiances thermiques.",
      citationCle:
        "L'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques pour la santé et la sécurité des travailleurs à laquelle il procède en application de l'article L. 4121-3. Cette évaluation comporte un inventaire des risques identifiés dans chaque unité de travail de l'entreprise ou de l'établissement, y compris ceux liés aux ambiances thermiques.",
      statut: "sans_objet",
      motif:
        "L'article qui fait exister le produit, et qui pour cette raison n'est pas une ligne du référentiel de conformité : la transcription EST le module DUERP — unités de travail, risques cotés, version figée à chaque validation, conservation. Le porter en obligation d'établissement doublerait le module d'une case à cocher qui dirait la même chose moins bien. LE POINT À RETENIR N'EST PAS LE STATUT MAIS LE VERBATIM. Cinq surfaces citent cet article entre guillemets et toutes s'arrêtent à « … en application de l'article L. 4121-3 », c'est-à-dire juste avant la phrase qui fonde le modèle de données : l'inventaire par UNITÉ DE TRAVAIL, dont l'ADR-033 borne le nombre à cinq. La citation tronquée n'est pas fausse ; elle coupe l'article au moment précis où il justifie l'écran qui l'affiche. Le verbatim intégral est ci-dessus, et il inclut « y compris ceux liés aux ambiances thermiques » — présent dans la version de 2011, donc SANS RAPPORT avec le décret chaleur de 2025, qui ne touche aucun R. 4121-*. Vérifié en relisant l'article à la date du 2012-01-01.",
    },
    {
      ref: "R. 4121-1-1",
      intitule:
        "Annexe du document unique : expositions et proportion de salariés exposés",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031818152",
      versionEnVigueur: "2016-01-01",
      modifiePar: { texte: "Décret n° 2015-1885 du 30 décembre 2015 - art. 2" },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur consigne en annexe du document unique les données collectives utiles à l'évaluation des expositions individuelles aux facteurs de risques de L. 4161-1, et la proportion de salariés exposés au-delà des seuils, actualisée en tant que de besoin à chaque mise à jour.",
      citationCle:
        "L'employeur consigne, en annexe du document unique : 1° Les données collectives utiles à l'évaluation des expositions individuelles aux facteurs de risques mentionnés à l'article L. 4161-1 de nature à faciliter la déclaration mentionnée à cet article, le cas échéant à partir de l'identification de postes, métiers ou situations de travail figurant dans un accord collectif étendu ou un référentiel professionnel de branche homologué mentionnés à l'article L. 4161-2 ; 2° La proportion de salariés exposés aux facteurs de risques professionnels mentionnés à l'article L. 4161-1, au-delà des seuils prévus au même article. Cette proportion est actualisée en tant que de besoin lors de la mise à jour du document unique.",
      statut: "obligation_manquante",
      cause: "module",
      toucheLaCible: true,
      motif:
        "[2026-09-20 — LE CONSTAT QUI SUIT EST RÉPARÉ, L'OBLIGATION RESTE MANQUANTE. La page du PDF ne s'annonce plus comme l'annexe de cet article : `src/lib/pdf/mentions-exposition.ts` l'intitule « Expositions relevées — dénombrement indicatif » et écrit en toutes lettres « Ce n'est pas l'annexe prévue par l'article R. 4121-1-1 et cela ne la remplace pas ». Ce qui manque toujours : le produit ne sait pas PRODUIRE cette annexe, faute de rattacher un risque aux facteurs de L. 4161-1 — d'où `cause: \"module\"`. Le texte d'origine suit, pour ce qu'il établit du manque.] ~~LE PDF IMPRIME UNE ANNEXE À CE NUMÉRO, ET ELLE NE REND PAS CE QUE L'ARTICLE DEMANDE.~~ `src/lib/pdf/DuerpDocument.tsx` produit une page « Annexe — Exposition (R. 4121-1-1) » dont le sous-titre annonce « la proportion de salariés exposés au-delà des seuils réglementaires », et dont le tableau donne quatre colonnes : le libellé du risque du DUERP, l'unité, un NOMBRE de salariés exposés, une date de dernières mesures physiques et un drapeau CMR. Trois écarts, dans l'ordre de gravité. (a) Ce n'est pas une proportion mais un effectif brut, et le mot « proportion » est celui du texte. (b) L'assiette n'est pas celle de l'article : les lignes sont les risques du référentiel sectoriel du produit, pas les dix facteurs de L. 4161-1 (manutentions manuelles, postures pénibles, vibrations mécaniques ; agents chimiques dangereux, milieu hyperbare, températures extrêmes, bruit ; travail de nuit, équipes successives alternantes, travail répétitif — verbatim relevé le 2026-09-02, version en vigueur depuis le 2017-10-01). Rien dans le modèle `Risque` (nombreSalariesExposes, dateMesuresPhysiques, exposeCMR) ne rattache un risque à un facteur. (c) Le drapeau CMR n'est pas un facteur de L. 4161-1 : le facteur est « agents chimiques dangereux, y compris les poussières et les fumées », plus large et différemment borné. CE QUI N'A PAS PU ÊTRE ÉTABLI, et qui est le nœud : le 2° renvoie « aux seuils prévus au même article », or L. 4161-1 dans sa version en vigueur depuis 2017 NE FIXE PLUS AUCUN SEUIL — il définit les dix facteurs et renvoie leur précision à un décret (II). D. 4161-1, seul article survivant de son chapitre, définit les facteurs sans les chiffrer ; D. 4161-2 à D. 4161-4, qui portaient les seuils, sont abrogés depuis le 2017-12-29 (décret n° 2017-1769). Où vivent aujourd'hui les seuils auxquels R. 4121-1-1 2° renvoie n'a pas été tranché par ce lot, et l'encoder sans le savoir reviendrait à fabriquer une exigence chiffrée sur un renvoi en l'air. L'obligation est donc déclarée manquante avec sa question ouverte, plutôt que comblée. À traiter avant d'y toucher : le sous-titre de l'annexe du PDF affirme rendre une proportion réglementaire qu'il ne rend pas.",
    },
    {
      ref: "R. 4121-2",
      intitule: "Mise à jour du document unique",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045386446",
      versionEnVigueur: "2022-03-31",
      modifiePar: { texte: "Décret n° 2022-395 du 18 mars 2022 - art. 1" },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "La mise à jour du document unique est réalisée au moins chaque année dans les entreprises d'au moins onze salariés, lors de toute décision d'aménagement important, et lorsqu'une information supplémentaire intéressant l'évaluation d'un risque est portée à la connaissance de l'employeur.",
      citationCle:
        "La mise à jour du document unique d'évaluation des risques professionnels est réalisée : 1° Au moins chaque année dans les entreprises d'au moins onze salariés ; 2° Lors de toute décision d'aménagement important modifiant les conditions de santé et de sécurité ou les conditions de travail ; 3° Lorsqu'une information supplémentaire intéressant l'évaluation d'un risque est portée à la connaissance de l'employeur. La mise à jour du programme annuel de prévention des risques professionnels et d'amélioration des conditions de travail ou de la liste des actions de prévention et de protection mentionnés au III de l'article L. 4121-3-1 est effectuée à chaque mise à jour du document unique d'évaluation des risques professionnels, si nécessaire.",
      statut: "retenu",
      obligations: ["prevention-etablissement-mise-a-jour-duerp-sur-fait"],
      historique:
        "Obligation manquante jusqu'au 2026-09-21 (cause `evenement`), encodée avec la page « Quand ça arrive ». Son motif d'alors : LE SEUIL AFFICHÉ À L'ÉCRAN EST JUSTE, ET C'EST LE PREMIER RÉSULTAT DE CETTE LECTURE. `/duerp/[id]/synthese` écrit « Mise à jour requise · art. R. 4121-2 » et « obligatoire pour les entreprises d'au moins 11 salariés » ; le texte dit « Au moins chaque année dans les entreprises d'au moins onze salariés ». `EFFECTIF_MAJ_ANNUELLE = 11` dans `src/lib/dashboard/duerp.ts` tombe sur le bon chiffre, et l'article qui le porte est bien celui qui est cité — les deux étaient à vérifier séparément, un seuil juste pouvant être attribué au mauvais article. CE QUI MANQUE EST LE RESTE DE L'ARTICLE. Les 2° et 3° s'appliquent SANS condition d'effectif : toute décision d'aménagement important modifiant les conditions de santé et de sécurité ou les conditions de travail, et toute information supplémentaire intéressant l'évaluation d'un risque. Pour un établissement de moins de onze salariés — la majorité de la cible du produit — ce sont les SEULES règles de mise à jour, et le dossier ne lui en dit rien : la page de synthèse ne mentionne que l'annuel, `evaluerEtatDuerp` ne connaît que l'anniversaire, et le calendrier ne peut rien porter faute de date. Seule la page publique `Questions.tsx` les énonce, à un endroit que le titulaire d'un dossier ne relit pas. Ces deux déclencheurs sont événementiels et l'ADR-022 n'implémente pas d'axe « événement » — même blocage que R. 4141-8, R. 4141-12 et L. 4121-3-1 VI. Le sens de l'erreur est le mauvais : le dirigeant qui a le plus besoin qu'on le lui dise est celui à qui l'outil ne dit rien. Dernier alinéa non traité non plus : la mise à jour de la liste d'actions du III de L. 4121-3-1 à chaque mise à jour du document. — [2026-09-21 : l'obligation encodée ne porte que les 2° et 3° ; le 1°, annuel à partir de onze salariés, reste servi par `evaluerEtatDuerp`.]",
    },
    {
      ref: "R. 4121-3",
      intitule: "Usage du document unique pour le rapport annuel au CSE",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045386448",
      versionEnVigueur: "2022-03-31",
      modifiePar: { texte: "Décret n° 2022-395 du 18 mars 2022 - art. 1" },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Dans les établissements dotés d'un comité social et économique, le document unique est utilisé pour l'établissement du rapport annuel prévu au 1° de l'article L. 2312-27.",
      citationCle:
        "Dans les établissements dotés d'un comité social et économique, le document unique d'évaluation des risques professionnels est utilisé pour l'établissement du rapport annuel prévu au 1° de l'article L. 2312-27.",
      statut: "sans_objet",
      motif:
        "Règle d'articulation, et non obligation autonome : elle dit à quoi le document unique SERT, elle ne crée ni pièce ni échéance. L'obligation de présenter le rapport annuel est portée par L. 2312-27, qui n'a pas été ouvert par ce lot — le corpus `code-travail-organisation-prevention` s'arrête à L. 2311-2 (seuil du CSE) et aux articles de formation des élus. Savoir si ce rapport entre au périmètre du produit reste donc une question ouverte, et elle se tranche sur L. 2312-27, pas ici. Consigné pour que le prochain lecteur ne conclue pas de la présence de cet article que la question a été instruite.",
    },
    {
      ref: "R. 4121-4",
      intitule:
        "Mise à disposition du document unique et avis d'accès des travailleurs",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045386451",
      versionEnVigueur: "2022-03-31",
      modifiePar: { texte: "Décret n° 2022-395 du 18 mars 2022 - art. 1" },
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le document unique et ses versions antérieures sont tenus quarante ans à la disposition de sept catégories de destinataires ; un avis indiquant les modalités d'accès des travailleurs est affiché à une place convenable et aisément accessible.",
      statut: "retenu",
      obligations: ["information-etablissement-avis-acces-duerp"],
      // ENTRÉE DE RAPPEL, VOLONTAIREMENT SANS `citationCle` NI `reserve`. Le
      // dépouillement de cet article vit dans `code-travail-information-
      // travailleurs`, où il est entré le 2026-08-31 par la porte de
      // l'affichage obligatoire, avec son verbatim et sa réserve. Il est repris
      // ici pour une seule raison : sans lui, la section 1 ne pourrait pas se
      // déclarer `integral`, et un corpus qui saute un article de la section
      // qu'il prétend couvrir ment sur son étendue. La duplication inter-corpus
      // est prévue et bornée — `indexArticlesParRef()` garde la première
      // lecture réelle, et `corpus.test.ts` exige seulement que les deux
      // entrées portent le MÊME statut. Le verbatim et la réserve ne sont pas
      // recopiés : `reservesDeLecture()` les compterait deux fois, ce qui
      // gonflerait la dette de lecture d'une réserve qui n'existe qu'une fois.
      // `luLe` est celui de la lecture d'origine, pas celui de ce lot — on ne
      // redate pas une lecture qu'on n'a pas refaite.
    },
  ],
};
