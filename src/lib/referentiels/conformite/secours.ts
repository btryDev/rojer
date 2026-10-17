/**
 * Domaine « premiers secours » — R. 4224-14 à R. 4224-16.
 *
 * TROIS ARTICLES VOISINS, TROIS OBLIGATIONS, DEUX PORTEURS. C'est le cas
 * d'école de l'ADR-022, et le brief du lot 7 était formel : « Écris-en deux,
 * jamais une. » Il y en a trois, parce que le texte en porte trois — le
 * matériel (R. 4224-14), la personne formée (R. 4224-15) et le document
 * d'organisation des secours (R. 4224-16). Les fondre en une ligne « premiers
 * secours » aurait effacé deux des trois : un dirigeant aurait coché « fait »
 * pour une trousse achetée, sans que personne ne soit formé ni qu'aucun
 * document existe.
 *
 * AUCUNE PÉRIODICITÉ. Aucun des trois articles n'écrit de durée — ni pour la
 * vérification de la trousse, ni pour le recyclage du secouriste, ni pour la
 * révision du document. Toutes portent `periodicite: "autre"`.
 *
 * C'est le piège principal de ce domaine, et il est célèbre : le « recyclage
 * SST tous les vingt-quatre mois » que tout le monde cite ne vient pas du Code
 * du travail. C'est le rythme du maintien et de l'actualisation des compétences
 * fixé par le dispositif de l'INRS et de la Caisse nationale d'assurance
 * maladie — une doctrine d'organisme, pas une règle opposable. La composition
 * d'une trousse de secours est dans le même cas. Ce dépôt a déjà retiré un
 * « triennal » d'origine NF ; encoder un « biennal » d'origine INRS serait la
 * même faute avec un autre sigle.
 *
 * LE DÉFIBRILLATEUR, ENTRÉ LE 2026-10-14. Trois lignes de plus, d'un autre
 * code (CCH R. 157-1 à R. 157-4) et pour un autre champ : les ERP des
 * catégories 1 à 4, que la cible accepte depuis le 2026-10-12 (ADR-031).
 * Corpus `cch-defibrillateur`. Une seule des trois porte un rythme, et c'est
 * le défaut annuel déclaré comme tel (ADR-039) : R. 157-4 fait « veille[r] à
 * la mise en œuvre de la maintenance » sans en écrire le rythme.
 *
 * LE 2026-10-15, DEUX DES TROIS PASSENT SUR L'APPAREIL (décision de la
 * propriétaire) : la maintenance et la déclaration Géo'DAE se portent sur la
 * catégorie `DEFIBRILLATEUR`, une ligne par DAE déclaré. La détention reste à
 * l'établissement : elle est due même sans appareil déclaré. C'est la première
 * fois que le domaine `secours` porte une obligation d'équipement.
 */

import type { Obligation } from "./types";

export const obligationsSecours: Obligation[] = [
  {
    id: "secours-etablissement-materiel",
    domaine: "secours",
    libelle: "Matériel de premiers secours sur les lieux de travail",
    description:
      "Les lieux de travail sont équipés d'un matériel de premiers secours adapté à la nature des risques et facilement accessible. Le Code du travail ne dit ni ce que ce matériel contient, ni à quel rythme il se vérifie ou se renouvelle : c'est une obligation de résultat permanente, appréciée au regard des risques de l'établissement.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4224-14 (matériel de premiers secours adapté à la nature des risques et facilement accessible)",
        article: "R. 4224-14",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532205",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "incendie_secours", sous: "secourir" },
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "PORTEUR ÉTABLISSEMENT, UNE SEULE LIGNE, DUE MÊME SANS AUCUN ÉQUIPEMENT DÉCLARÉ. C'est la sémantique exacte de l'ADR-022 : l'obligation vise « les lieux de travail », pas une installation. Un dirigeant qui n'a déclaré ni tableau électrique ni hotte la doit quand même.\n\nAUCUNE PÉRIODICITÉ DE VÉRIFICATION DE LA TROUSSE, ET C'EST VOULU. Le contenu d'une trousse de secours et son contrôle périodique relèvent de recommandations de l'INRS et des services de santé au travail, jamais du Code. Encoder une vérification annuelle ou semestrielle du matériel aurait fabriqué une échéance sans texte — le piège que le brief nommait d'avance, et que ce dépôt a déjà eu à défaire avec un « triennal » d'origine NF.\n\nCE QUI RESTERAIT À FAIRE POUR ALLER PLUS LOIN : le contenu adapté « à la nature des risques » pourrait se rapprocher du DUERP, qui les liste. Aucun mécanisme ne le fait, et ce lot n'en crée pas — ce serait une dérivation, et il faudrait qu'elle soit arbitrée.\n\nNATURE : ÉTAT PERMANENT (ADR-026). La description le nomme déjà « obligation de résultat permanente ». `pieceAttendue` est nulle : le texte exige du matériel, pas un document.",
  },

  {
    id: "secours-salarie-secouriste",
    domaine: "secours",
    libelle: "Membre du personnel formé au secourisme (SST)",
    description:
      "Un membre du personnel reçoit la formation de secouriste nécessaire pour donner les premiers secours en cas d'urgence dans chaque atelier où sont accomplis des travaux dangereux, et sur chaque chantier employant au moins vingt travailleurs pendant plus de quinze jours où sont réalisés des travaux dangereux. Les travailleurs ainsi formés ne peuvent pas remplacer des infirmiers. Le Code du travail ne fixe aucune durée de validité à cette formation : le recyclage tous les vingt-quatre mois souvent cité relève du dispositif de l'INRS et de l'assurance maladie, non de la réglementation.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4224-15 (membre du personnel formé au secourisme dans chaque atelier où sont accomplis des travaux dangereux)",
        article: "R. 4224-15",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532203",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "ponctuelle",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { travail: true },
    porteur: "salarie",
    exclut: [],
    pieceMedicale: false,
    transmet: [],
    notesInternes:
      "PORTEUR SALARIÉ, ET C'EST CE QUI REND L'OBLIGATION SÛRE. R. 4224-15 est conditionnel : il ne s'applique qu'aux établissements comportant « un atelier où sont accomplis des travaux dangereux », ou à certains chantiers. Le produit ne détient pas cette qualification — ni le parc d'équipements ni le code NAF ne la donnent, et la déduire serait le cinquième déclencheur, non implémenté. Avec un porteur établissement, il aurait fallu choisir entre afficher la ligne à tout le monde (faux positif chez un bureau sans atelier) ou à personne. Le porteur salarié tranche autrement : aucune ligne tant qu'aucun titre n'est déclaré, et une ligne exacte dès que le dirigeant en déclare un.\n\nPAS DE RECYCLAGE BIENNAL, MÊME S'IL EST PARTOUT. Le « MAC SST tous les vingt-quatre mois » vient du dispositif INRS/CNAM de maintien et d'actualisation des compétences. Le Code du travail écrit seulement « reçoit la formation de secouriste nécessaire » — verbatim relevé le 2026-08-31, aucune durée. `periodicite: \"autre\"` et `TitreSalarie.echeanceLe` nullable : l'employeur qui connaît l'échéance de son certificat SST la saisit, l'outil ne l'invente pas. C'est exactement la règle appliquée à l'habilitation électrique.\n\nQUI FORME ? Le Code ne le dit pas. `realisateurs: [\"exploitant\"]` au sens « il incombe à l'employeur d'y pourvoir » ; l'habilitation INRS du formateur SST est un dispositif conventionnel, et l'inscrire comme exigence légale ferait passer une pratique pour du droit. Le domaine `secours` attend malgré tout un organisme de formation à l'annuaire, ce qui est le constat pratique sans être une exigence du texte.\n\n`pieceMedicale: false` — un certificat de sauveteur secouriste du travail atteste d'une compétence, pas d'un état de santé. L'interface peut donc en proposer la trace sans restriction particulière.\n\nNATURE : PONCTUELLE (ADR-026). Le Code ne donne aucune durée de validité à la formation : le titre est acquis une fois. RÉSERVE, non comblée ici : l'article vise l'existence d'« un membre du personnel formé », donc le départ de la personne formée rend l'obligation à nouveau due. Ce fait — une sortie d'effectif — est observable par le produit (`Salarie.actif`), et rien ne s'en sert. Ce n'est pas un défaut de nature, c'est un rapprochement qui n'est pas fait.",
  },

  {
    id: "secours-etablissement-mesures",
    domaine: "secours",
    libelle:
      "Mesures d'organisation des premiers secours, consignées par écrit",
    description:
      "En l'absence d'infirmiers, ou lorsque leur nombre ne permet pas une présence permanente, l'employeur prend, après avis du médecin du travail, les mesures nécessaires pour assurer les premiers secours aux accidentés et aux malades. Ces mesures sont prises en liaison notamment avec les services de secours d'urgence extérieurs à l'entreprise et adaptées à la nature des risques. Elles sont consignées dans un document tenu à la disposition de l'agent de contrôle de l'inspection du travail.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4224-16 (mesures prises après avis du médecin du travail, consignées dans un document tenu à disposition de l'inspection du travail)",
        article: "R. 4224-16",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043128580",
        versionConstatee: "2021-02-13",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "document d'organisation des premiers secours",
    usageEcran: { groupe: "incendie_secours", sous: "secourir" },
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [
      {
        vers: "salarie_designe",
        titre: "secours-salarie-secouriste",
        motif:
          "Les mesures d'organisation des premiers secours n'ont de contenu que si quelqu'un est en mesure de les appliquer. R. 4224-15 impose un membre du personnel formé au secourisme dans les ateliers où sont accomplis des travaux dangereux ; le produit ne peut pas savoir qui l'est, l'employeur le déclare.",
      },
    ],
    notesInternes:
      "LA PLUPART DES TPE SONT CONCERNÉES SANS LE SAVOIR : la condition de l'article est l'ABSENCE d'infirmiers, ce qui est le cas ordinaire d'une entreprise de moins de cinquante personnes. Ce n'est donc pas une obligation d'exception, c'est la règle générale pour la cible du produit.\n\nCE QUE L'OUTIL NE SAIT PAS SOLDER. L'article exige un DOCUMENT « tenu à la disposition de l'agent de contrôle de l'inspection du travail ». Le produit n'offre ici qu'un dépôt de fichier là où le texte attend un écrit structuré — même configuration que R. 4227-39 pour le registre des exercices d'évacuation. Aucune transmission `modele_absent` n'est déclarée : `docs/registre-securite-ecart.md` recense les modèles manquants sous des noms précis, et en inventer un ici sans avoir vérifié sa nomenclature créerait une référence fantôme. C'est signalé au rapport du lot 7 comme un point à instruire, pas comme une décision prise.\n\n« APRÈS AVIS DU MÉDECIN DU TRAVAIL » : condition de bonne exécution que l'outil ne trace pas, comme l'association du médecin à la formation (R. 4141-6). Aucun champ ne la porte.\n\nVERSION À SURVEILLER : l'article a été modifié par le décret n° 2021-143 du 10 février 2021, en vigueur au 13 février 2021 — c'est le seul des trois articles de la section qui ait bougé depuis 2008.\n\nCriticité 3 : le manquement porte sur une organisation et sa formalisation, pas directement sur l'absence de moyens de secours (R. 4224-14) ou de personne formée (R. 4224-15).\n\nLE MODÈLE MANQUANT EST DÉSORMAIS NOMMÉ AUTREMENT (ADR-026). Le paragraphe ci-dessus refuse de déclarer une transmission `modele_absent` faute de nomenclature, et il a raison : `docs/registre-securite-ecart.md` est un écart du REGISTRE DE SÉCURITÉ INCENDIE, sa table des modèles manquants ne porte rien qui couvre le document de R. 4224-16, et y inventer une entrée serait la référence fantôme qu'il redoute. Vérifié le 2026-08-31, les huit modèles de son § 6 lus un à un. Le manque est maintenant porté par `pieceAttendue`, qui nomme l'écrit que le TEXTE exige sans rien préjuger du modèle Prisma qui le porterait : la donnée est lisible par une machine, et aucune référence n'est inventée.",
  },

  {
    id: "secours-etablissement-signalement-chaleur-intense",
    domaine: "secours",
    libelle:
      "Chaleur intense : modalités de signalement (indice physiologique préoccupant, malaise, détresse) et de secours, portées à la connaissance des travailleurs et communiquées au service de prévention et de santé au travail",
    description:
      "L'employeur définit les modalités de signalement de toute apparition d'indice physiologique préoccupant, de situation de malaise ou de détresse, ainsi que celles destinées à porter secours, dans les meilleurs délais, à tout travailleur et, plus particulièrement, aux travailleurs isolés ou éloignés. Elles sont portées à la connaissance des travailleurs et communiquées au service de prévention et de santé au travail.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4463-6 (modalités de signalement et de secours, portées à la connaissance des travailleurs et communiquées au service de prévention et de santé au travail)",
        article: "R. 4463-6",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676937",
        note: "« L'employeur définit les modalités de signalement de toute apparition d'indice physiologique préoccupant, de situation de malaise ou de détresse, ainsi que celles destinées à porter secours, dans les meilleurs délais, à tout travailleur et, plus particulièrement, aux travailleurs isolés ou éloignés. Elles sont portées à la connaissance des travailleurs et communiquées au service de prévention et de santé au travail. » Créé par le décret n° 2025-482 du 27 mai 2025, art. 3. Relu sur la page de l'article le 2026-09-20.",
        versionConstatee: "2025-06-02",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "incendie_secours", sous: "secourir" },
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "LE SECOND ALINÉA AVAIT ÉCHAPPÉ À LA PREMIÈRE LECTURE. L'instruction du 2026-09-01 résumait l'article à « définit les modalités de signalement » ; la page de SECTION du code le rend d'ailleurs tronqué à cette seule proposition. La page propre de l'article, ouverte le 2026-09-20, porte deux choses de plus : les modalités « destinées à porter secours », et un second alinéa — « portées à la connaissance des travailleurs et communiquées au service de prévention et de santé au travail ». Le libellé les dit — les TROIS signaux, les secours, et les deux destinataires du second alinéa ; sa première écriture réduisait le tout à « un malaise » et oubliait le service de santé au travail (contre-lecture du 2026-09-20).\n\n`pieceAttendue: null`. Le texte fait DÉFINIR, FAIRE CONNAÎTRE et COMMUNIQUER ; il ne nomme ni registre, ni consigne, ni document tenu à disposition — à la différence de `R. 4224-16`, son voisin de domaine, qui exige « un document ». Nommer une pièce ici ferait passer une bonne pratique pour du droit.\n\nPLACÉE SOUS LE CHAPITRE « CHALEUR INTENSE », ET BORNÉE PAR LUI. L'article ne répète pas la condition, mais il vit dans la section « Mesures de prévention » du chapitre III du titre VI : c'est une mesure de prévention du risque chaleur, pas une obligation générale de signalement des malaises. Le libellé garde donc « en cas de chaleur intense ».\n\nAUCUNE PÉRIODICITÉ, d'où `autre` et `etat_permanent`. Criticité 3, celle de `secours-etablissement-mesures`.",
  },

  {
    id: "dae-erp-detention",
    domaine: "secours",
    libelle:
      "Défibrillateur automatisé externe détenu, visible, accessible en permanence et signalé (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Un établissement recevant du public de la 1ʳᵉ à la 4ᵉ catégorie détient un défibrillateur automatisé externe. L'appareil est installé dans un emplacement visible du public, facilement accessible et utilisable en permanence par toute personne présente ; installé à l'extérieur, il est protégé par un boîtier contre les intempéries. Une affiche le signale à chaque entrée, des affiches indiquent son emplacement et le chemin pour y accéder, et une étiquette visible et à jour est apposée sur le boîtier ou à proximité immédiate. Plusieurs établissements d'un même site, ou sous une direction commune, peuvent partager un même appareil.",
    referencesLegales: [
      {
        source: "CCH",
        reference:
          "R. 157-1, 1° (obligation de détenir un défibrillateur automatisé externe dans les ERP des catégories 1 à 4)",
        article: "CCH R. 157-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052997831",
        note: "« Sont soumis à l'obligation de détenir un défibrillateur automatisé externe, les établissements recevant du public qui relèvent : 1° Des catégories 1 à 4 mentionnées à l'article R. 143-19 ; […] » Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version en vigueur du 2025-12-07 (décret n° 2025-1167). Le 2°, propre à la 5ᵉ catégorie, n'est pas encodé : voir la réserve du corpus.",
        versionConstatee: "2025-12-07",
      },
      {
        source: "CCH",
        reference:
          "R. 157-2 (emplacement visible du public et en permanence facile d'accès ; signalétique renvoyée à un arrêté)",
        article: "CCH R. 157-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819227",
        note: "« Le défibrillateur automatisé externe est installé dans un emplacement visible du public et en permanence facile d'accès. Un arrêté conjoint du ministre chargé de la santé et du ministre chargé des collectivités territoriales en prévoit la signalétique […]. » Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2021-07-01.",
        versionConstatee: "2021-07-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 29 octobre 2019 relatif aux défibrillateurs automatisés externes et à leurs modalités de signalisation dans les lieux publics et les établissements recevant du public, art. 2 (affiche à chaque entrée, fléchage, étiquette sur le boîtier)",
        article: "Arrêté 2019-10-29 DAE signalisation art. 2",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000039364652",
        note: "Les propriétaires d'ERP exploitants d'un DAE sont tenus « 1° d'apposer une affiche de signalisation, visible à chaque entrée de l'établissement, conformément au modèle 1 de l'annexe 1 du présent arrêté ; 2° d'indiquer l'emplacement et le chemin d'accès au défibrillateur automatisé externe à l'aide des affiches de signalisation conformes aux modèles 2, 3 et 4 […] ; 3° d'apposer sur le boîtier ou à proximité immédiate de l'appareil une étiquette conforme au modèle de l'annexe 3 du présent arrêté. […] Les informations y figurant sont mises à jour. » Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2019-11-14.",
        versionConstatee: "2019-11-14",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 29 octobre 2019 relatif aux défibrillateurs automatisés externes et à leurs modalités de signalisation dans les lieux publics et les établissements recevant du public, art. 3 (emplacement accessible, utilisation permanente, boîtier extérieur)",
        article: "Arrêté 2019-10-29 DAE signalisation art. 3",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000039364654",
        note: "« Le défibrillateur automatisé externe est installé dans un emplacement facilement accessible et permettant son utilisation permanente par toute personne présente dans l'enceinte de l'établissement. Le défibrillateur automatisé externe installé à l'extérieur de l'établissement est muni d'un boitier assurant sa protection contre les intempéries […]. » Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2019-11-14.",
        versionConstatee: "2019-11-14",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "incendie_secours", sous: "secourir" },
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    porteur: "etablissement",
    transmet: [],
    relectureDue: {
      le: "2027-01-14",
      motif:
        "Le 2° de R. 157-1 (5ᵉ catégorie, familles a à h) renvoie à un arrêté fixant « un nombre minimal de personnes », non publié au JORF au 2026-10-14. Chercher sa publication ; s'il est paru, instruire le seuil, la condition d'implantation de plus de trois mois et l'extension de cette ligne et de ses deux sœurs (décision de la propriétaire du 2026-10-14, Q4).",
    },
    notesInternes:
      "ENTRÉE LE 2026-10-14, DÉCISION DE LA PROPRIÉTAIRE (« c'est un gros manque »). Le DAE avait été écarté le 2026-09-01 (`docs/revues/lot-d3-recoupement-droit.md` § 3) parce que la cible était la 5ᵉ catégorie seule ; le même paragraphe annonçait qu'il deviendrait « dû sans condition » si les catégories 1 à 4 s'ouvraient. Elles sont dans la cible depuis le 2026-10-12 (ADR-031).\n\nUNE LIGNE POUR TROIS TEXTES (décision Q2 de la propriétaire, option a). R. 157-1 fait détenir, R. 157-2 fixe l'emplacement et renvoie lui-même la signalétique à l'arrêté du 29 octobre 2019 : l'article rattache la signalisation à l'emplacement, et un seul appareil ne se déclare qu'une fois « en place ». Deux lignes auraient demandé deux déclarations pour un même objet au mur.\n\nPORTEUR ÉTABLISSEMENT, ET LE TEXTE NOMME LE PROPRIÉTAIRE. L'installation incombe aux « propriétaires des établissements recevant du public » (décret n° 2018-1186, art. 2, calendrier 2020-2022, non codifié) et la signalétique aux mêmes « propriétaires […] exploitants des défibrillateurs » (arrêté, art. 2). Le produit ne distingue pas le propriétaire de l'exploitant, et c'est le seul point commun avec les ascenseurs, que le CCH met aussi à la charge du propriétaire sans que le produit sépare les deux. L'analogie s'arrête là : toutes les lignes `ascenseur-*` sont portées par l'ÉQUIPEMENT déclaré, celle-ci par l'établissement, parce qu'elle naît de la catégorie d'ERP et non d'un appareil (voir plus bas). L'obligation pèse sur l'établissement — il doit y avoir un DAE —, et c'est le dirigeant qui saura qui l'a acheté.\n\nÉTAT PERMANENT, SANS RYTHME. Ni R. 157-1, ni R. 157-2, ni l'arrêté n'écrivent d'acte à refaire : l'appareil est là, visible, accessible et signalé, ou il ne l'est pas. La maintenance, elle, revient — elle a sa ligne, `dae-erp-maintenance`.\n\nMISE EN COMMUN (R. 157-3, sans objet au corpus). Un établissement qui partage le DAE d'un voisin du même site ou de la même direction en détient un au sens de R. 157-1 : il déclare cette ligne « en place », sans ligne propre.\n\n~~AUCUNE CATÉGORIE D'ÉQUIPEMENT. Le parc ne connaît pas de « défibrillateur », et il n'en faut pas :~~ [2026-10-15, rayé — décision de la propriétaire, `lot/dae-materiel-1015` : la catégorie `DEFIBRILLATEUR` existe, et la maintenance et la déclaration Géo'DAE s'y portent, une ligne par appareil. CETTE LIGNE-CI RESTE PORTÉE PAR L'ÉTABLISSEMENT, pour la raison qui suit, inchangée :] l'obligation naît de la catégorie d'ERP, pas d'un appareil déclaré (ADR-022) — c'est l'absence d'appareil qui est le manquement. L'accrocher à un équipement ferait disparaître la ligne chez celui qui n'en a pas. La catégorie sert ici d'adresse : la section « Équipements de sécurité » de la page Équipements dit si un appareil est déclaré, et propose de l'ajouter s'il ne l'est pas.\n\nCE QUI N'EST PAS ENCODÉ, et pourquoi. (1) Le 2° de R. 157-1, propre à la 5ᵉ catégorie : l'arrêté du seuil n'est pas publié et la condition « plus de trois mois » n'a pas d'attribut — réserve du corpus, `relectureDue` au 2027-01-14. (2) Le détail graphique des affiches (modèles des annexes) : il dit à quoi ressemble la signalisation, pas une obligation de plus.",
  },

  {
    id: "dae-erp-maintenance",
    domaine: "secours",
    libelle:
      "Maintenance du défibrillateur automatisé externe et de ses accessoires (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Le propriétaire du défibrillateur veille à la maintenance de l'appareil et de ses accessoires, ainsi qu'aux contrôles de qualité prévus pour les dispositifs médicaux. La maintenance est réalisée par le fabricant ou sous sa responsabilité, par un fournisseur de tierce maintenance ou, si le propriétaire n'est pas l'exploitant, par l'exploitant lui-même. Le texte n'écrit aucun rythme : Rojer retient par défaut au moins une maintenance par an. La date de la prochaine maintenance figure sur l'étiquette du boîtier.",
    referencesLegales: [
      {
        source: "CCH",
        reference:
          "R. 157-4 (maintenance du défibrillateur et de ses accessoires, et contrôles de qualité, à la charge de son propriétaire)",
        article: "CCH R. 157-4",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053925011",
        note: "« Le propriétaire du défibrillateur veille à la mise en œuvre de la maintenance du défibrillateur et de ses accessoires et des contrôles de qualité prévus pour les dispositifs médicaux qu'il exploite. La maintenance est réalisée soit par le fabricant ou sous sa responsabilité, soit par un fournisseur de tierce maintenance, soit, si le propriétaire n'est pas l'exploitant, par l'exploitant lui-même conformément aux dispositions de l'article R. 5212-16 du code de la santé publique. » Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version en vigueur du 2026-04-22 (décret n° 2026-299, art. 2).",
        versionConstatee: "2026-04-22",
      },
      {
        source: "CCH",
        reference:
          "R. 157-1, 1° (ERP des catégories 1 à 4 soumis à l'obligation de détenir un défibrillateur)",
        article: "CCH R. 157-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052997831",
        note: "Le champ de la ligne : un défibrillateur n'est maintenu au titre de R. 157-4 que s'il est détenu au titre de R. 157-1. Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2025-12-07.",
        versionConstatee: "2025-12-07",
      },
    ],
    periodicite: "autre",
    rythmeRetenu: {
      motif: "defaut_annuel",
      periodicite: "annuelle",
      texteVague: "veille à la mise en œuvre de la maintenance",
    },
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["fabricant", "exploitant"],
    criticite: 4,
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    // 2026-10-15, décision de la propriétaire : une ligne par appareil.
    porteur: "equipement",
    categoriesEquipement: ["DEFIBRILLATEUR"],
    transmet: [],
    notesInternes:
      "ENTRÉE LE 2026-10-14, DÉCISION DE LA PROPRIÉTAIRE. Voir `dae-erp-detention` pour l'historique du DAE au référentiel.\n\nRYTHME RETENU PAR DÉFAUT (ADR-039 (b)). R. 157-4 fait « veille[r] à la mise en œuvre de la maintenance » sans rythme, et ne renvoie à aucun arrêté pour en fixer un. Rien ailleurs n'en écrit, vérifié le 2026-10-14 : ni le code de la santé publique réécrit au 2026-04-22 (R. 5212-14 à R. 5212-18 renvoient la liste des dispositifs soumis à maintenance et la périodicité des contrôles de qualité à des décisions du directeur général de l'ANSM — non lues, elles sont sur le site de l'Agence et pas sur Légifrance), ni l'arrêté du 3 mars 2003, qui ne nomme pas le DAE. L'étiquette de l'arrêté du 29 octobre 2019 (annexe 3) porte une « Date de la prochaine maintenance » : le texte suppose une maintenance qui revient, sans la dater. Rojer retient au moins une fois par an, affiché comme défaut. Si une décision de l'ANSM chiffre un jour la maintenance du DAE, elle l'emporte (rythme écrit).\n\n~~PORTEUR ÉTABLISSEMENT,~~ [2026-10-15 : PORTEUR ÉQUIPEMENT, décision de la propriétaire, `lot/dae-materiel-1015` — une ligne par défibrillateur déclaré, catégorie `DEFIBRILLATEUR`. L'identifiant est gardé, et la perte de continuité est ACCEPTÉE PAR ÉCRIT (`succession-porteurs.test.ts`) : la ligne est entrée au référentiel le 2026-10-14 et a atteint `main` le 2026-10-15 (PR #41, 05ac9f60) ; une ligne d'établissement déjà générée est archivée ou supprimée par la réconciliation, et chaque DAE déclaré reçoit la sienne, « à planifier ». La propriétaire l'a décidé en sachant que ces lignes n'avaient pas de vie en production à préserver.] ET LE TEXTE NOMME LE PROPRIÉTAIRE DU DAE. Ce n'est pas toujours l'exploitant de l'ERP — un appareil loué, ou mis en commun au titre de R. 157-3, a un autre propriétaire. Le produit ne distingue pas le propriétaire de l'exploitant — seul point commun avec les ascenseurs. ~~Celle-ci est portée par l'établissement, comme sa sœur `dae-erp-detention` : le parc ne connaît pas de défibrillateur, c'est chez l'établissement que l'appareil doit fonctionner, et c'est lui qui saura qui le fait maintenir.~~ [2026-10-15, rayé : la catégorie existe ; la maintenance s'attache à l'appareil qu'elle maintient, et chaque DAE a son étiquette « Date de la prochaine maintenance » (arrêté du 29 octobre 2019, annexe 3).] Les typologies restent bornées aux ERP des catégories 1 à 4 : un DAE déclaré ailleurs ne reçoit pas cette ligne, le 2° de R. 157-1 n'étant pas encodé.\n\nRÉALISATEURS `fabricant` ET `exploitant`. Le texte en nomme trois : le fabricant (ou sous sa responsabilité), un fournisseur de tierce maintenance, et l'exploitant « si le propriétaire n'est pas l'exploitant ». L'énumération `Realisateur` n'a pas de valeur pour le tiers mainteneur, et en créer une demanderait une migration pour un seul usage : il n'est pas nommé, et la description le cite. `exploitant` présent, `supposeUnTiers()` reste faux : aucune alerte d'annuaire, et `DOMAINES_PRESTATAIRE_ATTENDUS.secours` n'a pas à changer.\n\nLE RENVOI À R. 5212-16, UNE LECTURE. Depuis le décret n° 2026-299, R. 157-4 renvoie à « R. 5212-16 » du code de la santé publique, qui traite des décisions de l'ANSM sur le contrôle de qualité ; le texte de l'ancien R. 5212-25 (« l'exploitant veille à la mise en œuvre de la maintenance… ») est désormais au R. 5212-14, et le même décret a remplacé ailleurs « R. 5212-25 » par « R. 5212-14 ». Que le renvoi de R. 157-4 soit une erreur est une lecture : la référence citée est celle du texte, rien n'est corrigé sur cette base.\n\nÉTAT PERMANENT AU RYTHME RETENU : la ligne quitte « Ce qui doit être en place » pour le calendrier (`estEtatADeclarer`), comme `signalisation-etablissement-entretien` — et, depuis le 2026-10-15, une ligne annuelle par appareil.\n\nNOTICE DU FABRICANT PLUS SERRÉE (2026-10-16, décision de la propriétaire, option (a)). L'option « source Notice du fabricant marquée non légale (ADR-032) » est écartée pour l'instant, et l'aide de la catégorie ne renvoie plus aux Prescriptions : une notice n'est pas un acte, et une prescription de source « autre » arriverait au calendrier sans la mention « pas une obligation légale » — la règle « rien qui ne soit pas légal » s'applique. L'aide garde seulement « suivez la notice du fabricant si elle en demande une plus fréquente ». Le mécanisme de renforcement (`renforce_periodicite`) s'applique bien à cette ligne, portée par l'appareil (`matching/dae.test.ts`).",
  },

  {
    id: "dae-erp-declaration-geodae",
    domaine: "secours",
    libelle:
      "Défibrillateur automatisé externe déclaré à la base de données nationale (Géo'DAE) (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "L'exploitant du défibrillateur — au sens de l'arrêté, son propriétaire — transmet à la base de données nationale les informations relatives au lieu d'implantation et à l'accessibilité de l'appareil : localisation, accès et horaires, état de fonctionnement, fabricant, modèle, numéro de série, date de la dernière maintenance, coordonnées de l'exploitant. Le texte n'écrit pas de rythme de mise à jour.",
    referencesLegales: [
      {
        source: "DECRET",
        reference:
          "Décret n° 2018-1259 du 27 décembre 2018 relatif à la base de données nationale des défibrillateurs automatisés externes, art. 2 (transmission des informations par les exploitants)",
        article: "Décret 2018-1259 art. 2",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000037973080",
        note: "« Les exploitants des défibrillateurs automatisés externes transmettent les informations relatives aux lieux d'implantation et à l'accessibilité de leurs appareils au gestionnaire de la base de données désigné par le présent décret, à compter des dates mentionnées à l'article 2 du décret du 19 décembre 2018 susvisé. » Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2018-12-29.",
        versionConstatee: "2018-12-29",
      },
      {
        source: "CSP",
        reference:
          "L. 5233-1 (base de données nationale des lieux d'implantation et de l'accessibilité des défibrillateurs)",
        article: "CSP L. 5233-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037118534",
        note: "« Il est créé une base de données nationale relative aux lieux d'implantation et à l'accessibilité des défibrillateurs automatisés externes sur l'ensemble du territoire, constituée au moyen des informations fournies par les exploitants de ces appareils […]. » Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2018-06-30.",
        versionConstatee: "2018-06-30",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 29 octobre 2019 relatif au fonctionnement de la base de données nationale des défibrillateurs automatisés externes (DAE), art. 3 et annexe 1 (informations obligatoirement transmises par l'exploitant)",
        article: "Arrêté 2019-10-29 DAE base nationale art. 3",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000039364770",
        note: "Art. 3 : « l'annexe 1 précise les informations qui devront être obligatoirement transmises par l'exploitant du défibrillateur ». Annexe 1, champ `expt_rais` : « L'exploitant est le propriétaire du DAE, seul responsable de la déclaration sur la base ». Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2020-01-01.",
        versionConstatee: "2020-01-01",
      },
      {
        source: "CCH",
        reference:
          "R. 157-1, 1° (ERP des catégories 1 à 4 soumis à l'obligation de détenir un défibrillateur)",
        article: "CCH R. 157-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052997831",
        note: "Le champ de la ligne : l'appareil déclaré est celui que R. 157-1 fait détenir. Relu le 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2025-12-07.",
        versionConstatee: "2025-12-07",
      },
    ],
    // 2026-10-15, décision de la propriétaire : un acte par appareil, à faire
    // une fois — une ligne « à planifier » par DAE déclaré.
    periodicite: "mise_en_service_uniquement",
    nature: "ponctuelle",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    porteur: "equipement",
    categoriesEquipement: ["DEFIBRILLATEUR"],
    transmet: [],
    notesInternes:
      "ENTRÉE LE 2026-10-14, DÉCISION DE LA PROPRIÉTAIRE (Q1, option a : une ligne, sans rythme de mise à jour). Voir `dae-erp-detention` pour l'historique du DAE au référentiel.\n\n~~ÉTAT PERMANENT, ET NON PONCTUELLE — ÉCART AU PLAN, À VALIDER.~~ [2026-10-15, rayé — décision de la propriétaire, `lot/dae-materiel-1015` : la ligne passe sur l'appareil, en PONCTUELLE avec `mise_en_service_uniquement`. Le motif de l'écart ci-dessous tenait pour une ligne d'établissement, qui n'aurait eu aucune surface ; il tombe avec le porteur. Une `DeclarationEtatPermanent` est unique par (établissement, obligation) : en état permanent sur l'équipement, la ligne n'aurait eu qu'une case pour tout le parc. En ponctuelle, chaque DAE a sa ligne « à planifier » au calendrier, datée de sa mise en service si elle est connue. Le texte s'y prête : le décret n° 2018-1259 fait transmettre les informations relatives « à l'accessibilité de leurs appareils » — un acte par appareil. Le texte rayé ci-dessous est celui du 2026-10-14 :] ~~Le plan présenté à la propriétaire disait « ponctuelle ». Mesuré en appelant le référentiel le 2026-10-14 : aucune obligation d'établissement ne porte `ponctuelle` avec `autre`, et pour cause — le générateur n'en tire aucune ligne de calendrier (`estSansRendezVous`) et l'écran « Ce qui doit être en place » ne montre que les états permanents (`estEtatADeclarer`). Une ligne ponctuelle d'établissement n'aurait eu AUCUNE surface : le dirigeant ne l'aurait vue nulle part. Le texte s'y prête par ailleurs : l'arrêté fait de la base le reflet de l'appareil (état de fonctionnement, « Hors service », « Supprimé définitivement », date de la dernière maintenance, validation par l'exploitant) — être déclaré est un état qui se tient, pas un acte qui s'épuise.~~\n\nPAS DE RYTHME DE MISE À JOUR, ET C'EST VOULU. La date de la dernière maintenance est un champ obligatoire de l'annexe 1 : la déclaration suit donc les maintenances. Mais aucun texte lu n'écrit de délai de mise à jour — l'annexe 4 dit seulement que « les mises à jour sont effectuées à partir du fichier communiqué précédemment ». Coupler la mise à jour au rythme de `dae-erp-maintenance` serait poser un rythme que le texte n'écrit pas (option b, écartée par la propriétaire).\n\n~~PORTEUR ÉTABLISSEMENT,~~ [2026-10-15 : PORTEUR ÉQUIPEMENT, catégorie `DEFIBRILLATEUR` ; identifiant gardé, perte de continuité acceptée par écrit, comme pour la maintenance.] ET LE TEXTE NOMME L'EXPLOITANT DU DAE. L'arrêté le définit comme « le propriétaire du DAE, seul responsable de la déclaration sur la base » — pas nécessairement l'exploitant de l'ERP. ~~Même choix que pour les deux lignes sœurs.~~ [2026-10-15 : même choix que la maintenance ; la détention reste à l'établissement.]\n\n`pieceAttendue: null` : l'obligation est une transmission à un gestionnaire, pas un écrit tenu par l'établissement. La confirmation de déclaration peut se déposer comme trace de l'acte, comme un rapport sous une vérification ; elle n'est pas l'obligation (2026-10-15, maintenu en passant à la ponctuelle).\n\nPERTE ACCEPTÉE AUSSI SUR LA DÉCLARATION (2026-10-16, revue indépendante du lot). Une `DeclarationEtatPermanent` déjà saisie sur cette ligne quand elle était un état permanent d'établissement reste en base, orpheline : elle n'est plus affichée, et la ligne de chaque appareil repart « à planifier ». Perte acceptée comme celle des lignes de calendrier — la production n'a pas de clients (2026-10-08).",
  },
];
