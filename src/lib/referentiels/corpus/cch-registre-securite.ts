// Corpus : articles cités par le référentiel, dépouillés le 26 août 2026.
//
// Étendue « articles_cites » : cette liste ne contient QUE les articles que le
// référentiel cite. Elle ne dit rien de ce que le texte contient par ailleurs,
// et ne peut donc jamais se déclarer complète. C'est un remboursement de dette,
// pas une preuve d'exhaustivité.

import type { Corpus } from "./types";

export const CCH_REGISTRE_SECURITE: Corpus = {
  id: "cch-registre-securite",
  intitule:
    "Code de la construction et de l'habitation — registre de sécurité et contrôles",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818891/",
  etendue: "articles_cites",
  portee:
    "Articles du CCH fondant le registre de sécurité en ERP et en IGH, réécrits au 1er juillet 2026 par le décret n° 2025-1100.",
  articles: [
    {
      ref: "CCH R. 143-44",
      intitule: "Registre de sécurité en établissement recevant du public",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819037/",
      prescrit:
        "Dans tout ERP soumis au chapitre III : tenir un registre de sécurité portant les renseignements indispensables à la bonne marche du service de sécurité, comprenant — outre les pièces de R. 141-10 et R. 141-11 — les travaux d'aménagement, l'état nominatif du service de sécurité, les consignes incendie y compris d'évacuation des personnes handicapées, les dates et observations des contrôles et vérifications, et les dates des exercices. État à tenir : aucune périodicité propre.",
      citationCle:
        "Dans les établissements soumis aux prescriptions du présent chapitre, il doit être tenu un registre de sécurité sur lequel sont reportés les renseignements indispensables à la bonne marche du service de sécurité. Ce registre comprend, outre les pièces attendues aux articles R. 141-10 et R. 141-11 : 1° Les dates des travaux d'aménagement et de transformation, leur nature, les noms du ou des entrepreneurs et, s'il y a lieu, de l'architecte ou du technicien chargé de surveiller les travaux ; 2° L'état nominatif et hiérarchique des personnes appartenant au service de sécurité ; 3° Les diverses consignes, générales et particulières, établies en cas d'incendie, y compris les consignes d'évacuation prenant en compte les différents types de handicap ; 4° Les dates des divers contrôles et vérifications ainsi que les observations auxquelles ceux-ci ont donné lieu ; 5° Les dates des exercices de sécurité incendie.",
      versionEnVigueur: "2026-07-01",
      modifiePar: { texte: "Décret n° 2025-1100 du 19 novembre 2025 - art. 1" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
    },
    {
      ref: "CCH R. 141-10",
      intitule: "Contenu du registre de sécurité incendie (règle générale)",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818891/",
      prescrit:
        "Socle commun du registre de sécurité incendie prévu par L. 126-1 et L. 141-4 : il contient les renseignements indispensables à l'entretien et au contrôle de la sécurité incendie, et comprend en particulier les vérifications réalisées, les mesures de correction des écarts constatés et les consignes établies en cas d'incendie, évacuation et mise en sécurité comprises.",
      citationCle:
        "Le registre de sécurité incendie, prévu par les articles L. 126-1 et L. 141-4, contient les renseignements indispensables à l'entretien et au contrôle de la sécurité contre les risques d'incendie. Il comprend en particulier les vérifications réalisées, les mesures de correction des écarts constatés ainsi que les diverses consignes établies en cas d'incendie, y compris concernant l'évacuation et la mise en sécurité des personnes.",
      versionEnVigueur: "2026-07-01",
      // Page de l'article : « Création Décret n°2025-1100 du 19 novembre 2025 - art. 1 ».
      // Article CRÉÉ par ce décret, jamais modifié depuis : pas de texte modificateur.
      // Le décret lui-même est nommé sur R. 143-44 et R. 146-35, qu'il modifie.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
    },
    {
      ref: "CCH R. 141-11",
      intitule: "Pièces des solutions d'effet équivalent annexées au registre",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818891/",
      prescrit:
        "Annexer au registre de sécurité les éléments identifiant les solutions d'effet équivalent : dossier de conception et de mise en œuvre, attestations des articles L. 112-9 et L. 112-10, et les modifications ultérieures qui impactent le respect des objectifs. Ne concerne que les bâtiments ayant recours à une solution d'effet équivalent.",
      citationCle:
        "Les éléments permettant d'identifier les solutions d'effet équivalent sont annexés au registre de sécurité et comprennent : 1° Un dossier décrivant la nature, la conception de la solution d'effet équivalent ainsi que les modalités de sa mise en œuvre et, s'il y a lieu, les conditions d'exploitation, d'entretien périodique et de maintenance garantissant le respect des objectifs de sécurité incendie ; 2° Les attestations de respect des objectifs et de bonne mise en œuvre de la solution d'effet équivalent, telles que prévues par les articles L. 112-9 et L. 112-10 ; 3° Les modifications apportées à la solution d'effet équivalent lorsqu'elles impactent la manière de respecter les objectifs de sécurité incendie.",
      versionEnVigueur: "2026-07-01",
      // Page de l'article : « Création Décret n°2025-1100 du 19 novembre 2025 - art. 1 ».
      // Article CRÉÉ par ce décret, jamais modifié depuis : pas de texte modificateur.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
    },
    {
      ref: "CCH R. 146-35",
      intitule: "Registre de sécurité en immeuble de grande hauteur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819153",
      prescrit:
        "En IGH : le PROPRIÉTAIRE — et non l'exploitant — tient un registre de sécurité comprenant, outre les pièces de R. 141-10 et R. 141-11, six rubriques ; deux de plus que l'article ERP R. 143-44, dont l'état et les plans de situation des moyens de secours.",
      citationCle:
        "Il doit être tenu, par le propriétaire, un registre de sécurité sur lequel sont portés les renseignements indispensables au contrôle de la sécurité. Ce registre comprend, outre les pièces attendues aux articles R. 141-10 et R. 141-11 : 1° Les dates des travaux d'aménagement et de transformation, leur nature, les noms du ou des entrepreneurs, et, s'il y a lieu, de l'architecte ou du technicien chargé de surveiller les travaux ; 2° L'état nominatif et hiérarchique des personnes appartenant au service de sécurité ; 3° Les diverses consignes, générales et particulières, établies en cas d'incendie, y compris les consignes d'évacuation prenant en compte les différents types de handicap ; 4° Les dates des divers contrôles et vérifications ainsi que les observations ou rapports auxquels ceux-ci ont donné lieu ; 5° Les dates des exercices de sécurité incendie ; 6° L'état et les plans de situation des moyens de secours mis à disposition du service de sécurité.",
      versionEnVigueur: "2026-07-01",
      modifiePar: { texte: "Décret n° 2025-1100 du 19 novembre 2025 - art. 1" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
    },
    {
      // ENTRÉE DU 2026-09-20, ET C'EST UN CLIQUET QUI L'A EXIGÉE. L'écran des
      // prescriptions citait au dirigeant « CCH, art. R. 143-45 » pour l'acte
      // qui prescrit après une visite de commission ; R. 143-45 est l'article
      // de la FERMETURE d'un établissement exploité en infraction. La
      // correction a désigné R. 143-42, que le dépôt ne portait nulle part —
      // et `citations-ecran` l'a aussitôt dénoncé comme orphelin, ce qu'il
      // était. La référence était de surcroît coupée entre deux lignes du JSX,
      // donc invisible du balayage : la remettre d'un tenant a fait apparaître
      // la dette en même temps qu'elle la créait.
      ref: "CCH R. 143-42",
      intitule:
        "Présence de l'exploitant à la visite, procès-verbal, et notification par le maire",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819033",
      versionEnVigueur: "2021-07-01",
      modifiePar: null,
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Impose à l'exploitant d'ASSISTER à la visite de son établissement ou de s'y faire représenter par une personne qualifiée. Prévoit qu'un procès-verbal est dressé à l'issue de chaque visite, et que LE MAIRE — lui seul dans cet article — notifie aux exploitants le résultat de ces visites ET SA DÉCISION, par la voie administrative ou par lettre recommandée avec accusé de réception.",
      citationCle:
        "Les exploitants sont tenus d'assister à la visite de leur établissement ou de s'y faire représenter par une personne qualifiée. A l'issue de chaque visite, il est dressé un procès-verbal. Le maire notifie le résultat de ces visites et sa décision aux exploitants soit par la voie administrative, soit par lettre recommandée avec accusé de réception.",
      statut: "sans_objet",
      motif:
        "LU, DANS LE PÉRIMÈTRE, ET RIEN À INSCRIRE AU CALENDRIER. L'article décrit une PROCÉDURE que l'exploitant subit — une visite dont il ne fixe ni la date ni le rythme — et la notification qui la suit. Le seul acte qui lui incombe, assister ou se faire représenter, n'a ni périodicité propre ni fait générateur que le produit observe : il se déclenche quand la commission vient, ce que Rojer n'a aucun moyen de savoir. La périodicité des visites, elle, est portée par R. 143-41 et par la table GE 4, déjà encodées.\n\nPOURQUOI L'ENTRÉE EXISTE QUAND MÊME, et c'est l'usage le moins évident de ce statut : l'écran des prescriptions s'appuie sur cet article pour expliquer au dirigeant le partage entre l'AVIS de la commission et l'ACTE qui prescrit. Ce partage est le fondement de tout le module — Rojer n'enregistre qu'une prescription qui renforce. Sans cette entrée, la référence affichée reposerait sur une lecture que personne n'aurait tracée.\n\nNE PAS LE CONFONDRE AVEC R. 143-45, qui vit dans la section « Sanctions administratives » et permet au maire OU au représentant de l'État d'ordonner la fermeture d'un établissement exploité en infraction. C'est lui qui était cité à tort ; c'est aussi de lui que venait le « ou le préfet » de l'écran, R. 143-42 ne nommant que le maire.",
    },
    {
      ref: "CCH R. 143-41",
      intitule: "Visites périodiques de contrôle par la commission de sécurité",
      versionEnVigueur: "2021-07-01",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "incendie-erp-visite-commission-cat1-2-triennale",
        "incendie-erp-visite-commission-cat1-2-quinquennale",
        "incendie-erp-visite-commission-cat3-triennale",
        "incendie-erp-visite-commission-cat3-quinquennale",
        "incendie-erp-visite-commission-cat4-triennale",
        "incendie-erp-visite-commission-cat4-quinquennale",
        "incendie-erp-5-visite-commission",
      ],
      citationCle:
        "« Ces établissements doivent faire l'objet, dans les conditions fixées au règlement de sécurité, de visites périodiques de contrôle et de visites inopinées effectuées par la commission de sécurité compétente. »",
      prescrit:
        "Fonde les visites périodiques et inopinées de la commission. Ne fixe AUCUNE périodicité : il renvoie au règlement de sécurité, dont la seule table (GE 4) ne vise que les quatre premières catégories.",
    },
  ],
};
