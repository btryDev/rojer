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
      "Modalités de signalement d'un malaise et de secours en cas de chaleur intense, définies et portées à la connaissance des salariés",
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
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "LE SECOND ALINÉA AVAIT ÉCHAPPÉ À LA PREMIÈRE LECTURE. L'instruction du 2026-09-01 résumait l'article à « définit les modalités de signalement » ; la page de SECTION du code le rend d'ailleurs tronqué à cette seule proposition. La page propre de l'article, ouverte le 2026-09-20, porte deux choses de plus : les modalités « destinées à porter secours », et un second alinéa — « portées à la connaissance des travailleurs et communiquées au service de prévention et de santé au travail ». Le libellé les dit.\n\n`pieceAttendue: null`. Le texte fait DÉFINIR, FAIRE CONNAÎTRE et COMMUNIQUER ; il ne nomme ni registre, ni consigne, ni document tenu à disposition — à la différence de `R. 4224-16`, son voisin de domaine, qui exige « un document ». Nommer une pièce ici ferait passer une bonne pratique pour du droit.\n\nPLACÉE SOUS LE CHAPITRE « CHALEUR INTENSE », ET BORNÉE PAR LUI. L'article ne répète pas la condition, mais il vit dans la section « Mesures de prévention » du chapitre III du titre VI : c'est une mesure de prévention du risque chaleur, pas une obligation générale de signalement des malaises. Le libellé garde donc « en cas de chaleur intense ».\n\nAUCUNE PÉRIODICITÉ, d'où `autre` et `etat_permanent`. Criticité 3, celle de `secours-etablissement-mesures`.",
  },
];
