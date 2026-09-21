/**
 * Domaine « éclairage des lieux de travail » — `R. 4223-11`.
 *
 * UNE SEULE LIGNE, ET ELLE ATTENDAIT DEPUIS DEUX JOURS. Le corpus
 * `code-travail-eclairage` a relevé `R. 4223-11` le 2026-09-02, avec son
 * verbatim, sa version et son texte modificateur, et l'a classé
 * `obligation_manquante` en écrivant noir sur blanc : « Rien ne bloque
 * techniquement : c'est un article qu'on n'avait pas lu. » Ce fichier est la
 * conséquence de cette phrase.
 *
 * L'ÉCLAIRAGE ORDINAIRE, PAS L'ÉCLAIRAGE DE SÉCURITÉ. Les deux se ressemblent
 * de loin et n'ont rien de commun de près. L'éclairage de sécurité prend le
 * relais quand le courant tombe : `R. 4227-14`, arrêté du 14 décembre 2011,
 * `EC 14` pour les ERP, et le référentiel le porte depuis longtemps sous le
 * domaine `incendie` — essai mensuel, autonomie semestrielle. L'éclairage
 * ordinaire est celui sous lequel on travaille : la section 1 du chapitre III
 * en fixe les niveaux (`R. 4223-4`, de 40 à 200 lux selon le local) et impose
 * ici l'entretien de son matériel. Les fondre aurait fait disparaître le
 * second, qui n'a aucun rendez-vous, derrière le premier, qui en a deux.
 *
 * CE QUE CE FICHIER NE PORTE PAS. `R. 4223-4` — les lux au plan de travail —
 * est une obligation de RÉSULTAT sans acte ni pièce : aucun texte n'impose de
 * mesurer l'éclairement à intervalle, à la différence du bruit. Le corpus le
 * classe `obligation_manquante` depuis le 2026-09-02 en disant que la voie qui
 * l'ouvrirait est le DUERP et non le calendrier de conformité. Rien n'a changé
 * de ce côté, et ce lot ne l'ouvre pas.
 */

import type { Obligation } from "./types";

export const obligationsEclairage: Obligation[] = [
  {
    id: "eclairage-etablissement-regles-entretien",
    domaine: "eclairage",
    libelle:
      "Règles d'entretien périodique du matériel d'éclairage, consignées dans un document",
    description:
      "L'employeur fixe les règles d'entretien périodique du matériel d'éclairage, de manière à ce que les niveaux d'éclairement du chapitre restent atteints. Ces règles sont consignées dans un document, communiqué aux membres du comité social et économique. Le texte ne fixe aucun rythme : c'est l'employeur qui l'écrit, et ce document est ce que l'inspection lit pour savoir lequel il s'est donné.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4223-11 (l'employeur fixe les règles d'entretien périodique du matériel d'éclairage ; règles consignées dans un document communiqué aux membres du CSE)",
        article: "R. 4223-11",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483672",
        note: "« Le matériel d'éclairage est installé de manière à pouvoir être entretenu aisément. L'employeur fixe les règles d'entretien périodique du matériel en vue d'assurer le respect des dispositions de la présente section. Les règles d'entretien sont consignées dans un document qui est communiqué aux membres du comité social et économique. » Verbatim relevé sur Légifrance le 2026-09-02, version en vigueur depuis le 2018-01-01 (décret n° 2017-1819 du 29 décembre 2017 - art. 3).",
        versionConstatee: "2018-01-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4224-17 dernière phrase (le dossier de maintenance des lieux de travail regroupe notamment le document prévu en matière d'éclairage à l'article R. 4223-11)",
        article: "R. 4224-17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532197",
        note: "CONTEXTE, ET C'EST LUI QUI DIT OÙ VIT LE DOCUMENT : « Ce dossier regroupe notamment la consigne et les documents prévus en matière d'aération, d'assainissement et d'éclairage aux articles R. 4222-21 et R. 4223-11. » L'article n'ajoute aucun rythme — « une périodicité appropriée » n'en est pas un — et il ne fonde pas cette obligation ; il montre que le document est attendu dans un dossier unique, pour tout l'établissement.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "document consignant les règles d'entretien de l'éclairage",
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "NATURE : ÉTAT PERMANENT (ADR-026), ET C'EST LE PIÈGE QUE CET ARTICLE TEND. Le mot « périodique » y figure en toutes lettres — « les règles d'entretien PÉRIODIQUE du matériel » —, et il ne désigne pas le rythme de l'obligation encodée : il désigne le rythme que l'EMPLOYEUR doit fixer pour son propre entretien. Le texte n'écrit aucune durée, ni pour l'entretien, ni pour la révision du document. Ce qui est dû est un ÉCRIT qu'on détient et qu'on tient à jour, pas un rendez-vous. Lui donner une périodicité aurait été fabriquer une échéance — le « triennal » que ce dépôt a déjà retiré une fois, sous une autre forme.\n\n`periodicite: \"autre\"` en conséquence, sur le précédent de l'affichage de `D. 4711-1` et de la consigne de sécurité. La ligne n'entre donc pas au calendrier : elle atteint l'écran « Ce qui doit être en place », sous le verbe « en place » (`etats-permanents/regle.ts`), et `pieceAttendue` y fait apparaître le nom de l'écrit — une case cochée sans document derrière serait la déclaration-qui-ressemble-à-une-preuve que l'ADR-027 interdit.\n\nLA RÉSERVE DU CORPUS SUR LE CSE EST TRANCHÉE ICI, ET DANS LE SENS LITTÉRAL. Le corpus posait la question le 2026-09-02 sans la trancher : la communication au comité social et économique suppose un CSE, donc onze salariés ; en dessous, l'employeur doit-il encore fixer les règles ? L'article fait DEUX PHRASES DISTINCTES. La deuxième — « L'employeur fixe les règles d'entretien périodique du matériel en vue d'assurer le respect des dispositions de la présente section » — ne mentionne aucune instance et n'est subordonnée à rien. La troisième seule parle du CSE, et elle porte sur la COMMUNICATION d'un document dont la deuxième a déjà imposé l'existence. Aucun `effectifMin` n'est donc posé : le poser à onze retirerait l'obligation à la quasi-totalité de la cible du produit — des TPE — sur la foi d'une phrase qui ne dit pas cela. C'est la même lecture que celle retenue pour l'avis d'accès au DUERP de `R. 4121-4`, dont la seconde phrase renvoie au règlement intérieur sans réserver l'obligation aux établissements qui en ont un.\n\nCE QUE LA DESCRIPTION DIT ET QUE LE TEXTE NE DIT PAS : rien. La phrase « de manière à ce que les niveaux d'éclairement du chapitre restent atteints » est la traduction de « en vue d'assurer le respect des dispositions de la présente section », et la section est celle qui porte `R. 4223-4`. Ce n'est pas une extension : c'est le but que l'article assigne lui-même aux règles.\n\nPORTEUR ÉTABLISSEMENT, ET PAS ÉQUIPEMENT. Le document est UN document, pour tout l'établissement, et l'article ne le conditionne à aucune installation déclarée. L'accrocher à une catégorie d'équipement aurait produit zéro ligne chez un bureau qui n'a rien déclaré — lequel a pourtant de l'éclairage et le doit.\n\nCRITICITÉ 2 : le manquement est formel, il se corrige par une page écrite, et le risque qu'il porte est indirect — un éclairage mal entretenu fatigue et fait trébucher, il ne blesse pas seul. Même barreau que l'avis d'accès au DUERP.\n\n~~LE JUMEAU DE CETTE LIGNE N'EXISTE TOUJOURS PAS, ET IL FAUT LE SAVOIR.~~ [2026-09-20 : il existe — `aeration-etablissement-consigne-utilisation`. Ce qui suit décrit l'état d'avant.] `R. 4222-21` impose exactement la même chose du côté de la ventilation — une consigne d'utilisation écrite, soumise à l'avis du médecin du travail et du CSE — et reste `obligation_manquante` au corpus `code-travail-risque-chimique`. Les deux documents sont agrégés nommément par `R. 4224-17`, cité ci-dessus en contexte : le référentiel en porte désormais un sur deux. Ce lot ne comble pas le second — la consigne de ventilation relève du domaine `aeration`, et le sien reste à décider —, mais il cesse de laisser croire que le renvoi d'article a été lu en entier.",
  },
];
