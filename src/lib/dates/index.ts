// Dates civiles du produit — primitives pures, fuseau de référence unique.
//
// Le problème que ce module résout (cf. ADR-011) : toutes les dates
// saisies par l'utilisateur (échéance d'action, `datePrevue` d'une
// vérification, validité d'une attestation, `dateReleve`, `dateAnalyse`,
// `dateRapport`) arrivent en « AAAA-MM-JJ » et sont stockées par Prisma
// en `DateTime`, c'est-à-dire à **minuit UTC**. Ce sont pourtant des
// *dates civiles* : « le 10 août », pas « l'instant 2026-08-10T00:00:00Z ».
// Les comparer à `new Date()` brut fait basculer une échéance du jour en
// « en retard » dès 00:00 UTC — soit 02:00 à Paris en été.
//
// Deux règles structurent tout le fichier :
//
//  1. **Europe/Paris est le fuseau de référence produit.** Aucune
//     composante civile (année, mois, jour, heure) n'est lue via
//     `getFullYear()` / `getMonth()` / `getDate()`, qui dépendent du
//     fuseau du serveur : tout passe par `Intl.DateTimeFormat` avec
//     `timeZone: "Europe/Paris"` explicite. Conséquence utile : ces
//     fonctions donnent le même résultat quel que soit `TZ`, en
//     production comme en test.
//     [2026-10-28, plan performance] Le DÉCALAGE de Paris vient toujours
//     d'`Intl`, mais lu une fois par heure UTC ; les composantes en dérivent
//     par `getUTC*` sur l'instant décalé (`decalageMemorise`), seulement pour
//     une heure où ce décalage ne change pas — vérifié à la lecture de
//     l'heure, pas supposé. Ailleurs, un `getUTC*` sur une date civile reste
//     une faute.
//
//  2. **L'horloge est toujours injectée.** Aucune fonction d'ici n'appelle
//     `new Date()` ni `Date.now()` sans paramètre. C'est ce qui rend les
//     règles d'échéance reproductibles et testables — principe zéro-IA /
//     déterminisme du projet.
//
// Aucune dépendance externe : ni date-fns, ni luxon. L'arithmétique
// calendaire est implémentée ici, en une centaine de lignes, avec ses
// tests.

/** Fuseau de référence du produit. Rojer s'adresse à des TPE/PME
 *  françaises métropolitaines : toute date civile s'entend à Paris,
 *  quel que soit le fuseau du serveur ou du navigateur. */
export const FUSEAU_REFERENCE = "Europe/Paris";

/** Une journée en millisecondes. Réservé à la **géométrie** (largeur
 *  d'une frise, position d'un marqueur en pixels). Ne jamais s'en servir
 *  pour ajouter des jours à une date : un jour civil ne fait pas toujours
 *  24 h (changements d'heure). Utiliser `ajouterJours`. */
export const MS_PAR_JOUR = 86_400_000;

/** Horizon « prochainement » du produit : ce que l'utilisateur doit voir
 *  arriver sur son tableau de bord et son calendrier. Remplace les `30`
 *  dispersés dans les requêtes. */
export const JOURS_HORIZON_PROCHE = 30;

/** Fenêtre d'alerte avant l'expiration d'un document à durée de validité
 *  (attestations de vigilance prestataires, attestation d'accessibilité…).
 *  Même valeur que l'horizon proche, mais sémantique distincte : les deux
 *  peuvent diverger sans se contaminer. */
export const JOURS_ALERTE_EXPIRATION = 30;

/** Un an, exprimé en **mois calendaires**. Remplace les littéraux `365`
 *  dispersés : `365 * 86_400_000` se décale d'un jour à chaque année
 *  bissextile et d'une heure à chaque changement d'heure, alors que
 *  `ajouterMois(d, 12)` retombe toujours sur la même date civile.
 *  Les périodicités **réglementaires** (annuelle, triennale…) restent,
 *  elles, dans le référentiel de conformité — ADR-003. */
export const MOIS_PERIODE_ANNUELLE = 12;

/** Fenêtre d'historique affichée par le produit (« réalisées sur les 12
 *  derniers mois »). C'est un choix d'affichage, pas une règle légale. */
export const MOIS_FENETRE_HISTORIQUE = 12;

// ---------------------------------------------------------------------
// Composantes civiles
// ---------------------------------------------------------------------

/** Les composantes d'un instant, lues dans le fuseau de référence. */
export type ComposantesCiviles = {
  annee: number;
  /** 1–12 (et non 0–11 : on manipule des dates lisibles, pas l'API Date). */
  mois: number;
  jour: number;
  heure: number;
  minute: number;
  seconde: number;
  milliseconde: number;
};

// `en-CA` produit « 2026-08-10 » en date, et `hourCycle: h23` évite le
// « 24 » que certaines locales renvoient à minuit. On formate en parts
// pour n'avoir aucune analyse de chaîne à faire ensuite.
const FORMATEUR_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSEAU_REFERENCE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Les composantes lues par `Intl` — le chemin lent, hors de la plage
 *  mémorisée. Non exporté : `composantesCiviles` est la seule lecture. */
function composantesCivilesIntl(d: Date): ComposantesCiviles {
  const parts = FORMATEUR_PARTS.formatToParts(d);
  const lire = (type: Intl.DateTimeFormatPartTypes): number => {
    const p = parts.find((x) => x.type === type);
    return p ? Number(p.value) : 0;
  };
  return {
    annee: lire("year"),
    mois: lire("month"),
    jour: lire("day"),
    heure: lire("hour"),
    minute: lire("minute"),
    seconde: lire("second"),
    // Aucun fuseau n'a de décalage fractionnaire de seconde : les
    // millisecondes de l'instant sont celles de l'heure civile.
    milliseconde: d.getUTCMilliseconds(),
  };
}

/** Le décalage lu par `Intl` à l'instant donné. */
function decalageIntlMs(d: Date): number {
  const c = composantesCivilesIntl(d);
  const commeSiUtc = Date.UTC(
    c.annee,
    c.mois - 1,
    c.jour,
    c.heure,
    c.minute,
    c.seconde,
  );
  return commeSiUtc - (d.getTime() - d.getUTCMilliseconds());
}

// [2026-10-28, plan performance] Le décalage, mémorisé par heure UTC.
//
// `formatToParts` coûte quelques microsecondes, et un rendu en fait des
// dizaines de milliers : `instantCivil` l'appelle deux fois, `debutDuJour`
// trois. Mesuré au profileur sur le tableau de bord du gros dossier : ≈ 115 ms
// de calcul par affichage, la moitié de la page.
//
// Or le décalage de Paris ne change qu'aux changements d'heure, deux fois par
// an. Une heure UTC où il est le même au début et à la fin — toutes, sauf
// celle d'un changement qui ne tomberait pas sur une heure pleine — est lue
// une fois, et les composantes en dérivent par l'arithmétique UTC, à
// l'identique (`dates/composantes-rapides.test.ts`). Une heure où il change
// est marquée, et lue par `Intl` à chaque appel : aucune hypothèse sur les
// données de fuseau. [2026-10-29, revue : remplace une plage fixe 1981-2199
// supposée alignée sur les heures pleines.] Hors des années 1000 à 9999
// (format de l'année d'`Intl`), et pour une date invalide (même erreur
// qu'avant), la lecture reste celle d'`Intl`.
const HEURE_MS = 3_600_000;
const DEBUT_PLAGE = Date.UTC(1000, 0, 1);
const FIN_PLAGE = Date.UTC(10_000, 0, 1);
/** Valeur mémorisée d'une heure où le décalage change : lire par `Intl`. */
const VARIABLE = Number.NaN;
// Une mémoire bornée. Les dates du produit sont surtout des minuits civils
// (une ou deux heures UTC par jour), mais un horodatage peut tomber sur
// n'importe quelle heure : 8 760 par an au plus. Deux générations : quand la
// récente atteint le plafond, elle devient l'ancienne et la précédente est
// oubliée — les heures encore lues survivent au passage, sans falaise où
// tout serait relu d'un coup. Devant elles, la dernière heure lue : les
// appels successifs tombent surtout dans la même.
const PLAFOND_GENERATION = 50_000;
let decalagesRecents = new Map<number, number>();
let decalagesAnciens = new Map<number, number>();
let derniereHeure = Number.NaN;
let dernierDecalage = VARIABLE;

/** Le décalage de l'heure UTC `heure`, ou `VARIABLE` s'il y change. */
function decalageDeLHeure(heure: number): number {
  const debut = decalageIntlMs(new Date(heure * HEURE_MS));
  const fin = decalageIntlMs(new Date((heure + 1) * HEURE_MS - 1));
  return debut === fin ? debut : VARIABLE;
}

/** Le décalage mémorisé de l'heure UTC de `t`, ou `null` si `t` sort de la
 *  plage, est invalide, ou tombe dans une heure où le décalage change. */
function decalageMemorise(t: number): number | null {
  if (!(t >= DEBUT_PLAGE && t < FIN_PLAGE)) return null;
  const heure = Math.floor(t / HEURE_MS);
  if (heure !== derniereHeure) {
    let decalage = decalagesRecents.get(heure);
    if (decalage === undefined) {
      decalage = decalagesAnciens.get(heure) ?? decalageDeLHeure(heure);
      if (decalagesRecents.size >= PLAFOND_GENERATION) {
        decalagesAnciens = decalagesRecents;
        decalagesRecents = new Map();
      }
      decalagesRecents.set(heure, decalage);
    }
    derniereHeure = heure;
    dernierDecalage = decalage;
  }
  return Number.isNaN(dernierDecalage) ? null : dernierDecalage;
}

/**
 * Décalage Europe/Paris ↔ UTC, en millisecondes, **à l'instant `t`**
 * (+1 h en hiver, +2 h en été). Interne : sert à reconstruire un instant
 * depuis des composantes civiles. Prend un nombre : sur le chemin rapide,
 * aucune `Date` n'est construite.
 */
function decalageMs(t: number): number {
  return decalageMemorise(t) ?? decalageIntlMs(new Date(t));
}

/**
 * Décompose un instant en composantes civiles Europe/Paris.
 * C'est la brique de base : tout le reste du module en dérive.
 */
export function composantesCiviles(d: Date): ComposantesCiviles {
  const t = d.getTime();
  const decalage = decalageMemorise(t);
  if (decalage === null) return composantesCivilesIntl(d);
  // L'heure civile, c'est l'instant décalé, lu en UTC. Le décalage est un
  // nombre entier de secondes : les millisecondes ne bougent pas.
  const civil = new Date(t + decalage);
  return {
    annee: civil.getUTCFullYear(),
    mois: civil.getUTCMonth() + 1,
    jour: civil.getUTCDate(),
    heure: civil.getUTCHours(),
    minute: civil.getUTCMinutes(),
    seconde: civil.getUTCSeconds(),
    milliseconde: civil.getUTCMilliseconds(),
  };
}

/**
 * Reconstruit l'instant correspondant à une heure civile de Paris.
 *
 * Deux passes : la première estime le décalage en supposant l'heure
 * civile lue en UTC, la seconde le corrige si l'instant candidat tombe de
 * l'autre côté d'un changement d'heure. Les transitions Europe/Paris ont
 * lieu à 02:00/03:00 locales — minuit civil existe donc toujours et n'est
 * jamais ambigu, ce qui est le seul cas dont dépendent les échéances.
 */
export function instantCivil(
  annee: number,
  mois: number,
  jour: number,
  heure = 0,
  minute = 0,
  seconde = 0,
  milliseconde = 0,
): Date {
  const naif = Date.UTC(annee, mois - 1, jour, heure, minute, seconde, milliseconde);
  const decalage1 = decalageMs(naif);
  const candidat = naif - decalage1;
  const decalage2 = decalageMs(candidat);
  return new Date(decalage2 === decalage1 ? candidat : naif - decalage2);
}

// ---------------------------------------------------------------------
// Jour civil
// ---------------------------------------------------------------------

/**
 * Début du jour civil (minuit heure de Paris) auquel appartient
 * l'instant donné. Appliqué à `now`, c'est la **borne de référence du
 * retard** : tout ce qui est strictement avant est passé.
 *
 * Sert aussi à normaliser une date civile avant stockage : n'importe quel
 * instant du 10 août ramène au même instant canonique.
 */
export function debutDuJour(now: Date): Date {
  const c = composantesCiviles(now);
  return instantCivil(c.annee, c.mois, c.jour);
}

/**
 * Clé « AAAA-MM-JJ » du jour civil, en heure de Paris.
 *
 * Remplace les `d.toISOString().slice(0, 10)` : sur une date stockée à
 * minuit UTC l'ISO tombe juste par hasard, mais sur un instant réel de
 * soirée (23:30 à Paris en été = 21:30 UTC… et 00:30 UTC en hiver) il
 * décale d'un jour. À utiliser pour tout regroupement par jour.
 */
export function cleJourCivil(d: Date): string {
  const c = composantesCiviles(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${c.annee}-${pad(c.mois)}-${pad(c.jour)}`;
}

/**
 * Instant canonique (minuit Paris) d'une clé « AAAA-MM-JJ ».
 * Réciproque de `cleJourCivil`. Utile pour transformer une saisie de
 * formulaire `<input type="date">` en date civile sans passer par
 * `new Date("2026-08-10")`, qui produit minuit **UTC**.
 */
export function depuisCleJourCivil(cle: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cle);
  if (!m) {
    throw new Error(`Clé de jour civil invalide : « ${cle} » (attendu AAAA-MM-JJ)`);
  }
  return instantCivil(Number(m[1]), Number(m[2]), Number(m[3]));
}

/**
 * « AAAA-MM-JJ » désigne-t-il un jour qui existe ?
 *
 * Le motif seul ne le dit pas : « 2026-02-30 » et « 2026-13-45 » le passent, et
 * `depuisCleJourCivil` les reconstruit sans rien dire en 2026-03-02 et
 * 2027-02-14. C'est la règle de tout schéma de saisie de date (ASVS V2.2.1,
 * 2026-10-13) : un `.regex()` de date est toujours suivi de ce prédicat —
 * `validation-entrees.test.ts` en relève l'emploi dans les sources.
 *
 * Arithmétique pure sur les composantes : le dernier jour du mois se lit par
 * `Date.UTC(annee, mois, 0)`, qui ne dépend d'aucun fuseau.
 *
 * (Né dans `prestataires/schema.ts` à la contre-lecture du 2026-09-27, pour
 * les seules dates de l'attestation de vigilance ; remonté ici le 2026-10-13
 * pour servir à tous.)
 */
export function estJourCivilReel(cle: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cle);
  if (!m) return false;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mois < 1 || mois > 12 || jour < 1) return false;
  return jour <= new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/**
 * Pendant d'`estJourCivilReel` pour une saisie `datetime-local` : la forme
 * exacte que lit `depuisSaisieDateHeure` (sans secondes), un jour réel, une
 * heure de 00 à 23 et une minute de 00 à 59. Une saisie refusée ici aurait
 * fait lever `depuisSaisieDateHeure` (forme à secondes) ou été reportée en
 * silence (« T25:00 » devient le lendemain).
 */
export function estSaisieDateHeureReelle(valeur: string): boolean {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(valeur);
  if (!m) return false;
  return estJourCivilReel(m[1]) && Number(m[2]) <= 23 && Number(m[3]) <= 59;
}

/**
 * Instant d'une saisie `<input type="datetime-local">` (« AAAA-MM-JJTHH:MM »),
 * ancré sur l'heure de Paris.
 *
 * Une chaîne datetime-local n'a **pas d'offset** : `new Date("2026-08-10T14:30")`
 * l'interprète dans le fuseau du runtime. Ces `safeParse` tournent dans des
 * server actions : la référence était donc le fuseau du serveur, pas celui de
 * l'utilisateur. Sur un runtime en UTC — le défaut en conteneur — 14:30 saisi à
 * Paris était stocké 14:30 Z, puis réaffiché 16:30.
 *
 * C'est la fenêtre du permis de feu et la période de surveillance qui se
 * décalaient ainsi : la raison d'être même du document.
 */
export function depuisSaisieDateHeure(valeur: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valeur);
  if (!m) {
    throw new Error(
      `Saisie date-heure invalide : « ${valeur} » (attendu AAAA-MM-JJTHH:MM)`,
    );
  }
  return instantCivil(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
}

/**
 * Réciproque de `depuisSaisieDateHeure` : la valeur « AAAA-MM-JJTHH:MM » qu'un
 * `<input type="datetime-local">` affiche pour un instant, en heure de Paris.
 * Sert aux écrans « Modifier », qui rouvrent une saisie (2026-10-12).
 */
export function versSaisieDateHeure(d: Date): string {
  const c = composantesCiviles(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${cleJourCivil(d)}T${pad(c.heure)}:${pad(c.minute)}`;
}

/**
 * Différence en **jours civils** entre deux instants : le nombre de
 * minuits de Paris franchis, sans tenir compte des heures.
 *
 * Positif si `b` est après `a`. Aujourd'hui → demain = 1, quelles que
 * soient les heures ; aujourd'hui 23:00 → demain 01:00 = 1 aussi (là où
 * une division par 86 400 000 aurait renvoyé 0).
 */
export function joursCivilsEntre(a: Date, b: Date): number {
  const ca = composantesCiviles(a);
  const cb = composantesCiviles(b);
  // Passer par `Date.UTC` sur les seules composantes de date : UTC ignore
  // les changements d'heure, la division est donc exacte.
  const ja = Date.UTC(ca.annee, ca.mois - 1, ca.jour);
  const jb = Date.UTC(cb.annee, cb.mois - 1, cb.jour);
  return Math.round((jb - ja) / MS_PAR_JOUR);
}

// ---------------------------------------------------------------------
// Arithmétique calendaire
// ---------------------------------------------------------------------

/** Nombre de jours du mois civil (mois en 1–12), années bissextiles
 *  comprises. Le « jour 0 » du mois suivant est le dernier du mois. */
function joursDansLeMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/**
 * Ajoute `n` jours civils, en conservant l'heure locale de Paris.
 *
 * Passer par `+ n * 86 400 000` décale d'une heure au printemps et à
 * l'automne : une échéance à minuit devient 23:00 la veille, donc un jour
 * civil plus tôt. Ici, le jour civil est incrémenté puis l'instant
 * reconstruit — le résultat tombe toujours sur la bonne date.
 */
export function ajouterJours(d: Date, n: number): Date {
  const c = composantesCiviles(d);
  const cible = new Date(Date.UTC(c.annee, c.mois - 1, c.jour) + n * MS_PAR_JOUR);
  return instantCivil(
    cible.getUTCFullYear(),
    cible.getUTCMonth() + 1,
    cible.getUTCDate(),
    c.heure,
    c.minute,
    c.seconde,
    c.milliseconde,
  );
}

/**
 * Ajoute `n` mois calendaires, avec **écrêtage en fin de mois** :
 * 31 janvier + 1 mois = 28 février (29 en bissextile), pas le 2 ou 3 mars
 * comme le ferait `setMonth`. C'est la convention attendue pour une
 * périodicité réglementaire : « tous les mois », « tous les six mois ».
 */
export function ajouterMois(d: Date, n: number): Date {
  const c = composantesCiviles(d);
  const totalMois = c.annee * 12 + (c.mois - 1) + n;
  const annee = Math.floor(totalMois / 12);
  const mois = (((totalMois % 12) + 12) % 12) + 1;
  const jour = Math.min(c.jour, joursDansLeMois(annee, mois));
  return instantCivil(
    annee,
    mois,
    jour,
    c.heure,
    c.minute,
    c.seconde,
    c.milliseconde,
  );
}

/**
 * Ajoute `n` années calendaires. Défini comme `n * 12` mois, donc écrêté
 * de la même façon : 29 février 2028 + 1 an = 28 février 2029.
 * Remplace les `365 * 86 400 000`, qui dérivent d'un jour à chaque
 * bissextile traversée.
 */
export function ajouterAns(d: Date, n: number): Date {
  return ajouterMois(d, n * 12);
}

// ---------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------

// Les formateurs sont instanciés une fois : `Intl.DateTimeFormat` est
// coûteux à construire, et il est appelé par ligne de tableau.
const FMT_DATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const FMT_DATE_LONGUE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const FMT_DATE_COURTE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Sans année : réservé aux contextes où l'année est déjà portée par
// l'entourage (colonne d'un graphe, carte d'un ticket ouvert cette
// semaine, axe d'une frise). Ailleurs, préférer une forme datée — une
// échéance sans année est ambiguë dès qu'on franchit un 1er janvier.
const FMT_JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "2-digit",
  month: "short",
});

const FMT_MOIS_ANNEE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  month: "short",
  year: "numeric",
});

const FMT_DATE_HEURE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** « 10/08/2026 ». Remplace `toLocaleDateString("fr-FR")`, qui rend la
 *  sortie dépendante du fuseau du serveur (rendu serveur ≠ rendu client). */
export function formaterDateFr(d: Date): string {
  return FMT_DATE.format(d);
}

/** « 10 août 2026 ». */
export function formaterDateLongueFr(d: Date): string {
  return FMT_DATE_LONGUE.format(d);
}

/** « 10 août 2026 » en mois abrégé (« 10 sept. 2026 »). */
export function formaterDateCourteFr(d: Date): string {
  return FMT_DATE_COURTE.format(d);
}

/** « 10 sept. » — jour et mois seuls, sans année. À n'employer que si
 *  l'année est évidente dans le contexte (cf. `FMT_JOUR_MOIS`). */
export function formaterJourMoisFr(d: Date): string {
  return FMT_JOUR_MOIS.format(d);
}

/** « févr. 2026 » — le mois seul, quand le jour exact n'apporte rien :
 *  une périodicité annuelle se dit par son mois, pas par sa date. */
export function formaterMoisAnneeFr(d: Date): string {
  return FMT_MOIS_ANNEE.format(d);
}

/** « 10/08/2026 14:30 » — pour les horodatages (dépôts de rapport,
 *  signatures, journal du registre de sécurité). */
export function formaterDateHeureFr(d: Date): string {
  // `Intl` intercale « à » entre date et heure selon les versions d'ICU :
  // on normalise pour que la sortie soit stable et testable.
  return FMT_DATE_HEURE.format(d).replace(/,?\s+à\s+/, " ").replace(/,\s+/, " ");
}

/** « 14:05 », heure de Paris. Pour une échéance du jour même — la fin d'un
 *  plafond horaire —, où la date n'apprend rien. */
export function formaterHeureFr(d: Date): string {
  const c = composantesCiviles(d);
  return `${String(c.heure).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}`;
}
