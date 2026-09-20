// Corpus : code du travail — portes et portails, maintenance des lieux de travail.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_PORTES: Corpus = {
  id: "code-travail-portes",
  intitule:
    "Code du travail — portes et portails, maintenance des lieux de travail",
  url: "https://www.legifrance.gouv.fr/codes/id/LEGISCTA000018532219/",
  etendue: "articles_cites",
  portee:
    "Section 2 « Portes et portails » (R. 4224-12, R. 4224-13) et section 4 « Maintenance, entretien et vérifications » (R. 4224-17). R. 4224-13 est un article de renvoi : il n'institue aucun examen.",
  articles: [
    {
      ref: "R. 4224-13",
      intitule: "Portes et portails automatiques",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532209",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Deux phrases : une obligation de résultat — les portes et portails automatiques fonctionnent sans risque d'accident —, et un renvoi à l'arrêté du 21 décembre 1993 pour les caractéristiques, la maintenance et la vérification. Aucun acte, aucune périodicité en propre.",
      citationCle:
        "Les portes et portails automatiques fonctionnent sans risque d'accident pour les travailleurs. Les caractéristiques auxquelles obéissent les installations nouvelles et existantes de portes et portails automatiques ainsi que leurs conditions de maintenance et de vérification sont définies par arrêté conjoint des ministres chargés du travail et de l'agriculture.",
      statut: "retenu",
      obligations: [
        "porte-auto-maintien-en-etat",
        "porte-auto-verification-initiale",
      ],
    },
    {
      ref: "R. 4224-17",
      intitule:
        "Entretien et vérification des installations et dispositifs techniques et de sécurité des lieux de travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532197",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Article GÉNÉRAL du bâti technique, et non un article de portes. Il impose trois choses à l'employeur, pour TOUTES les installations et TOUS les dispositifs techniques et de sécurité des lieux de travail : les entretenir et les vérifier « suivant une périodicité appropriée », éliminer sans délai toute défectuosité, et consigner la périodicité des contrôles et les interventions dans un dossier annexé au dossier de maintenance des lieux de travail. La périodicité n'est pas chiffrée : elle est « appropriée », donc renvoyée à chaque texte spécial.",
      citationCle:
        "Les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée. Toute défectuosité susceptible d'affecter la santé et la sécurité des travailleurs est éliminée le plus rapidement possible. La périodicité des contrôles et les interventions sont consignées dans un dossier qui est, le cas échéant, annexé au dossier de maintenance des lieux de travail prévu à l'article R. 4211-3. Ce dossier regroupe notamment la consigne et les documents prévus en matière d'aération, d'assainissement et d'éclairage aux articles R. 4222-21 et R. 4223-11.",
      statut: "retenu",
      obligations: [
        "porte-auto-dossier-maintenance",
        "porte-auto-maintien-en-etat",
      ],
      reserve:
        "CHAMP RELEVÉ LE 2026-09-01, et il déborde très largement l'usage qu'en fait le référentiel. L'article ne nomme aucune porte : son sujet est « les installations et dispositifs techniques et de sécurité DES LIEUX DE TRAVAIL », et son chemin le confirme — Livre II, Titre II, Chapitre IV « Sécurité des lieux de travail », SECTION 4 « Maintenance, entretien et vérifications », section autonome de la section 2 « Portes et portails ». Il porte donc, du même mouvement, l'électricité, l'éclairage, l'aération, le désenfumage, les portes, et tout dispositif de sécurité du bâtiment.\n\nDeux conséquences que le référentiel n'encode pas. (1) Le dossier de consignation qu'il institue est UN dossier, unique, pour tout l'établissement — le référentiel ne le porte que sous `porte-auto-dossier-maintenance`, rattaché aux seules catégories PORTE_AUTO et PORTAIL_AUTO : un établissement sans porte automatique n'en reçoit rien, alors que l'article l'oblige. (2) [RÉÉCRIT LE 2026-09-04, VOIR CI-DESSOUS : CETTE MOITIÉ ÉTAIT UN RENVOI LU À MOITIÉ.] Sa dernière phrase y agrège nommément « la consigne et les documents prévus en matière d'aération, d'assainissement et d'éclairage aux articles R. 4222-21 et R. 4223-11 » — soit exactement la consigne de ventilation de R. 4222-21, que le référentiel n'encode nulle part.\n\nAucune périodicité n'en sort : « appropriée » n'est pas un rythme. Non corrigé — le lot relève, il ne rebranche pas.\n\nCORRECTION DU 2026-09-04 — LE RENVOI NOMME DEUX ARTICLES, LA RÉSERVE N'EN LISAIT QU'UN. Écrite le 2026-09-01, sa parenthèse (2) recopiait la phrase entière — « aux articles R. 4222-21 ET R. 4223-11 » — puis n'en tirait qu'un seul document, « la consigne de ventilation de R. 4222-21 ». Le second, celui de l'ÉCLAIRAGE, n'était pas même nommé. C'est le défaut que la skill de veille tient sous le nom de renvoi d'intervalle lu par son seul terme cité : le mot qui décide se trouve dans la moitié qu'on n'a pas ouverte. Ici il n'y avait même pas d'intervalle, seulement une conjonction.\n\nCE QUE LE RENVOI PORTE EXACTEMENT, ARTICLE PAR ARTICLE. `R. 4222-21` : une CONSIGNE D'UTILISATION de la ventilation, disant les dispositions prises et les mesures à prendre en cas de panne, soumise à l'avis du médecin du travail et du CSE. `R. 4223-11` : un DOCUMENT consignant les règles d'entretien périodique du matériel d'ÉCLAIRAGE, que l'employeur fixe, communiqué aux membres du CSE. Deux écrits distincts, deux articles distincts, un seul dossier qui les regroupe.\n\nÉTAT AU 2026-09-04 : un sur deux est porté. Le document d'éclairage l'est depuis ce jour, par `eclairage-etablissement-regles-entretien` (porteur établissement, `etat_permanent`, `pieceAttendue`). ~~La consigne de ventilation de `R. 4222-21` ne l'est toujours pas, et reste `obligation_manquante` au corpus `code-travail-risque-chimique`.~~ [2026-09-20 : elle l'est — `aeration-etablissement-consigne-utilisation`.] Les DEUX documents sont donc portés. La phrase « que le référentiel n'encode nulle part » vaut donc encore pour elle, et pour elle seule.",
    },
  ],
};
