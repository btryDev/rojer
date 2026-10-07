// Corpus : normes homologuées (NF, EN) — ADR-039, 2026-10-07.
//
// Une norme n'est pas un texte de droit, et ce corpus ne la fait pas passer
// pour tel. Elle y entre parce que la propriétaire a tranché, le 2026-10-07,
// que « rien qui ne soit pas légal » inclut la norme : une norme peut fonder
// une obligation ou un RYTHME même si aucun texte ne la rend obligatoire. Elle
// se cite alors comme norme — intitulé, édition, paragraphe ou annexe — sous la
// source `NORME`, et jamais comme un article de loi.
//
// Statut `norme`, et non `retenu` ni `sans_objet` : voir `StatutArticle`.
//
// PAS D'URL D'ARTICLE. Une norme se consulte chez l'AFNOR, payante ; il n'y a
// pas d'adresse stable d'un paragraphe. Le corpus pointe la notice de l'éditeur,
// les entrées n'en portent pas. Le texte lu est celui du scan remis par le
// préventeur (`relecture-jc-2026-10/`), hors dépôt — on n'en recopie que les
// phrases décisives.
//
// Ces entrées ne passent pas par `pnpm legifrance:verifier` : une norme est
// hors du fonds de l'API Légifrance (`resoudreCible`, branche « NF »).

import type { Corpus } from "./types";

export const NORMES: Corpus = {
  id: "normes",
  intitule: "Normes homologuées (NF, EN) citées comme normes",
  url: "https://www.afnor.org/",
  etendue: "articles_cites",
  portee:
    "Normes homologuées lues, dont Rojer peut retenir un rythme là où le texte n'en chiffre pas (ADR-039). Aucune n'est un texte de droit : chacune s'affiche « Rythme de la norme … ». Seuls les paragraphes relevés ci-dessous ont été lus.",
  articles: [
    {
      ref: "NF S 61-919 § 5.1.1",
      intitule:
        "NF S 61-919 (août 2001), Maintenance des extincteurs d'incendie portatifs — § 5.1.1, maintenance annuelle par une personne compétente",
      versionEnVigueur: "2001-08-20",
      modifiePar: null,
      luLe: "2026-10-07",
      lecture: "premiere_main",
      prescrit:
        "L'utilisateur s'assure que les extincteurs portatifs et les cartouches de gaz sont vérifiés et entretenus ; la personne compétente effectue la maintenance tous les ans, à plus ou moins deux mois.",
      citationCle:
        "5.1.1 L'utilisateur doit s'assurer que les extincteurs portatifs ainsi que les cartouches de gaz sont vérifiés et entretenus, s'il y a lieu, comme indiqué à l'annexe B. La personne compétente doit effectuer tous les ans, avec une tolérance de plus ou moins deux mois, la maintenance, conformément au présent document. Ce laps de temps peut être raccourci notamment en raisons d'exigences dues à l'environnement ou à des risques.",
      statut: "norme",
      motif:
        "Norme française homologuée par décision du directeur général d'AFNOR le 20 juillet 2001, pour prendre effet le 20 août 2001 (page de garde ; remplace XP S 61-919 de mai 1998). Lue le 2026-10-07 sur le scan remis par le préventeur, pages 1 à 12, et recoupée le même jour sur les mêmes pages par la session qui l'encode. Elle écrit un rythme ANNUEL de maintenance des extincteurs portatifs, que `R. 4227-29` (« maintenus en bon état de fonctionnement ») ne chiffre pas. Aucun texte en vigueur trouvé ne la rend obligatoire ni n'y renvoie (recherche plein texte API Légifrance sandbox, `relecture-jc-2026-10/reponses.md` Q7) : c'est une norme, citée comme norme. Le § 4, voisin, RECOMMANDE à l'utilisateur des inspections « au minimum trimestrielle[s] et de préférence mensuelle[s] » (« Il est recommandé », « Il convient ») : relevé, non retenu — le § 5.1.1 dit « doit ». Aucune obligation ne la retient encore : c'est le lot 3.",
      obligations: [],
    },
    {
      ref: "NF S 61-919 annexe A",
      intitule:
        "NF S 61-919 (août 2001) — annexe A (normative), tableau A.1 : intervalles maximaux de maintenance et durée de vie utile prévue",
      versionEnVigueur: "2001-08-20",
      modifiePar: null,
      luLe: "2026-10-07",
      lecture: "premiere_main",
      prescrit:
        "Intervalles maximaux par type d'extincteur portatif : maintenance 1 an (tous types) ; maintenance additionnelle approfondie à 5 et 15 ans (mousse, eau, poudre), à 15 ans (poudre à opercule scellé et pression permanente), sans objet pour halon et CO2 ; révision en atelier 10 ans (tous types sauf halon, « voir note 3 ») ; durée de vie prévue 20 ans, non fixée pour le CO2.",
      citationCle:
        "Les procédures de maintenance doivent être réalisées aux intervalles donnés dans le tableau A.1. [Tableau A.1 — Intervalles maximaux de maintenance et durée de vie utile prévue :] à mousse, eau et à base d'eau : 1 an / à 5 et 15 ans / 10 ans / 20 ans ; à poudre : 1 an / à 5 et 15 ans / 10 ans / 20 ans ; à poudre — avec opercule scellé, à pression permanente : 1 an / 15 ans / 10 ans / 20 ans ; au halon : 1 an / — / Voir note 3 / Voir note 3 ; au CO2 : 1 an / — / 10 ans / Non fixée. [Sous le tableau :] Les intervalles partent de la date d'installation de l'extincteur d'incendie mais ne doivent pas dépasser un an après la date de fabrication marquée sur le corps.",
      statut: "norme",
      motif:
        "Annexe NORMATIVE (avant-propos : « Les annexes A, B, C, D et E sont normatives »), p. 12 du scan, lue le 2026-10-07. Colonnes du tableau dans l'ordre : maintenance (annexe B) / maintenance additionnelle approfondie et renouvellement de la charge (annexe C) / révision en atelier et renouvellement de la charge (annexe D) / durée de vie prévue. « [Tableau A.1 …] » et « [Sous le tableau :] » sont des repères de ce relevé, pas du texte. Le rythme décennal de révision recoupe `MS 38` § 4 (« révision tous les dix ans ») pour les ERP, qui le portent déjà par le droit. Aucune obligation ne la retient encore.",
      obligations: [],
    },
    {
      ref: "NF S 61-919 § 11",
      intitule:
        "NF S 61-919 (août 2001) — § 11, durée de vie d'un extincteur d'incendie portatif",
      versionEnVigueur: "2001-08-20",
      modifiePar: null,
      luLe: "2026-10-07",
      lecture: "premiere_main",
      prescrit:
        "La personne compétente signale par écrit l'extincteur à mettre hors service ; la durée de vie prévue ne devrait pas dépasser 20 ans, sauf CO2 et cartouches de gaz.",
      citationCle:
        "À l'exception des extincteurs portatifs à dioxyde de carbone (voir 10.3) ou des cartouches de gaz, la durée de vie prévue d'un extincteur portatif ne devrait pas dépasser 20 ans.",
      statut: "norme",
      motif:
        "p. 11 du scan, lue le 2026-10-07. « Ne devrait pas » : une durée de vie PRÉVUE, conditionnelle — ce n'est pas un rythme, et rien ici ne la ferait entrer au calendrier. Relevée pour que la question ne se rouvre pas. Aucune obligation ne la retient.",
      obligations: [],
    },
    {
      ref: "NF C 18-510",
      intitule:
        "NF C 18-510 (janvier 2012) et NF C 18-510/A1 (février 2020) — Opérations sur les ouvrages et installations électriques et dans un environnement électrique — Prévention du risque électrique. Paragraphe du recyclage de l'habilitation : à préciser",
      versionEnVigueur: "2020-02-01",
      luLe: "2026-10-07",
      lecture: "indirect",
      prescrit:
        "Non lue. Connue par l'arrêté du 5 juillet 2024, art. 1 (LEGIARTI000049922372), qui la désigne comme norme « recommandée » au titre de `R. 4544-3` et `R. 4544-32` ; `R. 4544-10` fait délivrer, maintenir ou renouveler l'habilitation « selon les modalités contenues dans les normes mentionnées à l'article R. 4544-3 ».",
      statut: "norme",
      motif:
        "Entrée pour être comptée, pas pour fonder. Le recyclage triennal de l'habilitation électrique lui est couramment attribué — c'est le « triennal » retiré par l'ADR-023 § 6 — mais le texte de la norme N'A PAS ÉTÉ OUVERT : aucun paragraphe n'est cité, aucune durée n'est relevée ici. Lecture `indirect` : `controlerRythmeRetenu` refuse qu'un rythme retenu la cite tant qu'elle n'a pas été lue à la source. « février 2020 » est porté au 1er du mois faute de jour. Arrêté relu par l'API Légifrance sandbox le 2026-10-07 (`relecture-jc-2026-10/reponses.md` Q7) : « Les référence des normes recommandées conformément aux articles R. 4544-3 et R. 4544-32 du code du travail sont les suivantes : 1° NF C 18-510 : janvier 2012 […] ; 2° NF C 18-510 /A1 : février 2020 […] ».",
      obligations: [],
    },
  ],
};
