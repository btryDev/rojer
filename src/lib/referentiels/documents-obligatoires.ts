// Les documents qu'un dirigeant doit tenir — y compris ceux que Rojer ne
// produit pas.
//
// POURQUOI CETTE LISTE EXISTE. Le produit sait dire ce qu'il fabrique : le
// document unique, le registre de sécurité, le dossier de contrôle. Il ne
// savait pas dire ce qu'il ne fabrique pas, et un dirigeant qui n'a que Rojer
// sous les yeux en concluait raisonnablement que sa documentation était
// couverte. L'écran des « outils de conformité » du guide allait plus loin : il
// annonçait « Registre unique du personnel, affichages obligatoires, fiche
// d'entreprise » sous une pastille « Bientôt », c'est-à-dire une promesse, sur
// des documents que le CLAUDE.md déclare hors périmètre depuis toujours. Une
// porte annoncée fermée vaut mieux qu'un bouton inerte (charte, interdit 19).
//
// RÈGLE D'ENTRÉE, ET ELLE EST TESTÉE. Chaque document porte au moins un
// fondement : une référence, sa clé d'article, son URL Légifrance ou INRS, la
// version constatée et le jour où elle a été relevée. **Un document sans
// fondement vérifiable n'entre pas** — `documents-obligatoires.test.ts` fait
// tomber la construction plutôt que de laisser passer une ligne invérifiable.
// Aucune norme privée : ni NF, ni APSAD, ni CACES, ni recommandation de la
// CNAM. Elles ne sont pas opposables, et les citer ici les ferait passer pour
// du droit.
//
// CE QUE LA LISTE NE FAIT PAS. Elle ne qualifie la situation de personne : ni
// « conforme », ni « non conforme ». Elle ne compte pas non plus — dix
// documents dus ne font pas un score de dix, et la moitié d'entre eux ne sont
// dus que dans certains cas, ce que dit `quandIlEstDu`.
//
// CE QUI EN A ÉTÉ ÉCARTÉ, ET POURQUOI. Deux entrées attendues n'y sont pas.
//
//  - **Le registre des accidents du travail bénins.** `L. 441-4` du code de la
//    sécurité sociale ouvre une FACULTÉ — l'employeur qui remplit certaines
//    conditions « peut » le tenir, ce qui le dispense de déclarer les accidents
//    sans arrêt ni soins. Une autorisation ne fonde pas une obligation ; le
//    dépôt a déjà fait cette erreur une fois, avec `L. 4711-5`, et une branche
//    entière du référentiel reposait sur une faculté. Ce qui est dû, c'est la
//    déclaration d'accident du travail, et elle est dans la liste.
//  - **Les affichages obligatoires non liés à la santé-sécurité** (prix,
//    allergènes, licence, origine des viandes). Ils n'ont pas de fondement
//    commun : chacun vient de son propre texte, dans un autre code. Écrire
//    « affichages obligatoires » avec un article choisi au hasard parmi eux
//    aurait donné une entrée invérifiable — donc pas d'entrée. Le jour où on
//    les traitera, ce sera une ligne par affichage, avec son texte.
//
// Module **pur** : ni Prisma, ni React, ni horloge.

import type { SourceLegale } from "./conformite/types";

/**
 * De quoi un document tient sa force.
 *
 * Tous les champs sont requis, `citationCle` exceptée. C'est délibéré :
 * `versionConstatee` et `luLe` ne se remplissent qu'en ouvrant la page, et
 * c'est exactement ce qu'on veut rendre obligatoire. Un champ optionnel se
 * laisse vide, et une référence non ouverte ressemble alors à une référence
 * ouverte.
 */
export type FondementDocument = {
  source: SourceLegale;
  /** La référence telle qu'on la citerait dans un document remis à un tiers. */
  reference: string;
  /** La clé canonique de l'article : « R. 4121-1 », « CCH R. 164-6 ». */
  article: string;
  /** L'URL de la source, ouvrable telle quelle. */
  url: string;
  /** La phrase décisive, relevée mot pour mot. */
  citationCle?: string;
  /** La date depuis laquelle la version lue est en vigueur, en jour civil. */
  versionConstatee: string;
  /** Le jour où elle a été relevée. */
  luLe: string;
};

/**
 * Un document que le dirigeant doit tenir.
 *
 * Le type est une union discriminée, et pas un booléen suivi d'un champ
 * optionnel : un document que Rojer ne produit PAS doit dire où le trouver, et
 * l'oublier ne doit pas compiler. C'est la moitié utile de la liste — nommer
 * un document manquant sans dire où il se tient laisserait le dirigeant devant
 * un problème de plus, pas devant une solution.
 */
export type DocumentObligatoire = {
  id: string;
  nom: string;
  /** Ce que le texte impose de tenir, en une phrase adressée au dirigeant. */
  ceQueLeTexteDemande: string;
  /** Quand il n'est dû que dans certains cas, la condition. */
  quandIlEstDu?: string;
  fondements: [FondementDocument, ...FondementDocument[]];
} & (
  | { produitParRojer: true; ouDansRojer: string }
  | { produitParRojer: false; ouLeTrouver: string }
);

export const DOCUMENTS_OBLIGATOIRES: readonly DocumentObligatoire[] = [
  /* ─── Ce que Rojer produit ──────────────────────────────────────────── */

  {
    id: "duerp",
    nom: "Document unique d'évaluation des risques professionnels",
    ceQueLeTexteDemande:
      "Transcrire et tenir à jour, dans un document unique, les résultats de l'évaluation des risques, unité de travail par unité de travail. Il est dû dès le premier salarié.",
    produitParRojer: true,
    ouDansRojer:
      "Le module « Document unique » : unités de travail, risques cotés, et une version figée à chaque validation. Les versions successives sont conservées, l'article R. 4121-4 les rendant opposables pendant quarante ans.",
    fondements: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4121-1 (transcription des résultats de l'évaluation)",
        article: "R. 4121-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023795562",
        citationCle:
          "L'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques pour la santé et la sécurité des travailleurs à laquelle il procède en application de l'article L. 4121-3.",
        versionConstatee: "2011-04-01",
        luLe: "2026-09-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4121-4 (conservation quarante ans et mise à disposition ; avis affiché des modalités d'accès)",
        article: "R. 4121-4",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045386451",
        versionConstatee: "2022-03-31",
        luLe: "2026-09-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 4121-3-1 III (en deçà de cinquante salariés, la liste des actions de prévention est consignée dans le document unique)",
        article: "L. 4121-3-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043893919",
        versionConstatee: "2022-03-31",
        luLe: "2026-09-01",
      },
    ],
  },

  {
    id: "registre-securite",
    nom: "Registre de sécurité",
    ceQueLeTexteDemande:
      "Tenir un registre où se consignent les vérifications, les rapports des organismes et les contrôles, et le présenter à qui a qualité pour le demander.",
    produitParRojer: true,
    ouDansRojer:
      "Le module « Registre de sécurité » compose le document et y range les rapports de vérification archivés. Il s'exporte en PDF pour une commission ou un contrôle.",
    fondements: [
      {
        source: "CCH",
        reference:
          "CCH, art. R. 143-44 (ex R. 123-51) — registre de sécurité des établissements recevant du public",
        article: "CCH R. 143-44",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819037",
        citationCle:
          "Dans les établissements soumis aux prescriptions du présent chapitre, il doit être tenu un registre de sécurité",
        versionConstatee: "2026-07-01",
        luLe: "2026-08-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-25 (consignation du résultat des vérifications générales périodiques)",
        article: "R. 4323-25",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531475",
        citationCle:
          "Le résultat des vérifications générales périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5.",
        versionConstatee: "2008-05-01",
        luLe: "2026-09-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-26 (annexion au registre des rapports d'un vérificateur extérieur)",
        article: "R. 4323-26",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531473",
        versionConstatee: "2008-05-01",
        luLe: "2026-09-01",
      },
    ],
  },

  {
    id: "registre-accessibilite",
    nom: "Registre public d'accessibilité",
    ceQueLeTexteDemande:
      "Élaborer et tenir à la disposition du public un registre disant les dispositions prises pour que chacun, quel que soit son handicap, bénéficie des prestations de l'établissement.",
    quandIlEstDu: "Dans tout établissement recevant du public.",
    produitParRojer: true,
    ouDansRojer:
      "Le module « Accessibilité » compose les quatre rubriques de l'arrêté et publie une page consultable, avec son affiche et son QR code.",
    fondements: [
      {
        source: "CCH",
        reference: "CCH, art. R. 164-6 (registre public d'accessibilité)",
        article: "CCH R. 164-6",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819305",
        citationCle:
          "L'exploitant de tout établissement recevant du public au sens de l'article R. 143-2 élabore le registre public d'accessibilité prévu à l'article L. 164-1.",
        versionConstatee: "2021-07-01",
        luLe: "2026-09-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 19 avril 2017 fixant le contenu et les modalités de diffusion et de mise à jour du registre public d'accessibilité",
        article: "Arrêté 2017-04-19 registre accessibilité",
        url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000034454237/",
        versionConstatee: "2017-04-22",
        luLe: "2026-09-01",
      },
    ],
  },

  {
    id: "plan-prevention",
    nom: "Plan de prévention écrit",
    ceQueLeTexteDemande:
      "Établir par écrit, avant le début des travaux, le plan de prévention arrêté avec l'entreprise extérieure qui intervient chez vous.",
    quandIlEstDu:
      "Dès que l'opération représente au moins 400 heures de travail sur douze mois, ou — quelle que soit sa durée — dès qu'elle figure sur la liste des travaux dangereux de l'arrêté du 19 mars 1993.",
    produitParRojer: true,
    ouDansRojer:
      "Le module « Plans de prévention » : les entreprises intervenantes, les risques d'interférence et les mesures arrêtées, signés par les deux parties.",
    fondements: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4512-7 (le plan de prévention est établi par écrit dans deux cas : 400 heures sur douze mois, ou travaux dangereux)",
        article: "R. 4512-7",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529783",
        versionConstatee: "2008-05-01",
        luLe: "2026-09-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 19 mars 1993 fixant la liste des travaux dangereux pour lesquels il est établi par écrit un plan de prévention",
        article: "Arrêté 1993-03-19 travaux dangereux",
        url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000179892/",
        versionConstatee: "1993-03-27",
        luLe: "2026-09-01",
      },
    ],
  },

  /* ─── Ce que Rojer ne produit pas ───────────────────────────────────── */

  {
    id: "duerp-depot-portail",
    nom: "Dépôt dématérialisé du document unique",
    ceQueLeTexteDemande:
      "Déposer le document unique et ses mises à jour sur un portail numérique national, déployé et administré par les organisations professionnelles d'employeurs.",
    quandIlEstDu:
      "Depuis le 1ᵉʳ juillet 2023 pour les entreprises d'au moins cent cinquante salariés ; pour les autres, à des dates que le texte renvoie à un décret.",
    produitParRojer: false,
    ouLeTrouver:
      "Rojer conserve vos versions et les rend imprimables, mais il ne dépose rien à votre place : le dépôt se fait sur le portail national, hors de l'outil. Le PDF exporté depuis le module Document unique est la pièce à y porter.",
    fondements: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 4121-3-1 V (conservation quarante ans, mise à disposition, et dépôt dématérialisé sur un portail numérique)",
        article: "L. 4121-3-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043893919",
        versionConstatee: "2022-03-31",
        luLe: "2026-09-01",
      },
    ],
  },

  {
    id: "registre-danger-grave-imminent",
    nom: "Registre spécial des dangers graves et imminents",
    ceQueLeTexteDemande:
      "Tenir un registre spécial, aux pages numérotées, où se consigne l'avis d'un représentant du personnel qui signale une cause de danger grave et imminent : postes concernés, nature et cause du danger, nom des travailleurs exposés.",
    quandIlEstDu:
      "Il suppose un comité social et économique, donc un effectif d'au moins onze salariés.",
    produitParRojer: false,
    ouLeTrouver:
      "Aucun écran de Rojer ne le tient, et le registre de sécurité de l'outil n'en fait pas office : celui-ci reçoit des vérifications, pas des alertes. Il se tient sur un registre papier paginé, tamponné par le comité, conservé dans l'établissement. Votre service de prévention et de santé au travail en fournit le modèle.",
    fondements: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "D. 4132-1 (l'avis du représentant du personnel est consigné sur un registre spécial dont les pages sont numérotées)",
        article: "D. 4132-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036484010",
        citationCle:
          "L'avis du représentant du personnel au comité social et économique, prévu à l'article L. 4131-2, est consigné sur un registre spécial dont les pages sont numérotées et authentifiées par le tampon du comité.",
        versionConstatee: "2018-01-01",
        luLe: "2026-09-01",
      },
    ],
  },

  {
    id: "declaration-accident-travail",
    nom: "Déclaration d'accident du travail",
    ceQueLeTexteDemande:
      "Déclarer tout accident du travail à la caisse primaire d'assurance maladie dont relève la victime.",
    produitParRojer: false,
    ouLeTrouver:
      "La déclaration se fait auprès de la caisse primaire d'assurance maladie, en ligne sur net-entreprises.fr ou par formulaire. Rojer n'enregistre pas les accidents et ne déclare rien : ce que l'outil peut porter, c'est l'action corrective décidée après coup, dans le plan d'actions.",
    fondements: [
      {
        source: "CSS",
        reference:
          "CSS, art. L. 441-2 (l'employeur ou son préposé déclare tout accident à la caisse primaire dont relève la victime)",
        article: "CSS L. 441-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006743085",
        versionConstatee: "1985-12-21",
        luLe: "2026-09-01",
      },
    ],
  },

  {
    id: "verifications-epi",
    nom: "Consignation des vérifications d'équipements de protection individuelle",
    ceQueLeTexteDemande:
      "Faire vérifier périodiquement les équipements de protection individuelle que des arrêtés désignent, et consigner le résultat sur le registre de sécurité.",
    quandIlEstDu:
      "Pour les seuls équipements que les arrêtés du ministre chargé du travail ou de l'agriculture désignent — les autres ne sont pas soumis à vérification périodique. L'arrêté du 19 mars 1993, lu à la source le 4 septembre 2026, en nomme cinq et cinq seulement : appareils de protection respiratoire autonomes destinés à l'évacuation ; appareils de protection respiratoire et équipements complets destinés à des interventions accidentelles en milieu hostile ; gilets de sauvetage gonflables ; systèmes de protection individuelle contre les chutes de hauteur — le harnais antichute et sa longe ; stocks de cartouches filtrantes antigaz. Un casque, des gants, des chaussures de sécurité, des lunettes, des protections auditives n'y figurent pas : aucun rendez-vous périodique ne leur est demandé. Le rythme n'est pas « une fois par an » mais « depuis moins de douze mois au moment de leur utilisation », en service comme en stock — il se compte à l'instant de l'usage, pas à la date de la dernière visite.",
    produitParRojer: false,
    ouLeTrouver:
      "Le registre de sécurité existe dans Rojer, mais l'outil n'engendre aucune échéance de vérification d'équipement de protection individuelle : ces appareils ne sont pas au référentiel, et rien ne vous rappellera la date. La consignation se tient donc à part, et les rapports du vérificateur s'annexent au registre comme les autres.",
    fondements: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-99 (des arrêtés déterminent les équipements de protection individuelle soumis à vérifications générales périodiques, et leur périodicité)",
        article: "R. 4323-99",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531296",
        versionConstatee: "2008-05-01",
        luLe: "2026-09-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 19 mars 1993, art. 1er (liste des équipements de protection individuelle soumis à vérification générale périodique, depuis moins de douze mois au moment de leur utilisation)",
        article: "Arrêté 1993-03-19 (EPI) art. 1er",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006930405",
        citationCle:
          "Sans préjudice de la vérification à chaque utilisation du maintien en état de conformité des équipements de protection individuelle faite en application de l'article R. 233-1-1 du code du travail, les équipements de protection individuelle suivants, en service ou en stock, doivent avoir fait l'objet, depuis moins de douze mois au moment de leur utilisation, de la vérification générale périodique prévue à l'article R. 233-42-2 du code du travail : - appareils de protection respiratoire autonomes destinés à l'évacuation ; - appareils de protection respiratoire et équipements complets destinés à des interventions accidentelles en milieu hostile ; - gilets de sauvetage gonflables ; - systèmes de protection individuelle contre les chutes de hauteur ; - stocks de cartouches filtrantes antigaz pour appareils de protection respiratoire.",
        versionConstatee: "1993-12-01",
        luLe: "2026-09-04",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-101 (le résultat des vérifications périodiques est consigné sur le ou les registres de sécurité)",
        article: "R. 4323-101",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531292",
        citationCle:
          "Le résultat des vérifications périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5.",
        versionConstatee: "2008-05-01",
        luLe: "2026-09-01",
      },
    ],
  },

  {
    id: "registre-unique-personnel",
    nom: "Registre unique du personnel",
    ceQueLeTexteDemande:
      "Tenir, dans chaque établissement employant des salariés, un registre où les noms et prénoms sont inscrits dans l'ordre des embauches, au moment de l'embauche et de façon indélébile.",
    produitParRojer: false,
    ouLeTrouver:
      "Ce registre est un document de gestion du personnel, pas de santé-sécurité : Rojer ne le tient pas et n'a pas vocation à le tenir. Il est tenu par votre paie ou votre expert-comptable, et la plupart des logiciels de paie le produisent.",
    fondements: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 1221-13 (un registre unique du personnel est tenu dans tout établissement où sont employés des salariés)",
        article: "L. 1221-13",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033971569",
        citationCle:
          "Un registre unique du personnel est tenu dans tout établissement où sont employés des salariés.",
        versionConstatee: "2017-01-29",
        luLe: "2026-09-01",
      },
    ],
  },
];

/** Ceux que Rojer fabrique. */
export function documentsProduits(): DocumentObligatoire[] {
  return DOCUMENTS_OBLIGATOIRES.filter((d) => d.produitParRojer);
}

/**
 * Ceux qu'il ne fabrique pas — la moitié de la liste qui la justifie.
 *
 * Elle est rendue à part, et pas triée dans la même colonne : un dirigeant qui
 * parcourt une liste mêlée retient ce qu'il a déjà, pas ce qui lui manque.
 */
export function documentsNonProduits(): DocumentObligatoire[] {
  return DOCUMENTS_OBLIGATOIRES.filter((d) => !d.produitParRojer);
}
