// Corpus : arrêté du 21 décembre 1993 — portes et portails automatiques.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const ARRETE_1993_12_21_PORTES: Corpus = {
  id: "arrete-1993-12-21-portes",
  intitule: "Arrêté du 21 décembre 1993 — portes et portails automatiques",
  url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006082855",
  etendue: "articles_cites",
  portee:
    "Prescriptions techniques des installations (art. 2 à 5), dossier de maintenance (art. 8) et vérification au minimum semestrielle (art. 9). Plusieurs articles citent encore la numérotation du code du travail antérieure à 2008.",
  articles: [
    {
      ref: "Arrêté 1993-12-21 art. 2",
      intitule:
        "Prescriptions des installations nouvelles destinées au passage de véhicules",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679555",
      versionEnVigueur: "1994-07-13",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Dix prescriptions de CONSTRUCTION (§ 1, a à j) pour les installations NOUVELLES destinées au passage de VÉHICULES, plus deux prescriptions complémentaires quand la porte est accessible au public (§ 2). Aucun acte de vérification, aucune périodicité : ce sont des caractéristiques que l'installation doit présenter. Les portes pour piétons relèvent de l'article 4, non de celui-ci.",
      citationCle:
        "b) Un dispositif à sécurité positive doit interrompre immédiatement tout mouvement d'ouverture ou de fermeture de la porte ou du portail lorsque ce mouvement peut causer un dommage à une personne ; […] d) Les dispositifs à sécurité positive doivent protéger les zones d'écrasement et de cisaillement et, le cas échéant, les zones de coincement ; ces dispositifs sont des détections de présence et des détections de contact.",
      statut: "retenu",
      obligations: [
        "porte-auto-portail-piete-coulissant",
        "porte-auto-verification-initiale",
      ],
      reserve:
        "AUCUN EXAMEN DE SÉCURITÉ À LA MISE EN SERVICE DANS CET ARRÊTÉ — relevé le 2026-09-01, articles 2, 3, 4, 8 et 9 ouverts. L'article 2 fixe des caractéristiques, l'article 3 une présomption de conformité aux normes citées en annexe, l'article 4 les mêmes exigences pour les portes de piétons, l'article 8 un dossier de maintenance dû par le MAÎTRE D'OUVRAGE, et l'article 9 la vérification périodique. Nulle part un acte de contrôle daté par la mise en service. `porte-auto-verification-initiale` — « Examen de sécurité à la mise en service », criticité 5, réalisateur organisme agréé — n'a donc pas de porteur textuel dans les articles 2 à 4 qu'elle cite : ce qu'ils imposent est un état de l'installation, dû dès l'origine et non un examen.\n\nCONFIRMÉ ET ÉTENDU LE 2026-09-01 PAR LE LOT A, QUI N'A PAS TROUVÉ LE PORTEUR AILLEURS NON PLUS. Les SIX articles que ce relevé n'avait pas ouverts l'ont été : art. 1er (définitions), art. 5, 6 et 7 (installations EXISTANTES, modification, mise en conformité — des états à atteindre, aucun acte de contrôle), art. 10 et 11 (entrée en vigueur, exécution). L'arrêté est donc INTÉGRALEMENT lu sur ce point, et il ne porte pas cet examen. Hors de l'arrêté : la section 2 « Portes et portails » du code du travail (R. 4224-9 à R. 4224-13), R. 4224-17 et le décret n° 92-332 du 31 mars 1992 — qui s'adresse aux maîtres d'ouvrage — ont été ouverts, aucun ne date un acte par la mise en service. Le détail de la recherche est dans les `notesInternes` de l'obligation. LA LIGNE EST MAINTENUE, criticité 5 : la retirer est une décision de la propriétaire.\n\nDEUX RENVOIS À UNE NUMÉROTATION ABROGÉE, à ne pas recopier. LES DEUX RENVOIS MORTS SONT DANS LE TEXTE OFFICIEL, pas dans le référentiel : c'est l'arrêté du 21 décembre 1993 lui-même, tel que Légifrance le publie aujourd'hui, qui les porte. Le i) du § 1 de l'article 2 renvoie à « l'arrêté prévu par l'article R. 232-1-13 du code du travail » ; l'article 8 s'ouvre sur « En application de l'article R. 235-5 du code du travail, le maître d'ouvrage doit élaborer et transmettre à l'utilisateur un dossier de maintenance des portes et portails ». Les deux numéros ont disparu à la recodification du code du travail de 2008 (décret n° 2008-244 du 7 mars 2008), et l'arrêté n'a pas été rafraîchi depuis. Relevé le 2026-09-01, article 8 relu à la source le même jour.\n\nUNE SEULE DES DEUX CORRESPONDANCES EST VÉRIFIÉE. `R. 235-5` → `R. 4211-3`, vérifié le 2026-09-01 sur le CONTENU, à la source : R. 4211-3 dispose que « le maître d'ouvrage élabore et transmet aux utilisateurs, lors de la prise de possession des lieux et au plus tard un mois après, un dossier de maintenance des lieux de travail », dans la section 2 « Dossier de maintenance » du titre des obligations du maître d'ouvrage. Même acteur, même acte, même objet que le renvoi de l'article 8 — c'est ce qui fonde la correspondance, pas une table de concordance, qui n'a pas été lue.\n\n`R. 232-1-13` N'A PAS DE CORRESPONDANCE ÉTABLIE ICI, et aucune n'est inventée. Elle n'a pas été cherchée à la source, et une correspondance posée de mémoire vaudrait moins que rien : elle se recopierait comme un constat.",
    },
    {
      ref: "Arrêté 1993-12-21 art. 9",
      intitule: "Entretien et vérification périodique des portes et portails",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000054109592",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Entretien et vérification périodiques des portes et portails automatiques ou semi-automatiques, au minimum SEMESTRIELS et « à la suite de toute défaillance », par un technicien qualifié de l'entreprise spécialement formé ou par un prestataire extérieur sous contrat écrit ; consignation de toutes les interventions dans un livret d'entretien, joint au dossier de R. 4224-17.",
      citationCle:
        "Les portes ou portails automatiques ou semi-automatiques installés sur les lieux de travail doivent être entretenus et vérifiés périodiquement et à la suite de toute défaillance. La périodicité des visites est au minimum semestrielle et adaptée à la fréquence de l'utilisation et à la nature de la porte ou du portail.",
      statut: "retenu",
      obligations: [
        "porte-auto-dossier-maintenance",
        "porte-auto-verification-semestrielle",
      ],
      reserve:
        "TROIS CHOSES RELEVÉES LE 2026-09-01 QUE LE RÉFÉRENTIEL NE PORTE PAS.\n\n(1) « Au minimum semestrielle ET ADAPTÉE à la fréquence de l'utilisation et à la nature de la porte » : le semestre est un PLAFOND de délai, pas un rythme. Une porte très sollicitée doit être vérifiée plus souvent, et rien dans le produit ne le dira. La périodicité encodée reste juste comme borne, elle est fausse comme description.\n\n(2) Le second déclencheur — « et à la suite de toute défaillance » — n'est encodé nulle part : `porte-auto-verification-semestrielle` est une échéance récurrente pure.\n\n(3) L'article impose un ÉCRIT PRÉALABLE selon le réalisateur : un document de méthodes et procédures si la vérification est faite en interne, un contrat écrit si elle est confiée à un prestataire. `porte-auto-dossier-maintenance` ne nomme que le livret d'entretien et le dossier. Non corrigé.",
    },
  ],
};
