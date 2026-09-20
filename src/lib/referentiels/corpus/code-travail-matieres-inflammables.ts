// Corpus : code du travail — emploi et stockage de matières explosives et
// inflammables (section 4 du chapitre VII, R. 4227-22 à R. 4227-27).
//
// POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST LE PLUS URGENT DU LOT. Un
// attribut du modèle porte le numéro d'un de ces articles dans son nom :
// `Etablissement.manipuleMatieresR422722`. Le dépôt encodait donc une question
// posée au dirigeant, un champ Prisma, un `OU` du moteur de matching
// (`champR422734`) et trois obligations d'incendie sur un article que PERSONNE
// N'AVAIT OUVERT — zéro entrée de corpus au 2026-09-02, alors que `R. 4227-34`,
// qui le cite, était dépouillé en première main la veille.
//
// CE QUE L'ARTICLE DIT, ET CE QUE L'ATTRIBUT EN FAIT. Les deux se recouvrent,
// mais pas exactement, et l'écart se lit dans la `reserve` de `R. 4227-22`
// ci-dessous. En un mot : l'attribut est nommé d'après le mauvais article. La
// condition de déclenchement — « manipulées ET mises en œuvre » — est celle de
// `R. 4227-34` ; `R. 4227-22` ne sert qu'à DÉSIGNER LES MATIÈRES, et son propre
// champ est plus large (« entreposées OU manipulées »).
//
// `R. 4227-21` N'EST PAS ICI PARCE QU'IL N'EXISTE PLUS. La section s'intitulait
// « Articles R4227-21 à R4227-27 » jusqu'au 1er juillet 2011 ; elle s'intitule
// « R4227-22 à R4227-27 » depuis. L'article a été abrogé, et un corpus
// `integral` qui l'aurait recopié depuis une reproduction consolidée aurait
// réintroduit exactement le défaut que ce dépôt a découvert la semaine
// dernière — un article abrogé quatre mois plus tôt, encore cité. Vérifié sur
// le sommaire de section, pas déduit.
//
// UN RENVOI MORT, RELEVÉ CHEMIN FAISANT. `R. 4227-23` renvoie à « l'article
// L. 3511-7 du code de la santé publique ». Cet article est ABROGÉ depuis le
// 19 mai 2016 par l'ordonnance n° 2016-623, qui l'a recodifié à L. 3512-8 au
// contenu inchangé. Le renvoi n'a jamais été mis à jour dans le code du
// travail. Constaté, non corrigé : L. 3512-8 n'a pas été ouvert, et ce corpus
// ne l'encode pas.
//
// ÉTENDUE « INTEGRAL » : les six articles en vigueur de la section y sont tous,
// y compris ceux qui n'intéressent pas le produit.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-02.

import type { Corpus } from "./types";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

export const CODE_TRAVAIL_MATIERES_INFLAMMABLES: Corpus = {
  id: "code-travail-matieres-inflammables",
  intitule:
    "Code du travail — emploi et stockage de matières explosives et inflammables",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489111/",
  etendue: "integral",
  portee:
    "Les six articles en vigueur de la section 4 « Emploi et stockage de matières explosives et inflammables » du chapitre VII (prévention des incendies) : les locaux sans source d'ignition et à ventilation permanente (R. 4227-22), l'interdiction de fumer aux emplacements à l'air libre et sa signalisation (R. 4227-23), les trois conditions d'utilisation des locaux — dix mètres d'une issue, portes ouvrant vers l'extérieur, grilles ouvrables de l'intérieur (R. 4227-24), l'interdiction de déposer ces matières dans les dégagements (R. 4227-25), les chiffons imprégnés enfermés dans des récipients métalliques clos (R. 4227-26) et l'habilitation d'un arrêté pour le gaz et les hydrocarbures liquéfiés (R. 4227-27). R. 4227-21 n'y figure pas : il est abrogé depuis le 1er juillet 2011. DEUX CHAMPS DISTINCTS COHABITENT DANS LA SECTION et rien ne les nomme pareil : R. 4227-22 vise les substances « explosives, comburantes ou extrêmement inflammables » et les matières susceptibles d'explosion ou d'inflammation instantanée ; R. 4227-24 étend son propre champ aux substances « facilement inflammables » — un cran EN DESSOUS dans la classification —, ce qui en fait l'article le plus large de la section.",
  articles: [
    {
      ref: "R. 4227-22",
      intitule:
        "Locaux de matières explosives et inflammables — absence de source d'ignition et ventilation permanente",
      url: ART("LEGIARTI000018532097"),
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 ».
      // Aucun texte modificateur depuis.
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Impose deux états permanents aux LOCAUX ET EMPLACEMENTS où sont entreposées ou manipulées des substances classées explosives, comburantes ou extrêmement inflammables, ou des matières susceptibles d'explosion ou d'inflammation instantanée : aucune source d'ignition (foyer, flamme, appareil produisant des étincelles à l'extérieur, surface provoquant une auto-inflammation par sa température), et une ventilation permanente appropriée. Aucune périodicité, aucune pièce écrite, aucun seuil d'effectif.",
      citationCle:
        "Les locaux ou les emplacements dans lesquels sont entreposées ou manipulées des substances ou préparations classées explosives, comburantes ou extrêmement inflammables, ainsi que des matières dans un état physique susceptible d'engendrer des risques d'explosion ou d'inflammation instantanée, ne contiennent aucune source d'ignition telle que foyer, flamme, appareil pouvant donner lieu à production extérieure d'étincelles ni aucune surface susceptible de provoquer par sa température une auto-inflammation des substances, préparations ou matières précitées. Ces locaux disposent d'une ventilation permanente appropriée.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "L'ATTRIBUT `manipuleMatieresR422722` EST EXACT SUR LES PRODUITS ET MAL NOMMÉ SUR LA CONDITION, ce qui est le résultat le plus important de ce lot. L'aide du formulaire d'établissement dit « produits classés explosifs, comburants ou extrêmement inflammables (art. R. 4227-22 du Code du travail), manipulés ou mis en œuvre dans vos locaux — pas seulement stockés » : les trois classes sont bien celles de cet article, mot pour mot. Mais la CONDITION « manipulés ou mis en œuvre, pas seulement stockés » n'est pas de lui — elle vient de R. 4227-34 (« où sont manipulées ET mises en œuvre des matières inflammables mentionnées à l'article R. 4227-22 »), qui est l'article que l'attribut sert réellement. R. 4227-22, lui, vise « entreposées OU manipulées » : le simple entreposage suffit à le déclencher. L'attribut porte donc le numéro de l'article qui DÉSIGNE LES MATIÈRES, en énonçant le champ de l'article qui les UTILISE. Deux conséquences : la formule du formulaire est juste pour l'usage qu'en fait le moteur (le déclenchement des obligations d'incendie par `champR422734`) et fausse comme description de R. 4227-22 ; et un établissement qui ne fait qu'entreposer répondra « non » en toute bonne foi tout en relevant de l'article dont l'attribut porte le nom. Une seconde omission, mineure : l'aide ne reprend pas la quatrième catégorie de l'article — « matières dans un état physique susceptible d'engendrer des risques d'explosion ou d'inflammation instantanée ».\n\nDEUX ÉTATS PERMANENTS QUE LE RÉFÉRENTIEL NE PORTE PAS, et le second a un voisin qui ne le couvre pas. `stockage-dangereux-ventilation-locaux` fait bien contrôler annuellement une ventilation, mais elle se fonde sur R. 4222-20 et l'arrêté du 8 octobre 1987 (locaux à POLLUTION SPÉCIFIQUE), et surtout elle se déclenche sur la catégorie d'équipement STOCKAGE_MATIERE_DANGEREUSE. Un établissement qui a répondu « oui » à la question des matières inflammables sans avoir déclaré d'équipement de stockage ne reçoit donc rien, alors que R. 4227-22 l'oblige sans condition d'effectif ni d'équipement. L'absence de source d'ignition n'est portée par rien du tout.\n\nAUCUN BLOCAGE DE MODÈLE — et c'est ce qui distingue cette entrée de la plupart des autres de cette liste. L'état permanent de l'ADR-026 existe, le porteur établissement existe, et l'attribut de déclenchement existe déjà en base (`manipuleMatieresR422722`). Ce qui manque n'est pas un moyen, c'est une lecture : la section 4 n'avait jamais été ouverte.\n\nCE QUI RESTERAIT À TRANCHER SI ON L'ENCODAIT : l'attribut est lu « non » quand il est absent (`engine.ts`, critère 3 bis), ce qui convient à une branche qui ne fait qu'AJOUTER des obligations à un champ déjà ouvert par un seuil de personnes, mais qui ferait ici disparaître l'obligation entière pour tout établissement n'ayant pas répondu. Le silence deviendrait un « non » sur une obligation qui n'a pas d'autre porte d'entrée, alors qu'il ne l'est aujourd'hui que sur une branche d'un OU.",
    },
    {
      ref: "R. 4227-23",
      intitule:
        "Interdiction de fumer aux emplacements à l'air libre et sa signalisation",
      url: ART("LEGIARTI000018532095"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Étend l'interdiction de fumer aux EMPLACEMENTS SITUÉS À L'AIR LIBRE mentionnés à R. 4227-22 — là où l'interdiction générale des lieux collectifs ne porte pas — et impose que cette interdiction fasse l'objet d'une signalisation conforme à la réglementation en vigueur.",
      citationCle:
        "Outre l'interdiction de fumer dans les lieux collectifs, prévue à l'article L. 3511-7 du code de la santé publique, il est interdit de fumer dans les emplacements situés à l'air libre mentionnés à l'article R. 4227-22. Cette interdiction fait l'objet d'une signalisation conforme à la réglementation en vigueur.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "UNE SIGNALISATION OBLIGATOIRE QUE LE DOMAINE `signalisation`, ENCODÉ LE 2026-09-02 MÊME, NE PORTE PAS : il vient de l'arrêté du 4 novembre 1993, dont le champ est la signalisation de santé et de sécurité au travail, et aucune de ses obligations ne vise l'interdiction de fumer. Le panneau de R. 4227-23 est donc dû, opposable, et réclamé par personne.\n\nCE QUI LE BLOQUE est un attribut, et un seul : l'article ne vise que les emplacements situés À L'AIR LIBRE — la partie du champ de R. 4227-22 que l'interdiction générale des lieux collectifs ne couvre pas. `manipuleMatieresR422722` dit qu'un établissement manipule ces matières, jamais qu'il le fait dehors. Déclencher sur l'attribut seul afficherait le panneau à un laboratoire de pâtisserie entièrement clos, qui n'en doit aucun.\n\nRENVOI MORT, CONSTATÉ ET NON CORRIGÉ : « L. 3511-7 du code de la santé publique » est abrogé depuis le 19 mai 2016 (ordonnance n° 2016-623), recodifié à L. 3512-8 au contenu inchangé. Le code du travail n'a jamais été mis à jour. L. 3512-8 n'a pas été ouvert par ce lot.",
    },
    {
      ref: "R. 4227-24",
      intitule:
        "Conditions d'utilisation des locaux — issue à dix mètres, portes vers l'extérieur, grilles",
      url: ART("LEGIARTI000018532093"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Impose trois conditions d'UTILISATION — le verbe est « sont utilisés », pas « sont construits » — aux locaux de R. 4227-22 et, en plus, à ceux où se trouvent des substances « facilement inflammables » : aucun poste habituel de travail à plus de dix mètres d'une issue donnant sur l'extérieur ou sur un local y donnant lui-même, portes s'ouvrant vers l'extérieur, grilles ou grillages de fenêtres s'ouvrant très facilement de l'intérieur.",
      citationCle:
        "Les locaux mentionnés à l'article R. 4227-22 ainsi que ceux dans lesquels sont entreposées ou manipulées des substances ou préparations classées facilement inflammables ou des matières dans un état physique tel qu'elles sont susceptibles de prendre feu instantanément au contact d'une flamme ou d'une étincelle et de propager rapidement l'incendie, sont utilisés de telle sorte que : 1° Aucun poste habituel de travail ne se trouve à plus de 10 mètres d'une issue donnant sur l'extérieur ou sur un local donnant lui-même sur l'extérieur ; 2° Les portes de ces locaux s'ouvrent vers l'extérieur ; 3° Si les fenêtres de ces locaux sont munies de grilles ou grillages, ceux-ci s'ouvrent très facilement de l'intérieur.",
      statut: "obligation_manquante",
      cause: "attribut_etablissement",
      toucheLaCible: true,
      motif:
        "L'ARTICLE LE PLUS LARGE DE LA SECTION, et le seul qui déborde l'attribut du modèle. Son champ n'est pas celui de R. 4227-22 : il y AJOUTE les substances « facilement inflammables », un cran en dessous d'« extrêmement inflammables » dans la classification CLP. Un établissement qui répond « non » à `manipuleMatieresR422722` — parce qu'il ne manipule rien d'extrêmement inflammable — peut donc relever de R. 4227-24 en plein. Aucun attribut du modèle ne décrit ce champ-là, et c'est ce qui bloque : la question posée au dirigeant est plus étroite que l'article.\n\nCE N'EST PAS UNE RÈGLE DE CONSTRUCTION, et le classer `hors_perimetre / construction` aurait été le geste facile. Le chapeau dit « sont UTILISÉS de telle sorte que », l'article vit au Livre II Titre II (obligations de l'employeur pour l'utilisation des lieux de travail), et son 3° — les grilles ouvrables de l'intérieur — se vérifie à la main un matin quelconque. Deux de ses trois conditions se soldent une fois pour toutes à l'aménagement, ce qui est un vrai argument contre une case à cocher annuelle, mais pas contre l'existence de l'obligation.",
    },
    {
      ref: "R. 4227-25",
      intitule:
        "Interdiction de déposer ces matières dans les escaliers, passages et couloirs",
      url: ART("LEGIARTI000018532091"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Interdit de déposer et de laisser séjourner les substances de R. 4227-22 et de R. 4227-24 dans les escaliers, passages et couloirs, sous les escaliers, et à proximité des issues des locaux et bâtiments. État permanent, sans acte ni pièce.",
      citationCle:
        "Il est interdit de déposer et de laisser séjourner les substances, préparations ou matières mentionnées aux articles R. 4227-22 et R. 4227-24 dans les escaliers, passages et couloirs, sous les escaliers ainsi qu'à proximité des issues des locaux et bâtiments.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "OBLIGATION DE NE PAS FAIRE, PERMANENTE, ET C'EST CE QUI LA REND DIFFICILE À PORTER PLUTÔT QU'IMPOSSIBLE. Le référentiel ne connaît que des actes à faire et des états à maintenir ; « ne pas laisser séjourner » est un état à maintenir, donc encodable en état permanent de l'ADR-026 — au même titre que les extincteurs « maintenus en bon état » que le produit porte déjà.\n\nDEUX CHOSES LA BLOQUENT. (1) Son champ est celui de R. 4227-22 ET de R. 4227-24 réunis, donc plus large que l'attribut `manipuleMatieresR422722` — même limite que R. 4227-24. (2) Une case à cocher à vie y répondrait en apparence : le manquement naît d'un carton posé sous un escalier un mardi et retiré le jeudi, et rien de ce que l'outil détient ne le verrait. C'est un cas où le déclarer non porté vaut mieux que le porter mal, et c'est pour cela qu'il est écrit ici plutôt qu'encodé.",
    },
    {
      ref: "R. 4227-26",
      intitule:
        "Chiffons et papiers imprégnés enfermés dans des récipients métalliques clos",
      url: ART("LEGIARTI000018532089"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Impose que les chiffons, cotons et papiers imprégnés de liquides inflammables OU DE MATIÈRES GRASSES soient, après usage, enfermés dans des récipients métalliques clos et étanches. Aucune périodicité, aucune pièce, aucun seuil.",
      citationCle:
        "Les chiffons, cotons et papiers imprégnés de liquides inflammables ou de matières grasses sont, après usage, enfermés dans des récipients métalliques clos et étanches.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "L'ARTICLE DE LA SECTION QUI TOUCHE LE PLUS DIRECTEMENT LA CIBLE, et il n'a aucun rapport avec les matières explosives. « Ou de matières grasses » : un torchon de cuisine imbibé d'huile relève de cet article, dans toute cuisine de restaurant, sans condition d'effectif et sans qu'aucune matière classée dangereuse soit présente. Le risque est réel et documenté — l'auto-échauffement des textiles gras est une cause d'incendie connue.\n\nCE QUI LE BLOQUE N'EST PAS LE MODÈLE mais le déclencheur. L'article ne vit pas sous la condition de R. 4227-22 : sa phrase est autonome et vise tout lieu de travail où l'on utilise de tels chiffons. Le déclencher supposerait de savoir qu'un établissement en produit — c'est le cinquième déclencheur de l'ADR-022, « activité réellement exercée », non implémenté. L'accrocher au secteur restauration serait une inférence de code NAF, que ce dépôt n'autorise pas ; l'accrocher à `manipuleMatieresR422722` sous-appliquerait à contresens du texte, l'article n'en dépendant pas.",
    },
    {
      ref: "R. 4227-27",
      intitule:
        "Habilitation : arrêté sur les installations industrielles au gaz et aux hydrocarbures liquéfiés",
      url: ART("LEGIARTI000018532087"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Renvoie à un arrêté des ministres chargés du travail et de l'agriculture le soin de déterminer les dispositions spécifiques aux installations INDUSTRIELLES utilisant le gaz combustible et les hydrocarbures liquéfiés. Ne prescrit rien par lui-même.",
      citationCle:
        "Un arrêté des ministres chargés du travail et de l'agriculture détermine les dispositions spécifiques relatives aux installations industrielles utilisant le gaz combustible et les hydrocarbures liquéfiés.",
      statut: "sans_objet",
      motif:
        "ARTICLE D'HABILITATION : il ne prescrit rien, il annonce un arrêté. Deux raisons de le consigner plutôt que de l'ignorer.\n\n(1) SON CHAMP EST « INDUSTRIEL », et c'est le mot qui l'écarte : le produit sert la restauration, le commerce de détail et le tertiaire. Une cuisine de restaurant alimentée au gaz relève de l'arrêté du 23 février 2018 (habitation) et du règlement ERP (GZ), tous deux déjà au corpus — pas d'un texte sur les installations industrielles.\n\n(2) LE DÉPÔT A UNE RÈGLE POUR CES ARTICLES-LÀ, née de `R. 4323-23` le 2026-09-01 : un article d'habilitation se lit en énumérant les arrêtés qu'il habilite, faute de quoi on conclut à tort que le domaine ne porte aucune périodicité. JE N'AI PAS PU L'APPLIQUER ICI : la page de l'article ne nomme aucun arrêté d'application, et je n'en ai identifié aucun. Ce n'est donc pas « il n'y en a pas », c'est « je ne l'ai pas trouvé ». Le jour où l'un d'eux apparaîtra, cette entrée devra être rouverte — pas parce que le champ industriel aura changé, mais parce que la question n'a jamais été refermée.",
    },
  ],
};
