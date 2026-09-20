import type { Referentiel } from "./types";

/**
 * Référentiel restauration traditionnelle.
 *
 * Sources :
 *  - INRS ED 880 « La restauration traditionnelle — Prévention des risques
 *    professionnels » (novembre 2012) — fiches « Réception », « Stockage »,
 *    « Production froide et chaude », « Service en salle », « Plonge ».
 *  - OiRA Restauration (outil INRS / EU-OSHA, AC 64).
 *  - INRS ED 840 « Évaluation des risques professionnels — Aide au repérage
 *    des risques dans les PME-PMI », 8e édition (2023), révisée en mai 2025 pour la taxonomie des
 *    familles de risques.
 *
 * Les libellés des risques et les mesures recommandées sont alignés sur le
 * vocabulaire INRS. Les valeurs de cotation par défaut reflètent les risques
 * mis en avant comme prédominants par l'ED 880 (« les chutes et glissades
 * de plain-pied représentent 1/3 des accidents à elles seules ; les accidents
 * aux mains représentent plus d'1/3 des accidents »).
 */
export const restauration: Referentiel = {
  id: "restauration",
  nom: "Restauration traditionnelle",
  codesNaf: ["56.10A", "56.10B", "56.10C", "56.21Z", "56.29A", "56.29B", "56.30Z"],
  unitesTravailSuggerees: [
    {
      id: "reception",
      nom: "Réception des matières premières",
      description:
        "Déchargement, contrôle, transfert vers les zones de stockage (source : INRS ED 880, fiche 1).",
    },
    {
      id: "stockage",
      nom: "Stockage (réserve, chambre froide)",
      description:
        "Rayonnages, chambres froides, locaux d'emballage (source : INRS ED 880, fiche 2).",
    },
    {
      id: "production",
      nom: "Production froide et chaude (cuisine)",
      description:
        "Préparation et cuisson, plans de travail, équipements (source : INRS ED 880, fiche 3).",
    },
    {
      id: "service-salle",
      nom: "Service en salle",
      description:
        "Accueil, prise de commande, service, encaissement (source : INRS ED 880, fiche 4).",
    },
    {
      id: "plonge",
      nom: "Plonge, nettoyage",
      description:
        "Lavage de la vaisselle, nettoyage des locaux et équipements (source : INRS ED 880, fiche 5).",
    },
  ],
  risques: [
    {
      id: "resto-chute-plain-pied",
      libelle: "Chute de plain-pied (sols glissants, encombrés)",
      description:
        "INRS ED 880 : les chutes et glissades de plain-pied représentent à elles seules environ 1/3 des accidents en restauration.",
      unitesAssociees: ["reception", "stockage", "production", "service-salle", "plonge"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 4,
      mesuresRecommandees: [
        {
          id: "resto-sol-antiderapant",
          libelle:
            "Sol antidérapant (coefficient de frottement > 0,3) posé par un professionnel",
          type: "reduction_source",
        },
        {
          id: "resto-evacuation-eaux",
          libelle:
            "Système d'évacuation des eaux : siphons, caniveaux, légère pente — entretien régulier",
          type: "reduction_source",
        },
        {
          id: "resto-nettoyage-rapide",
          libelle:
            "Nettoyage immédiat des salissures susceptibles de faire glisser",
          type: "organisationnelle",
        },
        {
          id: "resto-circulation",
          libelle:
            "Couloirs et zones de passage dégagés (largeur ≥ 120 cm, signalisation des dénivelés)",
          type: "organisationnelle",
        },
        {
          id: "resto-chaussures-anti",
          libelle:
            "Chaussures antidérapantes spécifiques restauration (coefficient de frottement > 0,15)",
          type: "protection_individuelle",
        },
      ],
    },
    {
      id: "resto-coupure",
      libelle: "Coupure aux mains (couteaux, trancheuse, mandoline)",
      description:
        "INRS ED 880 : les accidents aux mains représentent plus d'1/3 des accidents en restauration.",
      unitesAssociees: ["production", "plonge"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "resto-machine-protec",
          libelle:
            "Trancheuses / machines à trancher avec protecteurs et arrêt d'urgence en place",
          type: "protection_collective",
        },
        {
          id: "resto-eplucheur",
          libelle:
            "Privilégier un éplucheur ou équipement adapté pour réduire les gestes manuels répétés",
          type: "reduction_source",
        },
        {
          id: "resto-rangement-couteaux",
          libelle:
            "Rangement spécifique des couteaux (armoire, bac), à part de la vaisselle sale",
          type: "organisationnelle",
        },
        {
          id: "resto-affutage",
          libelle:
            "Affûtage et affilage réguliers ; formation à l'affûtage et à la manipulation",
          type: "formation",
        },
        {
          id: "resto-gants-anti",
          libelle: "Gants anti-coupure pour les tâches à risque",
          type: "protection_individuelle",
        },
      ],
    },
    {
      id: "resto-brulure",
      libelle: "Brûlure (équipements de cuisson, friteuse, liquides chauds)",
      unitesAssociees: ["production"],
      graviteParDefaut: 3,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "resto-friteuse-implant",
          libelle:
            "Implantation : friteuse éloignée des points d'eau et des feux vifs",
          type: "reduction_source",
        },
        {
          id: "resto-queues-casserole",
          libelle:
            "Queues de casseroles tournées vers l'intérieur des plans de cuisson",
          type: "organisationnelle",
        },
        {
          id: "resto-protections-saisie",
          libelle:
            "Protections (poignées spéciales, tissus) pour la saisie des plats chauds",
          type: "protection_individuelle",
        },
        {
          id: "resto-formation-cuisson",
          libelle:
            "Formation manipulation des équipements chauds (friteuse, salamandre, four)",
          type: "formation",
        },
      ],
    },
    {
      id: "resto-charge-physique",
      libelle: "Charge physique : manutentions et postures (cuisine, service, plonge)",
      description:
        "ED 840 fiche 5 « charge physique de travail » : déplacements de charges, postures debout statiques, gestes répétitifs.",
      unitesAssociees: ["reception", "stockage", "production", "service-salle", "plonge"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 4,
      mesuresRecommandees: [
        {
          id: "resto-aides-manut",
          libelle:
            "Aides à la manutention : diables, chariots, dessertes à roulettes, monte-charge",
          type: "reduction_source",
        },
        {
          id: "resto-plans-reglables",
          libelle:
            "Plans de travail réglables en hauteur (ou à hauteur du tronc), bacs adaptés",
          type: "reduction_source",
        },
        {
          id: "resto-stockage-hauteur",
          libelle:
            "Charges lourdes à hauteur d'homme ; pas de stockage trop haut/trop bas",
          type: "organisationnelle",
        },
        {
          id: "resto-assis-debout",
          libelle:
            "Sièges assis-debout réglables aux postes le permettant",
          type: "protection_collective",
        },
        {
          id: "resto-prap",
          libelle:
            "Formation Prap (prévention des risques liés à l'activité physique)",
          type: "formation",
        },
      ],
    },
    {
      id: "resto-chute-hauteur",
      libelle: "Chute de hauteur (rangement en hauteur, escabeau, escaliers)",
      unitesAssociees: ["stockage", "production"],
      graviteParDefaut: 3,
      probabiliteParDefaut: 2,
      mesuresRecommandees: [
        {
          id: "resto-escabeau",
          libelle:
            "Escabeau avec garde-corps et mains courantes — proscrire échelles et accessoires improvisés (cageots, cartons)",
          type: "protection_collective",
        },
        {
          id: "resto-range-hauteur",
          libelle:
            "Réorganisation du rangement pour éviter le travail en hauteur",
          type: "organisationnelle",
        },
        {
          id: "resto-escaliers",
          libelle:
            "Escaliers : rambarde et/ou rampe, antidérapant sur les arêtes",
          type: "protection_collective",
        },
      ],
    },
    {
      id: "resto-incendie",
      libelle: "Incendie (friteuse, hotte, flamme nue)",
      unitesAssociees: ["production"],
      graviteParDefaut: 4,
      probabiliteParDefaut: 2,
      mesuresRecommandees: [
        {
          id: "resto-hotte",
          libelle:
            "Nettoyage régulier de la hotte aspirante et des filtres ; vérification VMC",
          type: "reduction_source",
        },
        {
          id: "resto-vanne-gaz",
          libelle:
            "Vanne de coupure de gaz à un emplacement connu de tous, accessible",
          type: "reduction_source",
        },
        {
          id: "resto-extincteurs",
          libelle:
            "Extincteurs adaptés (classe F pour huiles), accessibles, signalés, vérifiés annuellement",
          type: "protection_collective",
        },
        {
          id: "resto-formation-extincteur",
          libelle:
            "Formation à la manipulation des extincteurs ; consigne d'évacuation affichée",
          type: "formation",
        },
      ],
    },
    {
      id: "resto-electrisation",
      libelle: "Risque électrique (installations cuisine, lavage)",
      description:
        "ED 880 fiche 3 + ED 840 fiche 14. Contrôles périodiques annuels obligatoires.",
      unitesAssociees: ["production", "plonge", "stockage"],
      graviteParDefaut: 4,
      probabiliteParDefaut: 1,
      mesuresRecommandees: [
        {
          id: "resto-controle-elec",
          libelle:
            "Contrôles périodiques réglementaires des installations électriques (annuel)",
          type: "organisationnelle",
        },
        {
          id: "resto-debranchement",
          libelle:
            "Débranchement / sectionnement avant nettoyage des appareils",
          type: "organisationnelle",
        },
      ],
    },
    {
      id: "resto-chimique",
      libelle: "Produits chimiques (nettoyage, désinfection, dégraissage)",
      unitesAssociees: ["plonge", "production", "service-salle", "stockage"],
      graviteParDefaut: 3,
      probabiliteParDefaut: 2,
      mesuresRecommandees: [
        {
          id: "resto-substitution",
          libelle:
            "Substitution par produits moins dangereux quand possible (étiquettes CLP)",
          type: "reduction_source",
        },
        {
          id: "resto-ventilation",
          libelle:
            "Ventilation des zones d'utilisation, dosage automatique si possible",
          type: "protection_collective",
        },
        {
          id: "resto-fds",
          libelle:
            "Fiches de données de sécurité (FDS) accessibles, lues et expliquées au personnel",
          type: "formation",
        },
        {
          id: "resto-gants-chim",
          libelle: "Gants et lunettes de protection adaptés",
          type: "protection_individuelle",
        },
      ],
    },
    {
      id: "resto-ambiance-thermique",
      libelle: "Ambiances thermiques contrastées (cuisine chaude / chambre froide)",
      unitesAssociees: ["production", "stockage"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "resto-vmc",
          libelle:
            "Renouvellement mécanique de l'air en cuisine ; entretien VMC",
          type: "protection_collective",
        },
        {
          id: "resto-vetement-froid",
          libelle:
            "Vêtements de protection thermique pour le travail en chambre froide",
          type: "protection_individuelle",
        },
        {
          id: "resto-ouverture-cf",
          libelle:
            "Dispositif d'ouverture de l'intérieur des chambres froides",
          type: "protection_collective",
        },
        {
          id: "resto-rotation-postes",
          libelle:
            "Limitation du temps d'exposition continue ; rotation des postes",
          type: "organisationnelle",
        },
      ],
    },
    {
      // Entré le 2026-09-20. `resto-ambiance-thermique`, juste au-dessus, traite
      // le CONTRASTE cuisine chaude / chambre froide et n'a ni eau, ni horaires,
      // ni signalement : l'épisode de chaleur intense de R. 4463-2 n'y était pas,
      // alors que la cuisine de restaurant en est le cas d'école. Mêmes mesures
      // et même cotation que `com-chaleur-intense`, pour la même raison.
      id: "resto-chaleur-intense",
      libelle: "Ambiances thermiques — épisodes de chaleur intense",
      description:
        "Code du travail, art. R. 4463-2, R. 4463-3, R. 4463-4 et R. 4463-6.",
      unitesAssociees: ["production", "plonge", "service-salle"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "resto-chaleur-moyens-techniques",
          libelle:
            "Moyens techniques pour réduire le rayonnement solaire sur les surfaces exposées et prévenir l'accumulation de chaleur dans les locaux ou au poste de travail",
          type: "protection_collective",
        },
        {
          id: "resto-chaleur-organisation",
          libelle:
            "Adaptation de l'organisation et des horaires de travail pour limiter la durée et l'intensité de l'exposition, avec des périodes de repos",
          type: "organisationnelle",
        },
        {
          id: "resto-chaleur-eau",
          libelle:
            "En cas d'épisode de chaleur intense, eau potable fraîche en quantité suffisante, maintenue au frais à proximité des postes de travail",
          type: "organisationnelle",
        },
        {
          id: "resto-chaleur-signalement",
          libelle:
            "Modalités de signalement d'un indice physiologique préoccupant, d'un malaise ou d'une détresse, et de secours, portées à la connaissance des travailleurs",
          type: "organisationnelle",
        },
        {
          id: "resto-chaleur-formation",
          libelle:
            "Information et formation des travailleurs sur la conduite à tenir en cas de forte chaleur",
          type: "formation",
        },
      ],
    },
    {
      id: "resto-rps-coup-feu",
      libelle: "Risques psychosociaux : stress, coup de feu, amplitude horaire",
      description:
        "ED 840 fiche 17 « risques psychosociaux ». ED 880 fiche 3 (stress, fatigue physique).",
      unitesAssociees: ["production", "service-salle"],
      graviteParDefaut: 3,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "resto-organisation",
          libelle:
            "Organisation : tâches définies par poste, anticipation des fluctuations d'activité",
          type: "organisationnelle",
        },
        {
          id: "resto-zones-passage",
          libelle:
            "Zones de passage cuisine-salle dégagées, sens de circulation, hublot dans les portes",
          type: "organisationnelle",
        },
        {
          id: "resto-pauses",
          libelle:
            "Pauses aménagées dans l'organisation du travail",
          type: "organisationnelle",
        },
        {
          id: "resto-effectif-couverts",
          libelle:
            "Adaptation du nombre de serveurs au nombre de couverts",
          type: "organisationnelle",
        },
      ],
    },
    {
      // Ajouté 2026-08-25. Le référentiel n'avait aucune ligne bruit, alors que
      // le commerce et le bureau en ont une chacun — et qu'une cuisine cumule
      // hotte, lave-vaisselle, mixeurs et batteurs, doublés en salle par la
      // musique et l'affluence. Coté comme les deux lignes existantes : une
      // nuisance à évaluer, pas un dépassement de seuil. Les valeurs
      // déclenchant l'action de l'article R. 4431-2 (80 puis 85 dB(A)) relèvent
      // d'un mesurage que ce référentiel ne demande pas ; l'obligation
      // d'évaluer, elle, tient à l'article R. 4433-1.
      id: "resto-bruit",
      libelle: "Ambiance sonore (cuisine, plonge, salle)",
      description:
        "ED 840 fiche 11. Hotte, lave-vaisselle, mixeurs et batteurs en cuisine ; musique et affluence en salle. L'employeur évalue et, si nécessaire, mesure les niveaux de bruit (art. R. 4433-1).",
      unitesAssociees: ["production", "plonge", "service-salle"],
      graviteParDefaut: 1,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "resto-bruit-equipements",
          libelle:
            "Choisir et entretenir les équipements les plus silencieux : hotte, lave-vaisselle, ventilation",
          type: "reduction_source",
        },
        {
          id: "resto-bruit-locaux",
          libelle:
            "Traiter l'acoustique de la salle et de la plonge : plafond absorbant, séparation des zones bruyantes",
          type: "protection_collective",
        },
        {
          id: "resto-bruit-musique",
          libelle:
            "Limiter le niveau sonore de la musique d'ambiance ; mesurer en cas de doute",
          type: "organisationnelle",
        },
      ],
    },
  ],
  questionsDetection: [],
  /*
   * Les activités hors couverture du secteur.
   *
   * Les cinq unités ci-dessus décrivent bien un restaurant traditionnel : c'est
   * le périmètre que l'INRS donne lui-même à l'outil OiRA « Hôtels, cafés,
   * restaurants » (outil81), qui vise « les entreprises du secteur de la
   * restauration traditionnelle ». L'écart naît de `codesNaf`, qui va plus
   * loin que ce périmètre — 56.10C restauration rapide, 56.29A/B restauration
   * collective, 56.30Z débits de boissons — là où l'INRS publie des outils
   * distincts (outil80, outil155) parce que le métier n'est pas le même.
   *
   * Écartées après vérification, et le détail compte parce qu'il évite de
   * rouvrir le débat :
   *  - Traiteur et réceptions hors les murs. Le dépliant INRS ED 6440
   *    « Traiteur organisateur de réceptions » (1re éd., mars 2021) ne nomme
   *    que chutes, douleurs au dos, coupures et stress, et toutes ses mesures
   *    portent sur la cuisine et le stockage. Tel que l'INRS le documente, le
   *    traiteur n'ajoute aucune famille de risques à ce référentiel.
   *  - Livraison à domicile et vente à emporter. INRS ED 933 « La restauration
   *    rapide » y consacre sa section 3.5, mais ce qu'elle décrit est le risque
   *    routier, déjà porté par le référentiel transverse (`trv-routier`, dont
   *    la question détecteur vise explicitement les deux-roues).
   *  - Service en terrasse : aucune source INRS ne lui attribue de risque
   *    propre, et l'ambiance thermique est déjà cotée (`resto-thermique`).
   *  - Travail de nuit : non nommé par les sources sectorielles INRS de la
   *    restauration, donc pas de ligne sectorielle. Porté depuis le
   *    2026-08-25 par le transverse `trv-travail-nuit`, adossé à ED 6305 —
   *    `trv-rps-isolement` a été recentré sur le seul travail isolé.
   */
  activitesNonCouvertes: [
    {
      // Sources : INRS, outil OiRA « Boulangerie - Pâtisserie - Chocolaterie -
      // Glacerie » (outil70) et dépliant INRS ED 6400 du même nom (1re éd.,
      // octobre 2020) : allergies et asthme dus aux poussières de farine et de
      // sucre glace, brûlures, manutention de grandes quantités. Page métier
      // INRS « Boulangerie - Pâtisserie - Chocolaterie - Glacerie. Les risques
      // du métier » : les farines sont la première cause d'asthme
      // professionnel en France.
      //
      // C'est le seul candidat qui ouvre une famille de risques que la liste
      // ci-dessus n'a pas du tout : `resto-chimique` ne vise que les produits
      // d'entretien, et aucun risque n'y traite l'exposition respiratoire aux
      // poussières.
      id: "resto-fabrication-boulangere",
      libelle: "Fabrication de pain, de viennoiseries ou de pâtisseries",
      question:
        "Fabriquez-vous vous-même le pain, les viennoiseries ou les pâtisseries que vous servez ?",
      aide:
        "Répondez oui si la pâte est travaillée dans votre cuisine (pétrissage, façonnage, dressage). Répondez non si vous servez des produits achetés déjà finis.",
      cequiManque:
        "L'évaluation ne décrit pas le travail de la pâte : poussières de farine et de sucre glace, première cause d'asthme professionnel, et rhinites associées ; pétrins, batteurs-mélangeurs et laminoirs ; manutention des sacs de farine et des chariots de plaques.",
      pourquoi:
        "Le référentiel « Restauration » est bâti sur l'outil OiRA « Hôtels, cafés, restaurants », que l'INRS destine à la restauration traditionnelle. Le travail de la pâte relève d'un outil d'évaluation distinct (OiRA « Boulangerie - Pâtisserie - Chocolaterie - Glacerie », dépliant ED 6400) : l'exposition respiratoire aux poussières qu'il entraîne n'a aucun équivalent parmi les risques types de ce référentiel, dont le volet chimique ne vise que les produits d'entretien.",
    },
    {
      // Sources : INRS ED 933 « La restauration rapide — Aide au repérage des
      // risques », section 3.14 « Les agressions » : agression verbale ou
      // physique aux postes d'encaissement, braquage (consigne de non-
      // résistance, caméras, suivi psychologique après l'événement), transport
      // de fonds vers la banque. Dépliant INRS ED 6401 « Commerces
      // alimentaires de proximité » pour les phases d'ouverture et de
      // fermeture et les prélèvements de fonds en caisse.
      //
      // Le référentiel transverse s'arrête plus tôt : `trv-rps-public` couvre
      // « incivilités, agressions verbales », pas la violence dirigée contre la
      // caisse. Le référentiel commerce, lui, a `com-rps-public` — la
      // restauration n'a rien d'équivalent.
      id: "resto-caisse-espece-fermeture",
      libelle: "Détention d'espèces, ouverture et fermeture par un seul salarié",
      question:
        "Un salarié ouvre-t-il ou ferme-t-il seul l'établissement, ou transporte-t-il la recette ?",
      aide:
        "Répondez oui si une personne se retrouve seule dans l'établissement avant l'ouverture, après le service, ou sur le trajet du dépôt en banque.",
      cequiManque:
        "L'évaluation ne décrit pas les phases d'ouverture, de fermeture et de transport des fonds : agression physique ou vol à main armée au moment de l'encaissement ou de la fermeture, trajet vers la banque avec la recette, présence d'un salarié seul dans l'établissement hors des heures de service, prise en charge d'un salarié après un événement violent.",
      pourquoi:
        "Les risques types de ce référentiel décrivent le contact avec la clientèle pendant le service — incivilités et agressions verbales en salle. Ils ne décrivent ni la violence dirigée contre la caisse, ni les moments où l'établissement est occupé par une seule personne. L'INRS traite ces situations dans des documents que ce référentiel ne reprend pas : ED 933 « La restauration rapide » pour les agressions et le transport de fonds, ED 6401 « Commerces alimentaires de proximité » pour les phases d'ouverture et de fermeture.",
    },
    {
      // Source : INRS, outil OiRA « Restauration collective » (outil155),
      // outil sectoriel distinct de « Hôtels, cafés, restaurants » (outil81)
      // dont le texte de présentation vise « la restauration traditionnelle ».
      // L'existence de deux outils est ici l'argument : l'INRS ne considère pas
      // que l'un couvre l'autre, et `codesNaf` réunit pourtant les deux
      // (56.29A et 56.29B tombent sur ce référentiel).
      //
      // Le `cequiManque` s'en tient à ce que cette source établit — un
      // périmètre de travail non décrit — sans nommer de risques que l'outil
      // n'expose pas publiquement (règle 6).
      id: "resto-repas-hors-site",
      libelle: "Repas produits pour être consommés sur un autre site",
      question:
        "Produisez-vous des repas qui sont consommés ailleurs que dans votre salle ?",
      aide:
        "Répondez oui pour une cuisine centrale, une cantine desservie depuis vos locaux ou du portage de repas à domicile. Répondez non si vous ne servez que vos propres clients sur place ou à emporter.",
      cequiManque:
        "L'évaluation décrit une cuisine qui produit et sert dans les mêmes murs. Elle ne porte pas sur la production destinée à d'autres sites : conditionnement et refroidissement en série, contenants et chariots de grande capacité, chargement et transport des repas, remise en température et service dans des locaux que vous n'exploitez pas.",
      pourquoi:
        "Les unités types de ce référentiel décrivent une cuisine qui produit et sert dans les mêmes murs, périmètre que l'INRS donne lui-même à l'outil OiRA « Hôtels, cafés, restaurants ». La production destinée à d'autres sites relève d'un outil d'évaluation distinct (OiRA « Restauration collective ») : l'INRS en publie deux parce qu'il ne considère pas que l'un couvre l'autre, alors que le code NAF de la restauration réunit les deux activités.",
    },
  ],
};
