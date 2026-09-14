// Libellés temporels des widgets du tableau de bord.
//
// Tous les blocs du board disaient le temps qui passe avec la même
// formule : `Math.round((date - aujourdhui) / 86 400 000)`. Appliquée à
// des dates civiles stockées à minuit UTC (cf. ADR-011), elle ne compte
// pas des jours mais des tranches de 24 h à partir de l'instant courant :
// une échéance datée d'aujourd'hui affichait « Aujourd'hui » le matin,
// puis « J−1 » à partir de 14 h à Paris — et la carte « Prochaine
// échéance » virait au rouge l'après-midi du jour dit, sans que rien
// n'ait changé dans le dossier.
//
// Les colonnes des widgets Semaine et « 30 prochains jours » souffraient de la même
// racine, en pire : elles étaient construites à minuit **local**
// (`setHours(0,0,0,0)`) puis indexées par une clé **UTC**
// (`toISOString().slice(0,10)`). À Paris, minuit local vaut 22:00 Z la
// veille : la clé de chaque colonne désignait J−1 quand son étiquette
// disait J. Tout utilisateur français voyait donc, en permanence, ses
// vérifications décalées d'une colonne.
//
// Ce module centralise les quelques primitives d'affichage concernées.
// Il ne recalcule rien lui-même : il s'appuie sur `@/lib/dates`, seule
// source de vérité du jour civil (Europe/Paris), et sur `@/lib/dates/retard`
// pour le retard. Il est volontairement sans JSX ni React, pour être
// testable en environnement `node`.

import {
  FUSEAU_REFERENCE,
  ajouterJours,
  cleJourCivil,
  debutDuJour,
  joursCivilsEntre,
} from "@/lib/dates";
import { joursDeRetard } from "@/lib/dates/retard";

// ---------------------------------------------------------------------
// Colonnes de jours (widgets Semaine et « 30 prochains jours »)
// ---------------------------------------------------------------------

const FMT_JOUR_SEMAINE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  weekday: "short",
});

const FMT_NUMERO = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "numeric",
});

const FMT_JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "2-digit",
  month: "long",
});

const FMT_DATE_COURTE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "numeric",
  month: "short",
});

function capitaliser(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Une colonne de mini-agenda : sa clé de regroupement et ses étiquettes,
 *  toutes lues dans le fuseau de référence — jamais via `getDay()` /
 *  `getDate()`, qui dépendent du fuseau du navigateur. */
export type ColonneJour = {
  /** « 2026-08-10 » — la même clé que `cleJourCivil` sur les événements. */
  cle: string;
  /** « Lun » — abrégé sans point, registre des widgets. */
  libelleJour: string;
  /** « 10 ». */
  numero: string;
  /** « 10 août » — pour l'infobulle de la heatmap. */
  libelleLong: string;
  /** Vrai pour la première colonne seulement : la fenêtre démarre au jour
   *  courant, elle ne le contient jamais deux fois. */
  estAujourdhui: boolean;
};

/**
 * Fenêtre glissante de `nb` jours civils à partir d'aujourd'hui inclus.
 *
 * Les colonnes sont posées sur les minuits de Paris (`debutDuJour` puis
 * `ajouterJours`) : leur clé est celle du jour qu'elles affichent, et les
 * événements indexés par `cleJourCivil` retombent dans la bonne case.
 */
export function colonnesJours(aujourdhui: Date, nb: number): ColonneJour[] {
  const debut = debutDuJour(aujourdhui);
  return Array.from({ length: nb }, (_, i) => {
    const d = ajouterJours(debut, i);
    return {
      cle: cleJourCivil(d),
      libelleJour: capitaliser(FMT_JOUR_SEMAINE.format(d).replace(".", "")),
      numero: FMT_NUMERO.format(d),
      libelleLong: FMT_JOUR_MOIS.format(d),
      estAujourdhui: i === 0,
    };
  });
}

// ---------------------------------------------------------------------
// Écarts affichés
// ---------------------------------------------------------------------

/**
 * « Aujourd'hui », « J+3 », « 2 j de retard ». L'écart est compté en **jours
 * civils** : il ne change qu'à minuit, heure de Paris, jamais en cours
 * d'après-midi.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LE PASSÉ NE S'ÉCRIT PLUS EN « J− » — CORRECTION DU 2026-09-03
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Ces deux fonctions rendaient `J−96` pour une échéance dépassée de 96 jours,
 * et le widget « À faire » l'affichait à côté du sous-titre « Vérification ·
 * en retard ». Les deux se contredisaient sur la même ligne.
 *
 * La donnée était juste — `joursCivilsEntre` rend bien un écart négatif pour
 * une date passée. C'est la NOTATION qui mentait. « J−3 » est un compte à
 * rebours : en français, J−1 est la veille, J−3 le surlendemain de
 * l'avant-veille — bref, trois jours À VENIR. Le code s'en servait comme d'un
 * simple signe algébrique (« aujourd'hui moins trois jours »), et les deux
 * lectures sont exactement inverses.
 *
 * Deux remèdes se présentaient. Inverser le signe — « J+96 » pour un retard,
 * « J−12 » pour une échéance dans douze jours — rétablit la convention, mais
 * réécrit TOUS les badges du futur, qui sont l'écrasante majorité, et laisse
 * le lecteur devant une notation d'ingénieur.
 *
 * L'autre, retenue : **le futur garde `J+n`, le passé dit son retard en
 * toutes lettres.** Le mot ne se lit que d'une façon, et il n'introduit aucun
 * vocabulaire — le produit écrit déjà « depuis 3 j » (`libelleAnciennete`),
 * « j. de retard » (`compteARebours`) et « 4 actions dépassent leur
 * échéance ». Il ne restait que ces deux badges pour dire le contraire.
 */
export function libelleEcart(date: Date, aujourdhui: Date): string {
  const j = joursCivilsEntre(aujourdhui, date);
  if (j === 0) return "Aujourd'hui";
  if (j > 0) return `J+${j}`;
  return `${-j} j de retard`;
}

/** Même écart, en pastille : « Auj. » tient là où « Aujourd'hui » déborde.
 *  Le retard s'y écrit comme dans `libelleEcart` : « J− » disait l'inverse de
 *  ce qu'il comptait, voir la note ci-dessus. */
export function badgeEcart(date: Date, aujourdhui: Date): string {
  const j = joursCivilsEntre(aujourdhui, date);
  if (j === 0) return "Auj.";
  if (j > 0) return `J+${j}`;
  return `${-j} j de retard`;
}

/** Compte à rebours des cartes-chiffre : le nombre et sa légende.
 *  Le jour dit vaut zéro — ni retard, ni « 1 jour ». */
export function compteARebours(
  date: Date,
  aujourdhui: Date,
): { nombre: number; legende: string } {
  const j = joursCivilsEntre(aujourdhui, date);
  if (j === 0) return { nombre: 0, legende: "aujourd'hui" };
  if (j < 0) return { nombre: -j, legende: "j. de retard" };
  return { nombre: j, legende: j > 1 ? "jours" : "jour" };
}

/**
 * Ancienneté d'un retard, telle qu'elle s'écrit dans une méta de carte.
 * `null` le jour de l'échéance : rien n'est encore dépassé, et le
 * `Math.max(1, …)` qu'on trouvait dans le brief annonçait « depuis 1 j »
 * dès le jour J.
 */
export function libelleAnciennete(
  date: Date,
  aujourdhui: Date,
): string | null {
  const j = joursDeRetard(date, aujourdhui);
  if (j === 0) return null;
  if (j === 1) return "depuis hier";
  return `depuis ${j} j`;
}

/** « Aujourd'hui », « Hier », puis la date courte — journal des
 *  mouvements récents. Compté en jours civils, comme le reste. */
export function libelleAnteriorite(date: Date, aujourdhui: Date): string {
  const j = joursCivilsEntre(date, aujourdhui);
  if (j <= 0) return "Aujourd'hui";
  if (j === 1) return "Hier";
  return FMT_DATE_COURTE.format(date);
}

/** « 24 sept. » — date courte des cartes, épinglée sur Europe/Paris. */
export function libelleDateCourte(d: Date): string {
  return FMT_DATE_COURTE.format(d);
}
