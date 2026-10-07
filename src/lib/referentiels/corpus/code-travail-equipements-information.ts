// Corpus : code du travail — information et formation des travailleurs à
// l'utilisation des équipements de travail.
//
// Étendue « articles_cites » : la section 1 du chapitre III compte cinq
// articles (R. 4323-1 à R. 4323-5) ; un seul est cité par le référentiel et
// un seul est ici. Le corpus ne dit donc rien des quatre autres, et ne peut
// pas se déclarer complet.
//
// POURQUOI UN FICHIER À PART. Ce corpus naît le 2026-09-01 d'un déplacement,
// pas d'une lecture nouvelle : `R. 4323-1` était rangé dans
// `code-travail-risque-chimique`, dont la portée est « prévention du risque
// chimique, aération, et formation à l'utilisation des équipements de
// travail » — une portée qui rassemblait sous un même toit deux livres
// différents du Code. L'article ouvert à la source ce jour donne le chemin :
// Livre III « Équipements de travail et moyens de protection » > Titre II >
// Chapitre III > Section 1 « Information et formation des travailleurs ». Rien
// de chimique, et aucun équipement nommé : il vise TOUT employeur et TOUT
// équipement de travail.
//
// La convention du dépôt est déjà écrite dans `code-travail-conduite.ts` :
// « Deux sections du même chapitre, deux sujets, deux corpus. » Le chapitre III
// en a maintenant trois — la section 1 ici, la section 4 (vérifications) dans
// `code-travail-levage.ts`, la section 7 (conduite) dans
// `code-travail-conduite.ts`.
//
// [2026-10-07] `esp-personnel-formation` est retirée (relecture préventeur du
// 30/09, décision de la propriétaire du 07/10) : `R. 4323-1` ne fonde plus
// rien et passe `non_couvert`, annoncé. Le paragraphe suivant décrit l'état
// d'avant.
//
// ~~CE QUE LE DÉPLACEMENT NE CORRIGE PAS.~~ Le référentiel ne cite `R. 4323-1` que
// depuis `esp-personnel-formation`, c'est-à-dire pour les seuls équipements
// sous pression, alors que l'article vise tout équipement de travail. Le
// classement du corpus cesse de le cacher ; l'écart de champ, lui, reste
// entier et n'était pas dans le lot de traçabilité.

import { ADRESSE_MANQUES_ANNONCES } from "./adresses";
import type { Corpus } from "./types";

export const CODE_TRAVAIL_EQUIPEMENTS_INFORMATION: Corpus = {
  id: "code-travail-equipements-information",
  intitule:
    "Code du travail — information et formation à l'utilisation des équipements de travail",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489707/",
  etendue: "articles_cites",
  portee:
    "Section 1 du chapitre III du titre II du livre III de la quatrième partie : ce que l'employeur doit faire savoir aux travailleurs chargés d'utiliser ou d'entretenir un équipement de travail (R. 4323-1), et la formation qui prolonge cette information (R. 4323-2 à R. 4323-5, non dépouillés). S'applique à tout employeur et à tout équipement de travail, sans condition de secteur, d'effectif ni de catégorie d'appareil.",
  articles: [
    {
      ref: "R. 4323-1",
      intitule:
        "Information des travailleurs chargés de l'utilisation ou de la maintenance",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489707/",
      versionEnVigueur: "2009-12-29",
      modifiePar: { texte: "Décret n° 2008-1156 du 7 novembre 2008 - art. 10" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "Impose à l'employeur d'informer de manière appropriée les travailleurs chargés de l'utilisation ou de la maintenance des équipements de travail sur quatre points : conditions d'utilisation ou de maintenance, instructions et consignes dont celles de la notice du fabricant, conduite à tenir face aux situations anormales prévisibles, conclusions tirées de l'expérience acquise. Obligation d'INFORMATION, permanente, sans périodicité écrite ; la formation proprement dite et son renouvellement relèvent des articles suivants de la même section 1 (R. 4323-3 en particulier). Champ : tout équipement de travail et tout employeur — l'article n'est pas propre aux équipements sous pression, et le référentiel ne le cite que pour eux.",
      citationCle:
        "L'employeur informe de manière appropriée les travailleurs chargés de l'utilisation ou de la maintenance des équipements de travail : 1° De leurs conditions d'utilisation ou de maintenance ; 2° Des instructions ou consignes les concernant notamment celles contenues dans la notice d'instructions du fabricant ; 3° De la conduite à tenir face aux situations anormales prévisibles ; 4° Des conclusions tirées de l'expérience acquise permettant de supprimer certains risques.",
      // ~~statut: "retenu", obligations: ["esp-personnel-formation"]~~ —
      // 2026-10-07 : `non_couvert`, annoncé (page « Ce que Rojer ne couvre
      // pas », domaine « Formation »). La réserve passe dans `historique`.
      statut: "non_couvert",
      motif:
        "L'OBLIGATION QUI LE CITAIT EST RETIRÉE LE 2026-10-07 — `esp-personnel-formation`, périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. L'article, lui, vise toujours tout employeur qui confie un équipement de travail : il n'est ni sans objet ni hors périmètre. Le référentiel ne le portait que pour les équipements sous pression (voir `historique`) ; il ne le porte plus du tout, et la page « Ce que Rojer ne couvre pas » le dit à tout employeur.",
      declareA: ADRESSE_MANQUES_ANNONCES,
      historique:
        "RÉSERVE DU TEMPS OÙ L'ARTICLE ÉTAIT RETENU (jusqu'au 2026-10-07) — ~~L'ARTICLE EST PLUS LARGE QUE L'OBLIGATION QUI LE CITE, et le déplacement du 2026-09-01 ne change rien à cela. `esp-personnel-formation` porte `categoriesEquipement: [\"EQUIPEMENT_SOUS_PRESSION\"]` ; R. 4323-1 ne nomme aucun équipement et s'applique à tout employeur qui en confie un à un travailleur. Un établissement sans équipement sous pression ne reçoit donc aucune ligne au titre de cet article, alors que le texte l'oblige. Élargir le champ de l'obligation, ou en créer une seconde, déplace l'empreinte du référentiel : hors du lot de traçabilité.~~",
    },
  ],
};
