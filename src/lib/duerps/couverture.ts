// Ce que le DUERP ne couvre pas, nommé.
//
// Un DUERP sorti de Rojer a toujours la même allure : les mêmes colonnes, les
// mêmes familles de risques, la même mise en page. Cette régularité est une
// qualité tant que le référentiel sectoriel a effectivement vu l'activité de
// l'établissement — et un piège dès qu'il ne l'a pas vue. Le référentiel
// commerce n'a pas d'atelier ; le DUERP d'un supermarché avec rayon boucherie
// sort donc complet d'apparence et muet sur la scie à ruban. Personne, ni le
// dirigeant ni le tiers qui lit le document, n'a de raison de s'en douter.
//
// Ce module ne comble pas le trou : il le nomme. Il rend l'état de couverture
// d'un dossier et, surtout, **la liste de ce qui n'est pas couvert** — c'est
// cette liste, pas l'état, que le document doit citer.
//
// Deux sources de manque, qui ne se confondent pas :
//
//  1. une **activité déclarée** par le dirigeant en réponse à une question
//     fermée du référentiel (`ActiviteNonCouverte`) : un manque connu d'avance,
//     documenté, dont on sait dire les familles de risques absentes ;
//  2. une **unité hors référentiel** (`estHorsReferentiel`) : une unité ajoutée
//     à la main ou importée, à laquelle le référentiel n'a rien su proposer.
//     Manque réel lui aussi, mais d'une autre nature — on sait qu'il y a un
//     angle mort, on ne sait pas ce qu'il contient.
//
// Les fusionner dans un compteur unique reviendrait à mesurer ce qui ne se
// mesure pas. Il n'y a donc ici ni total, ni pourcentage de complétude : un
// chiffre laisserait croire à une mesure, et « 80 % couvert » est une phrase
// qu'aucune source ne fonde. Des listes, et l'état qui les résume.
//
// Zéro heuristique, comme partout ailleurs dans le dépôt : rien ne se déduit
// du nom d'une unité, du libellé d'un équipement ni de la raison sociale. Une
// activité n'est non couverte que parce que le dirigeant a répondu « oui » à
// une question fermée ; une unité n'est hors référentiel que parce que sa
// liaison au référentiel est structurellement absente.
//
// Rien ici ne bloque quoi que ce soit : aucun état de couverture n'empêche de
// créer, de modifier ou de valider un DUERP. L'outil dit ce qu'il ne sait pas,
// il ne se substitue pas au dirigeant, et il ne qualifie jamais la situation
// de l'établissement au regard du droit.

import { trouverReferentielParId } from "@/lib/referentiels";
import type { ActiviteNonCouverte, Referentiel } from "@/lib/referentiels/types";
import {
  estHorsReferentiel,
  unitesHorsReferentiel,
  type UniteEvaluable,
} from "@/lib/risques/helpers";

/**
 * Une unité du DUERP, dans la forme minimale que `estHorsReferentiel` sait
 * lire, plus de quoi la nommer — puisque le document devra la citer. On étend
 * le contrat du prédicat au lieu de le recopier : la règle qui décide de ce
 * qu'est une unité hors référentiel, y compris la distinction `null` /
 * `undefined`, reste écrite à un seul endroit.
 */
export type UniteCouverture = UniteEvaluable & {
  id: string;
  nom: string;
};

/**
 * Les réponses aux questions d'activité, indexées par identifiant d'activité.
 *
 * Une clé absente et une valeur `undefined` disent la même chose — « personne
 * n'a répondu » — et ne disent surtout pas « non ». C'est la doctrine que
 * `QuestionTransverseRow.tsx` tient à l'écran (aucun des deux boutons mis en
 * avant tant que rien n'est répondu — le refus y est persisté depuis
 * l'ADR-038) et que `estHorsReferentiel`
 * tient sur les snapshots (`undefined` n'est pas un `null`) : sur un document
 * conservé quarante ans, écrire une réponse que personne n'a donnée est une
 * faute plus grave que d'avouer qu'on n'a pas posé la question.
 *
 * Le type est volontairement plus large que ce que produit
 * `lireReponsesActivites` (`Record<string, boolean>`) : il accepte aussi bien
 * une clé absente qu'un `undefined` explicite, et les traite pareil. Rien à
 * assainir avant d'appeler.
 */
type ReponsesActivitesLues = Record<string, boolean | undefined>;

/**
 * Une activité citée dans le résultat. Le `cequiManque` voyage avec elle
 * jusqu'au document : il est rédigé pour être lu par un tiers, et il n'a
 * aucune raison d'être reconstruit ailleurs.
 */
export type ActiviteCitee = {
  id: string;
  libelle: string;
  question: string;
  cequiManque: string;
};

/** Une unité que le référentiel n'a pas su outiller. */
export type UniteCitee = {
  id: string;
  nom: string;
};

/**
 * L'état de couverture, en un mot. Résumé, jamais toute la vérité : les
 * listes qui l'accompagnent sont ce qu'on cite, et `listeInstruite` se lit
 * toujours à côté de l'état.
 *
 * Aucun de ces états n'est un jugement de conformité. Ils décrivent ce que
 * l'outil sait, à sa version courante, du périmètre de l'établissement.
 */
export type EtatCouverture =
  /** Aucun référentiel sectoriel ne porte cet identifiant — dossier créé sur
   *  un NAF hors des trois secteurs couverts, ou secteur retiré depuis. Rien
   *  ne peut être dit de la couverture : il n'y a pas de référence. */
  | "secteur_inconnu"
  /** Le secteur existe, mais sa liste d'activités non couvertes est vide,
   *  c'est-à-dire non instruite. Une liste vide n'affirme pas qu'un secteur
   *  couvre tout : elle affirme que personne n'a encore regardé. */
  | "secteur_non_instruit"
  /** Au moins un manque nommé : une activité déclarée, une unité hors
   *  référentiel, ou les deux. C'est le cas qui doit se voir dans le
   *  document. */
  | "manques_identifies"
  /** Aucun manque nommé, mais des questions n'ont pas été tranchées. Le
   *  silence n'est pas un « non » : on ne peut pas conclure. */
  | "reponses_incompletes"
  /** Toutes les questions ont reçu un « non » explicite et aucune unité n'est
   *  hors référentiel. Le nom dit exactement ce qui est établi — aucun manque
   *  identifié — et pas « le document est complet », que rien ne fonde : le
   *  référentiel a un périmètre (trois secteurs, cf. CLAUDE.md), le droit
   *  n'en a pas. */
  | "aucun_manque_identifie";

/**
 * L'état de couverture d'un DUERP, sérialisable tel quel — que des chaînes,
 * des booléens et des tableaux, aucune `Date`, aucune `Map`. Il finira figé
 * dans un snapshot de version, relu des années plus tard par du code qui
 * n'existe pas encore.
 */
export type CouvertureDuerp = {
  etat: EtatCouverture;
  /** L'identifiant demandé, conservé même s'il n'a résolu aucun référentiel. */
  secteurId: string;
  /** Le nom du secteur, ou `null` si l'identifiant n'a rien résolu. */
  secteurNom: string | null;
  /**
   * `false` quand le référentiel ne porte aucune activité non couverte. À lire
   * systématiquement à côté de `etat` : un dossier peut très bien avoir des
   * unités hors référentiel (donc `manques_identifies`) **et** relever d'un
   * secteur dont la liste n'a jamais été instruite. Les deux sont vrais.
   */
  listeInstruite: boolean;
  /** Activités que le dirigeant déclare exercer, et que le référentiel ne
   *  couvre pas. Ce sont elles que le document cite, avec leur `cequiManque`. */
  activitesDeclarees: ActiviteCitee[];
  /** Activités explicitement écartées par un « non ». Conservées : un refus
   *  daté est une information, et c'est ce qui le distingue d'un silence. */
  activitesEcartees: ActiviteCitee[];
  /** Questions restées sans réponse. Ni oui ni non — l'absence de réponse se
   *  montre comme telle. */
  activitesSansReponse: ActiviteCitee[];
  /** Unités du DUERP auxquelles le référentiel n'a rien proposé. Manque d'une
   *  autre nature que les activités : jamais additionné avec elles. */
  unitesHorsReferentiel: UniteCitee[];
};

/** Projection stable d'une activité du référentiel vers le résultat. */
function citer(a: ActiviteNonCouverte): ActiviteCitee {
  return {
    id: a.id,
    libelle: a.libelle,
    question: a.question,
    cequiManque: a.cequiManque,
  };
}

/**
 * Rend l'état de couverture d'un DUERP. Fonction pure : aucun accès base,
 * aucune lecture d'horloge, aucun effet de bord — appelable depuis un écran,
 * depuis un générateur de PDF ou depuis un test avec les mêmes garanties.
 *
 * `referentiels` n'existe que pour l'injection en test, sur le modèle de
 * `reperterSansEcheance` : en production, la résolution passe par le
 * référentiel du dépôt.
 */
export function evaluerCouverture(params: {
  secteurId: string;
  reponses: ReponsesActivitesLues;
  unites: readonly UniteCouverture[];
  referentiels?: readonly Referentiel[];
}): CouvertureDuerp {
  const { secteurId, reponses, unites, referentiels } = params;

  const referentiel = referentiels
    ? referentiels.find((r) => r.id === secteurId)
    : trouverReferentielParId(secteurId);

  // Les unités se lisent toujours, même sans référentiel résolu : le prédicat
  // est structurel, il ne dépend pas du secteur. Un dossier orphelin de
  // secteur garde donc ses unités hors référentiel nommées dans le résultat.
  const horsRef: UniteCitee[] = unitesHorsReferentiel(unites).map((u) => ({
    id: u.id,
    nom: u.nom,
  }));

  if (!referentiel) {
    return {
      etat: "secteur_inconnu",
      secteurId,
      secteurNom: null,
      listeInstruite: false,
      activitesDeclarees: [],
      activitesEcartees: [],
      activitesSansReponse: [],
      unitesHorsReferentiel: horsRef,
    };
  }

  const declarees: ActiviteCitee[] = [];
  const ecartees: ActiviteCitee[] = [];
  const sansReponse: ActiviteCitee[] = [];

  // Le référentiel est l'autorité sur les questions qui existent : on itère
  // sur lui, pas sur les réponses. Une réponse portant un identifiant inconnu
  // — activité retirée du référentiel depuis, faute de frappe dans un import —
  // n'invente donc aucune ligne dans le document.
  for (const activite of referentiel.activitesNonCouvertes) {
    const reponse = reponses[activite.id];
    if (reponse === true) declarees.push(citer(activite));
    else if (reponse === false) ecartees.push(citer(activite));
    else sansReponse.push(citer(activite));
  }

  const listeInstruite = referentiel.activitesNonCouvertes.length > 0;
  const aUnManqueNomme = declarees.length > 0 || horsRef.length > 0;

  // L'ordre des cas dit ce qui prime dans le résumé. Un manque nommé passe
  // devant tout le reste : c'est le seul fait qui ait quelque chose de concret
  // à faire figurer dans le document. Le caractère non instruit du secteur ne
  // disparaît pas pour autant — il reste lisible dans `listeInstruite`.
  const etat: EtatCouverture = aUnManqueNomme
    ? "manques_identifies"
    : !listeInstruite
      ? "secteur_non_instruit"
      : sansReponse.length > 0
        ? "reponses_incompletes"
        : "aucun_manque_identifie";

  return {
    etat,
    secteurId,
    secteurNom: referentiel.nom,
    listeInstruite,
    activitesDeclarees: declarees,
    activitesEcartees: ecartees,
    activitesSansReponse: sansReponse,
    unitesHorsReferentiel: horsRef,
  };
}

/** Le prédicat d'unité, réexporté pour les appelants qui n'ont besoin que de
 *  lui — histoire qu'aucun d'eux ne soit tenté de le réécrire. */
export { estHorsReferentiel };
