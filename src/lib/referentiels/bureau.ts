import type { Referentiel } from "./types";

/**
 * Référentiel activités de bureau / tertiaire.
 *
 * Sources :
 *  - INRS — page « Travail de bureau. Les risques du métier »
 *    (https://www.inrs.fr/metiers/commerce-service/travail-bureau/travail-bureau-risques.html,
 *    relue le 2026-09-26 ; l'adresse inrs.fr/risques/travail-bureau citée
 *    jusque-là répond 404). Les phrases que les descriptions citent y sont
 *    relevées mot pour mot au corpus (`inrs-documentaire`) ; la citation
 *    qui figurait ici les reformulait entre guillemets.
 *  - INRS ED 950 « Conception des lieux et des situations de travail »
 *    (5e édition, juin 2025 — ligne d'édition de la brochure ; le catalogue
 *    INRS la date d'août 2025).
 *  - INRS ED 6497 « Améliorer la qualité de l'air dans les locaux de travail
 *    du tertiaire » (octobre 2022).
 *  - INRS ED 840 « Évaluation des risques professionnels — Aide au repérage
 *    des risques dans les PME-PMI », 8e édition (2023), révisée en mai 2025 — taxonomie.
 */
export const bureau: Referentiel = {
  id: "bureau",
  nom: "Activités de bureau / tertiaire",
  codesNaf: [
    "62",
    "63",
    "64",
    "65",
    "66",
    "68",
    "69",
    "70",
    "71",
    "72",
    "73",
    "74",
    "78",
    "82",
  ],
  unitesTravailSuggerees: [
    {
      id: "bur-poste-ecran",
      nom: "Postes de travail sur écran (open-space, bureaux)",
      description:
        "Postes individuels ou partagés, travail prolongé sur écran (source : INRS, page « Travail de bureau. Les risques du métier »).",
    },
    {
      id: "bur-accueil",
      nom: "Accueil / réception",
      description:
        "Contact avec le public, téléphone, courrier, visiteurs.",
    },
    {
      id: "bur-reunion",
      nom: "Salles de réunion / espaces collaboratifs",
      description:
        "Présentations, visioconférence, échanges, déplacements ponctuels.",
    },
    {
      id: "bur-archives",
      nom: "Archives, locaux techniques, copieurs",
      description:
        "Stockage de documents, équipements informatiques, manutention occasionnelle.",
    },
    {
      id: "bur-communs",
      nom: "Espaces communs, circulation, sanitaires",
      description:
        "Couloirs, espaces de pause, circulation interne.",
    },
  ],
  risques: [
    {
      id: "bur-charge-physique-ecran",
      libelle:
        "Charge physique : travail prolongé sur écran (TMS, posture assise, sédentarité)",
      description:
        "INRS, page « Travail de bureau. Les risques du métier » : « Les troubles musculosquelettiques (ou TMS) et les lombalgies représentent quant à eux la très grande majorité des maladies professionnelles recensées. » « Ce comportement sédentaire, lorsqu'il se prolonge, peut être à l'origine de troubles musculosquelettiques, mais aussi d'atteinte à la santé mentale, de diabète de type 2, d'obésité, de pathologies cardiovasculaires… » ED 840, fiche 5.",
      unitesAssociees: ["bur-poste-ecran", "bur-accueil"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 4,
      mesuresRecommandees: [
        {
          id: "bur-poste-ergo",
          libelle:
            "Aménagement ergonomique : siège réglable, écran à hauteur des yeux, clavier et souris adaptés",
          type: "protection_collective",
        },
        {
          id: "bur-second-ecran",
          libelle:
            "Second écran ou support documents pour limiter les rotations du cou",
          type: "protection_collective",
        },
        {
          id: "bur-pauses-ecran",
          libelle:
            "Temps quotidien de travail sur écran périodiquement interrompu par des pauses ou par des changements d'activité (art. R. 4542-4) ; alternance assis / debout si possible",
          type: "organisationnelle",
        },
        {
          id: "bur-vue-medic",
          libelle:
            "Visites de médecine du travail dédiées au travail sur écran",
          type: "organisationnelle",
        },
      ],
    },
    {
      id: "bur-chute-plain-pied",
      libelle: "Chute de plain-pied (câbles, mobilier, sols)",
      description:
        "ED 840, fiche 1. INRS, page « Travail de bureau. Les risques du métier » : « Les chutes et les manutentions manuelles (port de charges, efforts physiques…) constituent les principales causes d'accidents. »",
      unitesAssociees: [
        "bur-poste-ecran",
        "bur-accueil",
        "bur-reunion",
        "bur-archives",
        "bur-communs",
      ],
      graviteParDefaut: 2,
      probabiliteParDefaut: 2,
      mesuresRecommandees: [
        {
          id: "bur-cables-goulottes",
          libelle:
            "Câbles goulottés, passés sous le sol ou regroupés ; pas de fils volants",
          type: "reduction_source",
        },
        {
          id: "bur-circulation-bur",
          libelle:
            "Allées dégagées, pas de stockage temporaire dans les passages",
          type: "organisationnelle",
        },
        {
          id: "bur-eclairage-circul",
          libelle:
            "Éclairage adapté des circulations, escaliers, issues",
          type: "protection_collective",
        },
      ],
    },
    {
      id: "bur-rps-charge",
      libelle:
        "Risques psychosociaux : charge mentale, stress, surcharge de travail",
      description:
        "INRS, page « Travail de bureau. Les risques du métier » : « L'activité elle-même ou l'organisation du travail, mais également les situations de harcèlement ou de violences peuvent exposer les salariés à des risques psychosociaux (stress, burnout…). » ED 840, fiche 17.",
      unitesAssociees: ["bur-poste-ecran", "bur-accueil"],
      graviteParDefaut: 3,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "bur-charge-revue",
          libelle:
            "Plan de charge formalisé, revue régulière, marges intégrées aux délais",
          type: "organisationnelle",
        },
        {
          id: "bur-entretiens-rps",
          libelle:
            "Entretiens individuels réguliers sur la charge et la qualité de vie au travail",
          type: "organisationnelle",
        },
        {
          id: "bur-droit-deconnexion",
          libelle:
            "Droit à la déconnexion : règles d'envoi de courriels en dehors des horaires",
          type: "organisationnelle",
        },
        {
          id: "bur-formation-mgmt",
          libelle:
            "Formation des managers à la prévention des RPS et à l'écoute active",
          type: "formation",
        },
      ],
    },
    {
      id: "bur-rps-public",
      libelle:
        "Risques psychosociaux : tensions avec le public, incivilités, harcèlement",
      description:
        "ED 840, fiche 17 « Risques psychosociaux ».",
      unitesAssociees: ["bur-accueil"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "bur-form-conflit-bur",
          libelle:
            "Formation à la gestion des conflits et incivilités",
          type: "formation",
        },
        {
          id: "bur-debrief-bur",
          libelle:
            "Débriefing collectif après incident ; cellule d'écoute",
          type: "organisationnelle",
        },
        {
          id: "bur-alerte-discret",
          libelle:
            "Bouton d'alerte discret à l'accueil, procédure d'évacuation",
          type: "protection_collective",
        },
      ],
    },
    {
      id: "bur-air-interieur",
      libelle: "Qualité de l'air intérieur",
      description: "INRS ED 6497.",
      unitesAssociees: ["bur-poste-ecran", "bur-accueil", "bur-reunion"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 2,
      mesuresRecommandees: [
        {
          id: "bur-vmc-bur",
          libelle:
            "Ventilation mécanique contrôlée, entretien et changement de filtres",
          type: "reduction_source",
        },
        {
          id: "bur-ouverture-fen",
          libelle:
            "Aération régulière des locaux par ouverture des fenêtres",
          type: "organisationnelle",
        },
        {
          id: "bur-substitution-mat",
          libelle:
            "Substitution des matériaux et produits émetteurs (peintures, mobilier neuf)",
          type: "reduction_source",
        },
      ],
    },
    {
      id: "bur-bruit-openspace",
      libelle: "Bruit en bureaux ouverts",
      description: "INRS, page « Travail de bureau. Les risques du métier », parmi les origines du stress : « Bruit ambiant excessif (voix, conversations voisines, climatisation, imprimantes…) ». ED 840 fiche 11. « En cas de mesurage, celui-ci est renouvelé au moins tous les cinq ans. » (art. R. 4433-2)",
      unitesAssociees: ["bur-poste-ecran"],
      graviteParDefaut: 1,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "bur-acoustique",
          libelle:
            "Traitement acoustique : panneaux absorbants, séparateurs, tapis",
          type: "protection_collective",
        },
        {
          id: "bur-zones-calmes",
          libelle:
            "Création de zones de concentration et de salles d'appel téléphonique",
          type: "organisationnelle",
        },
      ],
    },
    {
      id: "bur-electrique",
      libelle: "Risque électrique (multiprises, câbles, équipements)",
      description: "ED 840, fiche 14 « Risques liés à l'électricité ». « La périodicité des vérifications est fixée à un an, le point de départ de cette périodicité étant la date de la vérification initiale. Toutefois, le délai entre deux vérifications peut être porté à deux ans par le chef d'établissement si le rapport précédent ne présente aucune observation ou si, avant l'échéance, le chef d'établissement a fait réaliser les travaux de mise en conformité de nature à répondre aux observations contenues dans le rapport de vérification. Le chef d'établissement informe l'inspecteur du travail par lettre recommandée avec accusé de réception, accompagnée des éléments prouvant qu'il n'y a pas de non-conformité ou que les non-conformités ont été levées. Cet envoi doit comprendre, le cas échéant, l'avis des membres du CHSCT ou des délégués du personnel. » (arrêté du 26 décembre 2011, art. 3)",
      unitesAssociees: ["bur-poste-ecran", "bur-archives"],
      graviteParDefaut: 4,
      probabiliteParDefaut: 1,
      mesuresRecommandees: [
        {
          id: "bur-controle-elec-bur",
          libelle:
            "Vérification périodique des installations électriques : tous les ans, ou tous les deux ans aux conditions de l'arrêté du 26 décembre 2011, art. 3, dont l'information de l'inspecteur du travail",
          type: "organisationnelle",
        },
        {
          id: "bur-signalement-elec",
          libelle:
            "Procédure de signalement d'anomalie électrique ; remplacement immédiat",
          type: "organisationnelle",
        },
      ],
    },
    {
      id: "bur-thermique",
      libelle: "Ambiances thermiques (climatisation, vagues de chaleur)",
      description: "ED 840 fiche 12.",
      unitesAssociees: ["bur-poste-ecran", "bur-accueil"],
      graviteParDefaut: 2,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "bur-clim-bur",
          libelle:
            "Climatisation maintenue et entretenue ; pas de courant d'air direct",
          type: "reduction_source",
        },
        {
          id: "bur-canicule-bur",
          libelle:
            "Plan canicule : eau, adaptation des horaires, télétravail si possible",
          type: "organisationnelle",
        },
      ],
    },
    {
      id: "bur-lumineuse",
      libelle: "Ambiance lumineuse (reflets sur écran, éclairage inadapté)",
      description: "ED 840 fiche 15.",
      unitesAssociees: ["bur-poste-ecran"],
      graviteParDefaut: 1,
      probabiliteParDefaut: 3,
      mesuresRecommandees: [
        {
          id: "bur-stores-bur",
          libelle:
            "Stores orientables ou films anti-reflets ; orientation des écrans perpendiculaire aux fenêtres",
          type: "protection_collective",
        },
        {
          id: "bur-eclairage-appoint",
          libelle:
            "Éclairage d'appoint individuel réglable à chaque poste",
          type: "protection_collective",
        },
      ],
    },
    {
      id: "bur-chute-hauteur",
      libelle: "Chute de hauteur (archives, étagères hautes)",
      description: "ED 840 fiche 2.",
      unitesAssociees: ["bur-archives"],
      graviteParDefaut: 3,
      probabiliteParDefaut: 1,
      mesuresRecommandees: [
        {
          // Identifiant gardé malgré « norme » (retiré du libellé le 2026-09-26) :
          // il est stocké en base et n'est pas affiché ; le renommer casserait
          // la continuité des mesures déjà retenues.
          id: "bur-escabeau-norme",
          libelle:
            "Escabeau stable disponible ; interdiction de monter sur les chaises ou meubles",
          type: "protection_collective",
        },
      ],
    },
  ],
  questionsDetection: [],
  /*
   * Les activités hors couverture du secteur.
   *
   * Le dépliant INRS ED 6383 « Travail de bureau » ne nomme que quatre risques
   * principaux — douleurs au dos, TMS et fatigue visuelle, chutes, stress et
   * burnout — et l'outil OiRA « Travail de bureau » (outil69) annonce « une
   * trentaine de questions » sur « l'ensemble des risques liés au travail de
   * bureau ». Sur ce périmètre, la liste de risques ci-dessus est complète.
   *
   * Le manque est ailleurs : les cinq unités décrivent toutes des postes
   * **situés dans vos locaux**. Or `codesNaf` couvre des activités tertiaires
   * dont une partie du travail se fait hors les murs, ou dans une configuration
   * que le bureau ne décrit pas.
   *
   * Écartées après vérification : les déplacements professionnels (le risque
   * routier est porté par le référentiel transverse, `trv-routier`) ;
   * l'accueil du public et les incivilités (déjà `bur-rps-public`) ; le
   * stockage d'archives, qu'ED 6383 traite explicitement au titre des chutes
   * et de la manutention, et que `bur-chute-hauteur` couvre déjà.
   */
  activitesNonCouvertes: [
    {
      // Sources : dossier INRS « Entreprises extérieures » — risques
      // d'interférence et de coactivité, inspection commune préalable, plan de
      // prévention écrit (seuil de 400 heures sur douze mois ou travaux
      // dangereux), protocole de sécurité pour les opérations de chargement et
      // de déchargement ; art. R. 4511-1 et suivants du code du travail.
      //
      // Rojer sait déjà tenir un plan de prévention. Le manque est du côté du
      // DUERP : aucun risque de ce référentiel n'expose l'interférence comme
      // une famille à évaluer, alors qu'une PME d'ingénierie ou d'infogérance
      // passe une partie de son temps sur le site d'un client.
      id: "bur-intervention-site-tiers",
      libelle: "Travail sur le site d'un client",
      question:
        "Vos salariés travaillent-ils dans les locaux d'un client ou sur un chantier ?",
      aide:
        "La question porte sur le travail effectué une fois sur place, pas sur le trajet pour s'y rendre ni sur un simple rendez-vous en salle de réunion.",
      cequiManque:
        "L'évaluation ne décrit que vos propres locaux. Elle ne porte pas sur le travail réalisé chez un tiers : état des lieux, des accès et des installations du site d'accueil, risques d'interférence avec les autres intervenants présents, circulation d'engins et zones de chantier, travail en hauteur ou en local technique, consignes et moyens de secours propres au site.",
      pourquoi:
        "Les cinq unités types de ce référentiel décrivent toutes des postes situés dans les locaux de l'employeur, seul périmètre que couvrent les sources qui le fondent (dépliant INRS ED 6383 « Travail de bureau » et outil OiRA du même nom). Le travail réalisé sur le site d'un tiers met en présence plusieurs entreprises sur un même lieu, situation que l'INRS traite à part dans son dossier « Entreprises extérieures » — et le code NAF des activités tertiaires ne distingue pas celles qui se pratiquent hors les murs.",
    },
    {
      // Sources : dossier INRS « Télétravail », page « Risques et effets sur la
      // santé » : postures sédentaires nommées comme risque en propre (effets
      // cardiovasculaires, métaboliques, obésité, santé mentale), troubles du
      // sommeil et conduites addictives favorisés par l'isolement, RPS dont les
      // déterminants diffèrent de ceux du bureau (isolement du collectif,
      // porosité entre vie professionnelle et vie personnelle, manque de
      // soutien). Brochure INRS ED 6384 « Le télétravail. Quels risques ?
      // Quelles pistes de prévention ? ».
      //
      // `bur-charge-physique-ecran` cote un poste que l'employeur aménage ;
      // `trv-rps-isolement` vise le travail isolé et les horaires atypiques.
      // Ni l'un ni l'autre ne décrit un poste installé chez le salarié, hors du
      // regard de l'employeur, ni la question du secours à domicile.
      id: "bur-teletravail",
      libelle: "Travail à domicile",
      question:
        "Des salariés travaillent-ils depuis leur domicile, ne serait-ce qu'un jour par semaine ?",
      aide:
        "Répondez oui pour du télétravail régulier comme occasionnel, quel que soit le nombre de jours.",
      cequiManque:
        "L'évaluation décrit des postes installés dans vos locaux. Elle ne porte pas sur le travail à domicile : poste non aménagé et hors de votre regard (siège, écran, éclairage), postures sédentaires prolongées et leurs effets sur la santé, isolement du collectif de travail, porosité entre vie professionnelle et vie personnelle, troubles du sommeil, difficulté à donner l'alerte et à porter secours en cas de malaise.",
      pourquoi:
        "Le poste sur écran décrit par ce référentiel est un poste que l'employeur installe et voit. L'INRS traite le travail à domicile à part — dossier « Télétravail », brochure ED 6384 — parce que ses déterminants sont autres : poste hors du regard de l'employeur, postures sédentaires prolongées comme risque en propre, isolement du collectif, porosité entre vie professionnelle et vie personnelle.",
    },
    {
      // Sources : page métier INRS « Centres d'appels téléphoniques ». INRS
      // QR 71 « Travail au casque d'écoute en centre d'appels téléphoniques :
      // quels sont les risques pour l'audition ? » : les chocs acoustiques sont
      // des événements électro-acoustiques brefs et imprévisibles reçus dans le
      // casque, de niveau inférieur à 120 dB(A) mais dont les fréquences
      // correspondent au maximum de sensibilité de l'oreille ; conduite à tenir
      // (retirer le casque, déclarer l'incident, raccrocher) et limiteurs
      // d'exposition avec filtrage.
      //
      // `bur-bruit-openspace` traite le brouhaha ambiant, ce qui est une autre
      // exposition : le casque délivre le son directement à l'oreille, toute la
      // journée. Le NAF 82 est visé par `codesNaf`, plateformes téléphoniques
      // comprises.
      id: "bur-travail-casque",
      libelle: "Travail au casque d'écoute",
      question:
        "Des salariés passent-ils la journée au casque ou au micro-casque téléphonique ?",
      aide:
        "Répondez oui pour un poste de plateforme téléphonique, d'assistance ou de prise d'appels. Quelques visioconférences par semaine ne sont pas visées.",
      cequiManque:
        "L'évaluation traite le bruit ambiant des bureaux, pas le son délivré directement à l'oreille : exposition sonore cumulée sur la journée au casque, chocs acoustiques (sons brefs et aigus imprévisibles dans l'écouteur) et leurs suites auditives, fatigue auditive et vocale, cadence imposée par la file d'appels et absence de récupération entre deux communications.",
      pourquoi:
        "Le risque sonore de ce référentiel décrit le brouhaha d'un open-space, exposition ambiante et collective. Le casque délivre le son directement à l'oreille pendant toute la journée : l'INRS en fait une question distincte, traitée dans sa page métier « Centres d'appels téléphoniques » et dans sa réponse QR 71 sur les chocs acoustiques. Le code NAF 82, qui relève de ce référentiel, comprend les plateformes téléphoniques.",
    },
  ],
};
