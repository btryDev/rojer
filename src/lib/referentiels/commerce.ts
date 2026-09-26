import type { Referentiel } from "./types";

/**
 * Référentiel commerce de détail (alimentaire et non alimentaire).
 *
 * Sources :
 *  - INRS AC 93 « OiRA commerce non alimentaire — Un nouvel outil d'aide à
 *    l'évaluation des risques » (Réf. en santé au travail n° 146, juin 2016).
 *    Structure des unités OiRA : Réception et stockage / Mise en rayon /
 *    Activité de vente / Ambiance et aménagement des locaux / Interventions
 *    chez les clients / Atelier (laboratoire).
 *  - INRS ED 925 « Les commerces alimentaires de proximité ».
 *  - INRS ED 840 « Évaluation des risques professionnels — Aide au repérage
 *    des risques dans les PME-PMI », 8e édition (2023), révisée en mai 2025 — taxonomie des risques.
 *  - ameli.fr / Assurance Maladie Risques professionnels — secteur commerce.
 */
export const commerce: Referentiel = {
  id: "commerce",
  nom: "Commerce de détail",
  codesNaf: [
    "47.11",
    "47.19",
    "47.21",
    "47.22",
    "47.23",
    "47.24",
    "47.25",
    "47.29",
    "47.41",
    "47.42",
    "47.43",
    "47.51",
    "47.52",
    "47.53",
    "47.54",
    "47.59",
    "47.6",
    "47.7",
    "47.8",
    "47.9",
  ],
  unitesTravailSuggerees: [
    {
      id: "com-reception-stockage",
      nom: "Réception et stockage",
      description:
        "Déchargement, contrôle, rangement en réserve (source : OiRA commerce non alimentaire).",
    },
    {
      id: "com-mise-rayon",
      nom: "Mise en rayon et vitrine",
      description:
        "Approvisionnement des rayons, opérations en hauteur, merchandising (source : OiRA).",
    },
    {
      id: "com-vente-caisse",
      nom: "Activité de vente et caisse",
      description:
        "Accueil, conseil client, encaissement, manipulation d'espèces.",
    },
    {
      id: "com-locaux",
      nom: "Locaux et ambiance générale",
      description:
        "Surface de vente, sanitaires, espaces communs (source : OiRA).",
    },
  ],
  risques: [
    {
      id: "com-charge-physique",
      libelle: "Charge physique : manutentions et postures (mise en rayon, port de charges)",
      description:
        "ED 840, fiche 5 « Risques liés à la charge physique de travail ».",
      unitesAssociees: ["com-reception-stockage", "com-mise-rayon"],
      graviteParDefaut: 3,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "com-aides-manut",
          libelle:
            "Aides à la manutention : transpalettes, chariots, diables, dessertes",
          type: "reduction_source",
        },
        {
          id: "com-rangement-hauteur",
          libelle:
            "Rangement des charges lourdes à hauteur d'homme, allègement des contenants",
          type: "organisationnelle",
        },
        {
          id: "com-prap",
          libelle:
            "Formation Prap (prévention des risques liés à l'activité physique)",
          type: "formation",
        },
        {
          id: "com-chaussures-secu",
          libelle: "Chaussures de sécurité en réserve",
          type: "protection_individuelle",
        },
      ],
    },
    {
      id: "com-chute-plain-pied",
      libelle: "Chute de plain-pied (sols, allées encombrées)",
      description: "ED 840 fiche 1.",
      unitesAssociees: [
        "com-reception-stockage",
        "com-mise-rayon",
        "com-vente-caisse",
        "com-locaux",
      ],
      graviteParDefaut: 2,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "com-allees",
          libelle:
            "Allées de circulation dégagées et signalisées en permanence",
          type: "organisationnelle",
        },
        {
          id: "com-sol-anti",
          libelle:
            "Revêtement antidérapant aux zones sensibles (entrée, sanitaires, réserve humide)",
          type: "reduction_source",
        },
        {
          id: "com-nettoyage-signal",
          libelle:
            "Protocole de nettoyage avec signalisation des zones humides",
          type: "organisationnelle",
        },
      ],
    },
    {
      id: "com-chute-hauteur",
      libelle: "Chute de hauteur (mise en rayon, vitrine, archives)",
      description: "ED 840 fiche 2. OiRA commerce : opérations de mise en rayon en hauteur.",
      unitesAssociees: ["com-reception-stockage", "com-mise-rayon"],
      graviteParDefaut: 3,
      probabiliteParDefaut: 2,
      mesuresRecommandees: [
        {
          // Identifiant gardé malgré « norme » (retiré du libellé le 2026-09-26) :
          // il est stocké en base et n'est pas affiché ; le renommer casserait
          // la continuité des mesures déjà retenues.
          id: "com-marchepied-norme",
          libelle:
            "Escabeau ou marchepied stable ; proscrire les escaliers improvisés",
          type: "protection_collective",
        },
        {
          id: "com-interdiction-rayon",
          libelle:
            "Interdiction formelle de monter sur les rayonnages",
          type: "organisationnelle",
        },
      ],
    },
    {
      id: "com-rps-public",
      libelle:
        "Risques psychosociaux : agression, incivilités, braquage",
      description:
        "ED 840, fiche 17 « Risques psychosociaux ». Situations possibles : la caisse, l'ouverture et la fermeture du magasin.",
      unitesAssociees: ["com-vente-caisse", "com-locaux"],
      graviteParDefaut: 4,
      probabiliteParDefaut: 2,
      mesuresRecommandees: [
        {
          id: "com-coffre-differe",
          libelle:
            "Coffre à dépôt différé, limitation des fonds en caisse, collecte programmée",
          type: "reduction_source",
        },
        {
          id: "com-video-eclairage",
          libelle:
            "Vidéosurveillance et éclairage extérieur (entrée, parking)",
          type: "protection_collective",
        },
        {
          id: "com-procedure-fermeture",
          libelle:
            "Procédure d'ouverture / fermeture à deux personnes",
          type: "organisationnelle",
        },
        {
          id: "com-formation-conflit",
          libelle:
            "Formation à la gestion des incivilités et conduite à tenir en cas d'agression",
          type: "formation",
        },
      ],
    },
    {
      id: "com-postural-caisse",
      libelle:
        "Charge physique en caisse : posture statique et gestes répétitifs",
      description: "ED 840, fiche 5 « Risques liés à la charge physique de travail ».",
      unitesAssociees: ["com-vente-caisse"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 4,
      mesuresRecommandees: [
        {
          id: "com-siege-caisse",
          libelle:
            "Siège ergonomique réglable et repose-pieds aux postes de caisse",
          type: "protection_collective",
        },
        {
          id: "com-rotation-caisse",
          libelle:
            "Rotation des postes, alternance assis / debout, micropauses régulières",
          type: "organisationnelle",
        },
        {
          id: "com-info-tms",
          libelle:
            "Information / formation à la prévention des TMS et aux postures",
          type: "formation",
        },
      ],
    },
    {
      id: "com-coupure-cutter",
      libelle: "Coupure (cutter, ouverture de cartons, étiquetage)",
      description: "ED 840, fiche 9 « Risques liés aux équipements de travail », qui cite parmi les situations dangereuses l'« utilisation d'outils tranchants : couteaux, hachoirs, cutters, scies… ».",
      unitesAssociees: ["com-reception-stockage", "com-mise-rayon"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "com-cutter-securite",
          libelle:
            "Cutters à lame rétractable automatique ou cutters de sécurité",
          type: "reduction_source",
        },
        {
          id: "com-gants-anti-coup",
          libelle:
            "Gants anti-coupure pour les opérations à risque",
          type: "protection_individuelle",
        },
      ],
    },
    {
      id: "com-chimique",
      libelle: "Produits chimiques (entretien, désinfection)",
      description: "ED 840 fiche 7.",
      unitesAssociees: ["com-locaux", "com-reception-stockage"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 2,
      mesuresRecommandees: [
        {
          id: "com-substitution-chim",
          libelle:
            "Substitution par produits moins dangereux ; étiquetage CLP respecté",
          type: "reduction_source",
        },
        {
          id: "com-fds-com",
          libelle:
            "Fiches de données de sécurité (FDS) accessibles au personnel",
          type: "formation",
        },
        {
          id: "com-gants-chim-com",
          libelle: "Gants de protection adaptés au produit",
          type: "protection_individuelle",
        },
      ],
    },
    {
      id: "com-bruit",
      libelle: "Ambiance sonore (musique, ventilation, affluence)",
      description: "ED 840 fiche 11. À évaluer notamment dans les commerces avec musique de fond. « En cas de mesurage, celui-ci est renouvelé au moins tous les cinq ans. » (art. R. 4433-2)",
      unitesAssociees: ["com-vente-caisse", "com-locaux"],
      graviteParDefaut: 1,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "com-niveau-sonore",
          libelle:
            "Limiter le niveau sonore de la musique d'ambiance ; mesurer si doute",
          type: "reduction_source",
        },
      ],
    },
    {
      // Entré le 2026-09-20 avec l'encodage de R. 4463-2, qui vise l'exposition
      // « en intérieur ou en extérieur » de tout employeur. Le bureau nommait
      // déjà les « vagues de chaleur » (`bur-thermique`) ; le commerce n'en
      // disait rien, la restauration non plus (`resto-ambiance-thermique` ne
      // traite que le contraste cuisine / chambre froide — elle reçoit le même
      // risque dans ce lot). Cinq mesures CHOISIES parmi celles de R. 4463-3,
      // R. 4463-4 et R. 4463-6, dans leurs mots ; les 1°, 2°, 6° et 7° de
      // R. 4463-3 ne sont pas repris. Cotation par défaut : celle du bureau.
      // ~~« ED 840 fiche 12 »~~ retiré de la description : recopié de
      // `bur-thermique` sans que rien dans le dépôt établisse ce que porte
      // cette fiche. Le Code du travail suffit à sourcer. [Relu le 2026-09-26
      // sur le sommaire de la brochure (8e édition révisée en mai 2025) : la
      // fiche 12 est bien « Risques liés aux ambiances thermiques ». Le motif
      // du retrait était faux ; la référence n'est pas remise, le Code suffit.]
      id: "com-chaleur-intense",
      libelle: "Ambiances thermiques — épisodes de chaleur intense",
      description:
        "Code du travail, art. R. 4463-2, R. 4463-3, R. 4463-4 et R. 4463-6.",
      unitesAssociees: [
        "com-reception-stockage",
        "com-vente-caisse",
        "com-locaux",
      ],
      graviteParDefaut: 2,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "com-chaleur-moyens-techniques",
          libelle:
            "Moyens techniques pour réduire le rayonnement solaire sur les surfaces exposées et prévenir l'accumulation de chaleur dans les locaux ou au poste de travail",
          type: "protection_collective",
        },
        {
          id: "com-chaleur-organisation",
          libelle:
            "Adaptation de l'organisation et des horaires de travail pour limiter la durée et l'intensité de l'exposition, avec des périodes de repos",
          type: "organisationnelle",
        },
        {
          id: "com-chaleur-eau",
          libelle:
            "En cas d'épisode de chaleur intense, eau potable fraîche en quantité suffisante, maintenue au frais à proximité des postes de travail",
          type: "organisationnelle",
        },
        {
          id: "com-chaleur-signalement",
          libelle:
            "Modalités de signalement d'un indice physiologique préoccupant, d'un malaise ou d'une détresse, et de secours, portées à la connaissance des travailleurs",
          type: "organisationnelle",
        },
        {
          id: "com-chaleur-formation",
          libelle:
            "Information et formation des travailleurs sur la conduite à tenir en cas de forte chaleur",
          type: "formation",
        },
      ],
    },
  ],
  questionsDetection: [],
  /*
   * Les activités hors couverture du secteur.
   *
   * Le référentiel ci-dessus tient dans quatre unités — réception et stockage,
   * mise en rayon, vente et caisse, locaux. La structure OiRA citée en tête du
   * fichier en compte six : il lui manque « Atelier (laboratoire) » et
   * « Interventions chez les clients ». Ce n'est pas un détail de découpage.
   * Le dépliant INRS ED 6401 « Commerces alimentaires de proximité » (1re éd.,
   * novembre 2020) ne nomme que quatre risques principaux — douleurs au dos,
   * chutes, coupures au cutter de déballage, agression et stress — soit très
   * exactement le périmètre de ces quatre unités. Tout ce qui se fabrique ou se
   * transforme dans l'arrière-boutique en sort, et l'INRS le dit à sa façon :
   * il consacre aux ateliers des outils OiRA distincts (« Boucherie -
   * Charcuterie », « Poissonnerie », « Boulangerie - Pâtisserie - Chocolaterie
   * - Glacerie »), parce que les familles de risques n'y sont pas les mêmes.
   *
   * Le NAF 47.11 couvre pourtant aussi bien la supérette que l'hypermarché avec
   * rayon boucherie : les deux tombent sur ce référentiel, et rien jusqu'ici ne
   * les distinguait.
   *
   * Écartées faute d'ajouter une famille de risques que le référentiel n'ait
   * déjà : la livraison et les tournées (le risque routier est porté par le
   * référentiel transverse, `trv-routier`), l'ouverture tardive et le travail
   * seul (`trv-rps-isolement`, et `com-rps-public` couvre déjà l'agression et
   * le braquage), le stockage d'archives (`com-chute-hauteur`). Écartées faute
   * de source INRS exploitable : fleuriste et jardinerie, pour lesquels l'INRS
   * ne publie ni outil OiRA, ni page métier, ni dépliant TPE. Écartées comme
   * hors NAF : la station-service (47.30, que `codesNaf` ne vise pas) et la
   * réparation automobile (NAF 45).
   */
  activitesNonCouvertes: [
    {
      // Sources : INRS, outil OiRA « Boucherie - Charcuterie » (outil71) —
      // outil sectoriel distinct de celui du commerce, ce qui dit déjà que le
      // commerce ne le couvre pas. Dépliant INRS ED 6382 « Boucherie -
      // Charcuterie. Santé au travail : passez à l'action ! » (1re éd., octobre
      // 2020) : douleurs au dos, chutes, brûlures, coupures, risques liés aux
      // machines. Page INRS « Filière viandes » : « machines à trancher,
      // scies… » → amputations, coupures, écrasements ; travail au froid comme
      // facteur de TMS ; risque biologique. INRS ED 6227 « Sécurisation des
      // scies à ruban dans l'agroalimentaire » pour la machine la plus
      // accidentogène du laboratoire.
      id: "com-decoupe-viande",
      libelle: "Découpe de viande sur place",
      question: "Découpez-vous de la viande sur place ?",
      aide:
        "Répondez oui s'il existe un rayon boucherie, charcuterie ou traiteur avec un laboratoire de découpe. Répondez non si vous vendez uniquement de la viande reçue déjà conditionnée.",
      cequiManque:
        "L'évaluation ne décrit pas le laboratoire de découpe : machines à trancher et scies à ruban, qui exposent à des coupures, des écrasements et des amputations ; travail au couteau tout au long de la journée ; exposition au froid en chambre froide et au contact des produits ; troubles musculo-squelettiques du désossage et de la découpe répétée ; manutention des carcasses et des quartiers ; risque biologique lié à la manipulation de viande crue.",
      pourquoi:
        "Le référentiel « Commerce de détail » est bâti sur la structure OiRA du commerce, dont il ne retient que le magasin : réception et stockage, mise en rayon, vente et caisse, locaux. L'INRS traite la boucherie et la charcuterie dans un outil d'évaluation distinct (OiRA « Boucherie - Charcuterie », dépliant ED 6382), parce que les familles de risques d'un laboratoire de découpe ne sont pas celles d'une surface de vente. Le code NAF du commerce de détail, lui, ne distingue pas la supérette de l'hypermarché qui découpe sur place.",
    },
    {
      // Sources : INRS, outil OiRA « Poissonnerie » (outil72) et dépliant INRS
      // ED 6380 « Poissonnerie » (2e éd. révisée, octobre 2022), qui traite la
      // manutention de la glace comme un risque à part entière, au même rang
      // que les chutes. Page métier INRS « Poissonnerie. Les risques du
      // métier » : coupures par les arêtes dorsales et lors de la manipulation
      // des déchets, infections cutanées consécutives aux coupures, risque
      // électrique dû à des installations inadaptées au milieu humide.
      // ~~L'INRS y relève la durée d'arrêt moyenne par maladie professionnelle
      // la plus élevée des commerces de bouche.~~ [Retiré le 2026-09-26 : la
      // page métier, relue ce jour, ne porte cette comparaison dans aucun
      // texte lisible — son encadré « Quelques chiffres » est une image sans
      // texte alternatif. Non vérifiable, donc plus affiché.]
      id: "com-rayon-maree",
      libelle: "Préparation du poisson et des coquillages",
      question: "Préparez-vous du poisson ou des coquillages sur place ?",
      aide:
        "Répondez oui s'il existe un banc de marée, un rayon poissonnerie ou un poste d'écaillage. Répondez non si le poisson arrive déjà préparé et emballé.",
      cequiManque:
        "L'évaluation ne décrit pas le banc de marée : manutention répétée de la glace, du chargement du banc à l'évacuation de l'eau de fonte ; coupures par les arêtes et par les couteaux, et infections cutanées qui s'ensuivent ; installations électriques exposées à l'humidité permanente du poste ; travail debout dans le froid et sur sol mouillé.",
      pourquoi:
        "Les unités types de ce référentiel décrivent la vente, pas la préparation des produits. L'INRS consacre à ce métier un outil d'évaluation distinct (OiRA « Poissonnerie », dépliant ED 6380).",
    },
    {
      // Sources : INRS, outil OiRA « Boulangerie - Pâtisserie - Chocolaterie -
      // Glacerie » (outil70) et dépliant INRS ED 6400 du même nom (1re éd.,
      // octobre 2020) : allergies et asthme dus aux poussières de farine **et
      // de sucre glace**, brûlures aux appareils de cuisson, manutention de
      // grandes quantités. Page métier INRS « Boulangerie - Pâtisserie -
      // Chocolaterie - Glacerie. Les risques du métier » : les farines sont la
      // première cause d'asthme professionnel, et les boulangers représentent
      // un quart des salariés atteints d'affections respiratoires en France.
      //
      // Le travail de nuit n'est volontairement pas cité **ici** : l'INRS ne le
      // nomme ni dans ED 6400 ni sur la page métier, et une source générique
      // sur les horaires atypiques ne fonde pas une mention sectorielle
      // (règle 6). Il est en revanche porté depuis le 2026-08-25 par le risque
      // transverse `trv-travail-nuit`, adossé à ED 6305 qui lui est
      // spécifiquement consacré — la question de détection l'ajoute au dossier
      // quel que soit le secteur.
      id: "com-fabrication-boulangere",
      libelle: "Fabrication de pain, de viennoiseries ou de pâtisseries",
      question:
        "Fabriquez-vous du pain, des viennoiseries, des pâtisseries ou des glaces sur place ?",
      aide:
        "Répondez oui dès qu'il y a un four ou un laboratoire dans le magasin, y compris pour cuire des produits livrés crus ou surgelés.",
      cequiManque:
        "L'évaluation ne décrit pas le fournil ni le laboratoire de pâtisserie : poussières de farine et de sucre glace, première cause d'asthme professionnel, et rhinites associées ; brûlures au four et aux appareils de cuisson ; pétrins, diviseuses et laminoirs ; manutention des sacs de farine, des seaux et des chariots de plaques.",
      pourquoi:
        "Le référentiel décrit un magasin qui vend des produits reçus finis. La fabrication sur place relève d'un outil d'évaluation distinct de l'INRS (OiRA « Boulangerie - Pâtisserie - Chocolaterie - Glacerie », dépliant ED 6400), et l'exposition respiratoire aux poussières qu'elle entraîne n'a pas d'équivalent parmi les risques types de ce référentiel, dont le volet chimique ne vise que les produits d'entretien.",
    },
    {
      // Source : la structure OiRA du commerce non alimentaire citée en tête de
      // ce fichier comporte une unité « Interventions chez les clients » qui n'a
      // pas d'équivalent dans `unitesTravailSuggerees`. Pour les familles de
      // risques du travail sur le site d'un tiers : dossier INRS « Entreprises
      // extérieures » (risques d'interférence et de coactivité, inspection
      // commune préalable, plan de prévention — art. R. 4511-1 et s. du code du
      // travail).
      id: "com-intervention-chez-client",
      libelle: "Interventions chez les clients",
      question:
        "Vos salariés se rendent-ils chez les clients pour livrer, installer ou dépanner ?",
      aide:
        "La question porte sur le travail effectué une fois sur place, pas sur le trajet pour s'y rendre.",
      cequiManque:
        "L'évaluation ne décrit que le magasin et ses réserves. Elle ne porte pas sur le travail réalisé chez le client : accès, sols, escaliers et installations électriques d'un lieu que vous ne connaissez pas à l'avance ; portage et manutention dans des espaces contraints ; risques d'interférence avec les autres intervenants présents sur place ; intervention seul, loin de tout renfort.",
      pourquoi:
        "La structure OiRA du commerce comporte une unité « Interventions chez les clients » que les unités types de ce référentiel ne reprennent pas : elles décrivent toutes le magasin et ses réserves, c'est-à-dire des lieux que l'employeur maîtrise. Le travail réalisé sur le site d'un tiers met en présence plusieurs entreprises sur un même lieu, situation que l'INRS traite à part dans son dossier « Entreprises extérieures ».",
    },
  ],
};
