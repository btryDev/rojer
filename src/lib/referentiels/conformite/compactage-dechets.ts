/**
 * Obligations réglementaires — Compactage des déchets.
 *
 * Source primaire : arrêté du 5 mars 1993 soumettant certains équipements de
 * travail à l'obligation de faire l'objet des vérifications générales
 * périodiques prévues à l'article R. 233-11 du code du travail. Corpus
 * `arrete-1993-03-05-machines`, dépouillé INTÉGRALEMENT le 2026-09-02 — cinq
 * articles sur cinq.
 *
 * ── D'OÙ CE FICHIER VIENT ──────────────────────────────────────────────────
 *
 * `R. 4323-23` est un article d'HABILITATION : il n'écrit aucune périodicité,
 * il renvoie à « des arrêtés du ministre chargé du travail ou du ministre
 * chargé de l'agriculture ». Le dépôt ne l'avait instruit que par UNE de ses
 * branches — l'arrêté du 1er mars 2004, le levage, dans `levage.ts`. L'autre
 * branche existe depuis 1993 et ne fondait aucune ligne du référentiel. Ce
 * fichier est cette seconde branche, pour la part d'elle qui touche les
 * secteurs cibles.
 *
 * ── CE QUI ENTRE, ET CE QUI RESTE DEHORS ───────────────────────────────────
 *
 * Le I de l'article 1er énumère ONZE catégories d'équipements. Deux seulement
 * sont des appareils ordinaires de la restauration, du commerce de détail ou
 * du bureau, et ce ne sont pas celles qu'un guide professionnel désignait :
 *
 *   - « Presses à balles » — le compacteur-presse à cartons, équipement
 *     courant du commerce de détail jusqu'aux surfaces moyennes ;
 *   - « Compacteurs à déchets » — supermarchés et grandes cuisines.
 *
 * Les deux sont mus électriquement et chargés à la main en phase de
 * production : les deux conditions cumulatives du proviso du I sont donc
 * remplies par construction, et la catégorie d'équipement
 * `COMPACTEUR_PRESSE_DECHETS_MOTORISE` porte la première dans son nom plutôt
 * que dans un attribut qu'il aurait fallu inventer.
 *
 * TROIS ENTRÉES QUE LE SIGNAL D'ORIGINE CROYAIT CIBLES NE LE SONT PAS, et
 * c'est le verbatim qui le montre :
 *   - « machines à cylindres POUR L'INDUSTRIE DU CAOUTCHOUC » : la restriction
 *     de branche est dans le texte. Ce n'est ni un laminoir ni un pétrin de
 *     boulangerie ;
 *   - « systèmes de compactage des véhicules de collecte d'ordures ou de
 *     déchets » : la benne du collecteur, pas le local à poubelles du
 *     restaurant ;
 *   - un massicot de bureau est mû par la force humaine employée directement,
 *     donc écarté par le proviso. Seul un massicot MOTORISÉ, d'atelier de
 *     reprographie, entrerait — et il n'est pas encodé ici.
 *
 * L'ARTICLE 2 N'EST PAS ENCODÉ, et son corpus dit pourquoi : les engins
 * mobiles de terrassement et de forage ne touchent pas la cible, et ce qu'est
 * une « centrifugeuse » au sens de cet arrêté ne se tranche pas à la source —
 * le texte n'en donne aucune définition et ne la borne à aucune branche, là où
 * il borne expressément les machines à cylindres. La question reste ouverte au
 * corpus (`obligation_manquante`) plutôt que fermée dans un sens ou dans
 * l'autre.
 */

import type { Obligation } from "./types";

export const obligationsCompactageDechets: Obligation[] = [
  {
    id: "compactage-dechets-vgp-trimestrielle",
    domaine: "compactage_dechets",
    libelle:
      "Vérification générale périodique trimestrielle (compacteur à déchets, presse à balles)",
    description:
      "Un compacteur à déchets ou une presse à balles motorisé doit avoir fait l'objet, depuis moins de trois mois au moment de son utilisation, d'une vérification générale périodique. La vérification porte sur l'ensemble des éléments dont la détérioration est susceptible de créer un danger, et se limite aux parties visibles et aux éléments accessibles par démontage des carters ou capots. Elle comprend quatre volets : a) l'état physique du matériel — stabilité et fixation des éléments susceptibles de tomber ou d'être projetés, fixation des éléments de protection, fissures, déformations et oxydations anormales, propreté, filtres et échappements, liaisons et raccordements électriques, hydrauliques et pneumatiques ; b) les essais de fonctionnement des éléments fonctionnels — présence et fonctionnement des dispositifs de protection dans tous les modes de marche, bruits, vibrations, températures et chocs anormaux, fonctionnement des dispositifs d'arrêt automatiques ou volontaires et de ceux associés à une fonction de protection ; c) les réglages et les jeux — niveau des fluides, pression d'air et d'huile, ressorts de freinage et d'embrayage, jeux anormaux des organes mécaniques de commande, pièces d'usure, réglage des fins de course ; d) l'état des appareils de mesure et des dispositifs de signalisation. Elle est réalisée par une personne qualifiée, appartenant ou non à l'établissement, et son résultat est consigné sur le registre de sécurité.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 5 mars 1993, art. 1er, I (presses à balles ; compacteurs à déchets — moins de trois mois au moment de l'utilisation)",
        article: "Arrêté 1993-03-05 art. 1",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679618",
        note: "« I. - Les équipements de travail suivants doivent avoir fait l'objet, depuis moins de trois mois au moment de leur utilisation, de la vérification générale périodique prévue à l'article R. 233-11 du code du travail : […] Presses à balles ; Compacteurs à déchets ; […] Ne sont toutefois soumis à une vérification générale périodique que les équipements de travail mus par une source d'énergie autre que la force humaine employée directement et dont le chargement ou le déchargement est effectué manuellement en phase de production. » Verbatim relevé le 2026-09-02. ⚠ Le renvoi à « l'article R. 233-11 » est celui du texte : cette numérotation est abrogée depuis le 1er mai 2008 (décret n° 2008-244 du 7 mars 2008, art. 9) et l'article qui porte aujourd'hui la vérification générale périodique est R. 4323-23, cité ci-dessous.",
        versionConstatee: "1993-12-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-23 (article habilitant, branche hors levage)",
        article: "R. 4323-23",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479",
        note: "L'article qui renvoie à des arrêtés le soin de désigner les équipements soumis à vérification générale périodique et d'en fixer la périodicité, la nature et le contenu. Il n'écrit lui-même aucun rythme. Sa branche levage est l'arrêté du 1er mars 2004 (`levage.ts`), sa branche hors levage celui du 5 mars 1993.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 5 mars 1993, art. 3 (contenu de la vérification)",
        article: "Arrêté 1993-03-05 art. 3",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679621",
        note: "Article de CONTENU, cité en contexte et non en fondement : il dit sur quoi porte la vérification, jamais qui la doit ni quand. « Les vérifications générales périodiques visées aux articles 1er et 2 doivent porter sur l'ensemble des éléments dont la détérioration est susceptible de créer un danger. Ces vérifications, limitées aux parties visibles et aux éléments accessibles par démontage des carters ou capots, sont les suivantes : a) Vérification visuelle de l'état physique du matériel […] b) Vérification des éléments fonctionnels concourant au travail par des essais de fonctionnement […] c) Vérification des réglages et des jeux […] d) Vérification de l'état des indicateurs […] » Version issue de l'arrêté du 4 juin 1993, art. 2.",
        versionConstatee: "1993-12-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-24 (qualification du vérificateur)",
        article: "R. 4323-24",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531477",
        note: "« Les vérifications générales périodiques sont réalisées par des personnes qualifiées, appartenant ou non à l'établissement, dont la liste est tenue à la disposition de l'inspection du travail. » C'est cet article qui fonde `personne_qualifiee`, et le fait qu'aucun organisme extérieur ne soit exigé.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-25 (consignation au registre de sécurité)",
        article: "R. 4323-25",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531475",
        note: "« Le résultat des vérifications générales périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5. » Obligation de traçabilité sans périodicité propre : elle suit celle de la vérification.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "trimestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["COMPACTEUR_PRESSE_DECHETS_MOTORISE"],
    notesInternes:
      "Créée le 2026-09-02 avec le dépouillement intégral de l'arrêté du 5 mars 1993 (corpus `arrete-1993-03-05-machines`). L'article 1er y était classé `obligation_manquante` depuis le même jour, bloqué par une seule chose : aucune catégorie d'équipement ne pouvait porter ces machines.\n\nUNE LIGNE POUR DEUX ENTRÉES DE LA LISTE, et c'est un choix — le même que celui de `incendie-erp-5-sommeil-plans-affiches`, où trois paragraphes font une ligne. « Presses à balles » et « compacteurs à déchets » sont deux entrées distinctes du I, mais elles portent le même acte, la même périodicité (trois mois), le même réalisateur (personne qualifiée, R. 4323-24), le même contenu (art. 3) et la même consignation (R. 4323-25). Surtout : le dirigeant qui déclare son matériel ne fait pas la différence entre son compacteur et sa presse — c'est souvent la même machine, vendue sous les deux noms. Les scinder aurait produit deux rendez-vous trimestriels là où il y a un appareil et un vérificateur.\n\nLE NOM DE LA CATÉGORIE PORTE LE PROVISO, ET C'EST CE QUI PERMET DE NE PAS INVENTER D'ATTRIBUT. Le I ne soumet que les équipements « mus par une source d'énergie autre que la force humaine employée directement ET dont le chargement ou le déchargement est effectué manuellement en phase de production » — deux conditions cumulatives. La seconde est vraie par construction pour ces machines : on y jette ses cartons à la main, c'est leur mode d'emploi. La première ne l'est pas — une presse à levier de petit commerce existe —, et c'est pourquoi la catégorie s'appelle `COMPACTEUR_PRESSE_DECHETS_MOTORISE` et non `COMPACTEUR_PRESSE_DECHETS`. Le libellé de formulaire répète le mot (« motorisé »), et l'aide écarte nommément la presse actionnée au bras. Une propriété d'équipement à trois états aurait fait le même travail en moins bien : elle aurait laissé l'obligation s'appliquer tant que la question n'est pas répondue, sur une ligne trimestrielle de criticité 5, alors que le dirigeant SAIT si sa presse a un moteur — il n'y a pas d'incertitude à protéger ici.\n\nPOURQUOI PAS UNE CATÉGORIE « MACHINE » NI « ÉQUIPEMENT DE TRAVAIL ». La liste du I est nominative et FERMÉE. Une catégorie de ce nom aurait attiré le pétrin, la trancheuse, le laminoir — que l'arrêté ne vise pas — et leur aurait réclamé une vérification tous les trois mois. C'est la sur-application que ce lot existe pour ne pas créer : trimestrielle et de criticité 5, elle aurait coûté quatre visites par an à des dirigeants qui n'en doivent aucune.\n\nCE QUE LA PÉRIODICITÉ ENCODE, ET CE QU'ELLE PERD. Le texte n'écrit pas « tous les trois mois » mais « avoir fait l'objet, DEPUIS MOINS DE TROIS MOIS AU MOMENT DE LEUR UTILISATION » : l'échéance se mesure à l'instant de l'usage, et un équipement non vérifié depuis plus de trois mois ne peut pas être utilisé. `periodicite: \"trimestrielle\"` rend le rythme, pas cette conséquence — le produit ne sait pas interdire l'usage d'un appareil. Le sens de l'écart est le bon : le calendrier réclame la vérification à la date, ce qui est exactement ce qu'il faut faire pour que la condition d'usage reste satisfaite.\n\nLE II N'EST PAS ENCODÉ, ET C'EST DÉLIBÉRÉ. Il allège le régime des campagnes SAISONNIÈRES : une seule vérification pendant une intercampagne de plus de trois mois, à charge d'un essai de fonctionnement en sécurité avant la remise en service. Aucun attribut d'établissement ni d'équipement ne dit qu'une activité est saisonnière, et la règle du non-renseigné vaut ici en plein : un allègement ne se donne pas sur une absence supposée. L'établissement saisonnier reçoit donc quatre échéances au lieu d'une — une sur-application VISIBLE par celui qui la subit, et corrigeable en repoussant l'occurrence, là où l'inverse aurait retiré trois rendez-vous en silence. C'est la réserve que le corpus porte sur l'article.\n\nRÉALISATEUR : `personne_qualifiee` SEUL, et pas `organisme_agree`. R. 4323-24 dit « des personnes qualifiées, APPARTENANT OU NON À L'ÉTABLISSEMENT » : le Code n'exige aucun organisme extérieur, à la différence du régime des équipements sous pression. Ajouter `organisme_agree` aurait fait croire à une exigence que le texte ne porte pas.\n\nPAS DE `pieceAttendue`. Le rapport de vérification est la TRACE de l'acte, pas l'obligation elle-même — même partage que sur les VGP de levage. Ce qui est dû est la vérification ; sa consignation au registre relève de R. 4323-25, cité en contexte.",
  },
];
