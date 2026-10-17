/**
 * Domaine « information des travailleurs » — `D. 4711-1`, `R. 4121-4`.
 *
 * CE QUI SE CONSTATE SUR UN MUR. Deux obligations, et elles ont ceci de commun
 * qu'un inspecteur les vérifie en entrant : un support est affiché, ou il ne
 * l'est pas. C'est la première chose qu'on regarde dans une TPE, et c'est
 * souvent la seule que le dirigeant n'a jamais faite.
 *
 * POURQUOI CE DOMAINE N'EST PAS `formation_securite`. Le lot 7 y a encodé
 * `formation-securite-etablissement-information` (`L. 4141-1`, `R. 4141-3-1`),
 * qui est l'information ORALE et individuelle due à chaque salarié — y compris,
 * par le 1° de `R. 4141-3-1`, sur les modalités d'accès au document unique.
 * Les deux se ressemblent et ne se recouvrent pas : l'une se prouve par un
 * entretien, l'autre par un support affiché à une place convenable. Un
 * employeur peut avoir informé ses salariés de vive voix sans rien avoir
 * affiché, et c'est le cas ordinaire. Les fondre aurait fait disparaître
 * l'affichage, qui est précisément ce qui se contrôle.
 *
 * DEUX ÉTATS PERMANENTS, AUCUNE PÉRIODICITÉ. Ni `D. 4711-1` ni `R. 4121-4`
 * n'écrivent de durée : rien à réafficher tous les ans. `periodicite: "autre"`
 * pour les deux, sur le précédent de l'habilitation électrique.
 */

import type { Obligation } from "./types";

export const obligationsInformationTravailleurs: Obligation[] = [
  {
    id: "information-etablissement-affichages-obligatoires",
    domaine: "information_travailleurs",
    libelle:
      "Affichage des coordonnées : médecine du travail, secours, inspection du travail",
    description:
      "L'employeur affiche, dans des locaux normalement accessibles aux travailleurs, l'adresse et le numéro d'appel du médecin du travail ou du service de santé au travail compétent pour l'établissement, des services de secours d'urgence, et de l'inspection du travail compétente ainsi que le nom de l'inspecteur compétent. Trois coordonnées, à tenir à jour : un numéro d'inspecteur périmé ne vaut pas affichage.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "D. 4711-1 (affichage de l'adresse et du numéro d'appel du service de santé au travail, des secours d'urgence et de l'inspection du travail)",
        article: "D. 4711-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018527636",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "incendie_secours", sous: "alerter" },
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "VERBATIM RELEVÉ SUR LÉGIFRANCE LE 2026-08-31, version en vigueur depuis le 2008-05-01 : « L'employeur affiche, dans des locaux normalement accessibles aux travailleurs, l'adresse et le numéro d'appel : 1° Du médecin du travail ou du service de santé au travail compétent pour l'établissement ; 2° Des services de secours d'urgence ; 3° De l'inspection du travail compétente ainsi que le nom de l'inspecteur compétent. »\n\nÉTAT PERMANENT, PAS ÉCHÉANCE. Le texte n'écrit aucune durée : rien n'impose de réafficher tous les ans. `periodicite: \"autre\"`, sur le précédent de l'habilitation électrique — passée de `triennale` à `autre` quand quelqu'un a ouvert le texte et constaté qu'aucune durée n'y figurait. Ce n'est pas pour autant une obligation qui se solde une fois : le nom de l'inspecteur compétent change, l'adresse du service de santé au travail aussi. Le libellé et la description le disent ; l'outil ne fabrique pas d'échéance pour l'imposer.\n\nCE N'EST PAS LE 2° QUI PORTE LES CONSIGNES DE SECOURS. Ce 2° impose d'afficher l'ADRESSE ET LE NUMÉRO des services de secours d'urgence. L'organisation des premiers secours, elle, relève de `R. 4224-16`, qui n'est pas un affichage mais un DOCUMENT écrit tenu à disposition de l'inspection — encodé au lot 7 sous `secours-etablissement-mesures`. Le brief du lot 8 annonçait `R. 4224-16` comme « consignes de premiers secours affichées » ; l'ouverture du texte a montré que non, et l'encoder ainsi aurait posé deux fois l'affichage et zéro fois le document.\n\nÀ NE PAS CONFONDRE non plus avec les consignes d'incendie de `R. 4227-37`, qui sont affichées elles aussi mais relèvent du domaine `incendie` et sont conditionnées au champ de `R. 4227-34`.\n\nLE REGISTRE UNIQUE DE `D. 4711-2` ET `D. 4711-3` N'EST PAS ICI. Ces deux articles voisins portent le regroupement des registres obligatoires, que le module « Registre de sécurité » sert déjà en partie. Aucune obligation nouvelle n'est posée dessus par ce lot : les toucher aurait empiété sur un module existant sans que le besoin ait été instruit.\n\nCriticité 3 : le manquement est formel au regard de l'inspection, mais le 2° a une fonction de sécurité réelle — un numéro de secours introuvable coûte des minutes.\n\nNATURE : ÉTAT PERMANENT (ADR-026). `pieceAttendue: null`, et c'est un arbitrage à connaître : ce que D. 4711-1 exige est l'AFFICHAGE de trois coordonnées, pas la détention d'une pièce que l'inspection se ferait remettre. La distinction est celle qui sépare cette ligne de la consigne de sécurité incendie, que R. 4227-37 fait d'abord établir. L'état inclut la mise à jour — un numéro d'inspecteur périmé ne vaut pas affichage —, ce qui reste un état et non une échéance : aucun texte ne date la révision.",
  },

  {
    id: "information-etablissement-avis-acces-duerp",
    domaine: "information_travailleurs",
    libelle: "Avis affiché sur les modalités d'accès au DUERP",
    description:
      "Un avis indiquant les modalités d'accès des travailleurs au document unique d'évaluation des risques professionnels est affiché à une place convenable et aisément accessible dans les lieux de travail. Dans les entreprises ou établissements dotés d'un règlement intérieur, cet avis est affiché au même emplacement que celui réservé au règlement intérieur.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4121-4 dernier alinéa (avis affiché indiquant les modalités d'accès des travailleurs au document unique)",
        article: "R. 4121-4",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045386451",
        versionConstatee: "2022-03-31",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "quotidien", sous: "informer" },
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "VERBATIM DU DERNIER ALINÉA, RELEVÉ LE 2026-08-31, version en vigueur depuis le 2022-03-31 : « Un avis indiquant les modalités d'accès des travailleurs au document unique est affiché à une place convenable et aisément accessible dans les lieux de travail. Dans les entreprises ou établissements dotés d'un règlement intérieur, cet avis est affiché au même emplacement que celui réservé au règlement intérieur. »\n\nCE QUE CETTE OBLIGATION NE PORTE PAS, ET POURQUOI ELLE N'EST PAS UN DOUBLON. R. 4121-4 est un article long : ses 1° à 7° organisent la mise à disposition du DUERP pendant quarante ans à sept catégories de destinataires, et un alinéa règle la conservation en attendant le portail numérique. Tout cela est servi par le module DUERP (versionnement, conservation quarante ans) et n'est pas réencodé ici. Ce qui est encodé est le SEUL dernier alinéa : l'avis affiché.\n\nTROIS VOISINAGES VÉRIFIÉS AVANT D'ÉCRIRE CETTE LIGNE, parce que trois obligations parlent d'accès au DUERP et qu'il aurait été facile d'en poser une quatrième par-dessus une existante :\n  1. `formation-securite-etablissement-information` (lot 7) est fondée sur L. 4141-1 et détaille son contenu par R. 4141-3-1, dont le 1° porte sur les modalités d'accès au DUERP. C'est l'information due À CHAQUE SALARIÉ, oralement, à l'embauche et chaque fois que nécessaire. Article fondateur différent, acte différent, preuve différente.\n  2. Le module DUERP porte la mise à disposition et la conservation quarante ans. Ce n'est pas une ligne du référentiel de conformité.\n  3. R. 4121-2 impose la mise à jour annuelle du document unique. Autre article, autre obligation.\nLe test anti-doublon de `conformite.test.ts` compare l'article FONDATEUR : R. 4121-4 n'est fondateur d'aucune autre obligation du référentiel. Vérifié avant encodage.\n\nLE RENVOI AU RÈGLEMENT INTÉRIEUR N'EST PAS UNE CONDITION D'APPLICATION. La seconde phrase précise OÙ afficher quand un règlement intérieur existe ; elle ne restreint pas l'obligation aux établissements qui en ont un. Aucune `effectifMin` ici, donc : l'avis est dû dès le premier salarié, alors que le règlement intérieur n'est dû qu'à cinquante. Les conditionner ensemble aurait éteint l'obligation pour toute la cible du produit.\n\nÉTAT PERMANENT, aucune durée dans le texte : `periodicite: \"autre\"`.\n\nCriticité 2 : le manquement est formel et se corrige en une feuille imprimée. Il a néanmoins un effet réel — un DUERP que personne ne sait consulter ne remplit pas sa fonction.\n\nNATURE : ÉTAT PERMANENT (ADR-026), `pieceAttendue: null` pour le même motif que l'affichage des coordonnées : l'obligation est l'avis affiché, pas une pièce détenue.",
  },
];
