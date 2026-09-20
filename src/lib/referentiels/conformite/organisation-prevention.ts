/**
 * Domaine « organisation de la prévention » — `L. 4644-1`, `L. 2311-2`,
 * `L. 1311-2` / `L. 1321-1`.
 *
 * QUI S'OCCUPE DE LA PRÉVENTION, ET SOUS QUELLES INSTANCES. Quatre obligations
 * qui ne parlent ni d'un équipement ni d'un local : elles disent que
 * l'employeur désigne quelqu'un, qu'à partir d'un certain effectif il existe un
 * comité, qu'à partir d'un autre il existe un règlement écrit, et — depuis le
 * 2026-09-04 — qu'il tient la liste des personnes qualifiées qui vérifient ses
 * équipements de travail (`R. 4323-24`).
 *
 * LA QUATRIÈME VIENT D'AILLEURS, ET C'EST DÉLIBÉRÉ. `R. 4323-24` vit dans la
 * sous-section des vérifications périodiques d'équipements de travail, que le
 * corpus `code-travail-levage` porte. Elle est rangée ici parce que la liste
 * est UN document d'établissement couvrant TOUTES les vérifications générales
 * périodiques du parc — levage, presses à balles, compacteurs — et que le
 * domaine sert à grouper ce qu'un dirigeant traite d'un seul geste. La ranger
 * sous « Levage » aurait envoyé au rayon des chariots élévateurs celui qui n'a
 * qu'un compacteur à cartons ; c'est la confusion que le domaine
 * `compactage_dechets` a été créé pour éviter deux jours plus tôt.
 *
 * AUCUNE DES QUATRE N'A DE PÉRIODICITÉ, et aucun des textes n'en écrit une.
 * Ce sont des états à constituer puis à maintenir — `periodicite: "autre"`,
 * suivant le précédent de l'habilitation électrique, passée de `triennale` à
 * `autre` le jour où quelqu'un a ouvert le texte et constaté qu'il ne disait
 * aucune durée. La quatrième tend un piège de plus : le mot « périodiques » qui
 * figure dans son article qualifie les VÉRIFICATIONS générales périodiques,
 * jamais la liste de ceux qui les font.
 *
 * DEUX SEUILS D'EFFECTIF, ÉCRITS AVEC LE MÉCANISME QUI EXISTAIT DÉJÀ.
 * `TypologieApplication.effectifMin` porte les seuils depuis l'ADR-004 et le
 * moteur les évalue en ET (`matching/engine.ts`). Il n'a pas fallu de sixième
 * déclencheur « événement » ni de nouveau type de `ConditionApplication` :
 * `conditions` porte des propriétés d'ÉQUIPEMENT et reste `never` sur le
 * porteur établissement, ce qui est cohérent — un effectif n'est pas une
 * propriété d'équipement.
 *
 * CE QUE LE PRODUIT NE SAIT PAS, ET QUI EST ÉCRIT PLUTÔT QUE SIMULÉ.
 * `L. 2311-2` et `L. 1311-2` datent tous deux leur obligation par une durée —
 * douze mois consécutifs au-dessus de onze salariés pour le CSE, douze mois à
 * compter du franchissement de cinquante pour le règlement intérieur. Le
 * produit ne connaît que l'effectif COURANT : il n'historise pas les
 * variations. La ligne apparaît donc au franchissement constaté, et non à
 * l'échéance des douze mois. C'est une avance, jamais un retard, et le dire
 * vaut mieux que de fabriquer une date d'entrée en obligation depuis un
 * historique qui n'existe pas.
 */

import type { Obligation } from "./types";

export const obligationsOrganisationPrevention: Obligation[] = [
  {
    id: "prevention-etablissement-salarie-designe",
    domaine: "organisation_prevention",
    libelle: "Salarié désigné compétent en protection et prévention",
    description:
      "L'employeur désigne un ou plusieurs salariés compétents pour s'occuper des activités de protection et de prévention des risques professionnels de l'entreprise. Cette désignation s'impose dès le premier salarié, sans condition d'effectif ni de secteur. Le ou les salariés désignés bénéficient d'une formation en matière de santé au travail, dans les conditions prévues pour la formation des membres du comité social et économique. À défaut de compétences internes, l'employeur peut faire appel à un intervenant en prévention des risques professionnels — mais l'obligation reste de désigner.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 4644-1 I (l'employeur désigne un ou plusieurs salariés compétents pour s'occuper des activités de protection et de prévention)",
        article: "L. 4644-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043893856",
        versionConstatee: "2022-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4644-1 (les personnes désignées le sont après avis du comité social et économique s'il existe, et disposent du temps nécessaire et des moyens requis)",
        article: "R. 4644-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483822",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [
      {
        vers: "salarie_designe",
        titre: "formation-securite-salarie-designe-competent",
        motif:
          "L'alinéa 2 du même I fait bénéficier le ou les salariés désignés d'une formation en matière de santé au travail. Le produit ne peut pas savoir qui l'employeur a désigné ; l'employeur le déclare, et le catalogue porte le titre correspondant.",
      },
    ],
    notesInternes:
      "DEUX ACTES DANS UN SEUL ARTICLE, ET UN SEUL EST ENCODÉ ICI. L. 4644-1 I écrit d'abord « l'employeur désigne », puis « le ou les salariés ainsi désignés bénéficient d'une formation ». La désignation est un acte de l'employeur portant sur l'établissement : porteur `etablissement`, une seule ligne, due même si aucun équipement n'est déclaré. La formation, elle, est nominative — elle produit une attestation au nom d'une personne — et relève du porteur salarié.\n\nDEUX OBLIGATIONS, ET LA PREMIÈRE RÉDACTION DE CE LOT N'EN FAISAIT QU'UNE. J'avais d'abord fait porter la formation du désigné par la ligne de catalogue du CSE, au motif que L. 4644-1 renvoie « aux conditions prévues aux articles L. 2315-16 à L. 2315-18 ». La relecture des TROIS articles du renvoi — deux n'avaient pas été ouverts — a montré que ce sont deux actes sous un même régime, et non un seul acte : l'argument complet est dans les notes de `formation-securite-salarie-designe-competent`. Le point décisif est que L. 2315-17 écrit son renouvellement en termes de « représentants » ayant « exercé leur mandat », ce qu'un salarié DÉSIGNÉ n'est ni ne fait. La formation du désigné a donc sa propre ligne, sans condition d'effectif, et la liaison se fait par une `Transmission` — l'usage prévu par l'ADR-024 : nommer ce que l'obligation implique ailleurs, sans le dériver.\n\nCETTE LIGNE ET CELLE DE LA FORMATION PARTAGENT L'ARTICLE FONDATEUR L. 4644-1 — l'alinéa 1 pour la désignation, l'alinéa 2 pour la formation. Le test anti-doublon ne compare que l'article ; la paire est déclarée dans `PAIRES_DECLAREES` avec sa raison.\n\nVERBATIM RELEVÉ SUR LÉGIFRANCE LE 2026-08-31, version en vigueur depuis le 2022-03-31 : « I.-L'employeur désigne un ou plusieurs salariés compétents pour s'occuper des activités de protection et de prévention des risques professionnels de l'entreprise. »\n\nAUCUNE PÉRIODICITÉ. Le texte ne dit ni quand désigner, ni pour combien de temps, ni à quel rythme redésigner. `periodicite: \"autre\"` : un état à constituer et à maintenir.\n\n« À DÉFAUT » N'EST PAS UNE ALTERNATIVE OFFERTE. Les alinéas suivants ouvrent le recours à un intervenant extérieur (IPRP, service de prévention de la caisse, OPPBTP, ANACT) « à défaut, si les compétences dans l'entreprise ne permettent pas d'organiser ces activités ». C'est un second choix conditionné, pas une option équivalente. C'est pourquoi le domaine porte `aucun_tiers_attendu` dans `DOMAINES_PRESTATAIRE_ATTENDUS` : l'obligation est de désigner en interne, et prétendre qu'un prestataire est attendu inverserait l'ordre du texte.\n\nCriticité 3 : le manquement est réel et sanctionnable, mais il n'expose pas directement à un dommage corporel.\n\nNATURE : ÉTAT PERMANENT (ADR-026). La désignation est un acte, mais l'obligation est qu'il y ait à tout moment quelqu'un de désigné — un état. Réserve, non comblée : le départ de la personne désignée rend l'obligation à nouveau due, et ce fait est observable dans le produit sans que rien ne s'en serve. Même réserve que `secours-salarie-secouriste`.",
  },

  {
    id: "prevention-etablissement-cse",
    domaine: "organisation_prevention",
    libelle: "Mise en place du comité social et économique (11 salariés)",
    description:
      "Un comité social et économique est mis en place dans les entreprises d'au moins onze salariés. Sa mise en place n'est obligatoire que si l'effectif d'au moins onze salariés est atteint pendant douze mois consécutifs. Les modalités de calcul de l'effectif sont celles des articles L. 1111-2 et L. 1251-54 du code du travail.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 2311-2 (CSE dans les entreprises d'au moins onze salariés, si l'effectif est atteint pendant douze mois consécutifs)",
        article: "L. 2311-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035609353",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true, effectifMin: 11 },
    porteur: "etablissement",
    transmet: [
      {
        vers: "salarie_designe",
        titre: "formation-securite-salarie-cse-sst",
        motif:
          "L. 2315-18 fait bénéficier chaque membre de la délégation du personnel d'une formation en santé, sécurité et conditions de travail — cinq jours au premier mandat, trois au renouvellement. Le produit ne sait pas qui a été élu ; l'employeur le déclare.",
      },
    ],
    notesInternes:
      "LE SEUIL S'ÉCRIT AVEC LE MÉCANISME QUI EXISTAIT, ET C'ÉTAIT LA QUESTION DU BRIEF. `TypologieApplication.effectifMin` est en place depuis l'ADR-004 et `matching/engine.ts` l'évalue en ET avec le reste. Aucun sixième déclencheur « événement » n'a été créé, aucun nouveau type de `ConditionApplication` non plus — `conditions` porte des propriétés d'ÉQUIPEMENT et vaut `never` sur le porteur établissement, ce qui est cohérent : un effectif n'est pas une propriété d'équipement.\n\nLES DOUZE MOIS CONSÉCUTIFS NE SONT PAS SIMULÉS, ET C'EST DÉLIBÉRÉ. Le texte est en deux temps : le CSE est mis en place « dans les entreprises d'au moins onze salariés », et cette mise en place « n'est obligatoire que si l'effectif d'au moins onze salariés est atteint pendant douze mois consécutifs ». Le second alinéa DATE l'obligation, il ne la fait pas naître — c'est exactement ce qu'écrit `.claude/CLAUDE.md` sur l'absence de déclencheur événementiel. Or le modèle ne porte que l'effectif courant (`Etablissement.effectifSurSite`) : il n'historise aucune variation, donc rien ne permet de calculer la date d'expiration des douze mois. La ligne apparaît au franchissement constaté. C'est une avance sur l'échéance légale, jamais un retard ; l'inverse — attendre douze mois depuis une date qu'on ne connaît pas — aurait fabriqué une échéance depuis un historique inexistant.\n\n« ENTREPRISES », PAS « ÉTABLISSEMENTS ». L. 2311-2 compte l'effectif de l'ENTREPRISE. Le produit raisonne par établissement, et `effectifMin` est évalué sur `effectifSurSite`. Pour une TPE mono-établissement — la cible du produit — les deux coïncident. Pour une entreprise multi-établissements, un dirigeant dont chaque site compte moins de onze personnes mais dont l'entreprise en compte quinze ne verrait pas la ligne : c'est un faux négatif connu, il tient au fait que le seuil du texte ne se lit pas à la maille où le moteur l'évalue, et le corriger supposerait un effectif d'entreprise agrégé que le modèle ne porte pas. Signalé, non comblé.\n\nÀ NE PAS CONFONDRE avec le CSE d'établissement de L. 2313-1 et s., qui suppose une entreprise d'au moins cinquante salariés à établissements distincts — hors de la cible.\n\nCriticité 3 : le défaut de mise en place est un délit d'entrave, mais il n'expose pas directement à un dommage corporel.\n\nNATURE : ÉTAT PERMANENT (ADR-026). L. 2311-2 impose la mise en place, et le CSE une fois en place le reste. Les mandats se renouvellent, mais ce renouvellement n'est pas dans l'article encodé ici, et l'y lire serait déduire.",
  },

  {
    id: "prevention-etablissement-reglement-interieur",
    domaine: "organisation_prevention",
    libelle: "Règlement intérieur — volet santé et sécurité (50 salariés)",
    description:
      "L'établissement d'un règlement intérieur est obligatoire dans les entreprises ou établissements employant au moins cinquante salariés. L'obligation s'applique au terme d'un délai de douze mois à compter de la date à laquelle le seuil a été atteint. Le règlement intérieur fixe exclusivement les mesures d'application de la réglementation en matière de santé et de sécurité, les conditions dans lesquelles les salariés peuvent être appelés à participer au rétablissement de conditions de travail protectrices, et les règles générales et permanentes de discipline.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 1321-1 1° (le règlement intérieur fixe les mesures d'application de la réglementation en matière de santé et de sécurité)",
        article: "L. 1321-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006901432",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 1311-2 (obligation d'établir un règlement intérieur à partir de cinquante salariés, au terme d'un délai de douze mois)",
        article: "L. 1311-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038610176",
        versionConstatee: "2020-01-01",
        note: "Référence de contexte : elle porte le seuil, pas le contenu santé-sécurité.",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "règlement intérieur",
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { travail: true, effectifMin: 50 },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "L'ARTICLE FONDATEUR EST L. 1321-1, PAS L. 1311-2, ET L'ORDRE COMPTE. Le brief citait `L. 1311-2` seul. Ouvert sur Légifrance, cet article dit QUAND un règlement intérieur est dû (cinquante salariés, plus douze mois) mais ne dit rien de son contenu. Ce qui fait entrer le règlement intérieur dans le périmètre de Rojer — qui ne couvre que la santé-sécurité — c'est L. 1321-1 1° : « Le règlement intérieur est un document écrit par lequel l'employeur fixe exclusivement : 1° Les mesures d'application de la réglementation en matière de santé et de sécurité dans l'entreprise ou l'établissement, notamment les instructions prévues à l'article L. 4122-1 ». Verbatim relevé le 2026-08-31, version en vigueur depuis le 2008-05-01.\n\nLa convention d'ordre de `referencesLegales` veut que l'index 0 soit l'article qu'on citerait seul devant un inspecteur pour fonder l'obligation TELLE QUE LE PRODUIT LA PORTE. C'est L. 1321-1. L. 1311-2 suit, en contexte, parce qu'il porte le seuil. Le test anti-doublon compare le fondateur : mettre L. 1311-2 en tête aurait fait porter à l'obligation un article dont le contenu est étranger au périmètre.\n\nCE QUE LE PRODUIT NE COUVRE PAS DE CET ARTICLE : le 3° de L. 1321-1 — discipline et échelle des sanctions — est du droit du travail non-SST, hors périmètre déclaré. L'obligation encodée porte le volet santé-sécurité, et son libellé le dit.\n\nLES DOUZE MOIS, MÊME TRAITEMENT QUE LE CSE. L. 1311-2 alinéa 2 : l'obligation « s'applique au terme d'un délai de douze mois à compter de la date à laquelle le seuil de cinquante salariés a été atteint ». Le produit ne connaît pas cette date. La ligne apparaît au franchissement constaté — en avance sur l'échéance légale, jamais en retard.\n\nCriticité 2 : le manquement est formel. Un règlement intérieur absent n'expose personne directement ; il prive en revanche l'employeur du support par lequel ses consignes de sécurité deviennent opposables.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue: \"règlement intérieur\"` (ADR-026). L'écrit est l'obligation même : L. 1321-1 dit ce que le règlement FIXE, il n'impose aucun acte périodique.",
  },

  {
    id: "prevention-etablissement-liste-personnes-qualifiees",
    domaine: "organisation_prevention",
    libelle:
      "Liste des personnes qualifiées chargées des vérifications générales périodiques",
    description:
      "L'employeur tient à la disposition de l'inspection du travail la liste des personnes qualifiées qui réalisent les vérifications générales périodiques de ses équipements de travail. Ces personnes peuvent appartenir ou non à l'établissement : un salarié formé comme un prestataire extérieur. Le texte ne fixe ni forme ni rythme de mise à jour — ce qui est dû est que la liste existe et soit à jour le jour où elle est demandée.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-24 première phrase (liste des personnes qualifiées tenue à la disposition de l'inspection du travail)",
        article: "R. 4323-24",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531477",
        note: "« Les vérifications générales périodiques sont réalisées par des personnes qualifiées, appartenant ou non à l'établissement, dont la liste est tenue à la disposition de l'inspection du travail. » Article lu en première main le 2026-09-02. La première phrase porte DEUX exigences — qui vérifie, et la liste de ceux qui vérifient. Cette obligation ne porte que la SECONDE ; la première vit dans le `realisateurs: [\"personne_qualifiee\"]` des vérifications générales périodiques elles-mêmes.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-23 (article qui institue la vérification générale périodique et en renvoie la périodicité à des arrêtés)",
        article: "R. 4323-23",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479/",
        note: "CONTEXTE, ET IL DIT L'ASSIETTE : la liste ne se conçoit que par rapport aux vérifications générales périodiques que cet article institue. Deux arrêtés l'instruisent dans le référentiel — celui du 1er mars 2004 (levage) et celui du 5 mars 1993 (presses à balles et compacteurs à déchets) —, et la liste couvre les deux du même mouvement.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "liste des personnes qualifiées",
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { travail: true },
    porteur: "etablissement",
    equipementsEnContexte: [
      "EQUIPEMENT_LEVAGE",
      "COMPACTEUR_PRESSE_DECHETS_MOTORISE",
    ],
    transmet: [],
    notesInternes:
      "ENCODÉE LE 2026-09-04. Le corpus `code-travail-levage` la portait en `obligation_manquante` depuis le 2026-09-02, avec un `bloquePar` qui disait « Rien de technique […] Ce qui manque est l'encodage lui-même ». Il avait raison ; voici l'encodage.\n\nNATURE : ÉTAT PERMANENT (ADR-026), ET LE PIÈGE EST DANS LE MOT « PÉRIODIQUES ». L'article s'appelle par les vérifications générales PÉRIODIQUES, et cette périodicité est celle des VÉRIFICATIONS — annuelle en levage, trimestrielle pour les compacteurs —, pas celle de la liste. Rien, dans le texte, n'impose de refaire la liste à date : ce qui est dû est qu'elle SOIT tenue à disposition. `periodicite: \"autre\"`, donc aucune ligne au calendrier, et une case sur l'écran « Ce qui doit être en place » avec le nom de la pièce. Lui donner un rythme aurait fabriqué une échéance que le texte n'écrit pas.\n\nPOURQUOI LE DOMAINE `organisation_prevention` ET NON `levage`. Parce que la liste est UNE, pour tout l'établissement, et qu'elle couvre toutes les vérifications générales périodiques du parc — l'article ne parle pas de levage, il parle des « équipements de travail soumis à vérification ». La ranger sous « Levage » aurait envoyé au rayon des chariots élévateurs le commerçant qui n'a qu'un compacteur à cartons : c'est exactement la confusion que le domaine `compactage_dechets` a été créé pour éviter le 2026-09-02, et la reproduire ici l'aurait annulée. `organisation_prevention` porte ce que l'employeur met en place autour de la prévention — qui s'en occupe, sous quelles instances, et désormais qui vérifie —, et il porte déjà `aucun_tiers_attendu`, ce qui est juste : personne ne vend la tenue d'une liste.\n\nPOURQUOI LE PORTEUR ÉTABLISSEMENT. Le document est unique. Le faire porter par l'équipement aurait produit une ligne par chariot, par transpalette et par compacteur — autant de listes que d'appareils, pour un seul écrit. `equipementsEnContexte` affiche à titre INDICATIF les deux catégories dont le référentiel sait qu'elles portent une vérification générale périodique ; ce n'est pas un déclencheur, et l'interface accompagne la liste de la mention « non limitative », ce qui est juste : `R. 4323-23` renvoie à des arrêtés dont le référentiel n'a instruit que deux branches.\n\nLA SUR-APPLICATION, NOMMÉE PLUTÔT QUE CACHÉE. La liste n'est due qu'à l'employeur qui détient au moins un équipement soumis à vérification générale périodique. Un porteur établissement ne sait pas poser cette condition (ADR-022 § 4 : une seule ligne, quels que soient les équipements déclarés, y compris aucun). Un bureau qui n'a rien déclaré reçoit donc la case. C'est le sens d'erreur voulu, et il se lit sur les deux branches : la sur-application est visible par celui qui la subit — une case sur un écran, qu'il coche ou ignore, sans coût de tiers — tandis que la sous-application aurait été muette chez le commerçant qui déclare son transpalette sans savoir que la liste va avec. La description dit à qui l'obligation s'adresse, ce qui laisse au dirigeant sans équipement de quoi comprendre qu'elle ne le vise pas.\n\nAUCUNE `Transmission`. La liste nomme des personnes, mais elle ne suppose pas de déclarer un salarié dans le produit : `R. 4323-24` admet expressément des personnes « appartenant ou NON à l'établissement », et le cas ordinaire dans la cible est le prestataire extérieur. Une transmission `salarie_designe` aurait affirmé qu'une personne interne est requise, ce que le texte ne dit pas.\n\nCE QUE CETTE LIGNE NE PORTE PAS : la seconde phrase de l'article — « Ces personnes sont compétentes dans le domaine de la prévention des risques présentés par les équipements de travail soumis à vérification et connaissent les dispositions réglementaires afférentes. » C'est une exigence de fond sur la compétence, qu'aucune déclaration ne peut constater. Elle est nommée dans la réserve du corpus, pas encodée.\n\nCRITICITÉ 2 : le manquement est formel et se corrige en une page. Il a néanmoins un effet réel en contrôle — l'inspection qui demande la liste et ne l'obtient pas met en cause la qualification de tous les vérificateurs du parc.",
  },

  {
    id: "prevention-etablissement-evaluation-chaleur-intense",
    domaine: "organisation_prevention",
    libelle:
      "Risque lié aux épisodes de chaleur intense évalué, et mesures de prévention définies",
    description:
      "L'employeur évalue les risques liés à l'exposition des travailleurs à des épisodes de chaleur intense, en intérieur ou en extérieur. Lorsque l'évaluation identifie un risque d'atteinte à la santé ou à la sécurité des travailleurs, il définit les mesures ou les actions de prévention prévues au III de l'article L. 4121-3-1 — celles que le document unique consigne. Leur réduction se fonde notamment sur les procédés et l'aménagement des postes, l'organisation et les horaires de travail, les moyens contre le rayonnement solaire et l'accumulation de chaleur, l'eau potable fraîche, les équipements de travail et de protection individuelle, l'information et la formation.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4463-2 (évaluation du risque lié aux épisodes de chaleur intense, et définition des mesures du III de L. 4121-3-1)",
        article: "R. 4463-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676927",
        note: "« L'employeur évalue les risques liés à l'exposition des travailleurs à des épisodes de chaleur intense, en intérieur ou en extérieur. Lorsque l'évaluation identifie un risque d'atteinte à la santé ou à la sécurité des travailleurs, l'employeur définit les mesures ou les actions de prévention prévues au III de l'article L. 4121-3-1. » Créé par le décret n° 2025-482 du 27 mai 2025, art. 3. Relu sur la page de l'article le 2026-09-20.",
        versionConstatee: "2025-06-02",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4463-3 (les huit fondements de la réduction du risque)",
        article: "R. 4463-3",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676931",
        note: "CONTEXTE : il ne crée pas d'obligation distincte, il dit sur quoi « se fonde, notamment » la réduction du risque que R. 4463-2 fait définir — huit points, du procédé de travail à la formation. La description de l'obligation les résume sans en ajouter.",
        versionConstatee: "2025-06-02",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "INSTRUIT LE 2026-09-01 (`docs/revues/lot-d3-recoupement-droit.md` § 1), ENCODÉ LE 2026-09-20. C'est l'incident fondateur raconté en tête de `corpus/types.ts` : le décret n° 2025-482 était entré dans le dépôt par `R. 4225-2` (« eau potable et fraîche ») sans que personne remonte à son objet principal — un chapitre entier, `R. 4463-1` à `-8`, qui vise TOUT employeur et nomme l'exposition « en intérieur ». Une cuisine de restaurant en est le cas d'école.\n\nAUCUNE PÉRIODICITÉ, AUCUN SEUIL. Ni cet article ni aucun autre du chapitre n'écrit un rythme ; l'évaluation suit celle du document unique. Aucune température ne figure au code : l'épisode de chaleur intense est défini par arrêté, par référence au dispositif de vigilance de Météo-France (`R. 4463-1` ; l'arrêté du 27 mai 2025 n'a PAS été ouvert ici). Écrire « 33 °C » ou tout autre chiffre serait inventer. D'où `periodicite: \"autre\"` et `nature: \"etat_permanent\"`.\n\n`pieceAttendue: null`, ET C'EST DÉLIBÉRÉ. L'écrit existe — le III de `L. 4121-3-1` fait consigner les actions de prévention dans le document unique pour les entreprises de moins de cinquante salariés — mais cet écrit EST le DUERP, que le produit porte comme module et dont l'obligation est ailleurs. Nommer ici une seconde pièce ferait croire à un document distinct que le texte ne demande pas. L'obligation est un ACTE : évaluer, puis définir.\n\nCE QUE LE PRODUIT NE RELIE PAS. Les référentiels DUERP nomment le risque thermique (`bur-thermique`, `resto-ambiance-thermique`, et `com-chaleur-intense` depuis ce lot), mais rien ne rapproche cette ligne d'un risque effectivement coté dans le document unique du dossier : l'état se DÉCLARE (ADR-027), il ne se déduit pas.\n\nLES MODALITÉS NE SONT PAS DES LIGNES. `R. 4463-4` (eau fraîche en épisode, et un moyen de la maintenir au frais), `-5` (travailleur vulnérable), `-7` (mise en œuvre lors de la survenance) se déclenchent sur un ÉPISODE, que le produit n'observe pas : au corpus en `obligation_manquante`, bloqués par l'absence de surface pour l'événementiel (lot 6a du plan). `R. 4463-6` a sa propre ligne, secours-etablissement-signalement-chaleur-intense.\n\nCriticité 3 : obligation d'évaluation et d'organisation, comme `secours-etablissement-mesures`.",
  },
];
