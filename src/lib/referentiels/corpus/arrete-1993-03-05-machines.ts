// Corpus : arrêté du 5 mars 1993 — vérifications générales périodiques des
// équipements de travail AUTRES que les appareils de levage.
//
// ── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
//
// `R. 4323-23` est un article d'HABILITATION : il n'écrit aucune périodicité,
// il renvoie à « des arrêtés du ministre chargé du travail ou du ministre
// chargé de l'agriculture ». Le dépôt ne l'avait instruit que par UNE de ses
// branches — l'arrêté du 1er mars 2004, le levage — et son entrée dans
// `code-travail-levage.ts` le dit déjà en toutes lettres depuis le
// 2026-09-01 : « le corpus ne l'a instruit que par sa branche levage […]
// alors qu'au moins une autre branche existe, l'arrêté du 5 mars 1993 ». Le
// présent fichier ouvre cette seconde branche.
//
// C'est le cas d'école de la troisième famille de manques listée en tête de
// `types.ts` : « un article d'habilitation lu sans énumérer les arrêtés qu'il
// habilite ». L'article avait été lu, son verbatim relevé, sa version datée —
// et une moitié entière de sa portée n'existait nulle part.
//
// ── CE QUE CE CORPUS COUVRE, ET CE QU'IL NE COUVRE PAS ─────────────────────
//
// Ce corpus et `arrete-2004-03-01-levage` sont deux frères pris sur le MÊME
// article habilitant, et aucun des deux ne couvre l'autre :
//   - arrêté du 1er mars 2004 → appareils et accessoires de LEVAGE ;
//   - arrêté du 5 mars 1993  → machines qui ne sont PAS des appareils de
//     levage (presses, massicots, compacteurs, centrifugeuses…).
// Une machine ne relève jamais des deux : l'arrêté de 2004 borne son champ à
// la définition d'« appareil de levage » de son article 2 a), et l'arrêté de
// 1993 procède par liste nominative fermée.
//
// Une TROISIÈME branche existe et n'est pas dépouillée ici, délibérément :
// l'arrêté du 24 juin 1993 (LEGIARTI000006932393, ouvert à la source le
// 2026-09-02), dont l'intitulé exact est « Arrêté du 24 juin 1993 soumettant
// certains équipements de travail DES ÉTABLISSEMENTS AGRICOLES visés à
// l'article L. 231-1 à l'obligation de faire l'objet de vérifications
// générales périodiques prévues à l'article R. 233-11 du code du travail ».
// C'est le jumeau agricole de celui-ci — même liste d'équipements au
// trimestre, à un mot près — et la restauration, le commerce de détail et le
// bureau ne sont pas des établissements agricoles. Hors cible, donc, et pour
// le champ d'application, pas pour le contenu.
//
// ── UNE ERREUR DE GUIDE PROFESSIONNEL, CORRIGÉE À LA SOURCE ────────────────
//
// Le guide qui a servi de SIGNAL à ce dépouillement rattachait les
// « centrifugeuses, machines mobiles d'extraction, de terrassement, de
// forage » à l'arrêté du 24 juin 1993. C'est faux deux fois : ces équipements
// sont à l'article 2 du présent arrêté (régime général, douze mois), et
// l'arrêté du 24 juin 1993 est le texte agricole. Le même guide écrivait
// « machines à cylindres » là où le texte écrit « machines à cylindres POUR
// L'INDUSTRIE DU CAOUTCHOUC » — trois mots qui font toute la différence : ce
// n'est pas un laminoir de boulangerie. Un guide est un signal, jamais une
// source.

import type { Corpus } from "./types";

export const ARRETE_1993_03_05_MACHINES: Corpus = {
  id: "arrete-1993-03-05-machines",
  intitule:
    "Arrêté du 5 mars 1993 — vérifications générales périodiques des équipements de travail (branche hors levage de R. 4323-23)",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000874070",
  etendue: "integral",
  portee:
    "La branche NON LEVAGE de l'habilitation de R. 4323-23 : l'arrêté soumet à vérification générale périodique une liste NOMINATIVE et FERMÉE de machines qui ne sont pas des appareils de levage — presses, massicots, machines à cylindres pour le caoutchouc, presses à balles, compacteurs à déchets, systèmes de compactage des véhicules de collecte (art. 1er, trois mois) ; centrifugeuses et machines mobiles d'extraction, de terrassement, d'excavation ou de forage à conducteur porté et machines à battre les palplanches (art. 2, douze mois). Il ne couvre AUCUN appareil de levage : ceux-là relèvent de l'arrêté du 1er mars 2004, corpus `arrete-2004-03-01-levage`, pris sur le même article habilitant. Réciproquement, l'arrêté de 2004 ne couvre aucune de ces machines. Le texte est en vigueur au 2026-09-02 ; ses articles 1er à 3 sont en vigueur depuis le 1er décembre 1993, l'article 4 depuis le 15 juin 1993, l'article 5 depuis le 23 août 2006. Dernier modificateur de fond : arrêté du 4 juin 1993. Aucune version future programmée. Intégral : les cinq articles du sommaire Légifrance sont ici, y compris ceux qui n'intéressent pas le produit. Depuis le 2026-09-02, l'article 1er est RETENU pour deux de ses onze catégories — presses à balles et compacteurs à déchets, portées par `compactage-dechets-vgp-trimestrielle` — et sa `reserve` dit ce qui reste dehors ; l'article 2 reste `obligation_manquante`. ⚠ L'arrêté renvoie encore à « l'article R. 233-11 du code du travail », numérotation ABROGÉE par le décret n° 2008-244 du 7 mars 2008 (art. 9) au 1er mai 2008 ; l'article qui porte aujourd'hui la vérification générale périodique est R. 4323-23, dont le verbatim reprend celui du premier alinéa de l'ancien R. 233-11. Le renvoi est recopié tel qu'il figure au texte, il n'est pas mis à jour ici.",
  articles: [
    {
      ref: "Arrêté 1993-03-05 art. 1",
      intitule:
        "Équipements soumis à vérification générale périodique tous les trois mois",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679618",
      versionEnVigueur: "1993-12-01",
      // Page de l'article : mention « Création », aucune ligne « Modifié par ».
      // L'arrêté du 4 juin 1993, seul texte modificateur de cet arrêté, a été
      // ouvert en entier (JORFTEXT000000530066, le 2026-09-02) : ses trois
      // articles ne touchent QUE les articles 3, 4 et 5 du présent arrêté —
      // le contenu des vérifications et la date d'application. Il n'ajoute ni
      // ne retire AUCUN équipement à la liste ci-dessous.
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "premiere_main",
      prescrit:
        "Le I soumet onze catégories d'équipements nommément désignées à une vérification générale périodique dont la formule n'est pas « tous les trois mois » mais « avoir fait l'objet, DEPUIS MOINS DE TROIS MOIS AU MOMENT DE LEUR UTILISATION » — l'échéance se mesure donc à l'instant de l'usage, pas à la date de la dernière visite, et un équipement non vérifié depuis plus de trois mois ne peut pas être utilisé. Un PROVISO ferme la liste par le bas, et il vaut pour les onze catégories sans exception : ne sont soumis que les équipements (a) mus par une source d'énergie autre que la force humaine employée directement ET (b) dont le chargement ou le déchargement est effectué manuellement en phase de production. Les deux conditions sont cumulatives. Le II aménage le cas des campagnes saisonnières : une seule vérification pendant une intercampagne de plus de trois mois, mais la remise en service au début de la campagne suivante doit être précédée d'un essai de fonctionnement en sécurité. Le contenu de la vérification est à l'article 3 ; le vérificateur, à R. 4323-24 ; la consignation, à R. 4323-25 à -27.",
      citationCle:
        "I. - Les équipements de travail suivants doivent avoir fait l'objet, depuis moins de trois mois au moment de leur utilisation, de la vérification générale périodique prévue à l'article R. 233-11 du code du travail : Presses mécaniques et presses hydrauliques pour le travail à froid des métaux ; Presses à vis ; Presses à mouler par injection ou compression des matières plastiques ou du caoutchouc ; Presses à mouler les métaux ; Massicots pour la découpe du papier, du carton, du bois ou des matières plastiques en feuille ; Presses à façonner les cuirs, peaux, papiers, cartons ou matières plastiques en feuille au moyen d'un emporte-pièce ; Presses à platine telles que presses à dorer, à gaufrer, à découper ; Machines à cylindres pour l'industrie du caoutchouc ; Presses à balles ; Compacteurs à déchets ; Systèmes de compactage des véhicules de collecte d'ordures ou de déchets. Ne sont toutefois soumis à une vérification générale périodique que les équipements de travail mus par une source d'énergie autre que la force humaine employée directement et dont le chargement ou le déchargement est effectué manuellement en phase de production. II. - Lorsqu'ils ne sont effectivement utilisés que pendant la durée de campagnes saisonnières et que la période d'intercampagnes est supérieure à trois mois, les équipements de travail mentionnés au I ci-dessus ne doivent faire l'objet, pendant cette période d'intercampagnes, que d'une seule vérification périodique. Toutefois, la remise en service au début de la nouvelle campagne doit être précédée d'un essai permettant de s'assurer du fonctionnement en sécurité de ces équipements de travail.",
      statut: "retenu",
      obligations: ["compactage-dechets-vgp-trimestrielle"],
      reserve:
        "RETENU LE 2026-09-02, ET RETENU EN PARTIE SEULEMENT. `compactage-dechets-vgp-trimestrielle` porte DEUX des onze catégories du I — « Presses à balles » et « Compacteurs à déchets » —, celles qui sont des équipements ordinaires de la restauration et du commerce de détail. Le blocage qui empêchait de les encoder est levé : la catégorie `COMPACTEUR_PRESSE_DECHETS_MOTORISE` existe, et son nom porte le proviso du I plutôt qu'un attribut d'équipement inventé.\n\nCE QUI RESTE DEHORS, ET POURQUOI — trois motifs distincts, et il faut les tenir séparés.\n\n(1) RESTRICTION DE BRANCHE ÉCRITE AU TEXTE. « Machines à cylindres POUR L'INDUSTRIE DU CAOUTCHOUC » : ce n'est ni un laminoir ni un pétrin de boulangerie. Trois mots que le guide professionnel à l'origine du dépouillement avait laissé tomber, et qui font toute la différence. Rien à encoder pour la cible.\n\n(2) OBJET QUI N'EST PAS CELUI QU'ON CROIT. « Systèmes de compactage des véhicules de collecte d'ordures ou de déchets » vise la benne du camion de collecte, pas le local à poubelles du restaurant. Le véhicule appartient au collecteur, jamais à l'exploitant servi par le produit.\n\n(3) ÉCARTÉ PAR LE PROVISO. Un massicot de bureau est mû par la force humaine employée directement : il ne remplit pas la première des deux conditions cumulatives. Seul un massicot MOTORISÉ, d'atelier de reprographie, entrerait — aucune catégorie d'équipement ne le porte, et aucun des trois secteurs cibles n'en détient couramment. Les sept autres entrées du I (presses mécaniques et hydrauliques pour le travail à froid des métaux, presses à vis, presses à mouler par injection ou compression, presses à mouler les métaux, presses à façonner à l'emporte-pièce, presses à platine) sont des machines d'atelier industriel : hors cible pour la même raison de fait, sans qu'aucun mot du texte ne les écarte.\n\nLE II N'EST PAS ENCODÉ NON PLUS, et c'est la seule réserve qui porte sur la cible. Il allège le régime des campagnes SAISONNIÈRES : une seule vérification pendant une intercampagne de plus de trois mois, à charge d'un essai de fonctionnement en sécurité avant la remise en service. Aucun attribut d'établissement ni d'équipement ne dit qu'une activité est saisonnière, et la règle du non-renseigné interdit d'accorder un allègement sur une absence supposée. Un établissement saisonnier reçoit donc quatre échéances au lieu d'une — sur-application VISIBLE par celui qui la subit, contre une sous-application que personne ne verrait.",
    },
    {
      ref: "Arrêté 1993-03-05 art. 2",
      intitule:
        "Équipements soumis à vérification générale périodique tous les douze mois",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679619",
      versionEnVigueur: "1993-12-01",
      // Page de l'article : mention « Création », aucune ligne « Modifié par ».
      // Même constat que pour l'article 1er : l'arrêté du 4 juin 1993, ouvert
      // en entier, ne touche pas cette liste.
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "premiere_main",
      prescrit:
        "Deuxième liste nominative fermée, à douze mois, et rédigée sur le même patron que celle de l'article 1er : « avoir fait l'objet, depuis moins de douze mois au moment de leur utilisation ». Deux entrées seulement. NOTER CE QUI N'Y EST PAS : le proviso « mus par une source d'énergie autre que la force humaine […] et dont le chargement ou le déchargement est effectué manuellement » figure au I de l'article 1er et NE SE REPORTE PAS ici — l'article 2 est un article distinct, et rien dans sa rédaction n'y renvoie. Le contenu de la vérification est le même qu'à l'article 1er : l'article 3 vise « les articles 1er et 2 ».",
      citationCle:
        "Les équipements de travail suivants doivent avoir fait l'objet, depuis moins de douze mois au moment de leur utilisation, de la vérification générale périodique prévue à l'article R. 233-11 du code du travail : Centrifugeuses ; Machines mobiles d'extraction, de terrassement, d'excavation ou de forage du sol à conducteur porté et machines à battre les palplanches.",
      statut: "obligation_manquante",
      cause: "texte_a_lire",
      toucheLaCible: false,
      motif:
        "Une vérification générale périodique annuelle que le référentiel ne porte pour aucun équipement hors levage. Les deux entrées ne se ressemblent pas et ne se tranchent pas de la même façon. Les « machines mobiles d'extraction, de terrassement, d'excavation ou de forage du sol à conducteur porté et machines à battre les palplanches » sont des engins de travaux publics : un restaurant, un commerce de détail ou un bureau n'en détient pas, et cette moitié de l'article est sans portée pour la cible. LES « CENTRIFUGEUSES » NE SE TRANCHENT PAS À LA SOURCE, ET C'EST ÉCRIT ICI PLUTÔT QUE COMBLÉ : l'arrêté n'en donne aucune définition, ne renvoie à aucune norme et ne restreint le terme à aucune branche — à la différence des « machines à cylindres », qu'il borne expressément à l'industrie du caoutchouc. Rien dans le texte ne permet donc d'affirmer qu'une essoreuse de blanchisserie, une essoreuse à salade professionnelle ou une centrifugeuse de laboratoire en relève, ni qu'elle n'en relève pas. La question reste ouverte au lieu d'être fermée dans un sens ou dans l'autre.",
      bloquePar:
        "Le même manque de catégorie d'équipement qu'à l'article 1er, et par-dessus une question de champ non résolue à la source : ce qu'est une « centrifugeuse » au sens de cet arrêté. Encoder avant de l'avoir tranché produirait soit une obligation qui ne se déclenche jamais, soit une obligation qui se déclenche à tort.",
    },
    {
      ref: "Arrêté 1993-03-05 art. 3",
      intitule: "Contenu de la vérification générale périodique",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679621",
      versionEnVigueur: "1993-12-01",
      // Le texte modificateur a été ouvert EN ENTIER le 2026-09-02
      // (JORFTEXT000000530066, « Arrêté du 4 juin 1993 complétant l'arrêté du
      // 5 mars 1993 […] en ce qui concerne le contenu desdites
      // vérifications »). Il compte trois articles : son art. 1er touche les
      // articles 3, 4 et 5 du présent arrêté, son art. 2 récrit l'article 3
      // ci-dessous, son art. 3 est une clause d'exécution. Rien d'autre n'en
      // sort : il n'ajoute aucun équipement, aucune périodicité, et ne
      // modifie aucun autre texte.
      modifiePar: { texte: "Arrêté du 4 juin 1993 - art. 2" },
      luLe: "2026-09-02",
      lecture: "premiere_main",
      prescrit:
        "Fixe le CONTENU des vérifications des articles 1er et 2, et pose d'abord la règle générale — elles portent sur l'ensemble des éléments dont la détérioration est susceptible de créer un danger — puis la BORNE qui la rend praticable : elles sont « limitées aux parties visibles et aux éléments accessibles par démontage des carters ou capots ». Quatre volets suivent : a) vérification visuelle de l'état physique du matériel (stabilité et fixation des éléments qui pourraient tomber ou être projetés, fixation des éléments de protection, état des matériaux — fissures, déformations, oxydations anormales —, état de propreté, état des filtres et des échappements, état des liaisons et raccordements électriques, hydrauliques et pneumatiques) ; b) vérification des éléments fonctionnels concourant au travail par des essais de fonctionnement (présence et fonctionnement des dispositifs de protection dans tous les modes de fonctionnement, caractéristiques anormales — bruit, vibrations, température, chocs —, fonctionnement des dispositifs d'arrêt automatiques ou à actionnement volontaire, fonctionnement des dispositifs d'arrêt associés à une fonction de protection) ; c) vérification des réglages et des jeux (niveau des fluides, pression d'air et d'huile, état des ressorts notamment dans le freinage et l'embrayage, jeux anormaux dans les organes mécaniques de commande, état des pièces d'usure, réglage des fins de course) ; d) vérification de l'état des indicateurs (appareils de mesure, dispositifs de signalisation). C'est l'équivalent, pour cette branche, de ce que l'article 9 de l'arrêté du 1er mars 2004 est au levage.",
      citationCle:
        "Les vérifications générales périodiques visées aux articles 1er et 2 doivent porter sur l'ensemble des éléments dont la détérioration est susceptible de créer un danger. Ces vérifications, limitées aux parties visibles et aux éléments accessibles par démontage des carters ou capots, sont les suivantes : a) Vérification visuelle de l'état physique du matériel […] b) Vérification des éléments fonctionnels concourant au travail par des essais de fonctionnement […] c) Vérification des réglages et des jeux […] d) Vérification de l'état des indicateurs […]",
      statut: "sans_objet",
      motif:
        "Article de CONTENU, pas d'assujettissement : il dit sur quoi porte la vérification, jamais qui la doit ni quand. Il ne crée donc aucune échéance propre et ne peut fonder aucune obligation à lui seul — même partage des rôles qu'entre l'article 9 (définition) et les articles 22-23 (exigence et rythme) de l'arrêté du 1er mars 2004, où le lot A a dû défaire un fondement posé sur l'article de définition. L'assujettissement est aux articles 1er et 2 ci-dessus. LE 2026-09-02, CE QUI ÉTAIT ANNONCÉ AU FUTUR S'EST PRODUIT, et l'article garde son statut : `compactage-dechets-vgp-trimestrielle` reprend ses quatre volets dans sa `description` et le cite en CONTEXTE (troisième référence), jamais en fondement. L'article 2, lui, reste `obligation_manquante`.",
    },
    {
      ref: "Arrêté 1993-03-05 art. 4",
      intitule: "Date d'application et régime transitoire des presses",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679622",
      versionEnVigueur: "1993-06-15",
      // Même texte modificateur que l'article 3, ouvert en entier le même
      // jour : c'est son article 1er qui a récrit celui-ci, notamment pour
      // reporter au 1er décembre 1993 l'application des articles 1er à 3.
      modifiePar: { texte: "Arrêté du 4 juin 1993 - art. 1" },
      luLe: "2026-09-02",
      lecture: "premiere_main",
      prescrit:
        "Reporte au 1er décembre 1993 l'application des articles 1er, 2 et 3, et maintient jusque-là le régime antérieur des « presses à mouvement alternatif de tous systèmes, mues mécaniquement et utilisées à des travaux automatiques », soumises à visites générales périodiques trimestrielles.",
      citationCle:
        "Les articles 1er, 2 et 3 du présent arrêté sont applicables à compter du 1er décembre 1993. Jusqu'à l'entrée en vigueur de l'article 1er, les presses à mouvement alternatif de tous systèmes, mues mécaniquement et utilisées à des travaux automatiques, doivent continuer à faire l'objet de visites générales périodiques trimestrielles afin que soit décelée en temps utile, de façon qu'il puisse y être porté remède, toute défectuosité susceptible d'occasionner un accident.",
      statut: "sans_objet",
      motif:
        "Disposition transitoire épuisée depuis le 1er décembre 1993 : sa date d'entrée en vigueur est passée et le régime provisoire qu'elle maintenait a pris fin le même jour. Elle est relevée ici, et non omise, parce que le corpus est déclaré `integral` — un article que le produit n'utilise pas se compte quand même, sans quoi « intégral » ne voudrait rien dire. Aucune échéance n'en découle aujourd'hui.",
    },
    {
      ref: "Arrêté 1993-03-05 art. 5",
      intitule: "Clause d'exécution",
      // PAS D'URL D'ARTICLE, ET C'EST UNE RÉPONSE, PAS UN OUBLI. Les
      // identifiants LEGIARTI des articles 1 à 4 ont été relevés un par un
      // sur Légifrance ; celui de l'article 5 n'a pas pu l'être — l'entrée
      // voisine attendue (LEGIARTI000006679623) rend l'article 4. Le
      // verbatim ci-dessous vient de la page consolidée du texte
      // (JORFTEXT000000874070), lue le 2026-09-02. Fabriquer une URL
      // plausible serait exactement la faute que ce corpus existe pour
      // empêcher, et une URL de section serait comptée comme telle par le
      // cliquet de `corpus.test.ts`.
      versionEnVigueur: "2006-08-23",
      // Le décret modificateur a été ouvert EN ENTIER le 2026-09-02
      // (JORFTEXT000000457187). Six articles, tous d'organisation
      // ministérielle : création de la direction générale du travail,
      // abrogation de trois décrets d'organisation, et l'article 5 qui
      // substitue « directeur général du travail » à « directeur des
      // relations du travail » dans TOUTES les dispositions réglementaires —
      // c'est par cette substitution générale qu'il touche l'article
      // ci-dessous. Il ne modifie aucune règle de vérification, aucune
      // périodicité, aucune obligation d'employeur.
      modifiePar: {
        texte: "Décret n° 2006-1033 du 22 août 2006 - art. 5",
        url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000457187/",
      },
      luLe: "2026-09-02",
      lecture: "premiere_main",
      prescrit:
        "Charge le directeur général du travail de l'exécution de l'arrêté et ordonne sa publication au Journal officiel. Aucune prescription à un employeur.",
      citationCle:
        "Le directeur général du travail au ministère du travail, de l'emploi et de la formation professionnelle est chargé de l'exécution du présent arrêté, qui sera publié au Journal officiel de la République française.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "Clause d'exécution : elle s'adresse à un directeur d'administration centrale, pas à un exploitant.",
    },
  ],
};
