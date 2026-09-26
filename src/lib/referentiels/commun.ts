import type { RisqueReferentiel, QuestionDetection } from "./types";

/**
 * Risques transverses présents quel que soit le secteur. Référencés sur les
 * 20 fiches de risques de l'INRS ED 840, 8e édition (2023), révisée en mai 2025. Les numéros
 * de fiche cités dans ce fichier ont été recoupés un à un sur le sommaire de
 * cette édition à l'audit du 2026-08-25.
 *
 * Sources :
 *  - INRS ED 840 « Évaluation des risques professionnels — Aide au repérage
 *    des risques dans les PME-PMI ».
 *  - INRS ED 6329 « Le risque routier en mission — Guide d'évaluation des
 *    risques » (fiche 4 ED 840).
 *  - INRS ED 6433 « Les chutes de plain-pied » (fiche 1 ED 840).
 *  - INRS dossier « Risques psychosociaux » (fiche 17 ED 840).
 */
export const risquesTransverses: RisqueReferentiel[] = [
  {
    id: "trv-routier",
    libelle: "Risque routier en mission",
    description:
      "INRS ED 840 fiche 4. Concerne tout déplacement professionnel (voiture, deux-roues, utilitaire) — y compris occasionnel. Risque majeur en termes de gravité.",
    unitesAssociees: [],
    graviteParDefaut: 4,
    probabiliteParDefaut: 2,
    mesuresRecommandees: [
      {
        id: "trv-routier-alternatif",
        libelle:
          "Limiter les déplacements (visioconférence, audioconférence) ; privilégier le train sur l'autoroute",
        type: "reduction_source",
      },
      {
        id: "trv-routier-planif",
        libelle:
          "Planification des déplacements : temps de conduite et de pause respectés ; pas de « fini-quitte »",
        type: "organisationnelle",
      },
      {
        id: "trv-routier-vehicule",
        libelle:
          "Maintien en bon état des véhicules ; équipement adapté (boîte automatique, ABS, climatisation)",
        type: "reduction_source",
      },
      {
        id: "trv-routier-tel",
        libelle:
          "Interdiction du téléphone au volant (quel que soit le dispositif) ; plages d'appel sur temps de pause",
        type: "organisationnelle",
      },
      {
        id: "trv-routier-formation",
        libelle:
          "Formation à la conduite préventive ; recyclage régulier",
        type: "formation",
      },
    ],
  },
  {
    id: "trv-tms-ecran",
    libelle: "Travail sur écran (TMS, fatigue visuelle)",
    description:
      "INRS dossier « Travail sur écran ». Concerne tout poste exposé plus de 4 heures par jour à un écran.",
    unitesAssociees: [],
    graviteParDefaut: 2,
    probabiliteParDefaut: 3,
    mesuresRecommandees: [
      {
        id: "trv-ecran-poste",
        libelle:
          "Aménagement ergonomique du poste : écran à hauteur des yeux, distance ~50–70 cm, siège réglable",
        type: "protection_collective",
      },
      {
        id: "trv-ecran-pauses",
        libelle:
          "Pauses régulières (règle 20-20-20 : toutes les 20 min, regarder à 20 pieds pendant 20 s)",
        type: "organisationnelle",
      },
      {
        id: "trv-ecran-medic",
        libelle:
          "Visites médecine du travail dédiées (vue, posture)",
        type: "organisationnelle",
      },
    ],
  },
  {
    id: "trv-rps-public",
    libelle:
      "Risques psychosociaux — relation avec le public (incivilités, agressions verbales)",
    description: "ED 840 fiche 17.",
    unitesAssociees: [],
    graviteParDefaut: 3,
    probabiliteParDefaut: 3,
    mesuresRecommandees: [
      {
        id: "trv-rps-procedure",
        libelle:
          "Procédure écrite de gestion des incivilités ; débriefing après incident",
        type: "organisationnelle",
      },
      {
        id: "trv-rps-formation",
        libelle:
          "Formation à la gestion des conflits et à la posture professionnelle face à l'agression",
        type: "formation",
      },
      {
        id: "trv-rps-alerte",
        libelle:
          "Dispositif d'alerte (bouton discret, téléphone d'urgence)",
        type: "protection_collective",
      },
    ],
  },
  {
    // Recentré sur le travail isolé au 2026-08-25 : les horaires atypiques
    // sont portés par `trv-travail-nuit`, adossé à une source qui leur est
    // propre. L'identifiant est conservé — il est stocké en base sur les
    // évaluations en cours. Cette note reste ici : le champ `description` est
    // affiché au dirigeant dans le wizard, il n'a pas à y lire notre
    // historique de maintenance.
    id: "trv-rps-isolement",
    libelle: "Risques psychosociaux — travail isolé",
    description:
      "ED 840 fiche 17. Concerne le travail effectué hors de portée de vue ou de voix d'un tiers, y compris ponctuellement — ouverture, fermeture, livraison, intervention seul.",
    unitesAssociees: [],
    graviteParDefaut: 3,
    probabiliteParDefaut: 2,
    mesuresRecommandees: [
      {
        id: "trv-iso-comm",
        libelle:
          "Moyen de communication permanent avec un tiers (téléphone, DATI — dispositif d'alarme du travailleur isolé)",
        type: "protection_collective",
      },
      {
        id: "trv-iso-protocole",
        libelle:
          "Protocole d'appel régulier (check-in horaire) ; consigne d'évacuation accessible",
        type: "organisationnelle",
      },
    ],
  },
  {
    id: "trv-charges",
    libelle:
      "Charge physique : port de charges, manutention manuelle (TMS, lombalgies)",
    description:
      "INRS ED 840 fiche 5 « Risques liés à la charge physique de travail ». Le Code du travail impose d'éviter le recours à la manutention manuelle (R. 4541-2) ; il ne fixe pas de seuil général, seulement des limites hautes avec avis médical (R. 4541-9 : 55 kg, 105 kg au maximum). Le repère de 10 kg est une valeur de bonne pratique.",
    unitesAssociees: [],
    graviteParDefaut: 3,
    probabiliteParDefaut: 3,
    mesuresRecommandees: [
      {
        id: "trv-charges-meca",
        libelle:
          "Aide mécanique (diable, chariot, transpalette, monte-charge)",
        type: "reduction_source",
      },
      {
        id: "trv-charges-organis",
        libelle:
          "Réduction des charges unitaires ; rotation des opérateurs",
        type: "organisationnelle",
      },
      {
        id: "trv-charges-prap",
        libelle:
          "Formation Prap (prévention des risques liés à l'activité physique) ; analyse de la charge physique selon la méthode INRS ED 6161",
        type: "formation",
      },
    ],
  },
  {
    id: "trv-rps-orga",
    libelle:
      "Risques psychosociaux — tensions internes, charge mentale, turnover",
    description: "ED 840 fiche 17.",
    unitesAssociees: [],
    graviteParDefaut: 3,
    probabiliteParDefaut: 3,
    mesuresRecommandees: [
      {
        id: "trv-rps-entretiens",
        libelle:
          "Entretiens individuels réguliers ; baromètre social ; revue de charge",
        type: "organisationnelle",
      },
      {
        id: "trv-rps-tiers",
        libelle:
          "Intervention d'un tiers (psychologue du travail, médiateur, service de santé au travail)",
        type: "organisationnelle",
      },
      {
        id: "trv-rps-mgmt",
        libelle:
          "Formation des managers à la prévention des RPS",
        type: "formation",
      },
    ],
  },
  {
    id: "trv-addictions",
    libelle:
      "Pratiques addictives en milieu professionnel (alcool, médicaments, substances psychoactives)",
    description:
      "INRS ED 840 fiche 20. Concerne tous les secteurs ; risque accru en cas d'usage de machines ou de conduite.",
    unitesAssociees: [],
    graviteParDefaut: 3,
    probabiliteParDefaut: 1,
    mesuresRecommandees: [
      {
        id: "trv-addict-reglement",
        libelle:
          "Règlement intérieur précisant les règles concernant l'alcool et les substances psychoactives",
        type: "organisationnelle",
      },
      {
        id: "trv-addict-info",
        libelle:
          "Information / sensibilisation des salariés et de l'encadrement",
        type: "formation",
      },
      {
        id: "trv-addict-medic",
        libelle:
          "Orientation vers les services de santé au travail / cellule d'écoute",
        type: "organisationnelle",
      },
    ],
  },
  {
    // Ajouté 2026-08-25. Les horaires de nuit n'étaient portés que par
    // `trv-rps-isolement`, c'est-à-dire traités comme un facteur
    // psychosocial parmi d'autres. Les effets documentés par l'INRS
    // dépassent le champ des RPS : troubles du sommeil et de la vigilance,
    // accidents, effets cardiovasculaires, digestifs et métaboliques, risque
    // cancérogène.
    //
    // Sur le fondement : il n'existe pas de chapitre réglementaire
    // d'évaluation propre au travail de nuit, comme il en existe pour le
    // bruit (R. 4433-1) ou les agents biologiques (R. 4423-1). L'obligation
    // d'évaluer relève du régime général, L. 4121-1 et L. 4121-3. Les
    // articles L. 3122-1 et suivants relèvent du temps de travail, non de
    // l'évaluation — L. 3122-1 est cité parce qu'il pose le caractère
    // exceptionnel du recours, ce qui est bien une question de prévention.
    id: "trv-travail-nuit",
    libelle: "Travail de nuit et travail posté",
    description:
      "INRS ED 6305 « Le travail de nuit et le travail posté. Quels effets ? Quelle prévention ? » (2022). Troubles du sommeil et de la vigilance, accidents, effets cardiovasculaires, digestifs et métaboliques, risque cancérogène. Le recours au travail de nuit est exceptionnel et doit être justifié (art. L. 3122-1) ; est considéré comme travail de nuit tout travail effectué sur une période d'au moins neuf heures consécutives comprenant l'intervalle entre minuit et 5 heures (art. L. 3122-2).",
    unitesAssociees: [],
    graviteParDefaut: 3,
    probabiliteParDefaut: 2,
    mesuresRecommandees: [
      {
        id: "trv-nuit-recours",
        libelle:
          "Réinterroger la nécessité du recours au travail de nuit poste par poste, et le supprimer là où l'activité ne l'impose pas",
        type: "suppression",
      },
      {
        id: "trv-nuit-rotation",
        libelle:
          "Organiser les rotations dans le sens horaire (matin, après-midi, nuit) et limiter les nuits consécutives",
        type: "organisationnelle",
      },
      {
        id: "trv-nuit-conditions",
        libelle:
          "Aménager les conditions du poste de nuit : éclairage, local de pause, accès à un repas chaud, moyen d'alerte",
        type: "protection_collective",
      },
      {
        id: "trv-nuit-suivi",
        libelle:
          "Suivi individuel régulier de l'état de santé des travailleurs de nuit (art. L. 3122-11)",
        type: "organisationnelle",
      },
      {
        id: "trv-nuit-info",
        libelle:
          "Informer les salariés concernés des effets du travail de nuit sur le sommeil et l'alimentation",
        type: "formation",
      },
    ],
  },
  {
    // Ajouté 2026-08-25. Aucun des trois secteurs couverts n'avait de ligne
    // biologique, alors que tous trois ont une ligne chimique.
    //
    // Sur le périmètre : l'article R. 4421-1 écarte expressément le
    // confinement, les mesures techniques de laboratoire et les déclarations
    // « lorsque l'activité, bien qu'elle puisse conduire à exposer des
    // travailleurs, n'implique pas normalement l'utilisation délibérée d'un
    // agent biologique ». La restauration et le commerce alimentaire relèvent
    // de ce second étage : l'évaluation s'applique, le régime laboratoire non.
    id: "trv-biologique",
    libelle: "Agents biologiques (denrées, déchets, linge, sanitaires)",
    description:
      "INRS ED 840 fiche 8 « risques liés aux agents biologiques ». Contact avec des produits agroalimentaires, des déchets ou des surfaces contaminées. L'employeur détermine la nature, la durée et les conditions de l'exposition (art. R. 4423-1). Les mesures de confinement et les déclarations ne s'appliquent pas lorsque l'activité n'implique pas l'utilisation délibérée d'un agent biologique (art. R. 4421-1).",
    unitesAssociees: [],
    graviteParDefaut: 2,
    probabiliteParDefaut: 3,
    mesuresRecommandees: [
      {
        id: "trv-bio-separation",
        libelle:
          "Séparer les circuits propres et sales : denrées, déchets, linge, vaisselle",
        type: "reduction_source",
      },
      {
        id: "trv-bio-nettoyage",
        libelle:
          "Protocole de nettoyage et de désinfection des surfaces et du matériel, avec fréquences définies",
        type: "protection_collective",
      },
      {
        id: "trv-bio-lavage",
        libelle:
          "Points de lavage des mains accessibles et approvisionnés à chaque poste concerné",
        type: "protection_collective",
      },
      {
        id: "trv-bio-epi",
        libelle:
          "Gants adaptés à la tâche pour la manipulation des déchets et du linge sale ; tenue de travail changée et lavée par l'employeur",
        type: "protection_individuelle",
      },
      {
        id: "trv-bio-plaies",
        libelle:
          "Conduite à tenir en cas de coupure ou de piqûre : nettoyage immédiat, pansement étanche, signalement",
        type: "organisationnelle",
      },
    ],
  },
];

export const questionsDetectionTransverses: QuestionDetection[] = [
  {
    // Vise le cœur de l'intervalle de l'art. L. 3122-2 sans demander au
    // dirigeant de qualifier lui-même le « travailleur de nuit » de
    // l'art. L. 3122-5, qui suppose de compter des heures sur une période de
    // référence.
    id: "q-travail-nuit",
    intitule:
      "Des salariés travaillent-ils habituellement entre minuit et 5 heures ?",
    risqueIdAssocie: "trv-travail-nuit",
  },
  {
    // Ne prononce jamais « agent biologique » : un dirigeant de TPE ne sait
    // pas répondre à cette question-là. Décrit les gestes, pas la catégorie.
    id: "q-biologique",
    intitule:
      "Vos salariés manipulent-ils des denrées crues, des déchets ou du linge sale ?",
    risqueIdAssocie: "trv-biologique",
  },
  {
    id: "q-routier",
    intitule:
      "Des salariés conduisent-ils un véhicule (voiture, deux-roues, utilitaire) dans le cadre du travail, même occasionnellement ?",
    risqueIdAssocie: "trv-routier",
  },
  {
    id: "q-ecran",
    intitule:
      "Des salariés travaillent-ils plus de 4 heures par jour sur un écran ?",
    risqueIdAssocie: "trv-tms-ecran",
  },
  {
    id: "q-public",
    intitule:
      "Des salariés sont-ils en contact direct avec du public (clients, patients, usagers) ?",
    risqueIdAssocie: "trv-rps-public",
  },
  {
    id: "q-isolement",
    intitule:
      "Des salariés travaillent-ils seuls ou sur des horaires atypiques (nuit, week-end, isolés géographiquement) ?",
    risqueIdAssocie: "trv-rps-isolement",
  },
  {
    id: "q-charges",
    intitule:
      "Des salariés portent-ils régulièrement des charges supérieures à 10 kg, ou effectuent-ils des manutentions manuelles fréquentes ?",
    risqueIdAssocie: "trv-charges",
  },
  {
    id: "q-rps-orga",
    intitule:
      "Observez-vous des tensions internes, un turnover élevé, des arrêts maladie répétés ou un climat dégradé ?",
    risqueIdAssocie: "trv-rps-orga",
  },
  {
    id: "q-addictions",
    intitule:
      "Existe-t-il des situations connues ou suspectées de consommation d'alcool ou de substances psychoactives en lien avec le travail ?",
    risqueIdAssocie: "trv-addictions",
  },
];
