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

import type { Corpus, ReleveParPreventeur } from "./types";

/**
 * NF C 18-510 : ce que le préventeur en a relevé (ADR-039 § 8). Annotation du
 * 2026-10-05 sur « Rojer-reponse-referentiel JC.pdf », p. 2, en face de la
 * question sur l'habilitation électrique — mots recopiés tels quels, retour à
 * la ligne compris. L'obligation qui s'en sert (`elec-salarie-habilitation`)
 * en porte une COPIE — un fichier de données du référentiel n'importe aucune
 * valeur (`version-moteur.test.ts`) — et `controlerRythmeRetenu` exige que
 * les deux soient égales.
 */
export const RELEVE_NF_C_18_510: ReleveParPreventeur = {
  date: "2026-10-05",
  citation:
    "Fréquence et validité recommandées (Norme NF C 18-510)\n• Cas général : Un recyclage (Maintien et Actualisation des Compétences - MAC) est conseillé tous les 3 ans.",
  ou: "relecture-jc-2026-10/Rojer-reponse-referentiel JC.pdf, p. 2, annotation du préventeur (Julien Chantoin), 2026-10-05",
};

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
        "Norme française homologuée par décision du directeur général d'AFNOR le 20 juillet 2001, pour prendre effet le 20 août 2001 (page de garde ; remplace XP S 61-919 de mai 1998). Lue le 2026-10-07 sur le scan remis par le préventeur, pages 1 à 12, et recoupée le même jour sur les mêmes pages par la session qui l'encode. Elle écrit un rythme ANNUEL de maintenance des extincteurs portatifs, que `R. 4227-29` (« maintenus en bon état de fonctionnement ») ne chiffre pas. Aucun texte en vigueur trouvé ne la rend obligatoire ni n'y renvoie (recherche plein texte API Légifrance sandbox, `relecture-jc-2026-10/reponses.md` Q7) : c'est une norme, citée comme norme. Le § 4, voisin, RECOMMANDE à l'utilisateur des inspections « au minimum trimestrielle[s] et de préférence mensuelle[s] » (« Il est recommandé », « Il convient ») : relevé, non retenu — le § 5.1.1 dit « doit ». ~~Aucune obligation ne la retient encore : c'est le lot 3.~~ [2026-10-07, C59 lot 3 : `incendie-travail-moyens-lutte` en retient le rythme annuel (lieu de travail hors ERP) ; `incendie-erp-extincteurs-annuelle` la cite en seconde référence, son rythme restant celui de MS 38 § 4.]",
      obligations: ["incendie-travail-moyens-lutte", "incendie-erp-extincteurs-annuelle"],
    },
    {
      ref: "NF S 61-919 § 9",
      intitule:
        "NF S 61-919 (août 2001) — § 9, étiquette de maintenance",
      versionEnVigueur: "2001-08-20",
      modifiePar: null,
      luLe: "2026-10-07",
      lecture: "premiere_main",
      prescrit:
        "Les données de maintenance figurent sur une étiquette qui ne cache aucun marquage du fabricant : vérifié, date de recharge, date de maintenance additionnelle approfondie, nom et adresse de la société qualifiée, marque de la personne compétente, date de la maintenance ou des vérifications, date de la précédente révision en atelier — chaque date en année et mois.",
      citationCle:
        "9.1 Les données relatives à la maintenance doivent figurer sur une étiquette qui ne cache aucun des marquages du fabricant. 9.2 Les données suivantes doivent être fournies sur l'étiquette : — vérifié ; — date de recharge (année et mois) avec précision éventuelle de l'agent extincteur si nécessaire ; — date de maintenance additionnelle approfondie (année et mois) ; — nom et adresse de la société qualifiée ; — marque identifiant clairement la personne compétente ; — date (année et mois) de réalisation de la maintenance ou des vérifications ; — date (année et mois) de la précédente révision en atelier. NOTE Il y a également lieu de marquer l'année et le mois de la maintenance suivante si la législation l'exige.",
      statut: "norme",
      motif:
        "p. 10 du scan, lue le 2026-10-07 (C60, revue indépendante de la relecture du préventeur, qui demandait de citer l'étiquette et la formation de la personne compétente). L'étiquette est la PREUVE de l'acte que le § 5.1.1 rythme, pas un acte de plus : elle ne fonde aucun rythme, et aucune obligation ne la retient. Elle est citée dans la description de `incendie-travail-moyens-lutte`, la ligne annuelle hors ERP. En ERP, MS 38 § 4 écrit sa propre étiquette (« Les années et les mois des vérifications doivent apparaître sur l'étiquette »).",
      obligations: [],
    },
    {
      ref: "NF S 61-919 annexe E",
      intitule:
        "NF S 61-919 (août 2001) — annexe E (normative), formation et expérience de la personne compétente",
      versionEnVigueur: "2001-08-20",
      modifiePar: null,
      luLe: "2026-10-07",
      lecture: "premiere_main",
      prescrit:
        "La personne compétente est formée — trois mois d'expérience de terrain au moins, des cours d'une durée recommandée d'au moins 32 h, un examen supervisé par un organisme indépendant — et suit des stages de recyclage au moins tous les cinq ans.",
      citationCle:
        "La personne compétente doit être formée : la formation doit comprendre au moins trois mois d'expérience sur le terrain et la participation à des cours de formation dont la durée recommandée est d'au moins 32 h. À l'issue de ce stage de formation, la personne compétente doit réussir un examen qui doit être supervisé par un organisme indépendant. Le stage de formation est organisé par un fabricant ou tout autre organisme reconnu. La personne compétente doit assister à des stages de recyclage au moins tous les cinq ans. Un organisme professionnel désigné effectuera une validation des acquis pour les personnels vérificateurs qui opéraient avant la mise en place du présent document.",
      statut: "norme",
      motif:
        "p. 18 du scan, lue le 2026-10-07 (C60). Annexe NORMATIVE (avant-propos). Elle porte un rythme — « des stages de recyclage au moins tous les cinq ans » — mais il pèse sur la PERSONNE COMPÉTENTE, salariée du prestataire, pas sur l'établissement qui fait maintenir ses extincteurs : il ne fonde aucune échéance du référentiel, et aucune obligation ne la retient. Elle dit ce que « personne compétente » veut dire dans le § 5.1.1 que `incendie-travail-moyens-lutte` retient, et sa description la cite.",
      obligations: [],
    },
    {
      ref: "NF S 61-919 § 10.1",
      intitule:
        "NF S 61-919 (août 2001) — § 10.1, intervalles de révision en atelier des extincteurs d'incendie portatifs",
      versionEnVigueur: "2001-08-20",
      modifiePar: null,
      luLe: "2026-10-07",
      lecture: "premiere_main",
      prescrit:
        "Tout extincteur portatif est soumis à une révision en atelier, par le fabricant ou un centre de révision, à intervalles ne dépassant pas ceux de l'annexe A (dix ans, tableau A.1), comptés de la date de fabrication, de la dernière recharge effective ou de la dernière révision en atelier.",
      citationCle:
        "Tous les extincteurs portatifs doivent être soumis à une révision en atelier effectuée par le fabricant ou un centre de révision à intervalles ne dépassant pas ceux donnés à l'annexe A. Il est facile de le faire en remettant en état chaque année un pourcentage approprié de chaque type d'extincteur portatif. Il faut se conformer aux règlements nationaux en matière d'environnement en ce qui concerne la destruction des agents extincteurs. L'annexe A donne les intervalles spécifiés, partant dans chaque cas de la date de fabrication ou de la dernière recharge effective ou de la révision en atelier de l'extincteur portatif concerné.",
      statut: "norme",
      motif:
        "p. 10 du scan, lue le 2026-10-07 (C59 lot 3). Le premier alinéa du § 10.1 (« Le calendrier de maintenance spécifié à l'annexe B est conçu pour garantir… ») est descriptif, non relevé. Les dix ans se lisent au tableau A.1 (entrée « NF S 61-919 annexe A »), colonne « Révision en atelier et renouvellement de la charge » : 10 ans pour tous les types sauf le halon (« Voir note 3 »). « Doivent » : un rythme, pas une recommandation. `incendie-travail-extincteurs-revision-atelier-decennale` en retient le rythme décennal en lieu de travail hors ERP ; `incendie-erp-extincteurs-revision-decennale` la cite en seconde référence, son rythme restant celui de MS 38 § 4.",
      obligations: [
        "incendie-travail-extincteurs-revision-atelier-decennale",
        "incendie-erp-extincteurs-revision-decennale",
      ],
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
        "Les procédures de maintenance doivent être réalisées aux intervalles donnés dans le tableau A.1. [Tableau A.1 — Intervalles maximaux de maintenance et durée de vie utile prévue :] à mousse, eau et à base d'eau : 1 an / à 5 et 15 ans / 10 ans / 20 ans ; à poudre : 1 an / à 5 et 15 ans / 10 ans / 20 ans ; à poudre — avec opercule scellé, à pression permanente : 1 an / 15 ans / 10 ans / 20 ans ; au halon : 1 an / — / Voir note 3 / Voir note 3 ; au CO2 : 1 an / — / 10 ans / Non fixée. [Notes du tableau :] NOTE 3 Les extincteurs portatifs à halon ne doivent pas être déchargés mais vidés selon une méthode permettant de récupérer le halon (voir annexe G). [Sous le tableau :] Les intervalles partent de la date d'installation de l'extincteur d'incendie mais ne doivent pas dépasser un an après la date de fabrication marquée sur le corps.",
      statut: "norme",
      motif:
        "Annexe NORMATIVE (avant-propos : « Les annexes A, B, C, D et E sont normatives »), p. 12 du scan, lue le 2026-10-07. Colonnes du tableau dans l'ordre : maintenance (annexe B) / maintenance additionnelle approfondie et renouvellement de la charge (annexe C) / révision en atelier et renouvellement de la charge (annexe D) / durée de vie prévue. « [Tableau A.1 …] » et « [Sous le tableau :] » sont des repères de ce relevé, pas du texte. Le rythme décennal de révision recoupe `MS 38` § 4 (« révision tous les dix ans ») pour les ERP, qui le portent déjà par le droit. ~~Aucune obligation ne la retient encore.~~ [2026-10-07, C59 lot 3 : `incendie-travail-extincteurs-maintenance-approfondie` en retient la colonne « maintenance additionnelle approfondie » — premier pas de cinq ans, puis dix — pour les types eau, mousse et poudre ; la poudre à opercule (15 ans seulement) n'est pas datée, aucune périodicité ne valant quinze ans. La décennale de révision est retenue par l'entrée § 10.1.] [2026-10-07, C60, revue indépendante : la NOTE 3, relue sur le scan p. 12, est ajoutée à la citation — c'est elle que le tableau renvoie pour le halon, en révision et en durée de vie, et elle ne dit rien d'une recharge : « vidés selon une méthode permettant de récupérer le halon ». ~~Le halon a une maintenance annuelle (« 1 an ») ; il n'a ni maintenance approfondie (« — ») ni intervalle de révision. La valeur `halon` de `typeExtincteur` les lui retire (`enum_differente` sur la maintenance approfondie et sur la révision hors ERP).~~] [2026-10-08, C66 — « on s'en tient à ce que dit Julien », décision de la propriétaire : le préventeur a fourni la NF S 61-919 pour la maintenance annuelle et la révision tous les dix ans des extincteurs, dans tous les établissements, et pour rien d'autre. ~~La colonne « maintenance additionnelle approfondie » (5 et 15 ans) ne fonde plus rien~~ : `incendie-travail-extincteurs-maintenance-approfondie` est retirée (`OBLIGATIONS_RETIREES`), la question `typeExtincteur` et ses conditions `enum_differente` (halon, CO2, poudre à opercule) quittent le produit, et la décennale hors ERP vaut pour tout extincteur. Cette entrée reste au corpus parce que le tableau A.1 est l'endroit où se LIT le chiffre de dix ans que l'entrée § 10.1 fonde ; elle ne fonde elle-même aucune obligation.]",
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
        "p. 11 du scan, lue le 2026-10-07. « Ne devrait pas » : une durée de vie PRÉVUE, conditionnelle — ce n'est pas un rythme, et rien ici ne la ferait entrer au calendrier. Relevée pour que la question ne se rouvre pas. Aucune obligation ne la retient. [2026-10-07, C60] ~~L'aide du champ « Type d'extincteur » (`EquipementForm.tsx`) écrit « une durée de vie de 20 ans au plus » : plus ferme que « ne devrait pas dépasser ». Correction d'interface signalée à la passe « code », pas faite ici.~~ [2026-10-07, C62 : corrigé par C61 — l'aide écrit « la durée de vie prévue ne devrait pas dépasser 20 ans ».] [2026-10-08, C66 : la question « Type d'extincteur » et son aide sont retirées du produit (non demandé par le préventeur, décision de la propriétaire) ; la durée de vie n'est plus affichée nulle part. Rien ne fonde sur ce paragraphe.]",
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
        "~~Entrée pour être comptée, pas pour fonder.~~ [2026-10-08, C66 — ADR-039 § 8 : elle fonde désormais le rythme triennal de `elec-salarie-habilitation`, sur le RELEVÉ DU PRÉVENTEUR (`releveParPreventeur`), et sur lui seul. Décision de la propriétaire : appliquer les 3 ans sur la parole du préventeur, sans attendre le texte de la norme (« il faut appliquer mes recommandations comme des obligations par défaut », annotation du 2026-10-05). La lecture reste `indirect` : Rojer n'a toujours pas ouvert la norme, et la mention le dit — « norme non relue par Rojer ».] Le recyclage triennal de l'habilitation électrique lui est couramment attribué — c'est le « triennal » retiré par l'ADR-023 § 6 — mais le texte de la norme N'A PAS ÉTÉ OUVERT : aucun paragraphe n'est cité, aucune durée n'est relevée ici. Lecture `indirect` : `controlerRythmeRetenu` refuse qu'un rythme retenu la cite tant qu'elle n'a pas été lue à la source. « février 2020 » est porté au 1er du mois faute de jour. Arrêté relu par l'API Légifrance sandbox le 2026-10-07 (`relecture-jc-2026-10/reponses.md` Q7) : « Les référence des normes recommandées conformément aux articles R. 4544-3 et R. 4544-32 du code du travail sont les suivantes : 1° NF C 18-510 : janvier 2012 […] ; 2° NF C 18-510 /A1 : février 2020 […] ».",
      obligations: ["elec-salarie-habilitation"],
      releveParPreventeur: RELEVE_NF_C_18_510,
    },
  ],
};
