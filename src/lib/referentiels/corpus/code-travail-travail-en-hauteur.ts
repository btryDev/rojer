// Corpus : code du travail — travaux temporaires en hauteur, et l'arrêté qui
// fixe les vérifications des échafaudages.
//
// CE FICHIER NE COMBLE PAS LE TROU, IL LE MESURE. Au 2026-09-01, le
// référentiel ne portait AUCUNE obligation et ne citait AUCUN article de ce
// domaine — vérifié au grep sur `4323-5[89]`, `4323-[6-9][0-9]`, `hauteur`,
// `échafaud`, tous corpus et toutes obligations confondus : zéro. Ce
// dépouillement établit ce que les textes imposent, à qui, et pourquoi rien
// n'est encodé. Il ne crée aucune obligation : encoder demanderait deux
// extensions de modèle que ce lot n'avait pas mandat de décider (voir
// « CE QU'IL FAUDRAIT POUR ENCODER » plus bas).
//
// POURQUOI LE TROU EXISTAIT. Le sujet avait été rangé avec les EPI, qui sont
// hors périmètre. Vérification faite dans `.claude/CLAUDE.md` avant d'écrire
// une ligne : l'exclusion y porte sur le REGISTRE des EPI (§ « Hors périmètre
// (à ce jour) », dernière puce : « Registres non couverts : accidents du
// travail / AT bénins, dangers graves et imminents, EPI »), et le travail en
// hauteur y est au contraire nommé DANS le périmètre — cinquième déclencheur,
// « Activité réellement exercée — un fait de tâche, ni statut ni équipement :
// habilitation électrique, conduite d'engins, travail en hauteur ». Les deux
// mentions sont à trente lignes l'une de l'autre dans le même fichier.
//
// ⚠ « R. 4323-58 ET SUIVANTS » NE DIT PAS OÙ ÇA S'ARRÊTE, et la borne réelle
// n'est pas devinable. La section a été ouverte en entier : c'est la
// **section 8** du chapitre III, et elle court de `R. 4323-58` à
// `R. 4323-90` — **33 articles**, quatre sous-sections, dont un paragraphe
// entier sur les échelles, escabeaux et marchepieds que « et suivants »
// n'annonçait pas. Les 33 sont ici, y compris ceux dont il n'y a rien à tirer :
// c'est ce que `etendue: "integral"` veut dire, et ce corpus est le premier du
// dépôt à pouvoir écrire « 33 articles sur 33 » sur une section entière.
//
// ⚠ AUCUN DES 33 ARTICLES NE PORTE DE PÉRIODICITÉ CHIFFRÉE. Pas un. Les trois
// seules périodicités opposables du domaine sont dans un texte que « R. 4323-58
// et s. » ne mentionne pas — l'**arrêté du 21 décembre 2004**, pris sur le
// fondement des articles alors numérotés R. 233-11, R. 233-11-1 et R. 233-11-2,
// devenus `R. 4323-22`, `R. 4323-23` et `R. 4323-24` au 1er mai 2008. C'est le
// second corpus de ce fichier. Un dépouillement arrêté à la section aurait
// conclu « pas de périodicité dans ce domaine », et se serait trompé de trois.
//
// ⚠ LE RENVOI DE FORMATION NE CHIFFRE RIEN, ET C'EST LA RÉPONSE. `R. 4323-69`
// (montage d'échafaudage) et `R. 4323-89` 6° (cordes) renvoient tous deux le
// renouvellement de la formation à `R. 4323-3`, qui a été ouvert pour cette
// raison — version en vigueur du 01/05/2008, lu le 2026-09-01 :
//
//   « La formation à la sécurité dont bénéficient les travailleurs chargés de
//   l'utilisation ou de la maintenance des équipements de travail est
//   renouvelée et complétée aussi souvent que nécessaire pour prendre en compte
//   les évolutions de ces équipements. »
//
// « Aussi souvent que nécessaire » n'est pas un rythme. La périodicité de ces
// deux formations est donc `autre`, et c'est une constatation, pas un aveu.
// `R. 4323-3` n'est PAS inscrit comme article de ce corpus : il n'appartient
// pas à la section 8, et l'y faire entrer casserait la seule chose que
// `etendue: "integral"` permet d'affirmer ici. Il est lu, daté et cité, ce qui
// est ce qu'on lui demande.
//
// ⚠ LE PIÈGE DE LA NORME PRIVÉE, ET IL EST PARTICULIÈREMENT DENSE ICI. Le
// domaine du travail en hauteur est celui où la documentation professionnelle
// remplace le plus souvent le texte. On lit couramment « recyclage de la
// formation échafaudage tous les cinq ans » et « vérification trimestrielle
// R 408 » : la **recommandation R 408 de la CNAM** n'est pas une source
// opposable, et elle n'est le fondement de rien dans ce corpus. Les cinq ans
// n'existent dans AUCUN texte — le Code écrit « aussi souvent que nécessaire »
// (`R. 4323-3`). Les trois mois, eux, existent, mais dans l'arrêté du
// 21 décembre 2004, art. 6, pas dans la R 408. Ce qui fonde est le texte ; la
// recommandation est nommée ici uniquement pour qu'on cesse de la confondre
// avec lui.
//
// CE QU'IL FAUDRAIT POUR ENCODER, et qui n'est pas un travail de dépouillement :
//
//  1. **Une catégorie d'équipement « échafaudage »**. `CATEGORIES_EQUIPEMENT`
//     n'en a pas (18 valeurs, aucune approchante) ; les trois vérifications de
//     l'arrêté du 21 décembre 2004 sont portées par l'échafaudage lui-même, pas
//     par l'établissement. Elles sont sans porteur tant que la catégorie
//     n'existe pas.
//  2. **Un attribut d'établissement disant que l'activité s'exerce**. Le
//     cinquième déclencheur de l'ADR-022 — « activité réellement exercée » —
//     est nommé dans le CLAUDE.md et n'a aucun attribut dans le modèle : rien
//     ne permet de savoir qu'un établissement fait travailler en hauteur. Sans
//     lui, les obligations de méthode s'appliqueraient à tous les dossiers ou
//     à aucun, et « à tous » est une sur-application muette.
//
// Aucune des deux n'est tranchable depuis un dépouillement, et les inventer
// aurait produit exactement le genre de faux positif que la revue proscrit.
//
// CE QUE CE DOMAINE DOIT AU DUERP PLUTÔT QU'AUX ÉCHÉANCES. `R. 4323-63` —
// l'interdiction d'utiliser une échelle ou un escabeau comme poste de travail —
// est l'article qui touche le plus les trois secteurs cibles, et il ne produit
// aucune échéance : il produit un risque à évaluer. Il est le seul article de
// la section classé `non_couvert` plutôt que `sans_objet`, parce qu'une
// obligation réelle y vise des établissements que le produit sert déjà, et que
// le produit n'en dit rien nulle part — donc sans `declareA`, c'est-à-dire un
// silence, pas une déclaration.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-01. Les
// 33 articles de la section 8 sont tous en vigueur depuis le 01/05/2008
// (décret n° 2008-244 du 7 mars 2008) — vérifié article par article, aucun
// abrogé, aucune version future programmée.

import type { Corpus } from "./types";

const URL = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

/** Tous les articles de la section 8 datent du même décret de recodification. */
const V2008 = "2008-05-01";
const LU = "2026-09-01";

export const CODE_TRAVAIL_TRAVAIL_EN_HAUTEUR: Corpus = {
  id: "code-travail-travail-en-hauteur",
  intitule:
    "Code du travail — travaux temporaires en hauteur (section 8, R. 4323-58 à R. 4323-90)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489845/",
  etendue: "integral",
  portee:
    "La section 8 du chapitre III du titre II du livre III de la quatrième partie — « Dispositions particulières applicables à l'exécution de travaux temporaires en hauteur et à certains équipements de travail utilisés à cette fin » — lue de bout en bout, ses 33 articles sans exception. Quatre sous-sections : travaux réalisés à partir d'un plan de travail (R. 4323-58 à -61), travaux réalisés au moyen d'équipements de travail (R. 4323-62 à -64), conditions générales de travail, d'accès et de circulation en hauteur (R. 4323-65 à -68), puis caractéristiques et conditions particulières d'utilisation (R. 4323-69 à -90), elle-même divisée en trois paragraphes : échafaudages (R. 4323-69 à -80), échelles, escabeaux et marchepieds (R. 4323-81 à -88), cordes (R. 4323-89 et -90). La section s'adresse à tout employeur, sans seuil d'effectif ni condition de secteur. ATTENTION : elle ne contient AUCUNE périodicité chiffrée — les trois périodicités opposables du domaine sont dans l'arrêté du 21 décembre 2004, corpus voisin de ce même fichier.",
  articles: [
    // ── Sous-section 1 : travaux réalisés à partir d'un plan de travail ──
    {
      ref: "R. 4323-58",
      intitule:
        "Principe : les travaux temporaires en hauteur se font depuis un plan de travail",
      url: URL("LEGIARTI000018531397"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur fait réaliser les travaux temporaires en hauteur depuis un plan de travail conçu, installé ou équipé pour préserver la santé et la sécurité, et permettant l'exécution dans des conditions ergonomiques.",
      citationCle:
        "Les travaux temporaires en hauteur sont réalisés à partir d'un plan de travail conçu, installé ou équipé de manière à préserver la santé et la sécurité des travailleurs. Le poste de travail est tel qu'il permet l'exécution des travaux dans des conditions ergonomiques.",
      statut: "sans_objet",
      motif:
        "L'article pose le principe dont toute la section décline les modalités ; il ne produit par lui-même ni échéance, ni pièce, ni état datable. C'est une règle de méthode, qui se vérifie sur le chantier au moment où il a lieu, et que rien dans le produit ne pourrait solder — cocher « fait » n'aurait aucun sens sur une obligation qui se renouvelle à chaque intervention.\n\nIl n'est pas pour autant sans effet : c'est lui qui rend `R. 4323-63` (échelle interdite comme poste de travail) intelligible, en disant ce qu'il aurait fallu faire à la place.",
    },
    {
      ref: "R. 4323-59",
      intitule: "Garde-corps : caractéristiques du dispositif de protection",
      url: URL("LEGIARTI000018531395"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "La prévention des chutes depuis un plan de travail est assurée par des garde-corps rigides placés entre 1 m et 1,10 m, comportant plinthe de 10 à 15 cm, main courante et lisse intermédiaire — ou par tout autre moyen d'une sécurité équivalente.",
      citationCle:
        "La prévention des chutes de hauteur à partir d'un plan de travail est assurée : 1° Soit par des garde-corps intégrés ou fixés de manière sûre, rigides et d'une résistance appropriée, placés à une hauteur comprise entre un mètre et 1,10 m et comportant au moins : a) Une plinthe de butée de 10 à 15 cm, en fonction de la hauteur retenue pour les garde-corps ; b) Une main courante ; c) Une lisse intermédiaire à mi-hauteur ; 2° Soit par tout autre moyen assurant une sécurité équivalente.",
      statut: "sans_objet",
      motif:
        "Spécification dimensionnelle d'un dispositif, pas une échéance. Elle décrit ce qu'un garde-corps doit être, à l'instant où quelqu'un travaille derrière : il n'y a ni date de départ, ni renouvellement, ni document. Un référentiel d'échéances qui prétendrait porter « le garde-corps mesure entre 1 m et 1,10 m » afficherait une ligne que personne ne peut solder.",
    },
    {
      ref: "R. 4323-60",
      intitule: "Dispositifs de recueil souples, à défaut de garde-corps",
      url: URL("LEGIARTI000018531393"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "À défaut de garde-corps, des dispositifs de recueil souples sont installés de manière à éviter une chute de plus de trois mètres.",
      citationCle:
        "Lorsque les dispositions de l'article R. 4323-59 ne peuvent être mises en œuvre, des dispositifs de recueil souples sont installés et positionnés de manière à permettre d'éviter une chute de plus de trois mètres.",
      statut: "sans_objet",
      motif:
        "Deuxième cran d'une cascade de protection à trois niveaux (R. 4323-59 collectif rigide, puis -60 recueil souple, puis -61 protection individuelle). Les trois mètres bornent une hauteur de chute, pas une durée : ce n'est ni une périodicité ni une échéance, et le lire comme un seuil déclencheur d'obligation serait un contresens.",
    },
    {
      ref: "R. 4323-61",
      intitule:
        "Protection individuelle en dernier recours — et notice des points d'ancrage",
      url: URL("LEGIARTI000018531391"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Quand aucune protection collective n'est possible, la protection individuelle est assurée par un système d'arrêt de chute limitant la chute libre à un mètre ; le travailleur ne reste jamais seul ; et l'employeur PRÉCISE DANS UNE NOTICE les points d'ancrage, les dispositifs d'amarrage et les modalités d'utilisation de l'équipement.",
      citationCle:
        "L'employeur précise dans une notice les points d'ancrage, les dispositifs d'amarrage et les modalités d'utilisation de l'équipement de protection individuelle.",
      statut: "obligation_manquante",
      cause: "activite_exercee",
      toucheLaCible: true,
      motif:
        "Le troisième alinéa met à la charge de l'employeur un DOCUMENT qu'il rédige et détient : la notice des points d'ancrage. C'est le seul élément de la sous-section 1 qui ne soit ni une dimension ni une règle de geste, et c'est à ce titre qu'il se distingue de `R. 4323-59` et `-60`, classés sans objet — un document se constitue, se date, se montre à un contrôle, et se voit manquer.\n\nPORTEUR : établissement. La notice décrit les ancrages d'un lieu, pas la formation d'une personne ni la révision d'une machine.\nNATURE : état permanent (ADR-026) — à constituer une fois, puis à maintenir à jour quand les ancrages changent.\nPÉRIODICITÉ : `autre`. Le texte ne chiffre rien, et il n'y a rien à chiffrer : une notice ne se renouvelle pas à échéance, elle suit l'installation.\n\nCE QUE CE N'EST PAS : une obligation relative aux EPI, qui sont hors périmètre par leur REGISTRE. L'obligation porte sur la notice de l'employeur, pas sur la vérification périodique du harnais. La confusion des deux est précisément ce qui avait fait ranger tout le domaine hors périmètre.",
      bloquePar:
        "Le déclencheur manque, pas le porteur. L'établissement sait porter un état permanent sans échéance depuis l'ADR-022, mais rien dans le modèle ne dit qu'un établissement fait travailler en hauteur : le cinquième déclencheur de l'ADR-022, « activité réellement exercée », est nommé dans le CLAUDE.md et n'a aucun attribut. Encoder sans lui appliquerait la notice d'ancrage aux 100 % des dossiers, bureaux compris — une sur-application muette sur une obligation qui ne concerne, dans les trois secteurs cibles, qu'une minorité d'établissements.",
    },

    // ── Sous-section 2 : travaux réalisés au moyen d'équipements de travail ──
    {
      ref: "R. 4323-62",
      intitule:
        "Choix des équipements quand le plan de travail est impossible — priorité au collectif",
      url: URL("LEGIARTI000018531387"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "À défaut de plan de travail, les équipements appropriés sont choisis pour assurer des conditions sûres, la priorité étant donnée à ceux qui assurent une protection collective, avec des dimensions adaptées aux travaux et aux contraintes prévisibles.",
      citationCle:
        "Lorsque les travaux temporaires en hauteur ne peuvent être exécutés à partir du plan de travail tel que mentionné à l'article R. 4323-58, les équipements de travail appropriés sont choisis pour assurer et maintenir des conditions de travail sûres. La priorité est donnée aux équipements de travail assurant une protection collective.",
      statut: "sans_objet",
      motif:
        "Règle de choix, exercée au moment où l'on décide comment mener une intervention. Elle n'a ni date, ni pièce, ni récurrence : c'est un arbitrage à faire, pas un rendez-vous à tenir. Elle est le pivot juridique du reste de la section — c'est elle qui ouvre l'usage des échafaudages, échelles et cordes traités à la sous-section 4 — mais un pivot ne s'encode pas.",
    },
    {
      ref: "R. 4323-63",
      intitule:
        "Interdiction d'utiliser échelles, escabeaux et marchepieds comme poste de travail",
      url: URL("LEGIARTI000018531385"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Il est INTERDIT d'utiliser les échelles, escabeaux et marchepieds comme poste de travail ; ils ne sont admis qu'en cas d'impossibilité technique de recourir à une protection collective, ou lorsque l'évaluation du risque a établi que le risque est faible et qu'il s'agit de travaux de courte durée ne présentant pas un caractère répétitif.",
      citationCle:
        "Il est interdit d'utiliser les échelles, escabeaux et marchepieds comme poste de travail. Toutefois, ces équipements peuvent être utilisés en cas d'impossibilité technique de recourir à un équipement assurant la protection collective des travailleurs ou lorsque l'évaluation du risque a établi que ce risque est faible et qu'il s'agit de travaux de courte durée ne présentant pas un caractère répétitif.",
      statut: "non_couvert",
      motif:
        "L'ARTICLE DE LA SECTION QUI TOUCHE LE PLUS LES TROIS SECTEURS CIBLES, et le produit n'en dit rien. Un restaurant, un commerce et un bureau n'érigent pratiquement jamais d'échafaudage ni ne travaillent sur cordes ; tous les trois utilisent un escabeau, toutes les semaines — réassort d'un rayon haut, nettoyage d'une hotte, changement d'un tube, décoration de vitrine. C'est là que le risque de chute de hauteur se réalise dans ces secteurs, et c'est l'article qui l'encadre.\n\nCE QU'IL EXIGE VRAIMENT, et qui se lit de travers une fois sur deux : ce n'est PAS « l'escabeau est interdit ». C'est que l'usage comme POSTE DE TRAVAIL est interdit par principe, et que la dérogation est CONDITIONNÉE — soit impossibilité technique, soit un risque évalué comme faible ET des travaux de courte durée ET non répétitifs. Les trois conditions du second cas sont cumulatives. Un réassort quotidien en haut d'un escabeau est répétitif : il ne remplit pas la dérogation.\n\nCLASSÉ `non_couvert` ET NON `sans_objet`, seul cas de cette section. Les deux statuts se ressemblent — aucun des deux ne produit d'échéance — mais ils ne disent pas la même chose. « Sans objet » dirait qu'il n'y a rien à porter ; or il y a quelque chose, et ce quelque chose vise des établissements que le produit sert déjà. Ce que le produit devrait en faire relève du DUERP — le risque « chute de hauteur depuis un escabeau » et sa mesure de maîtrise — et non du calendrier de conformité : il n'y a pas de rendez-vous à inscrire, il y a un risque à évaluer et une dérogation à justifier.\n\nPAS DE `declareA`, DÉLIBÉRÉMENT. L'article est bien inscrit au § 3 de `docs/couverture-declaree-du-produit.md`, comme les vingt-sept autres, mais ce document n'est pas une adresse : il le dit lui-même, et le cliquet `MUETS` de `corpus.test.ts` compte comme muet tout `declareA` commençant par `docs/`. Y pointer aurait donné l'apparence d'une déclaration sans en être une. Le manque n'est annoncé à aucun exploitant, ni à l'écran, ni dans le modèle de DUERP livré — c'est un silence, et il est écrit comme tel pour que le compte le fasse apparaître.\n\nCE QUI LE DISTINGUE DES VINGT-SEPT AUTRES : ceux-là visent des hôtels, des locaux à sommeil, des établissements de soins ou des équipements sportifs — des établissements que le produit ne sert pas, et que le rattachement par `Etablissement.typeErp` réclamé de longue date ferait disparaître de l'écran d'un restaurant. Celui-ci concerne un restaurant sur deux. Aucun rattachement par type d'ERP ne le rendra silencieux, parce qu'il n'y a pas de type à qui ne pas le montrer.",
    },
    {
      ref: "R. 4323-64",
      intitule:
        "Interdiction d'utiliser les cordes pour constituer un poste de travail",
      url: URL("LEGIARTI000018531383"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Il est interdit d'utiliser les techniques d'accès et de positionnement au moyen de cordes pour constituer un poste de travail, sauf impossibilité technique de recourir à une protection collective ou risque supérieur résultant de cette protection ; un siège muni des accessoires appropriés est alors prévu.",
      citationCle:
        "Il est interdit d'utiliser les techniques d'accès et de positionnement au moyen de cordes pour constituer un poste de travail.",
      statut: "sans_objet",
      motif:
        "Symétrique de `R. 4323-63` pour les cordes, mais sans son poids pratique : le travail sur cordes ne s'exerce pas en restauration, en commerce de détail ni en bureau, et l'employeur qui y recourrait ferait appel à une entreprise extérieure — auquel cas l'obligation change de débiteur et relève de la co-activité, déjà couverte par le corpus `code-travail-co-activite`. Aucune échéance à porter, et pas de manque à déclarer non plus.",
    },

    // ── Sous-section 3 : conditions générales de travail, d'accès, de circulation ──
    {
      ref: "R. 4323-65",
      intitule: "Continuité des protections collectives aux points d'accès",
      url: URL("LEGIARTI000018531379"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les dispositifs de protection collective sont conçus et installés de manière à éviter leur interruption aux points d'accès ; si l'interruption est nécessaire, des mesures assurent une sécurité équivalente.",
      citationCle:
        "Les dispositifs de protection collective sont conçus et installés de manière à éviter leur interruption aux points d'accès aux postes de travail, notamment du fait de l'utilisation d'une échelle ou d'un escalier. Lorsque cette interruption est nécessaire, des mesures sont prises pour assurer une sécurité équivalente.",
      statut: "sans_objet",
      motif:
        "Règle de conception et d'installation d'un dispositif, appréciée sur place au moment du travail. Elle ne se date pas, ne se renouvelle pas et ne produit aucune pièce : il n'y a rien à inscrire à un calendrier ni à montrer à un contrôle qui vaudrait exécution.",
    },
    {
      ref: "R. 4323-66",
      intitule: "Enlèvement temporaire d'une protection collective",
      url: URL("LEGIARTI000018531377"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "L'enlèvement temporaire d'une protection collective est évité ; s'il est nécessaire, le travail ne peut être entrepris sans mesures compensatoires efficaces préalables, et la protection est rétablie après.",
      citationCle:
        "Si cet enlèvement est nécessaire, le travail ne peut être entrepris et réalisé sans l'adoption préalable de mesures de sécurité compensatoires efficaces.",
      statut: "sans_objet",
      motif:
        "Séquence de gestes attachée à une intervention particulière — évitement, mesures compensatoires, rétablissement. Rien n'y est récurrent ni datable : l'obligation naît et s'éteint avec le travail qui l'a rendue nécessaire, et il peut y en avoir dix dans une journée comme aucune en cinq ans.",
    },
    {
      ref: "R. 4323-67",
      intitule: "Accès sûr aux postes de travail en hauteur et circulation",
      url: URL("LEGIARTI000018531375"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les postes en hauteur sont accessibles en toute sécurité, par le moyen le plus approprié compte tenu de la fréquence de circulation, de la hauteur et de la durée d'utilisation ; ce moyen permet de porter rapidement secours et d'évacuer en cas de danger imminent.",
      citationCle:
        "Ce moyen garantit l'accès dans des conditions adaptées du point de vue ergonomique et permet de porter rapidement secours à toute personne en difficulté et d'assurer l'évacuation en cas de danger imminent.",
      statut: "sans_objet",
      motif:
        "Règle de choix du moyen d'accès, exercée intervention par intervention. Elle porte une exigence de secourabilité qui recoupe l'organisation des secours déjà couverte par le corpus `code-travail-secours`, mais elle n'ajoute par elle-même ni pièce, ni échéance, ni personne à former.",
    },
    {
      ref: "R. 4323-68",
      intitule:
        "Interdiction des travaux en hauteur par conditions météorologiques dangereuses",
      url: URL("LEGIARTI000018531373"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Il est interdit de réaliser des travaux temporaires en hauteur lorsque les conditions météorologiques ou liées à l'environnement du poste sont susceptibles de compromettre la santé et la sécurité des travailleurs.",
      citationCle:
        "Il est interdit de réaliser des travaux temporaires en hauteur lorsque les conditions météorologiques ou liées à l'environnement du poste de travail sont susceptibles de compromettre la santé et la sécurité des travailleurs.",
      statut: "sans_objet",
      motif:
        "Interdiction conditionnelle, appréciée le jour même par l'encadrement. Aucun produit ne peut la porter : elle dépend d'un fait météorologique que rien dans le modèle n'observe, et elle se solderait par une ligne permanente que personne ne coche jamais.",
    },

    // ── Sous-section 4 § 1 : échafaudages ──
    {
      ref: "R. 4323-69",
      intitule:
        "Montage, démontage et modification d'un échafaudage — direction compétente et formation des travailleurs",
      url: URL("LEGIARTI000018531367"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échafaudages ne peuvent être montés, démontés ou sensiblement modifiés que sous la direction d'une personne compétente et par des travailleurs ayant reçu une formation adéquate et spécifique aux opérations envisagées, dont l'article énumère six objets ; la formation est renouvelée dans les conditions de R. 4323-3.",
      citationCle:
        "Les échafaudages ne peuvent être montés, démontés ou sensiblement modifiés que sous la direction d'une personne compétente et par des travailleurs qui ont reçu une formation adéquate et spécifique aux opérations envisagées.",
      statut: "obligation_manquante",
      cause: "activite_exercee",
      toucheLaCible: true,
      motif:
        "Une formation NOMINATIVE que le référentiel ne porte pas, alors qu'il en porte déjà cinq autres du même genre depuis le lot 7. L'article ne se contente pas d'exiger une formation : il en fixe le contenu en six points (compréhension du plan de montage ; sécurité pendant l'opération ; prévention des chutes de personnes et d'objets ; conduite en cas de changement météorologique ; efforts de structure admissibles ; tout autre risque), et renvoie pour le reste à `R. 4141-13` et `R. 4141-17`, tous deux déjà dépouillés par `code-travail-formation-securite`.\n\nPORTEUR : salarié (ADR-023). L'obligation se rattache à une personne désignée, pas à un poste : elle a la même forme que l'habilitation électrique de `R. 4544-10`, que le référentiel porte déjà. Un compteur par poste produirait un chiffre, pas une preuve.\nNATURE : état permanent — une compétence à acquérir puis à maintenir, non un rendez-vous.\nPÉRIODICITÉ : `autre`, et c'est une conclusion, pas un défaut de lecture. `R. 4323-3`, ouvert pour cette question le 2026-09-01, dit « renouvelée et complétée AUSSI SOUVENT QUE NÉCESSAIRE pour prendre en compte les évolutions de ces équipements ». Aucun chiffre. Les « cinq ans » que l'on rencontre partout viennent de la recommandation R 408 de la CNAM, qui n'est pas une source opposable et ne fonde rien ici.\n\nÀ NE PAS CONFONDRE avec la deuxième exigence du même alinéa : la DIRECTION par une « personne compétente » n'est pas une formation, c'est une condition d'organisation de l'opération, et elle ne se traduit par aucun titre délivré.",
      bloquePar:
        "Le porteur salarié existe et conviendrait ; ce qui manque est le déclencheur. Une formation au montage d'échafaudage ne se propose pas à tous les salariés de tous les dossiers — ce serait du bruit sur la quasi-totalité du parc de restaurants, commerces et bureaux — et le modèle n'a aucun attribut disant que l'établissement monte des échafaudages. C'est le même blocage que `R. 4323-61` : le cinquième déclencheur de l'ADR-022 est nommé et sans mécanisme.",
    },
    {
      ref: "R. 4323-70",
      intitule:
        "Notice du fabricant, note de calcul et plan de montage — conservés sur le lieu de travail",
      url: URL("LEGIARTI000018531365"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "La personne qui dirige l'opération et les travailleurs disposent de la notice du fabricant ou du plan de montage et de démontage ; à défaut de note de calcul disponible ou en cas de configuration non prévue, un calcul de résistance et de stabilité puis un plan de montage sont établis par une personne compétente ; ces documents sont conservés sur le lieu de travail.",
      citationCle:
        "Ces documents sont conservés sur le lieu de travail.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: true,
      motif:
        "Le dernier alinéa crée une obligation DOCUMENTAIRE opposable, et c'est ce qui distingue cet article des huit autres du paragraphe échafaudages : « ces documents sont conservés sur le lieu de travail ». Un contrôleur les demande, l'employeur les produit ou ne les produit pas. C'est exactement la forme d'obligation que le référentiel sait porter ailleurs — registre de sécurité, notice d'instructions, rapport de vérification.\n\nPORTEUR : équipement — l'échafaudage. Les documents suivent le matériel et sa configuration, pas l'établissement : le même employeur qui monte deux échafaudages différents en doit deux jeux.\nNATURE : état permanent, à constituer avant le montage et à maintenir sur place pendant toute la durée d'installation.\nPÉRIODICITÉ : `autre`. Aucun renouvellement dans le texte ; l'obligation s'éteint au démontage.\n\nLE CAS À TROIS BRANCHES, qu'un résumé aurait rabattu sur une : montage conforme à la notice → on suit la note de calcul qu'elle vise ; note de calcul indisponible OU configuration structurelle non prévue par elle → calcul de résistance et de stabilité par une personne compétente ; configuration ne correspondant pas à un montage prévu par la notice → plan de montage, d'utilisation et de démontage par une personne compétente. Les trois branches ne s'excluent pas et la troisième se cumule couramment avec la deuxième.",
      bloquePar:
        "`CATEGORIES_EQUIPEMENT` n'a pas de valeur « échafaudage » — dix-huit valeurs, aucune approchante, et `AUTRE` ne porte aucune obligation. Sans catégorie, l'obligation n'a pas de porteur : le référentiel ne pourrait la rattacher qu'à l'établissement, ce qui serait faux au sens de l'ADR-022 (les documents décrivent un matériel, pas un lieu) et produirait la ligne sur des dossiers qui n'ont jamais vu d'échafaudage.",
    },
    {
      ref: "R. 4323-71",
      intitule:
        "Protection contre les chutes pendant le montage, le démontage ou la transformation",
      url: URL("LEGIARTI000018531363"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Une protection appropriée contre la chute de hauteur et la chute d'objet est assurée avant l'accès à tout niveau d'un échafaudage lors de son montage, de son démontage ou de sa transformation.",
      citationCle:
        "Une protection appropriée contre le risque de chute de hauteur et le risque de chute d'objet est assurée avant l'accès à tout niveau d'un échafaudage lors de son montage, de son démontage ou de sa transformation.",
      statut: "sans_objet",
      motif:
        "Règle de geste attachée à une opération de montage, sans date, sans pièce et sans récurrence. Elle se contrôle pendant l'opération et ne laisse aucune trace qu'un dossier de conformité pourrait porter.",
    },
    {
      ref: "R. 4323-72",
      intitule:
        "Matériaux, assemblages, et vérification de l'état de conservation des éléments avant montage",
      url: URL("LEGIARTI000018531361"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les matériaux sont d'une solidité appropriée, les assemblages réalisés à l'aide d'éléments compatibles d'une même origine et dans les conditions testées, et ces éléments font l'objet d'une VÉRIFICATION de leur bon état de conservation AVANT TOUTE OPÉRATION DE MONTAGE.",
      citationCle:
        "Ces éléments font l'objet d'une vérification de leur bon état de conservation avant toute opération de montage d'un échafaudage.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: true,
      motif:
        "Le troisième alinéa impose une VÉRIFICATION, et c'est la seule de la section 8 — toutes les autres vérifications du domaine viennent de l'arrêté du 21 décembre 2004. Elle est distincte de celles de l'arrêté : celles-ci portent sur l'échafaudage monté, celle-ci sur les ÉLÉMENTS avant qu'il n'existe, et elle est due même si le montage n'aboutit pas.\n\nPORTEUR : équipement.\nNATURE : événementielle (ADR-026) — le fait générateur est l'opération de montage, qui peut survenir une fois par décennie ou trois fois par mois. Ce n'est pas une échéance récurrente déguisée : « avant toute opération de montage » ne dit rien d'un intervalle.\nPÉRIODICITÉ : `autre`. Le texte ne chiffre rien et n'a rien à chiffrer.\n\nLes deux premiers alinéas, eux, sont des spécifications de matériau et d'assemblage sans échéance ; s'ils étaient seuls, l'article serait classé sans objet comme ses voisins.",
      bloquePar:
        "Même blocage que `R. 4323-70` : pas de catégorie d'équipement « échafaudage » dans `CATEGORIES_EQUIPEMENT`. S'y ajoute que la nature événementielle est reconnue par l'ADR-026 mais que le générateur MVP ne sait pas encore l'observer — il tient lieu par `mise_en_service_uniquement`, comme le note déjà `levage.ts` pour la remise en service de `R. 4323-28`.",
    },
    {
      ref: "R. 4323-73",
      intitule: "Stabilité de l'échafaudage en cours d'utilisation",
      url: URL("LEGIARTI000018531359"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "La stabilité de l'échafaudage doit être assurée ; il est construit et installé de manière à empêcher, en cours d'utilisation, le déplacement d'une quelconque de ses parties constituantes par rapport à l'ensemble.",
      citationCle:
        "La stabilité de l'échafaudage doit être assurée. Tout échafaudage est construit et installé de manière à empêcher, en cours d'utilisation, le déplacement d'une quelconque de ses parties constituantes par rapport à l'ensemble.",
      statut: "sans_objet",
      motif:
        "Exigence de résultat sur l'état du matériel, sans date ni pièce. Elle est le critère que l'examen d'état de conservation de l'arrêté du 21 décembre 2004 vient constater : c'est cet examen-là qui porte une périodicité, pas cet article-ci.",
    },
    {
      ref: "R. 4323-74",
      intitule:
        "Échafaudages fixes : résistance aux efforts et au vent, ancrage, surface portante",
      url: URL("LEGIARTI000018531357"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échafaudages fixes supportent les efforts et résistent aux conditions atmosphériques, notamment au vent ; ils sont ancrés ou amarrés à un point de résistance suffisante ou protégés par un moyen d'efficacité équivalente ; la surface portante s'oppose à tout affaissement d'appui.",
      citationCle:
        "Les échafaudages fixes sont construits et installés de manière à supporter les efforts auxquels ils sont soumis et à résister aux contraintes résultant des conditions atmosphériques, notamment des effets du vent.",
      statut: "sans_objet",
      motif:
        "Spécification technique de construction et d'installation, sans échéance ni document. Comme `R. 4323-73`, elle définit ce que les examens de l'arrêté du 21 décembre 2004 viennent vérifier, sans porter elle-même de rendez-vous.",
    },
    {
      ref: "R. 4323-75",
      intitule: "Échafaudages roulants : déplacement inopiné et présence de travailleurs",
      url: URL("LEGIARTI000018531354"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Le déplacement ou le basculement inopiné des échafaudages roulants est empêché par des dispositifs appropriés lors du montage, du démontage et de l'utilisation ; aucun travailleur ne doit demeurer sur un échafaudage roulant lors de son déplacement.",
      citationCle:
        "Aucun travailleur ne doit demeurer sur un échafaudage roulant lors de son déplacement.",
      statut: "sans_objet",
      motif:
        "L'article de la sous-section le plus susceptible de concerner un commerce ou un entrepôt — l'échafaudage roulant est le seul que ces secteurs possèdent parfois en propre. Il n'en produit pas moins qu'une règle de geste : une interdiction appréciée à l'instant du déplacement, sans date, sans pièce, sans récurrence. Sa place est au DUERP, comme `R. 4323-63`, mais sans la fréquence d'exposition qui a fait classer celui-ci `non_couvert`.",
    },
    {
      ref: "R. 4323-76",
      intitule: "Affichage de la charge admissible",
      url: URL("LEGIARTI000018531352"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "La charge admissible d'un échafaudage est indiquée de manière visible sur l'échafaudage ainsi que sur chacun de ses planchers.",
      citationCle:
        "La charge admissible d'un échafaudage est indiquée de manière visible sur l'échafaudage ainsi que sur chacun de ses planchers.",
      statut: "sans_objet",
      motif:
        "Obligation d'affichage sur le matériel lui-même, permanente pendant l'installation et sans échéance. Elle figure explicitement parmi les points que l'examen approfondi trimestriel de l'arrêté du 21 décembre 2004 vient contrôler — « la visibilité des indications relatives aux charges admissibles » — de sorte que le seul rendez-vous qu'elle génère est celui de l'arrêté, déjà relevé.",
    },
    {
      ref: "R. 4323-77",
      intitule: "Protections collectives sur les côtés extérieurs",
      url: URL("LEGIARTI000018531350"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échafaudages sont munis sur les côtés extérieurs de dispositifs de protection collective tels que prévus à l'article R. 4323-59.",
      citationCle:
        "Les échafaudages sont munis sur les côtés extérieurs de dispositifs de protection collective tels que prévus à l'article R. 4323-59.",
      statut: "sans_objet",
      motif:
        "Renvoi pur : l'article applique aux échafaudages les caractéristiques de garde-corps déjà fixées par `R. 4323-59`, lui-même classé sans objet pour la même raison. Un renvoi ne crée pas d'obligation nouvelle et n'ajoute ni date ni pièce.",
    },
    {
      ref: "R. 4323-78",
      intitule: "Planchers : dimensions, disposition, vide de 20 centimètres",
      url: URL("LEGIARTI000018531348"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les planchers sont dimensionnés et disposés pour permettre de travailler et circuler sûrement, montés de sorte que leurs composants ne se déplacent pas, et aucun vide de plus de 20 cm ne doit exister entre leur bord et l'ouvrage ; à défaut, le risque de chute est prévenu selon R. 4323-58 à R. 4323-61.",
      citationCle:
        "Aucun vide de plus de 20 centimètres ne doit exister entre le bord des planchers et l'ouvrage ou l'équipement contre lequel l'échafaudage est établi.",
      statut: "sans_objet",
      motif:
        "Spécification dimensionnelle assortie d'un renvoi à la cascade de protection de la sous-section 1. Les 20 centimètres bornent une distance, pas une durée : aucune échéance, aucun document, rien qu'un dossier de conformité puisse porter.",
    },
    {
      ref: "R. 4323-79",
      intitule: "Moyens d'accès entre planchers",
      url: URL("LEGIARTI000018531346"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Des moyens d'accès sûrs et en nombre suffisant sont aménagés entre les différents planchers de l'échafaudage.",
      citationCle:
        "Des moyens d'accès sûrs et en nombre suffisant sont aménagés entre les différents planchers de l'échafaudage.",
      statut: "sans_objet",
      motif:
        "Exigence d'aménagement appréciée sur l'échafaudage monté. Elle figure parmi les points de l'examen d'état de conservation de l'arrêté du 21 décembre 2004 — « la présence et la bonne installation des dispositifs de protection collective et des moyens d'accès » — et n'ajoute par elle-même aucune échéance propre.",
    },
    {
      ref: "R. 4323-80",
      intitule: "Zones d'accès limité aux parties non prêtes à l'emploi",
      url: URL("LEGIARTI000018531344"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les parties d'échafaudage non prêtes à l'emploi constituent des zones d'accès limité, équipées de dispositifs évitant que les personnes non autorisées y pénètrent, et des mesures appropriées protègent les travailleurs autorisés à y entrer.",
      citationCle:
        "Lorsque certaines parties d'un échafaudage ne sont pas prêtes à l'emploi notamment pendant le montage, le démontage ou les transformations, ces parties constituent des zones d'accès limité qui sont équipées de dispositifs évitant que les personnes non autorisées puissent y pénétrer.",
      statut: "sans_objet",
      motif:
        "Mesure de balisage temporaire, active pendant une opération et éteinte avec elle. Ni date, ni pièce, ni récurrence : rien qui puisse s'inscrire à un calendrier ou se solder dans un dossier.",
    },

    // ── Sous-section 4 § 2 : échelles, escabeaux et marchepieds ──
    {
      ref: "R. 4323-81",
      intitule: "Matériaux des échelles, escabeaux et marchepieds",
      url: URL("LEGIARTI000018531340"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur s'assure que les échelles, escabeaux et marchepieds sont constitués de matériaux appropriés compte tenu des contraintes du milieu d'utilisation.",
      citationCle:
        "L'employeur s'assure que les échelles, escabeaux et marchepieds sont constitués de matériaux appropriés compte tenu des contraintes du milieu d'utilisation.",
      statut: "sans_objet",
      motif:
        "Le verbe « s'assure » désigne une diligence continue, pas un contrôle daté : l'article n'institue aucune vérification périodique des échelles, contrairement à ce que la lecture rapide du paragraphe laisse croire. AUCUN des huit articles du paragraphe échelles n'impose de vérification périodique, et l'arrêté du 21 décembre 2004 ne vise que les échafaudages — son article 7 ne mentionne les échelles qu'à la demande de l'inspection du travail. C'est un constat qui vaut d'être écrit : la « vérification annuelle des échelles » couramment affirmée n'a pas de fondement réglementaire.",
    },
    {
      ref: "R. 4323-82",
      intitule: "Stabilité et horizontalité en cours d'accès et d'utilisation",
      url: URL("LEGIARTI000018531338"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échelles, escabeaux et marchepieds sont placés de manière à ce que leur stabilité soit assurée en cours d'accès et d'utilisation et que leurs échelons ou marches soient horizontaux.",
      citationCle:
        "Les échelles, escabeaux et marchepieds sont placés de manière à ce que leur stabilité soit assurée en cours d'accès et d'utilisation et que leurs échelons ou marches soient horizontaux.",
      statut: "sans_objet",
      motif:
        "Règle de mise en place, appréciée à chaque usage. Elle relève de la consigne et de l'évaluation des risques, pas de l'échéancier : il n'y a ni pièce à produire ni date à tenir.",
    },
    {
      ref: "R. 4323-83",
      intitule: "Échelles fixes : conception, équipement, installation",
      url: URL("LEGIARTI000018531336"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur s'assure que les échelles fixes sont conçues, équipées ou installées de manière à prévenir les chutes de hauteur.",
      citationCle:
        "L'employeur s'assure que les échelles fixes sont conçues, équipées ou installées de manière à prévenir les chutes de hauteur.",
      statut: "sans_objet",
      motif:
        "Exigence de résultat sur un ouvrage installé à demeure — échelle à crinoline d'accès en toiture, échelle de réserve. Elle ne porte aucune périodicité de contrôle, ce qui distingue l'échelle fixe de l'ascenseur ou de la porte automatique, pour lesquels le référentiel porte des vérifications parce qu'un texte les impose.",
    },
    {
      ref: "R. 4323-84",
      intitule: "Échelles portables : appui sur supports stables",
      url: URL("LEGIARTI000018531334"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échelles portables sont appuyées et reposent sur des supports stables, résistants et de dimensions adéquates, notamment afin de demeurer immobiles.",
      citationCle:
        "Les échelles portables sont appuyées et reposent sur des supports stables, résistants et de dimensions adéquates notamment afin de demeurer immobiles.",
      statut: "sans_objet",
      motif:
        "Règle d'installation ponctuelle, sans date ni pièce. Comme les autres articles du paragraphe, elle nourrit le DUERP — le risque de chute de plain-pied et de hauteur — et non le calendrier de conformité.",
    },
    {
      ref: "R. 4323-85",
      intitule: "Échelles suspendues : attache et mouvements de balancement",
      url: URL("LEGIARTI000018531332"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échelles suspendues sont attachées d'une manière sûre et, à l'exception de celles en corde, de façon à ne pas se déplacer et à éviter les mouvements de balancement.",
      citationCle:
        "Les échelles suspendues sont attachées d'une manière sûre et, à l'exception de celles en corde, de façon à ne pas se déplacer et à éviter les mouvements de balancement.",
      statut: "sans_objet",
      motif:
        "Spécification d'installation visant un matériel que les trois secteurs cibles ne possèdent pas. Aucune échéance, aucun document, et aucun manque à déclarer : ce n'est pas une couverture qu'on refuse, c'est une obligation qui ne se présente pas.",
    },
    {
      ref: "R. 4323-86",
      intitule: "Échelles à éléments assemblés et à coulisse : immobilisation",
      url: URL("LEGIARTI000018531330"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échelles composées de plusieurs éléments assemblés et les échelles à coulisse sont utilisées de telle sorte que l'immobilisation des différents éléments les uns par rapport aux autres soit assurée.",
      citationCle:
        "Les échelles composées de plusieurs éléments assemblés et les échelles à coulisse sont utilisées de telle sorte que l'immobilisation des différents éléments les uns par rapport aux autres soit assurée.",
      statut: "sans_objet",
      motif:
        "Règle d'usage appréciée à chaque emploi du matériel. Aucune récurrence datable, aucune pièce à conserver : elle relève de la consigne au poste, pas de l'échéancier de conformité.",
    },
    {
      ref: "R. 4323-87",
      intitule: "Dépassement d'un mètre des échelles d'accès",
      url: URL("LEGIARTI000018531328"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échelles d'accès sont d'une longueur telle qu'elles dépassent d'au moins un mètre le niveau d'accès, à moins que d'autres mesures aient été prises pour garantir une prise sûre.",
      citationCle:
        "Les échelles d'accès sont d'une longueur telle qu'elles dépassent d'au moins un mètre le niveau d'accès, à moins que d'autres mesures aient été prises pour garantir une prise sûre.",
      statut: "sans_objet",
      motif:
        "Spécification dimensionnelle assortie d'une équivalence. Le mètre borne une longueur, pas une durée — même piège de lecture que les trois mètres de `R. 4323-60` et les 20 centimètres de `R. 4323-78`, et même conclusion : rien à inscrire au calendrier.",
    },
    {
      ref: "R. 4323-88",
      intitule: "Prise et appui sûrs à tout moment",
      url: URL("LEGIARTI000018531326"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les échelles sont utilisées de façon à permettre aux travailleurs de disposer à tout moment d'une prise et d'un appui sûrs.",
      citationCle:
        "Les échelles sont utilisées de façon à permettre aux travailleurs de disposer à tout moment d'une prise et d'un appui sûrs.",
      statut: "sans_objet",
      motif:
        "Règle d'usage, sans date ni document. C'est la traduction pratique de l'interdiction de `R. 4323-63` : elle dit pourquoi une échelle n'est pas un poste de travail — on ne peut y tenir un outil des deux mains. Le manque de couverture est porté par `R. 4323-63`, il n'est pas compté deux fois ici.",
    },

    // ── Sous-section 4 § 3 : cordes ──
    {
      ref: "R. 4323-89",
      intitule:
        "Conditions d'utilisation des techniques d'accès par cordes — six conditions cumulatives, dont la formation",
      url: URL("LEGIARTI000018531322"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "L'utilisation des cordes est conditionnée à six exigences cumulatives : deux cordes ancrées séparément avec note de calcul des ancrages, harnais antichute relié aux deux cordes, mécanismes autobloquant et antichute mobile, outils attachés, travail programmé et supervisé pour un secours immédiat, et formation adéquate et spécifique aux opérations ET aux procédures de sauvetage, renouvelée dans les conditions de R. 4323-3.",
      citationCle:
        "6° Les travailleurs reçoivent une formation adéquate et spécifique aux opérations envisagées et aux procédures de sauvetage. Le contenu de cette formation est précisé aux articles R. 4141-13 et R. 4141-17. Elle est renouvelée dans les conditions prévues à l'article R. 4323-3.",
      statut: "obligation_manquante",
      cause: "activite_exercee",
      toucheLaCible: false,
      motif:
        "Deux obligations distinctes que le référentiel ne porte pas, dans un même article.\n\n1. LA FORMATION DU 6°, nominative, porteur SALARIÉ (ADR-023), nature état permanent, périodicité `autre` — `R. 4323-3` dit « aussi souvent que nécessaire », sans chiffre. Elle a une particularité que n'a pas celle de `R. 4323-69` : elle porte aussi sur les PROCÉDURES DE SAUVETAGE, ce qui la rattache à l'organisation des secours et non seulement au maniement du matériel.\n\n2. LA NOTE DE CALCUL DES ANCRAGES DU 1°, document établi par l'employeur ou une personne compétente, porteur établissement ou équipement selon que les ancrages sont ceux du bâtiment ou d'une installation mobile, nature état permanent, périodicité `autre`. Elle est le pendant de la notice de `R. 4323-61` pour les cordes.\n\nLES SIX CONDITIONS SONT CUMULATIVES : le texte écrit « est conditionnée au respect des conditions suivantes », et manquer une seule rend l'usage des cordes irrégulier. Le 5° — « le travail est programmé et supervisé de telle sorte qu'un secours puisse être immédiatement porté » — n'est pas une formalité de rédaction : c'est l'obligation d'organisation qui interdit le travail sur cordes en solitaire.",
      bloquePar:
        "Le même déclencheur manquant que `R. 4323-61` et `R. 4323-69`, aggravé par une question de proportion : le travail sur cordes ne s'exerce dans aucun des trois secteurs cibles autrement que par une entreprise extérieure, auquel cas l'obligation pèse sur elle et relève de la co-activité — déjà couverte par `code-travail-co-activite`. Encoder ces deux lignes servirait donc un cas de figure que le périmètre déclaré ne contient pas. Consigné pour être retrouvé, pas pour être encodé en l'état.",
    },
    {
      ref: "R. 4323-90",
      intitule: "Dérogation à la deuxième corde, dans des circonstances spécifiques",
      url: URL("LEGIARTI000018531320"),
      versionEnVigueur: V2008,
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Lorsque l'utilisation d'une deuxième corde rendrait le travail plus dangereux, le recours à une seule corde peut être autorisé à condition que le travailleur ne reste jamais seul ; les circonstances et les mesures sont déterminées par arrêté ministériel.",
      citationCle:
        "Ces circonstances spécifiques ainsi que les mesures appropriées pour assurer la sécurité sont déterminées par arrêté du ministre chargé du travail ou du ministre chargé de l'agriculture.",
      statut: "sans_objet",
      motif:
        "Dérogation au 1° de `R. 4323-89`, et renvoi à un arrêté d'application. L'article n'impose rien de plus à l'employeur : il lui ouvre une possibilité sous condition. L'arrêté auquel il renvoie n'a pas été ouvert — il ne le serait utilement que si le travail sur cordes entrait au périmètre, ce qu'il n'a pas fait, et le dire ici évite au prochain lecteur de refaire le détour.",
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────

// Corpus : arrêté du 21 décembre 2004 — vérifications des échafaudages.
//
// POURQUOI IL EST ICI ET PAS DANS LA SECTION 8. Parce que les trois seules
// périodicités opposables du travail en hauteur y sont, et qu'aucune n'est dans
// le Code. « R. 4323-58 et suivants » ne l'annonce pas ; c'est le renvoi de
// `R. 4323-23` — « des arrêtés du ministre chargé du travail […] déterminent
// les équipements de travail […] pour lesquels l'employeur procède ou fait
// procéder à des vérifications générales périodiques » — qui y mène. Le Code
// habilite, l'arrêté fixe. C'est la convention déjà retenue par `levage.ts`
// pour l'arrêté du 1er mars 2004 : « R. 4323-23 renvoie la périodicité à un
// arrêté, c'est l'arrêté qui la fixe ».
//
// ⚠ LES VISAS SONT DANS L'ANCIENNE NUMÉROTATION, et c'est ce qui rend le lien
// invisible à un grep. L'arrêté vise `R. 233-11`, `R. 233-11-1` et
// `R. 233-11-2`, devenus `R. 4323-22`, `R. 4323-23` et `R. 4323-24` à la
// recodification du 1er mai 2008. Ces trois articles sont déjà dépouillés par
// `code-travail-levage`, qui les rattache aux appareils de levage ; ils sont
// en réalité l'habilitation générale de TOUTES les vérifications
// réglementaires d'équipements de travail, échafaudages compris. Ils ne sont
// pas redéclarés ici : un même `ref` dans deux corpus est le défaut que le
// lot B est en train de corriger sur `L. 4622-1`, et il n'y a aucune raison
// d'en fabriquer un quatrième.
//
// ⚠ TROIS MOIS EST UN PLAFOND, ET C'EST QUAND MÊME UN RYTHME. L'article 6
// n'écrit pas « tous les trois mois » mais « aucun échafaudage ne peut demeurer
// en service s'il n'a pas fait l'objet DEPUIS MOINS DE TROIS MOIS d'un examen
// approfondi de son état de conservation ». La différence est celle que le
// corpus `code-travail-sante-travail` a documentée pour les cinq ans de
// `R. 4624-16` : la date est la borne extérieure au-delà de laquelle
// l'employeur est nécessairement en défaut. Ici, à la différence de la visite
// médicale, aucun tiers ne fixe de délai plus court : l'examen conditionne le
// MAINTIEN EN SERVICE, de sorte que le plafond et le rythme coïncident en
// pratique. `trimestrielle` serait donc la valeur juste — si l'obligation avait
// un porteur.
//
// État en vigueur vérifié à la date du 2026-09-01 : l'arrêté n'est pas abrogé.
// Lecture : `agent_verbatim`, Légifrance, 2026-09-01.

export const ARRETE_2004_12_21_ECHAFAUDAGES: Corpus = {
  id: "arrete-2004-12-21-echafaudages",
  intitule:
    "Arrêté du 21 décembre 2004 relatif aux vérifications des échafaudages",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000240930",
  etendue: "articles_cites",
  portee:
    "Les sept premiers articles de l'arrêté, qui définissent pour les échafaudages le contenu, les conditions d'exécution et, le cas échéant, la périodicité des vérifications prévues par les articles alors numérotés R. 233-11, R. 233-11-1 et R. 233-11-2 du code du travail — aujourd'hui R. 4323-22, R. 4323-23 et R. 4323-24. Trois vérifications distinctes en sortent : avant mise ou remise en service (art. 4, cinq circonstances), journalière (art. 5), et approfondie tous les trois mois au plus (art. 6). D'après le sommaire de Légifrance l'arrêté compte huit articles ; le huitième n'a pas été ouvert, l'article 1er bornant lui-même aux six premiers la définition des vérifications. L'arrêté vise TOUT chef d'établissement utilisant un échafaudage, sans restriction au bâtiment ni seuil d'effectif : c'est le point qui a fait le plus défaut, le domaine étant spontanément rangé au BTP.",
  articles: [
    {
      ref: "Arrêté 21-12-2004 art. 1",
      intitule: "Objet — ce que les articles 1er à 6 définissent",
      url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000002235279",
      versionEnVigueur: "2005-01-01",
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Les articles 1er à 6 définissent, pour les échafaudages, le contenu, les conditions d'exécution et, le cas échéant, la périodicité des vérifications générales périodiques, des vérifications lors de la mise en service et des vérifications lors de la remise en service après démontage et remontage ou modification.",
      statut: "sans_objet",
      motif:
        "Article d'objet : il délimite le champ des cinq articles suivants sans rien prescrire lui-même. Il vaut d'être consigné pour deux raisons de méthode — il donne la borne réelle du texte utile (« les articles 1er à 6 »), et le « LE CAS ÉCHÉANT » de sa rédaction annonce que toutes les vérifications qu'il couvre ne portent pas de périodicité, ce qui se vérifie aux articles 4 et 7.",
    },
    {
      ref: "Arrêté 21-12-2004 art. 2",
      intitule:
        "Conditions d'exécution — documents, information, et échafaudage partagé entre entreprises",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025542606",
      versionEnVigueur: "2005-01-01",
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Le chef d'établissement dispose des documents nécessaires et communique aux personnes qualifiées les informations utiles ; lorsqu'un échafaudage est utilisé par plusieurs entreprises sur un même site et dans la même configuration, il n'est pas nécessaire que chaque chef d'entreprise réalise les vérifications avant mise ou remise en service ni les vérifications trimestrielles.",
      citationCle:
        "Lorsqu'un échafaudage est utilisé par plusieurs entreprises, sur un même site et dans la même configuration, il n'est pas nécessaire que chaque chef d'entreprise réalise les vérifications avant mise en service ou remise en service ainsi que les vérifications trimestrielles.",
      statut: "sans_objet",
      motif:
        "Article d'exécution, sans échéance propre. Son second alinéa mérite pourtant d'être relevé : c'est une EXCLUSION explicite, de la même famille que celles que le lot A traite pour le suivi médical. Elle dispense un chef d'entreprise de vérifications qu'un autre a déjà faites sur le même échafaudage, dans la même configuration et sur le même site.\n\nElle ne dispense PAS de la vérification journalière de l'article 5, qui reste due par chacun — le texte ne cite que les deux autres. Si les vérifications d'échafaudage étaient un jour encodées, cette asymétrie serait exactement le genre de détail qu'un encodage rapide effacerait, en fabriquant une échéance que le texte exclut ou en supprimant une qu'il maintient.",
    },
    {
      ref: "Arrêté 21-12-2004 art. 3",
      intitule:
        "Définition des trois examens : adéquation, montage et installation, état de conservation",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025542617",
      versionEnVigueur: "2005-01-01",
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "L'article définit l'examen d'adéquation, l'examen de montage et d'installation (conformité à la notice ou, à défaut, à la note de calcul et au plan établi par une personne compétente) et l'examen de l'état de conservation, dont le III énumère les points à couvrir.",
      statut: "sans_objet",
      motif:
        "Article de définitions : il dit ce que chaque examen contient, jamais quand il est dû. Ce sont les articles 4, 5 et 6 qui les déclenchent, et c'est la raison pour laquelle il est classé sans objet plutôt qu'obligation manquante — définir n'est pas prescrire, distinction que `levage.ts` a déjà payée une fois en citant les articles qui définissent les épreuves sans citer celui qui les exige.\n\nSon III est la liste que l'examen trimestriel de l'article 6 vient contrôler : protections collectives et moyens d'accès en place, absence de déformation permanente ou de corrosion, présence de tous les éléments de fixation et absence de jeu, bon état des ancrages et des appuis, éléments de stabilisation, fixation des filets et bâches, continuité et planéité des planchers, visibilité des indications de charge admissible.",
    },
    {
      ref: "Arrêté 21-12-2004 art. 4",
      intitule: "Vérification avant mise ou remise en service — cinq circonstances",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025542614",
      versionEnVigueur: "2005-01-01",
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Une vérification comprenant un examen d'adéquation, un examen de montage et d'installation et un examen de l'état de conservation s'impose dans cinq circonstances : première utilisation ; changement de site d'utilisation et tout démontage suivi d'un remontage ; changement de configuration, remplacement ou transformation importante des constituants essentiels, notamment après un accident, un incident ou un choc ; modification des conditions d'utilisation, atmosphériques ou d'environnement affectant la sécurité ; interruption d'utilisation d'au moins un mois.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: true,
      motif:
        "PORTEUR : équipement — l'échafaudage.\nNATURE : événementielle (ADR-026), et c'est le champ qui la qualifie, pas une déduction. Cinq faits générateurs, dont aucun n'est une date.\nPÉRIODICITÉ : `autre`. Le texte ne chiffre RIEN ici, et le « d'au moins un mois » du cinquième cas est une durée d'INTERRUPTION qui déclenche, non un intervalle qui revient. Le lire comme « vérification mensuelle » serait précisément l'erreur de plafond-pris-pour-rythme que cette revue a relevée à répétition.\n\nMêmes cinq circonstances, à un mot près, que celles de l'article 20-I de l'arrêté du 1er mars 2004 déjà porté par `levage-remise-en-service-apres-reparation` — même famille d'obligation, même impasse de génération : le produit n'observe aucun de ces faits.\n\nLe VERBATIM des cinq alinéas a) à e) n'est pas reproduit en `citationCle` : la restitution obtenue portait deux coquilles manifestes de transcription (« montagne » pour montage, « à la uiste » pour à la suite), et un verbatim douteux ne se colle pas. Le contenu des cinq cas, lui, est concordant et repris ci-dessus en `prescrit`.",
      bloquePar:
        "Pas de catégorie d'équipement « échafaudage » dans `CATEGORIES_EQUIPEMENT`, donc pas de porteur. S'y ajoute que la nature événementielle n'est pas générée : `levage.ts` le note déjà pour `R. 4323-28` — la valeur `mise_en_service_uniquement` y sert de tenant-lieu, et les faits déclencheurs ne sont observés par rien.",
    },
    {
      ref: "Arrêté 21-12-2004 art. 5",
      intitule: "Vérification journalière de l'état de conservation",
      url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000001654308",
      versionEnVigueur: "2005-01-01",
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Le chef d'établissement réalise ou fait réaliser QUOTIDIENNEMENT un examen de l'état de conservation, pour s'assurer que l'échafaudage n'a pas subi de dégradation perceptible pouvant créer des dangers ; les mesures qui s'imposent pour y remédier sont consignées sur le registre prévu à l'article L. 620-6.",
      citationCle:
        "Le chef d'établissement doit, quotidiennement, réaliser ou faire réaliser un examen de l'état de conservation en vue de s'assurer que l'échafaudage n'a pas subi de dégradation perceptible pouvant créer des dangers.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: true,
      motif:
        "PORTEUR : équipement.\nNATURE : échéance récurrente.\nPÉRIODICITÉ : aucune valeur ne convient. `PERIODICITES` va de `hebdomadaire` à `decennale` et n'a pas de valeur journalière — la plus courte, `hebdomadaire`, diviserait la charge réelle par sept et ferait mentir le référentiel dans le sens permissif. Le seul encodage honnête aujourd'hui serait `autre`, qui tairait le rythme alors que le texte en donne un, clair et quotidien.\n\nC'EST LE SEUL CAS DU RÉFÉRENTIEL OÙ LE TEXTE CHIFFRE UN RYTHME QUE LE MODÈLE NE PEUT PAS ÉCRIRE. Le dépôt a déjà ajouté `bimensuelle` pour EL 18 § 4 et `six_semaines` pour la visite de base des ascenseurs, chaque fois parce que rabattre sur une valeur voisine faisait mentir le texte ; `journaliere` serait le même geste. Il n'est pas fait ici : une valeur d'énumération ajoutée sans obligation qui la porte est du sur-engineering, et l'obligation ne peut pas exister sans catégorie d'équipement.\n\nLA CONSIGNATION AU REGISTRE `L. 620-6` est une seconde obligation dans le même article. `L. 620-6` est le registre unique de sécurité, dont le référentiel porte déjà la tenue côté ERP et côté levage — voir `levage-registre-securite-consignation`. Ce qui manque n'est donc pas le registre, c'est la ligne d'échafaudage qui devrait s'y consigner.",
      bloquePar:
        "Deux blocages qui se cumulent, et il faut les lever dans cet ordre : d'abord la catégorie d'équipement « échafaudage », sans quoi l'obligation n'a pas de porteur ; ensuite seulement la valeur `journaliere` de `Periodicite`, sans quoi elle a un porteur mais un rythme faux. Ajouter la seconde avant la première produirait une valeur d'énumération que rien n'utilise.",
    },
    {
      ref: "Arrêté 21-12-2004 art. 6",
      intitule:
        "Examen approfondi de l'état de conservation — au plus tous les trois mois",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000240930",
      versionEnVigueur: "2005-01-01",
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Aucun échafaudage ne peut demeurer en service s'il n'a pas fait l'objet depuis moins de trois mois d'un examen approfondi de son état de conservation, portant notamment sur les éléments énumérés à l'article 3-III.",
      citationCle:
        "Aucun échafaudage ne peut demeurer en service s'il n'a pas fait l'objet depuis moins de trois mois d'un examen approfondi de son état de conservation. Cet examen implique des vérifications techniques concernant notamment les éléments énumérés à l'article 3-III du présent arrêté.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: true,
      motif:
        "LA SEULE PÉRIODICITÉ CHIFFRÉE ET ENCODABLE DE TOUT LE DOMAINE DU TRAVAIL EN HAUTEUR. Les 33 articles de la section 8 n'en portent aucune ; celle-ci en porte une, et elle est nette.\n\nPORTEUR : équipement — l'échafaudage.\nNATURE : échéance récurrente.\nPÉRIODICITÉ : `trimestrielle`. Le texte écrit « depuis moins de trois mois », donc un plafond ; mais à la différence des cinq ans de `R. 4624-16`, où le médecin du travail fixe un délai réel plus court, aucun tiers n'intervient ici et l'examen conditionne le MAINTIEN EN SERVICE de l'échafaudage. Le plafond est donc aussi le rythme : au quatre-vingt-douzième jour, l'échafaudage doit sortir du service ou avoir été réexaminé. `trimestrielle` (91 jours dans `PERIODICITE_EN_JOURS`) est juste, et légèrement conservateur, ce qui est le bon sens de l'erreur.\n\nCE QUI FONDE N'EST PAS LA R 408. La « vérification trimestrielle des échafaudages » est presque toujours attribuée à la recommandation R 408 de la CNAM, qui n'est pas une source opposable. Elle est ici, dans un arrêté, depuis le 1er janvier 2005.\n\nL'ARTICLE 2 EN DISPENSE le chef d'entreprise dont l'échafaudage est déjà vérifié par une autre entreprise sur le même site et dans la même configuration — exclusion à porter avec l'obligation, jamais après.",
      bloquePar:
        "Une seule chose manque, et c'est peu : la catégorie d'équipement « échafaudage » dans `CATEGORIES_EQUIPEMENT`. La périodicité existe (`trimestrielle`), la nature existe (échéance récurrente), le porteur équipement est le mieux servi des trois par le générateur. C'est l'obligation la plus proche d'être encodable de tout ce dépouillement — mais créer une catégorie d'équipement change l'onboarding et le formulaire de parc, ce qu'un lot de dépouillement n'avait pas mandat de décider.",
    },
    {
      ref: "Arrêté 21-12-2004 art. 7",
      intitule:
        "Vérification par un organisme agréé sur demande de l'inspection du travail",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025542612",
      versionEnVigueur: "2005-01-01",
      luLe: LU,
      lecture: "agent_verbatim",
      prescrit:
        "Sur demande de l'inspection du travail, l'état de conformité des échelles et des échafaudages est vérifié par un organisme agréé.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "La vérification n'est due que si l'inspection du travail la demande : c'est une procédure que l'exploitant subit, pas une échéance qu'il tient. Aucune date ne s'en déduit et rien ne pourrait être proposé à l'avance.\n\nÀ RELEVER TOUT DE MÊME : c'est le seul article de l'arrêté qui mentionne les ÉCHELLES. Il confirme par sa rédaction que les échelles, escabeaux et marchepieds ne sont soumis à AUCUNE vérification périodique réglementaire — l'arrêté ne les vise qu'ici, et sur demande. Le constat vaut d'être écrit parce que la « vérification annuelle des échelles » est couramment présentée comme obligatoire ; elle ne l'est pas, et ce qu'on cite alors est une norme privée ou une préconisation de fabricant, pas un texte.",
    },
  ],
};
