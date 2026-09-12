// Prédicats de retard — **source de vérité unique** du produit.
//
// Avant ce module, « en retard » existait en six variantes divergentes
// (calendrier, trois endroits du dashboard, recommandations, frise, PDF).
// Deux écarts d'affichage étaient déjà visibles à l'écran : le calendrier
// affichait « 3 en retard » là où le tableau de bord en annonçait 5, et une
// vérification `a_planifier` dont la date était passée était tantôt une
// urgence, tantôt un simple « à faire ». Un outil de conformité n'a pas le
// droit d'être approximatif là-dessus (règle n°8 : on n'affirme rien qu'on
// ne sache démontrer).
//
// Règle de produit fondatrice : **une échéance datée d'aujourd'hui n'est
// jamais en retard.** Le retard commence à minuit, heure de Paris, du jour
// qui suit l'échéance. L'utilisateur a toute sa journée.
//
// Comme dans `./index`, l'horloge est toujours injectée : aucun appel à
// `new Date()` ici. Cf. ADR-011.

import { debutDuJour, joursCivilsEntre } from "./index";

// ---------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------

/**
 * `date` est-elle strictement antérieure au début du jour civil courant ?
 *
 * C'est la définition canonique du retard. Comparer à `now` brut (ce que
 * faisait la moitié du code) fait basculer en retard une date civile
 * stockée à minuit UTC dès 02:00 à Paris en été — l'utilisateur ouvrait
 * son tableau de bord le matin et découvrait « en retard » une échéance du
 * jour même.
 */
export function estEnRetard(date: Date, now: Date): boolean {
  return date.getTime() < debutDuJour(now).getTime();
}

/**
 * `date` tombe-t-elle dans la fenêtre « aujourd'hui → dans `jours` jours » ?
 *
 * Bornes en **jours civils**, toutes deux incluses : aujourd'hui compte
 * (sinon une échéance du jour tombe dans un trou — ni en retard, ni à
 * venir), et le dernier jour de la fenêtre compte en entier.
 */
export function estDansLesProchainsJours(
  date: Date,
  now: Date,
  jours: number,
): boolean {
  const ecart = joursCivilsEntre(now, date);
  return ecart >= 0 && ecart <= jours;
}

/**
 * Ancienneté du retard, en jours civils. `0` si la date n'est pas en
 * retard (aujourd'hui et le futur donnent donc `0`, jamais un négatif).
 * La veille vaut `1`.
 */
export function joursDeRetard(date: Date, now: Date): number {
  if (!estEnRetard(date, now)) return 0;
  return joursCivilsEntre(date, now);
}

// ---------------------------------------------------------------------
// Vérifications périodiques
// ---------------------------------------------------------------------

/** Forme minimale attendue d'une vérification. Volontairement structurelle
 *  (et non le type Prisma) pour que le module reste utilisable côté client
 *  et dans les tests, sans importer `@prisma/client`. */
export type VerificationDatee = {
  statut: string;
  datePrevue: Date;
  /**
   * COLONNE GELÉE (ADR-034) : plus écrite depuis le 2026-09-11, et plus lue
   * par aucun prédicat depuis le N3. Elle reste dans le type le temps que les
   * lecteurs la laissent tomber ; N5 la retire de la base.
   */
  dateRealisee: Date | null;
  /**
   * **Requis, et c'est tout l'objet du champ.** La date à laquelle
   * l'obligation a cessé de s'appliquer à cette ligne (ADR-034) ; `null` =
   * ligne ouverte. Une ligne archivée ne réclame plus rien, et son statut
   * reste GELÉ dans son dernier état connu — faute de valeur `archivee` dans
   * l'enum Prisma —, si bien qu'une ligne gelée sur `depassee` se lit « en
   * retard » à perpétuité quand personne ne regarde ce champ.
   *
   * Il remplace le préfixe « Ne s'applique plus — » que ces prédicats lisaient
   * dans le libellé : un fait daté qui se lisait par `startsWith`, et que sept
   * surfaces oubliaient — la fiche de vérification, le serveur MCP, deux
   * widgets, le bandeau de recommandations, le registre de sécurité en PDF.
   * Chacune annonçait un retard sur une obligation éteinte, et le PDF
   * l'imprimait dans un document remis en contrôle. Requis, l'oubli ne
   * compile pas.
   */
  archiveLe: Date | null;
  /** Le libellé recopié du référentiel. Il ne porte plus aucun marqueur
   *  depuis le N3 : c'est du texte d'affichage, rien d'autre. */
  libelleObligation: string;
};

/**
 * La ligne est-elle ARCHIVÉE, c'est-à-dire conservée pour la preuve qu'elle
 * porte alors que son obligation ne s'applique plus ?
 *
 * Une ligne archivée ne réclame rien : ni retard, ni rendez-vous, ni
 * planification. Les trois prédicats ci-dessous s'arrêtent dessus, en
 * premier — avant même de regarder les dates.
 */
export function estVerificationArchivee(v: VerificationDatee): boolean {
  // `!=` ET NON `!==`, et c'est le sens de l'erreur qui décide. Un appelant qui
  // oublie `archiveLe: true` dans son `select` — ou une fixture fabriquée par
  // un cast — passe `undefined` : avec l'égalité stricte, TOUTE ligne se lisait
  // archivée, les trois compteurs tombaient à zéro et l'écran devenait vide
  // sans un mot. Deux relectures se sont fait prendre le même jour (2026-09-12).
  //
  // Avec `!=`, l'absence se lit « ligne ouverte » : la ligne s'affiche, elle
  // peut compter un retard de trop, et ça se voit. Une garde qui échoue doit
  // faire du bruit du côté visible, jamais du côté du silence.
  return v.archiveLe != null;
}

/** Statuts marquant une occurrence comme réalisée — le rapport existe,
 *  l'échéance est purgée quelle que soit la date. */
const STATUTS_REALISES = new Set([
  "realisee_conforme",
  "realisee_observations",
  "realisee_ecart_majeur",
]);

/**
 * Une vérification est **en retard** quand son échéance réglementaire est
 * passée sans qu'elle ait été réalisée :
 *
 *  - statut `depassee` — le passage au statut a déjà été acté ;
 *  - statut `planifiee` dont la `datePrevue` est en retard ;
 *  - statut `a_planifier` dont la `datePrevue` est en retard.
 *
 * **Arbitrage sur `a_planifier`** (les deux camps existaient dans le code) :
 * `src/lib/calendrier/queries.ts` le tenait pour non pénalisant, considérant
 * qu'une occurrence tout juste générée à la déclaration d'un équipement est
 * un simple « à faire » ; `src/lib/dashboard/recommandations.ts` faisait
 * l'inverse et le remontait en urgence. Décision retenue (ADR-011) : ce
 * n'est pas le statut qui crée l'obligation, c'est la date. Tant que la
 * `datePrevue` est à venir, `a_planifier` reste un « à faire » — c'est
 * `estVerificationAPlanifier` ci-dessous. Dès qu'elle est passée, le
 * contrôle réglementaire n'a pas été fait dans les temps : c'est un retard,
 * que l'utilisateur ait ou non pris rendez-vous. Prétendre le contraire
 * reviendrait à minorer la non-conformité, ce que le produit s'interdit.
 *
 * Une occurrence réalisée n'est jamais en retard, même si son statut n'a pas
 * été rafraîchi : la preuve prime sur l'état.
 */
export function estVerificationEnRetard(
  v: VerificationDatee,
  now: Date,
): boolean {
  if (estVerificationArchivee(v)) return false;
  // `dateRealisee` N'EST PLUS LUE (ADR-034, N3). Elle disait « cette ligne est
  // soldée », ce qui sortait des comptes une ligne roulée dont l'échéance
  // suivante était pourtant passée — le défaut du lot 3 bis. Depuis que la
  // ligne ne porte que l'échéance ouverte, seul un statut réalisé purge
  // l'échéance, et il n'en reste que sur une obligation sans rendez-vous
  // suivant, consommée.
  if (STATUTS_REALISES.has(v.statut)) return false;
  if (v.statut === "depassee") return true;
  if (v.statut === "planifiee" || v.statut === "a_planifier") {
    return estEnRetard(v.datePrevue, now);
  }
  return false;
}

/**
 * Une vérification est **à planifier** quand elle attend une date de
 * rendez-vous sans être encore en retard : statut `a_planifier`, échéance
 * aujourd'hui ou plus tard.
 *
 * Volontairement disjoint de `estVerificationEnRetard` : les deux prédicats
 * ne sont jamais vrais ensemble, un compteur « en retard » et un compteur
 * « à planifier » ne doublonnent donc jamais.
 */
export function estVerificationAPlanifier(
  v: VerificationDatee,
  now: Date,
): boolean {
  if (estVerificationArchivee(v)) return false;
  if (STATUTS_REALISES.has(v.statut)) return false;
  if (v.statut !== "a_planifier") return false;
  return !estEnRetard(v.datePrevue, now);
}

/**
 * Une vérification est **à venir** quand elle est planifiée et tombe dans
 * la fenêtre courante (par défaut l'horizon proche du produit, 30 jours).
 * Les occurrences `a_planifier` en sont exclues : sans date arrêtée avec le
 * prestataire, annoncer « prévue le 12 » serait un mensonge d'affichage.
 */
export function estVerificationAVenir(
  v: VerificationDatee,
  now: Date,
  jours: number,
): boolean {
  if (estVerificationArchivee(v)) return false;
  if (STATUTS_REALISES.has(v.statut)) return false;
  if (v.statut !== "planifiee") return false;
  return estDansLesProchainsJours(v.datePrevue, now, jours);
}

// ---------------------------------------------------------------------
// Actions correctives
// ---------------------------------------------------------------------

/** Forme minimale attendue d'une action corrective (modèle unifié,
 *  ADR-002). L'échéance est facultative en base. */
export type ActionDatee = {
  statut: string;
  echeance: Date | null;
};

/** Statuts d'action encore à traiter — par opposition à `levee` et
 *  `abandonnee`, qui sortent du plan d'actions. */
export const STATUTS_ACTION_OUVERTE: readonly string[] = ["ouverte", "en_cours"];

/** L'action est-elle encore à traiter ? */
export function estActionOuverte(a: ActionDatee): boolean {
  return STATUTS_ACTION_OUVERTE.includes(a.statut);
}

/**
 * Une action est **en retard** quand elle est encore ouverte et que son
 * échéance est passée. Une action levée ou abandonnée ne l'est jamais, même
 * si elle a été traitée après la date visée : le plan d'actions rend compte
 * de ce qui reste à faire.
 */
export function estActionEnRetard(a: ActionDatee, now: Date): boolean {
  if (!estActionOuverte(a)) return false;
  if (a.echeance === null) return false;
  return estEnRetard(a.echeance, now);
}

/**
 * Une action ouverte **sans échéance** n'est pas en retard — on ne peut pas
 * dépasser une date qui n'existe pas — mais elle ne doit pas disparaître des
 * radars pour autant : sans date, elle n'apparaît ni au calendrier, ni dans
 * la frise, ni dans les « 30 prochains jours ». C'est un angle mort du plan
 * d'actions, que ce prédicat rend repérable pour inviter à dater.
 */
export function estActionSansEcheance(a: ActionDatee): boolean {
  return estActionOuverte(a) && a.echeance === null;
}
