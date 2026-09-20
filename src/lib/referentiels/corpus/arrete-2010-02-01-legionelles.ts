// Corpus : arrêté du 1er février 2010 — surveillance des légionelles dans les
// installations d'eau chaude sanitaire — et l'article 36 de l'arrêté du 23 juin
// 1978, d'où viennent les températures que le module lui attribuait.
//
// POURQUOI CE FICHIER EXISTE. Le module « Carnet sanitaire » est né le
// 2026-04-24, quatre mois avant la discipline du corpus, et il est « hors
// référentiel » : aucune obligation ne le fonde, donc aucun cliquet
// obligation ↔ corpus ne le voyait. Il citait l'arrêté du 1er février 2010 à
// l'écran sans que personne l'ait ouvert — c'était le dernier arrêté orphelin de
// `citations-ecran` (`PLAFOND_ARRETES = 1`, chantier § 16).
//
// CE QUE LA LECTURE A ÉTABLI, le 2026-09-20.
//   1. LE CHAMP N'EST PAS « tout établissement avec ECS ». Il faut un ERP (ou
//      l'un des établissements nommés), une installation COLLECTIVE, et un point
//      d'usage À RISQUE : accessible au public ET producteur d'aérosols. La
//      cible du produit — restaurant, commerce, bureau — n'y est pas.
//   2. L'ARRÊTÉ NE PORTE AUCUNE TEMPÉRATURE. Les 50 °C et 55 °C viennent de
//      l'article 36 de l'arrêté du 23 juin 1978, et le module les plaçait au
//      mauvais endroit (voir l'entrée). Les 20 °C de l'eau froide ne viennent
//      d'aucun des deux : repère du produit, présenté comme tel.
//   3. 1 000 UFC/L est à l'ARTICLE 4, pas à « l'annexe II », et c'est une
//      « limite de qualité ».
//   4. Les rythmes de l'annexe 2 sont MENSUEL (température) et ANNUEL
//      (légionelles). L'hebdomadaire du module est plus serré que le texte ;
//      `dashboard/obligations.ts` le disait déjà.
//
// DÉCISION DE LA PROPRIÉTAIRE, même jour : aucune obligation n'est encodée. Le
// module reste un outil pour qui est concerné ; la page dit le champ.
//
// LECTURE : `agent_verbatim`. Les textes ont été lus sur Légifrance à travers
// l'outil de récupération, qui en rapporte le verbatim ; il n'a pas été recoupé
// à l'œil. DEUX PASSES, ET LA SECONDE A CORRIGÉ LA PREMIÈRE : la page consolidée
// de l'arrêté d'abord, puis la page PROPRE de chaque article pour les articles
// 1er, 2, 3, 4, 7, l'annexe 2 et l'article 36 de 1978 — la parade du journal des
// vérifications (§ 2.D, pièges 4 à 8). La page consolidée avait rendu l'article
// 2 tronqué. Les articles 5, 6, 8 et l'annexe 1 ne sont lus QUE sur la page
// consolidée : aucun ne fonde quoi que ce soit à l'écran. Le texte modificateur du 30 décembre 2022 a été OUVERT, pas
// seulement nommé (règle de `types.ts`) : il compte SEPT points (le 7° touche
// l'annexe 1), et ceux qui changent le sens sont reportés dans les
// motifs des articles qu'ils touchent.

import type { Corpus } from "./types";

export const ARRETE_2010_02_01_LEGIONELLES: Corpus = {
  id: "arrete-2010-02-01-legionelles",
  intitule:
    "Arrêté du 1er février 2010 relatif à la surveillance des légionelles dans les installations de production, de stockage et de distribution d'eau chaude sanitaire",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000021795143/",
  etendue: "integral",
  portee:
    "Les huit articles et les deux annexes de l'arrêté du 1er février 2010, lus à la source le 2026-09-20 dans leur version au 1er janvier 2023, et son texte modificateur du 30 décembre 2022. S'y ajoute UN article d'un autre texte — l'article 36 de l'arrêté du 23 juin 1978 — parce que le module du carnet sanitaire tient de lui ses deux températures : le reste de cet arrêté-là n'est PAS dépouillé, et son article 1er (champ d'application) n'a pas été ouvert.",
  articles: [
    {
      ref: "Arrêté 01-02-2010 art. 1",
      intitule: "Champ d'application — les installations collectives qui alimentent des points d'usage à risque",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890717/",
      versionEnVigueur: "2023-01-01",
      modifiePar: { texte: "Arrêté du 30 décembre 2022 - art. 1", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046849698" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Borne tout l'arrêté : il ne vise que les installations COLLECTIVES d'eau chaude sanitaire qui alimentent des points d'usage à risque (définis à l'article 2), dans les établissements de santé, sociaux et médico-sociaux, pénitentiaires, les hôtels et résidences de tourisme, les campings et les autres ERP. Exclut les eaux minérales naturelles des établissements thermaux.",
      citationCle:
        "Sans préjudice des dispositions de l'arrêté du 23 juin 1978 susvisé, le présent arrêté fixe les prescriptions techniques applicables aux installations collectives de production, de stockage et de distribution d'eau chaude sanitaire qui alimentent des points d'usage à risque définis à l'article 2 dans les établissements de santé, les établissements sociaux et médico-sociaux, les établissements pénitentiaires, les hôtels et résidences de tourisme, les campings et les autres établissements recevant du public.",
      statut: "sans_objet",
      motif: "Article de champ, qui ne prescrit rien — mais c'est LUI qui décide si le carnet sanitaire de Rojer a quoi que ce soit d'obligatoire à dire. Trois conditions cumulées : être un ERP (ou l'un des établissements nommés), avoir une installation COLLECTIVE d'eau chaude, et que celle-ci alimente au moins un point d'usage à risque. La rédaction « des points d'usage à risque définis à l'article 2 dans » a été DÉPLACÉE, pas créée, par l'arrêté du 30 décembre 2022, ouvert le 2026-09-20 : son 1° a) l'insère après « qui alimentent », et son 1° b) supprime, après « du public », les mots « qui possèdent des points d'usage à risque tels que définis à l'article 2 du présent arrêté ». La condition existait donc dès 2010 pour les « autres établissements recevant du public » — la catégorie de la cible. ~~« avant le 1er janvier 2023 le champ se lisait plus large »~~ : rien ne le soutient pour un restaurant ou un commerce (contre-lecture du même jour) ; la version de 2010 de l'article n'a pas été ouverte. L'écran du module affirmait « obligatoire pour tout établissement avec ECS » : c'est faux trois fois — un établissement de travail seul n'est pas visé, un ERP sans installation collective non plus, ni un ERP dont l'eau chaude n'alimente aucun point d'usage à risque. Ce qu'EST un tel point (un lavabo en est-il un ?) n'est pas tranché par le texte au-delà des deux conditions de l'article 2 : l'écran les cite et ne qualifie pas.",
    },
    {
      ref: "Arrêté 01-02-2010 art. 2",
      intitule: "Définitions — dont celle du point d'usage à risque",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890721/",
      versionEnVigueur: "2023-01-01",
      modifiePar: { texte: "Arrêté du 30 décembre 2022 - art. 1", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046849698" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Définit le point d'usage à risque (accessible au public ET pouvant produire des aérosols d'eau chaude — notamment douches, douchettes, bains à remous ou à jets), les réseaux d'eau chaude sanitaire (alimentés par une production CENTRALISÉE), l'eau chaude sanitaire, le responsable des installations (propriétaire, directeur de l'ERP, ou exploitant par délégation contractuelle), l'analyse de légionelles (NF T90-431) et le prélèvement (FD T 90 522, NF EN ISO 19458).",
      citationCle:
        "point d'usage à risque, tout point d'usage accessible au public et pouvant produire des aérosols d'eau chaude sanitaire susceptible d'être contaminée par les légionelles ; il s'agit notamment des douches, des douchettes, des bains à remous ou à jets",
      statut: "sans_objet",
      motif: "Définitions. Celle du point d'usage à risque porte DEUX conditions cumulées — accessible AU PUBLIC, et producteur d'aérosols — suivies d'exemples : « il s'agit notamment des douches, des douchettes, des bains à remous ou à jets ». C'est elle qui sort la cible de Rojer du champ : un restaurant ou un commerce n'offre en règle générale ni douche ni bain à remous à sa clientèle, et la douche d'un vestiaire du personnel n'est pas « accessible au public ». Le destinataire est nommé avec une précision rare : le responsable des installations « peut être le propriétaire des installations, le directeur de l'établissement recevant du public, ou un exploitant si cette responsabilité lui a été contractuellement déléguée » — trois titulaires possibles, que le produit ne sait pas départager. ~~« L'article ne donne AUCUNE liste d'exemples »~~ : écrit d'abord ici sur la foi de la page CONSOLIDÉE de l'arrêté, qui rendait l'article tronqué après « légionelles » et sans la phrase sur le responsable (piège n° 8 du journal des vérifications, § 2.D). La page propre de l'article, ouverte ensuite le même jour, a rendu le texte entier.",
    },
    {
      ref: "Arrêté 01-02-2010 art. 3",
      intitule: "Surveillance des installations et fichier sanitaire",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890723/",
      versionEnVigueur: "2023-01-01",
      modifiePar: { texte: "Arrêté du 30 décembre 2022 - art. 1", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046849698" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Le responsable des installations surveille ses réseaux d'eau chaude : mesures de température et campagnes d'analyses de légionelles aux fréquences MINIMALES de l'annexe 1 (santé) ou 2 (autres), selon une stratégie d'échantillonnage qu'il élabore ; prélèvements dans les trois semaines précédant l'accueil du public après plusieurs semaines d'inutilisation ; traçabilité dans un « fichier sanitaire des installations » tenu à la disposition du directeur général de l'ARS ; surveillance renforcée en cas d'incident ou à la demande de l'ARS.",
      citationCle:
        "Le responsable des installations assure la traçabilité de cette surveillance. Il consigne les modalités et les résultats de cette surveillance avec les éléments descriptifs des réseaux d'eau chaude sanitaire et ceux relatifs à leur maintenance dans un fichier sanitaire des installations, qui est tenu à disposition du directeur général de l'agence régionale de santé.",
      statut: "non_couvert",
      motif: "Une obligation d'exploitation réelle, avec deux rythmes (annexe 2 : température mensuelle, légionelles annuelles) — que le RÉFÉRENTIEL ne porte pas, par décision du 2026-09-20. Son champ (art. 1 et 2) laisse dehors la cible du produit : restaurant, commerce de détail, bureau. Elle vise des hôtels, campings, salles de sport, établissements de santé, que Rojer accepte sans les viser. Le module « Carnet sanitaire » l'OUTILLE pour qui est concerné — c'est le « fichier sanitaire » de cet article. ~~« sans qu'aucune ligne de calendrier n'en dérive »~~ : FAUX, relevé par la contre-lecture du 2026-09-20. `calendrier/echeances.ts` (`echeanceLegionelles`, source `sourceLegionelles`) inscrit l'analyse suivante à un an de la dernière saisie, et le tableau de bord porte deux cellules — mais seulement pour qui a OUVERT un carnet : c'est une échéance du module, déclenchée par le dirigeant, pas une obligation que le moteur applique. Le RÉFÉRENTIEL, lui, n'en dérive rien, et le produit ne sait pas dire QUI est concerné : il ne connaît ni le caractère collectif de l'installation ni la présence d'un point d'usage à risque. Les encoder demanderait deux attributs d'établissement que personne dans la cible n'aurait à renseigner. « trois semaines » a remplacé « deux » le 1er janvier 2023 (arrêté du 30 décembre 2022, art. 1er, 3°).",
      declareA: "src/app/etablissements/[id]/carnet-sanitaire/page.tsx — le paragraphe « Êtes-vous concerné ? » cite le champ de l'arrêté (art. 1er et 2) et dit ce que Rojer fait : rien tant qu'aucun carnet n'est ouvert, puis un rappel de l'analyse suivante à un an",
    },
    {
      ref: "Arrêté 01-02-2010 art. 4",
      intitule: "Seuils — limite de qualité de 1 000 UFC/L",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890728",
      versionEnVigueur: "2023-01-01",
      modifiePar: { texte: "Arrêté du 30 décembre 2022 - art. 1", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046849698" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Legionella pneumophila doit rester inférieure à 1 000 UFC/L à tous les points d'usage à risque (et sous la limite de détection pour les patients vulnérables des établissements de santé). En cas de dépassement, mesures correctives sans délai, puis prélèvements et analyses pour en vérifier l'efficacité.",
      citationCle:
        "Les dénombrements en Legionella pneumophila doivent être inférieurs à la limite de qualité fixée à 1 000 unités formant colonie par litre au niveau de tous les points d'usage à risque.",
      statut: "non_couvert",
      motif: "Même décision et même champ que l'article 3, dont il est le critère. C'est l'article que le module cite pour son seuil de 1 000 UFC/L — le code l'attribuait à « l'annexe II », qui ne porte que des fréquences, et le nommait « seuil d'action légal » quand le texte dit « limite de qualité » depuis le 1er janvier 2023 (« Objectifs cibles » devient « Seuils », « au seuil » devient « à la limite » : arrêté du 30 décembre 2022, art. 1er, 4°). L'article vise Legionella PNEUMOPHILA ; le module enregistre un dénombrement sans distinguer l'espèce, ce qui est sans conséquence tant que l'utilisateur saisit le résultat que son laboratoire rend pour pneumophila.",
      declareA: "src/app/etablissements/[id]/carnet-sanitaire/page.tsx — le paragraphe « Êtes-vous concerné ? » cite le champ de l'arrêté (art. 1er et 2) et dit ce que Rojer fait : rien tant qu'aucun carnet n'est ouvert, puis un rappel de l'analyse suivante à un an",
    },
    {
      ref: "Arrêté 01-02-2010 art. 5",
      intitule: "Choix des laboratoires — accréditation",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890730",
      versionEnVigueur: "2023-01-01",
      modifiePar: { texte: "Arrêté du 30 décembre 2022 - art. 1", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046849698" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Le responsable des installations fait réaliser prélèvements et analyses par un laboratoire ou organisme accrédité (COFRAC ou équivalent européen ; NF EN ISO/IEC 17025 réputée y satisfaire).",
      citationCle:
        "Le responsable des installations fait réaliser les prélèvements d'eau et les analyses de légionelles par un laboratoire ou un organisme accrédité pour les prélèvements et la recherche des légionelles",
      statut: "sans_objet",
      motif: "Modalité de l'obligation de l'article 3, non une obligation autonome : elle dit PAR QUI l'analyse est faite. Le module ne demande pas le laboratoire ; c'est une donnée du rapport d'analyse, que l'exploitant conserve.",
    },
    {
      ref: "Arrêté 01-02-2010 art. 6",
      intitule: "Prestations des laboratoires",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890732",
      versionEnVigueur: "2023-01-01",
      modifiePar: { texte: "Arrêté du 30 décembre 2022 - art. 1", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046849698" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Fixe la norme d'analyse (NF T90-431), la forme des résultats (UFC/L) et le contenu du rapport d'essai ; met les frais à la charge du responsable des installations ; conservation des souches trois mois quand l'ARS a demandé l'analyse et que les seuils sont dépassés.",
      citationCle:
        "Les frais relatifs aux prélèvements et analyses réalisés en application de l'article 3 sont à la charge du responsable des installations.",
      statut: "sans_objet",
      motif: "~~hors_perimetre / sans_destinataire_exploitant~~ : le statut niait ce que ce motif dit lui-même. S'adresse au laboratoire pour l'essentiel. Deux phrases visent le responsable des installations — demander la conservation des souches, supporter les frais — et ni l'une ni l'autre ne produit d'échéance ni de pièce à tenir.",
    },
    {
      ref: "Arrêté 01-02-2010 art. 7",
      intitule: "Entrée en application, par type d'établissement",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021796731",
      versionEnVigueur: "2010-02-10",
      modifiePar: null,
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Échelonne l'application : 1er juillet 2010 pour la santé et l'hébergement de personnes âgées, 1er janvier 2011 pour hôtels, campings, autres médico-sociaux et prisons, 1er janvier 2012 pour les autres ERP.",
      citationCle:
        "Pour les autres établissements recevant du public, les dispositions du présent arrêté s'appliquent à compter du 1er janvier 2012.",
      statut: "sans_objet",
      motif: "Dispositions transitoires, toutes échues. Aucune ne distingue installations neuves et existantes : l'arrêté s'applique à toute installation du champ.",
    },
    {
      ref: "Arrêté 01-02-2010 art. 8",
      intitule: "Exécution",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000021795143/",
      versionEnVigueur: "2010-02-10",
      modifiePar: null,
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Charge le directeur général de la santé de l'exécution.",
      citationCle:
        "Le directeur général de la santé est chargé de l'exécution du présent arrêté",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
    },
    {
      ref: "Arrêté 01-02-2010 annexe 1",
      intitule: "Fréquences minimales — établissements de santé",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890734",
      versionEnVigueur: "2023-01-01",
      modifiePar: { texte: "Arrêté du 30 décembre 2022 - art. 1", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046849698" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Pour les établissements de santé : température quotidienne (ou en continu) en sortie de production et en retour de boucle, hebdomadaire aux points d'usage ; légionelles annuelles en fond de ballon, aux points d'usage représentatifs ET les plus éloignés, dans les services de patients vulnérables, et en retour de boucle.",
      citationCle:
        "Température de l'eau : 1 fois par jour (ou en continu).",
      statut: "non_couvert",
      motif: "Régime des seuls établissements de santé, hors de la cible et que le produit ne vise pas. C'est pourtant de LUI que vient, vraisemblablement, le rythme hebdomadaire du module (« 1 fois par semaine » aux points d'usage) — que `dashboard/obligations.ts` présente, à raison, comme un seuil retenu par le produit et non comme l'exigence de l'annexe 2.",
      declareA: "src/app/etablissements/[id]/carnet-sanitaire/page.tsx — le paragraphe « Êtes-vous concerné ? » cite le champ de l'arrêté (art. 1er et 2) et dit ce que Rojer fait : rien tant qu'aucun carnet n'est ouvert, puis un rappel de l'analyse suivante à un an",
    },
    {
      ref: "Arrêté 01-02-2010 annexe 2",
      intitule: "Fréquences minimales — hôtels, campings et autres ERP",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021796797",
      versionEnVigueur: "2010-02-10",
      modifiePar: null,
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Pour tous les établissements autres que de santé : température MENSUELLE en sortie de production, aux points d'usage à risque représentatifs (à défaut les plus éloignés) et sur chaque retour de boucle ; légionelles ANNUELLES en fond de ballon, aux mêmes points d'usage et en retour de boucle. Ce sont des fréquences minimales.",
      citationCle:
        "Point(s) d'usage à risque le(s) plus représentatif(s) du réseau ou à défaut le(s) point(s) d'usage le(s) plus éloigné(s) de la production d'eau chaude sanitaire. Analyses de légionelles : 1 fois par an. Température de l'eau : 1 fois par mois.",
      statut: "non_couvert",
      motif: "Les deux seuls rythmes de l'arrêté pour un ERP ordinaire : un mois pour la température, un an pour les légionelles. Le module retient 365 jours pour l'analyse — conforme — et 7 jours pour le relevé, plus serré que le texte et présenté comme tel. Non encodés au référentiel pour la raison dite à l'article 3.",
      declareA: "src/app/etablissements/[id]/carnet-sanitaire/page.tsx — le paragraphe « Êtes-vous concerné ? » cite le champ de l'arrêté (art. 1er et 2) et dit ce que Rojer fait : rien tant qu'aucun carnet n'est ouvert, puis un rappel de l'analyse suivante à un an",
    },
    {
      ref: "Arrêté du 23 juin 1978 art. 36",
      intitule: "Installations de distribution d'eau chaude sanitaire — températures contre la brûlure et contre les légionelles",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006828036",
      versionEnVigueur: "2006-12-15",
      modifiePar: { texte: "Arrêté du 30 novembre 2005 - art. 1", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000423756" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "§ 1, contre la brûlure : 50 °C AU PLUS aux points de puisage des pièces destinées à la toilette, 60 °C au plus ailleurs (90 °C en certains points signalés des cuisines et buanderies d'ERP). § 2, contre les légionelles, sur les réseaux susceptibles d'alimenter des points de puisage à risque (« notamment des douches ») : 50 °C AU MOINS en tout point du système de distribution quand le volume entre mise en distribution et point le plus éloigné dépasse 3 litres, tubes finaux exceptés ; et, quand le stockage atteint 400 litres, 55 °C AU MOINS en permanence à la SORTIE des équipements de stockage — ou une élévation quotidienne suffisante (annexe 1).",
      citationCle:
        "lorsque le volume entre le point de mise en distribution et le point de puisage le plus éloigné est supérieur à 3 litres, la température de l'eau doit être supérieure ou égale à 50 °C en tout point du système de distribution, à l'exception des tubes finaux d'alimentation des points de puisage.",
      statut: "non_couvert",
      declareA:
        "src/components/carnet-sanitaire/AjoutPointReleveForm.tsx — l'aide du seuil cite l'article, ses conditions et son alternative, et présente les valeurs proposées comme des repères",
      motif:
        "~~sans_objet~~ : l'article IMPOSE (« les exigences suivantes doivent être respectées pendant l'utilisation […] et dans les 24 heures précédant »), à qui tient un réseau susceptible d'alimenter des points de puisage à risque. Le référentiel ne le porte pas : exigence permanente sans échéance, sur un fait — la présence de douches — que le produit ne détient pas. C'est LA SOURCE des 50 °C et des 55 °C du module, que son code attribuait à l'arrêté du 1er février 2010 — lequel ne porte aucune température. Deux écarts relevés le 2026-09-20. (1) Le module posait « 50 °C au puisage » comme un MINIMUM : au puisage des pièces de toilette, 50 °C est un MAXIMUM (§ 1) ; le minimum de 50 °C vaut « en tout point du système de distribution », tubes finaux EXCEPTÉS — donc précisément pas au robinet. (2) Il posait 55 °C « au retour de boucle » : le texte le place « à la sortie des équipements » de stockage de 400 litres et plus ; le retour de boucle relève des 50 °C de tout point du réseau. Aucune périodicité ici : c'est une règle de conception et d'exploitation d'installation, d'où le statut. NON TRANCHÉ : le champ dans le temps. L'article 2 de l'arrêté du 30 novembre 2005, ouvert le même jour, fixe la prise d'effet un an après parution (15 décembre 2006) sans distinguer installations neuves et existantes ; l'article 1er de l'arrêté de 1978, qui borne l'ensemble du texte, n'a PAS été ouvert. L'écran présente donc ces deux valeurs comme des repères tirés de cet article, avec ses conditions (réseau pouvant alimenter un point de puisage à risque, plus de 3 litres) et son alternative (élévation quotidienne), pas comme une obligation du dirigeant. L'annexe 1 (durées d'élévation quotidienne) n'est pas reproduite sur Légifrance : non lue.",
    },
  ],
};
