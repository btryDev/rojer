// Les conditions générales d'utilisation et de vente (ADR-053 § 8). Une
// version = un texte figé : la preuve d'acceptation enregistre la version et
// l'empreinte du texte accepté (`conditions-empreinte.ts`, serveur seul). Ce
// module n'a que les données : un écran client peut l'importer. Changer le
// texte, c'est changer de version.
//
// TEXTE PROVISOIRE (décision de la propriétaire du 2026-11-03) : à faire
// relire par un juriste avant le lancement de l'offre (notes du chantier, § 6).
// [2026-11-19 : texte complet rédigé d'après les conditions de RiskBoard
// (BTRY) et le fonctionnement de Rojer relu dans le code — abonnement en
// ligne, essai, résiliation en fin de période, impayé, suppression à 12 mois.
// Toujours à faire relire par l'avocat ; les points à trancher sont marqués
// « À VALIDER » ci-dessous, en commentaire.]

import { EDITEUR, IDENTITE_EDITEUR } from "@/components/landing/editeur";

export type Section = { titre: string; paragraphes: string[] };

// [2026-11-17 : « 2026-11-provisoire-ttc » remplacée — l'essai est en
// Essentiel, l'export demande un abonnement payé, et un compte sans
// abonnement depuis douze mois est supprimé (ADR-058) ; l'ancien texte
// promettait l'inverse.] [2026-11-19 : « 2026-11-17-provisoire » remplacée
// par le texte complet, encore à relire par l'avocat.]
export const VERSION_CONDITIONS = "2026-11-19-provisoire";

export const CONDITIONS: Section[] = [
  {
    titre: "Version provisoire",
    paragraphes: [
      "Ce texte est provisoire. Il sera remplacé par des conditions relues par un juriste avant toute facturation.",
    ],
  },
  {
    titre: "1. Objet et parties",
    paragraphes: [
      `Rojer est un service en ligne édité par ${IDENTITE_EDITEUR}, représentée par son gérant (ci-après « BTRY »).`,
      "Les présentes conditions générales d'utilisation et de vente (les « Conditions ») régissent l'accès à Rojer et son utilisation par toute personne qui crée un compte, démarre un essai ou souscrit un abonnement (le « Client »), ainsi que par les personnes qu'il invite sur son compte (les « Utilisateurs »).",
      "Rojer s'adresse aux professionnels — entreprises, associations, administrations — qui l'utilisent pour leur activité. Il n'est pas proposé aux consommateurs. En acceptant les Conditions, la personne qui crée le compte déclare agir au nom et pour le compte de la structure qu'elle représente, et avoir le pouvoir de l'engager.",
    ],
  },
  {
    titre: "2. Acceptation et modification des Conditions",
    paragraphes: [
      "Le Client accepte les Conditions en cochant la case prévue au démarrage de l'essai ou à la souscription. Rojer enregistre la version acceptée, sa date et l'adresse du compte.",
      "BTRY peut modifier les Conditions. Le Client en est informé par e-mail au moins trente jours avant leur entrée en vigueur ; elles s'appliquent à la période d'abonnement suivante. Le Client qui les refuse résilie son abonnement avant cette date, sans frais.",
    ],
  },
  {
    titre: "3. Ce que fait Rojer",
    paragraphes: [
      "Rojer aide le Client à organiser la prévention des risques professionnels et le suivi de la sécurité de ses établissements : il présente des obligations réglementaires à partir de ce que le Client déclare (activité, effectif, établissement, équipements), calcule des échéances, tient des registres, et met en forme des documents — document unique d'évaluation des risques, registre de sécurité, plan d'actions, dossier de contrôle — à partir des informations saisies.",
      "Les obligations présentées proviennent d'un référentiel établi par BTRY à partir des textes officiels (Code du travail, Code de la construction et de l'habitation, règlement de sécurité contre l'incendie des établissements recevant du public, arrêtés et normes cités dans chaque fiche). Chaque obligation indique le texte dont elle découle.",
      "Rojer n'utilise aucune intelligence artificielle pour traiter les informations du Client : les obligations, les échéances et les documents résultent de règles fixes et vérifiables.",
    ],
  },
  {
    titre: "4. Ce que Rojer n'est pas",
    paragraphes: [
      "Rojer est un outil d'aide à l'organisation. Il ne délivre aucun conseil juridique, ne réalise aucun audit, aucune visite ni aucune vérification réglementaire, et ne remplace ni les organismes et personnes qualifiés ou agréés chargés des vérifications périodiques, ni le service de prévention et de santé au travail, ni l'avis de la commission de sécurité, ni le conseil d'un avocat ou d'un préventeur.",
      "Rojer n'atteste jamais la conformité d'un établissement. Aucun indicateur, tableau de bord, échéance « à jour » ni document produit par Rojer ne vaut attestation de conformité, ni à l'égard du Client, ni à l'égard d'un tiers (inspection du travail, commission de sécurité, assureur, bailleur, acquéreur).",
      "Le Client reste seul tenu des obligations que la loi met à sa charge, en particulier celles de l'employeur (article L. 4121-1 du Code du travail) et de l'exploitant d'un établissement. Il évalue les risques, prend les décisions, fait réaliser les vérifications, conduit les actions et répond de leur exécution.",
      "Les documents produits avec Rojer — notamment le document unique d'évaluation des risques — sont les documents du Client, établis sous sa responsabilité à partir des informations qu'il a saisies. Il lui appartient de les relire, de les compléter et de les valider avant de les utiliser ou de les remettre à un tiers.",
    ],
  },
  {
    titre: "5. Périmètre couvert",
    paragraphes: [
      "Le référentiel de Rojer ne couvre pas toutes les obligations auxquelles un établissement peut être soumis. Ce que Rojer ne suit pas — domaines, régimes, types d'établissement, situations particulières — est indiqué dans l'application, à la page « Ce que Rojer ne couvre pas », sans que cette liste soit exhaustive.",
      "Qu'une obligation ne figure pas dans Rojer ne signifie pas qu'elle ne s'applique pas au Client. Les obligations présentées dépendent des réponses et déclarations du Client : une réponse inexacte, incomplète ou devenue fausse peut faire apparaître une obligation qui ne s'applique pas, ou en masquer une qui s'applique. Le Client tient ses déclarations à jour.",
    ],
  },
  {
    titre: "6. Évolutions de la réglementation et exactitude du référentiel",
    paragraphes: [
      "BTRY assure une veille des textes et intègre leurs évolutions au référentiel dans un délai raisonnable, sans délai garanti. Entre la publication ou l'entrée en vigueur d'un texte et son intégration, Rojer peut présenter une obligation, une périodicité ou une échéance qui ne correspond plus au droit en vigueur, ou ne pas présenter une obligation nouvelle.",
      "Malgré le soin apporté à son établissement, le référentiel peut comporter des erreurs, des omissions ou des interprétations discutables. Seuls font foi les textes officiels publiés (Journal officiel, Légifrance) et les décisions des autorités compétentes. Le Client qui relève une erreur la signale à BTRY, qui l'examine et la corrige le cas échéant dans un délai raisonnable.",
      "Les échéances sont calculées à partir des dates et des faits saisis par le Client (dernier rapport, mise en service, date d'entrée d'un salarié…) et des périodicités du référentiel. Elles sont indicatives : une périodicité ou une date fixée par un texte, une prescription de l'administration, la commission de sécurité, un rapport de vérification ou l'assureur du Client prime sur celle que Rojer affiche.",
      "Lorsque le texte n'écrit pas de rythme précis, Rojer retient un rythme par défaut et l'affiche comme un choix de Rojer, non comme une exigence du texte.",
    ],
  },
  {
    titre: "7. Rappels et notifications",
    paragraphes: [
      "Les rappels, alertes et e-mails envoyés par Rojer sont une aide. Leur absence, leur retard ou leur non-réception (adresse erronée, filtre de messagerie, indisponibilité du service) ne décharge le Client d'aucune obligation, et ne peut être reprochée à BTRY. Le Client consulte régulièrement son calendrier dans l'application.",
    ],
  },
  {
    titre: "8. L'expert (offre Pro)",
    // À VALIDER (propriétaire) : les avantages Pro affichés sur la page des
    // tarifs (question à l'expert, rendez-vous d'une heure par an, assistant)
    // sont-ils maintenus ? Retirer la section si non.
    paragraphes: [
      "L'offre Pro permet de poser des questions techniques de prévention à un expert désigné par BTRY, et d'obtenir un rendez-vous d'une heure par an, dans les conditions affichées sur la page des tarifs à la date de souscription.",
      "L'expert donne un avis technique de prévention, fondé sur les seules informations que le Client lui transmet. Il ne donne aucun avis juridique, ne se rend pas sur place, n'effectue aucune vérification réglementaire et ne prend aucune décision à la place du Client. BTRY s'engage à une réponse dans un délai raisonnable, sans délai garanti.",
    ],
  },
  {
    titre: "9. Services de tiers reliés à Rojer",
    paragraphes: [
      "Le Client peut relier Rojer à un assistant d'intelligence artificielle de son choix (offre Pro). Les informations que cet assistant lit dans Rojer quittent alors le service, sous la seule responsabilité du Client et selon les conditions du fournisseur de l'assistant. Les réponses de l'assistant ne sont pas produites par Rojer ; BTRY n'en répond pas.",
      "Le paiement est assuré par Stripe, la messagerie par un prestataire d'envoi d'e-mails, l'hébergement par Clever Cloud. BTRY n'est pas responsable des interruptions propres à ces services.",
    ],
  },
  {
    titre: "10. Signature électronique, accès des tiers, pages publiques",
    paragraphes: [
      "La signature proposée par Rojer est une signature électronique simple au sens du règlement (UE) n° 910/2014 (« eIDAS ») : elle associe au document signé une empreinte et une date, vérifiables sur une page publique. Ce n'est ni une signature avancée ni une signature qualifiée ; il appartient au Client d'apprécier si elle convient à l'usage qu'il en fait.",
      "Le Client choisit les personnes qu'il invite sur son compte et les prestataires auxquels il ouvre un accès ou demande une signature. Il répond de leur usage du service et de ce qu'il leur communique.",
      "Les informations que le Client publie (registre public d'accessibilité, affiche à QR code) le sont sous sa responsabilité ; il en vérifie l'exactitude.",
    ],
  },
  {
    titre: "11. Compte et Utilisateurs",
    paragraphes: [
      "Le Client fournit des informations exactes et les tient à jour. Il garde ses identifiants confidentiels, en répond, et prévient BTRY sans délai de tout usage non autorisé. Chaque Utilisateur dispose d'identifiants personnels ; un compte ne se partage pas.",
      "Le Client s'interdit tout usage contraire à la loi ou aux Conditions, toute tentative d'accès non autorisé, toute atteinte à la sécurité ou au fonctionnement du service, et toute extraction automatisée du référentiel.",
    ],
  },
  {
    titre: "12. Essai gratuit",
    paragraphes: [
      "L'essai dure 30 jours, sans carte bancaire, une fois par compte, dans la formule Essentiel et ses limites d'essai.",
      "Rien n'est prélevé pendant l'essai. Pendant l'essai, les gestes qui produisent un document officiel ou engagent un tiers (valider une version du document unique, exporter le dossier ou le registre, publier le registre d'accessibilité, signer pour un tiers) demandent un abonnement payé.",
      "Sans abonnement au terme de l'essai, la saisie est fermée et le dossier reste consultable.",
    ],
  },
  {
    titre: "13. Formules, prix et paiement",
    paragraphes: [
      "Les formules, leurs limites et leurs prix sont ceux de la page des tarifs à la date de souscription. L'abonnement est mensuel ou annuel, payable d'avance par carte bancaire. Les prix sont indiqués toutes taxes comprises (TVA de 20 % incluse). Le paiement et l'émission des factures sont assurés par Stripe ; les factures sont envoyées par e-mail et restent disponibles dans l'espace de gestion de l'abonnement.",
      "L'abonnement se renouvelle automatiquement à la fin de chaque période, au prix en vigueur, jusqu'à sa résiliation. BTRY peut modifier ses prix ; le Client en est informé par e-mail au moins trente jours à l'avance, et le nouveau prix s'applique à la période suivante.",
      "Passer à une formule supérieure prend effet immédiatement ; la différence pour la période en cours est facturée au prorata. Passer à une formule inférieure prend effet à la fin de la période payée.",
      // À VALIDER (expert-comptable) : le taux des pénalités de retard.
      "Toute somme impayée à son échéance porte de plein droit des pénalités de retard au taux d'intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente majoré de dix points, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (articles L. 441-10 et D. 441-5 du Code de commerce).",
    ],
  },
  {
    titre: "14. Impayé",
    paragraphes: [
      "Si un paiement échoue, il est présenté de nouveau pendant un mois au plus, et le Client est prévenu par e-mail ; la saisie reste ouverte pendant ce temps. Sans règlement à leur terme, l'abonnement est suspendu : la saisie est fermée, le dossier reste consultable, et le Client peut régulariser à tout moment depuis l'espace de gestion de l'abonnement.",
    ],
  },
  {
    titre: "15. Résiliation",
    paragraphes: [
      "Le Client résilie son abonnement en ligne, à tout moment, depuis l'espace de gestion de l'abonnement accessible dans Rojer. La résiliation prend effet à la fin de la période payée ; le service reste accessible jusque-là.",
      "BTRY peut résilier l'abonnement en cas de manquement grave du Client aux Conditions, après une mise en demeure restée sans effet pendant quinze jours, ou suspendre l'accès sans délai en cas de risque pour la sécurité du service ou des autres clients.",
      "Après la fin de l'abonnement, la saisie est fermée ; le dossier reste consultable, et les exports déjà ouverts par un abonnement payé restent disponibles, jusqu'à la suppression du compte prévue à l'article 17.",
    ],
  },
  {
    titre: "16. Remboursement",
    // À VALIDER (propriétaire, avocat) : la règle de remboursement.
    paragraphes: [
      "Une période commencée est due en entier : la résiliation, un passage à une formule inférieure ou l'absence d'utilisation ne donnent lieu à aucun remboursement, total ou au prorata, que l'abonnement soit mensuel ou annuel. Seule une erreur de facturation imputable à BTRY est remboursée.",
      "Une contestation de paiement auprès de la banque (rétrofacturation) met fin à l'abonnement sans délai ; le Client peut se réabonner ensuite.",
    ],
  },
  {
    titre: "17. Données du Client, export et suppression",
    paragraphes: [
      "Les données saisies et les documents déposés par le Client restent sa propriété. Il les consulte à tout moment, et les exporte dans les conditions de sa formule.",
      "La conservation du document unique d'évaluation des risques pendant quarante ans (article L. 4121-3-1 du Code du travail) et celle des rapports de vérification incombent au Client. Rojer n'est pas un service d'archivage : le Client télécharge et conserve lui-même ses versions validées et ses rapports.",
      "Un compte sans abonnement depuis douze mois (après l'essai, une résiliation ou un impayé) est supprimé avec toutes ses données. Deux e-mails le préviennent, trente jours puis sept jours avant, avec la date. La suppression est définitive.",
      "Le propriétaire du compte peut aussi en demander la suppression depuis l'application : elle intervient le septième jour, et peut être annulée d'ici là. BTRY conserve les factures et les preuves d'acceptation des Conditions pendant les durées que la loi lui impose.",
    ],
  },
  {
    titre: "18. Données personnelles",
    paragraphes: [
      "Pour les données personnelles que le Client enregistre dans Rojer (salariés, prestataires, intervenants), le Client est responsable du traitement et BTRY agit en qualité de sous-traitant au sens de l'article 28 du règlement (UE) 2016/679 (RGPD). BTRY s'engage à : ne traiter ces données que pour fournir le service et sur instruction du Client ; en garantir la confidentialité par les personnes autorisées à y accéder ; mettre en œuvre des mesures de sécurité appropriées ; ne recourir qu'aux sous-traitants ultérieurs listés dans la politique de confidentialité, et informer le Client de tout changement ; l'aider à répondre aux demandes d'exercice des droits ; lui notifier toute violation de données dans les meilleurs délais ; supprimer les données à la fin du service dans les conditions de l'article 17 ; et mettre à sa disposition les informations nécessaires pour démontrer le respect de ces obligations.",
      "Pour les données des comptes, de la facturation et des échanges avec ses clients, BTRY est responsable du traitement. La politique de confidentialité, accessible depuis le site, décrit ces traitements, leurs durées et les droits des personnes.",
      "Les données sont hébergées dans l'Union européenne.",
    ],
  },
  {
    titre: "19. Disponibilité et assistance",
    paragraphes: [
      "BTRY met en œuvre les moyens raisonnables pour que Rojer soit accessible en continu, sans garantir de taux de disponibilité. Le service peut être interrompu pour maintenance, mise à jour, ou en raison d'un incident chez un prestataire, d'une attaque informatique ou d'un cas de force majeure ; BTRY s'efforce de prévenir le Client des maintenances prévues.",
      "BTRY corrige dans un délai raisonnable les anomalies reproductibles qui lui sont signalées, sans délai d'intervention garanti. Elle fait évoluer Rojer librement, sans en dénaturer l'objet ; les évolutions sont comprises dans l'abonnement.",
      `L'assistance est assurée par écrit, depuis l'application ou le formulaire de contact du site, les jours ouvrés.`,
    ],
  },
  {
    titre: "20. Responsabilité",
    // À VALIDER (avocat) : plafond, exclusions, articulation avec l'article
    // 1170 du Code civil (obligation essentielle) et l'article 1171
    // (déséquilibre significatif dans un contrat d'adhésion).
    paragraphes: [
      "Les obligations de BTRY sont des obligations de moyens. Sa responsabilité ne peut être engagée qu'en cas de faute prouvée, et pour les seuls dommages directs et prévisibles subis par le Client.",
      "BTRY ne répond pas des dommages indirects, ni des conséquences des décisions du Client, de ses déclarations inexactes ou incomplètes, ou de la non-réalisation d'une obligation qui lui incombe. Sont notamment exclus : les amendes, sanctions administratives ou pénales, mises en demeure, fermetures administratives, avis défavorables, refus de garantie ou majorations d'assurance, accidents et sinistres, pertes d'exploitation, de chiffre d'affaires ou de clientèle, et atteintes à l'image.",
      "Sauf faute lourde ou dolosive de BTRY, et hors dommages corporels causés par sa faute, la responsabilité totale de BTRY, tous dommages et toutes causes confondus, est limitée aux sommes payées par le Client au titre de son abonnement pendant les douze mois précédant le fait qui l'engage.",
    ],
  },
  {
    titre: "21. Propriété intellectuelle",
    paragraphes: [
      "Rojer, ses logiciels, ses interfaces, ses textes, son référentiel d'obligations (base de données protégée par les articles L. 341-1 et suivants du Code de la propriété intellectuelle), ses documents types et sa marque appartiennent à BTRY. L'abonnement donne au Client un droit d'usage personnel, non exclusif et non cessible, pour ses besoins internes et pour la durée de l'abonnement.",
      "Le Client s'interdit de reproduire, d'extraire ou de réutiliser tout ou partie substantielle du référentiel, de copier ou de décompiler le service, ou de le mettre à la disposition d'un tiers, hors les cas autorisés par la loi.",
    ],
  },
  {
    titre: "22. Confidentialité",
    paragraphes: [
      "Chaque partie garde confidentielles les informations non publiques de l'autre auxquelles elle a accès, pendant la durée de l'abonnement et deux ans après sa fin, sauf obligation légale ou demande d'une autorité.",
    ],
  },
  {
    titre: "23. Force majeure",
    paragraphes: [
      "Aucune partie n'est responsable d'un manquement dû à un cas de force majeure au sens de l'article 1218 du Code civil. Si l'empêchement dure plus de soixante jours, chaque partie peut résilier l'abonnement par écrit, sans indemnité.",
    ],
  },
  {
    titre: "24. Dispositions générales",
    paragraphes: [
      "Le Client ne peut céder son abonnement sans l'accord écrit de BTRY. BTRY peut céder le contrat dans le cadre d'une cession ou d'une réorganisation de son activité, en en informant le Client.",
      "Si une stipulation des Conditions est déclarée nulle, les autres restent applicables. Ne pas se prévaloir d'un manquement ne vaut pas renonciation à s'en prévaloir plus tard.",
    ],
  },
  {
    titre: "25. Droit applicable et litiges",
    paragraphes: [
      `Les Conditions sont régies par le droit français. En cas de différend, les parties recherchent d'abord une solution amiable ; le Client écrit à ${EDITEUR.email}. À défaut d'accord, compétence exclusive est attribuée aux tribunaux compétents de Nîmes, y compris en cas de pluralité de défendeurs ou d'appel en garantie.`,
    ],
  },
];
