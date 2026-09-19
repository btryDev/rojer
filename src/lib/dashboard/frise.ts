// Placement des événements sur la frise « Les 90 prochains jours »
// (bloc central du board éditorial 4a).
//
// Pure et déterministe : on lui passe la date du jour, on ne lit jamais
// l'horloge ici — c'est ce qui rend la frise testable et le rendu stable
// entre serveur et client.
//
// La frise n'est plus bornée à la largeur de la carte : l'axe est bien
// plus long que ce qu'on voit (trois mois de passé, deux ans à venir) et
// c'est le conteneur qui défile. Les positions sont donc exprimées en
// **pixels** — un pixel vaut `pxParJour`, constant sur tout l'axe — et
// non plus en pourcentage d'un horizon fixe. Conséquence utile : deux
// échéances distantes de dix jours sont toujours à la même distance
// visuelle, quel que soit l'horizon affiché.

import { composantesCiviles, FUSEAU_REFERENCE } from "@/lib/dates";
import type { TypeEcheance } from "@/lib/calendrier/echeances";
import { raccourcirLibelle } from "./libelles";
import { dateEnJeuEvenement } from "@/lib/calendrier/etats";

export type EvenementFrise = {
  id: string;
  libelle: string;
  date: Date;
  /** La fin d'une opération (`EcheanceCalendrier.dateFin`) : le marqueur reste
   *  posé sur le début, mais « sous 30 j » se lit sur ce qui reste à tenir. */
  dateFin?: Date;
  tone: "alerte" | "warn" | "ok";
  equipement: string;
  /** Ce que c'est (ADR-016). La frise recevait déjà la donnée et la
   *  jetait faute de la déclarer : ses cartes ne pouvaient pas dire si
   *  elles montraient une vérification ou une action. */
  type?: TypeEcheance;
  /** Porte de sortie de l'échéance. Absente = vérification périodique,
   *  l'appelant sait la construire depuis l'`id`. Toutes les autres
   *  familles (action, permis, attestation…) la portent : leur `id` est
   *  préfixé par module et ne désigne pas une vérification. */
  href?: string;
};

/** Une échéance, telle qu'elle apparaît dans une carte de la frise. */
export type EvenementMarqueur = {
  id: string;
  libelle: string;
  equipement: string;
  tone: EvenementFrise["tone"];
  type?: TypeEcheance;
  /** « 24 SEPT. » */
  libelleDate: string;
  passe: boolean;
  href?: string;
};

export type MarqueurFrise = {
  /** Clé stable, dérivée de la première échéance du marqueur. */
  cle: string;
  /** Les échéances portées par ce marqueur — une seule, ou une grappe. */
  evenements: EvenementMarqueur[];
  /** Le libellé de l'échéance si elle est seule, « 3 échéances » sinon. */
  titre: string;
  /** Nature commune aux échéances du marqueur. Absente quand le groupe en
   *  mêle plusieurs : une carte qui annoncerait « Vérification » au-dessus
   *  d'une action mentirait pour gagner un pictogramme. */
  type?: TypeEcheance;
  /** « 24 SEPT. », ou la plage « 6 → 24 JUIL. » pour une grappe. */
  sousTitre: string;
  /** Le ton le plus alarmant du groupe : une alerte ne se dilue pas. */
  tone: EvenementFrise["tone"];
  /** Position de la première échéance, en pixels depuis le début. */
  x: number;
  /** Position de la dernière — égale à `x` hors grappe. */
  xFin: number;
  /** Alternance au-dessus / au-dessous de l'axe, comme dans le design. */
  cote: "haut" | "bas";
  /** Toutes les échéances du marqueur sont derrière nous. */
  passe: boolean;
  /** Au moins une échéance tombe dans les JOURS_PROCHE jours à venir. */
  proche: boolean;
};

export type GraduationMois = {
  /** Clé stable « 2026-08 ». */
  cle: string;
  /** « Août » — l'année n'apparaît qu'en janvier et au premier mois. */
  label: string;
  x: number;
  largeur: number;
  estMoisCourant: boolean;
};

export type Frise = {
  /** Premier jour de la fenêtre (1er du mois). */
  debut: Date;
  /** Dernier jour de la fenêtre (fin de mois). */
  fin: Date;
  /** Largeur totale de l'axe, en pixels. */
  largeur: number;
  /** Abscisse d'aujourd'hui — sert à cadrer le défilement à l'ouverture. */
  xAujourdhui: number;
  marqueurs: MarqueurFrise[];
  /** Échéances placées sur l'axe — grappes comprises. */
  nbPlaces: number;
  /** Abscisse du bord gauche de l'écran à l'ouverture (`CADRAGE_INITIAL`). */
  xCadrage: number;
  /**
   * Les OPÉRATIONS (une échéance qui porte une `dateFin` : permis de feu, plan
   * de prévention) dont le point est hors de l'écran à l'ouverture, à gauche du
   * cadrage, dans l'ordre de l'axe. Le tableau de bord les nomme sous la frise
   * et mène à la première (2026-09-15).
   *
   * LA RÈGLE, ET RIEN D'AUTRE : non close — les closes ne sont pas chargées —,
   * présente sur la frise, et hors écran à l'ouverture. En cours, en retard sur
   * son début, échue : toutes comptent, parce qu'aucune n'a de place visible à
   * l'ouverture alors qu'une opération non close reste à suivre.
   *
   * LA BORNE EST CELLE DE LA FENÊTRE (`place`) : l'opération commence dans la
   * fenêtre, ou avant avec une fin qui tombe dans la fenêtre ou après. Une
   * opération échue avant le début de la fenêtre n'est ni sur la frise ni ici
   * — le compte « en retard » la porte. La note ne promet ni « sous 30 jours »
   * ni une ancienneté, qui dépendrait de l'échelle (deux semaines en vue
   * « 90 jours », deux mois en vue « 12 mois »).
   */
  horsCadrage: { libelle: string; cle: string; x: number }[];
  mois: GraduationMois[];
};

/**
 * Écart minimal entre deux marqueurs consécutifs, en pixels.
 *
 * Les cartes font 172 px et alternent au-dessus / au-dessous de l'axe :
 * deux voisines ne partagent donc jamais la même ligne, et il suffit que
 * `i` et `i+2` ne se recouvrent pas — soit 88 px entre voisins. On prend
 * 92 pour garder un filet d'air.
 *
 * C'est aussi le seuil de **regroupement** : deux échéances plus proches
 * que ça ne peuvent pas être distinguées à l'œil, on les réunit dans une
 * seule carte plutôt que d'en cacher une. À l'échelle « 12 mois », ce
 * seuil vaut ~35 jours — le regroupement y est donc, de fait, mensuel ;
 * à l'échelle « 90 jours » il vaut ~9 jours. Le regroupement suit ainsi
 * ce que l'écran peut montrer, pas une règle de calendrier arbitraire.
 */
export const ECART_MIN_PX = 92;

/** Échelles disponibles, en pixels par jour. */
export const PX_PAR_JOUR = {
  /** Vue serrée : ~90 jours dans une carte de 900 px. */
  jours: 10,
  /** Vue large : ~12 mois dans la même carte. */
  mois: 2.6,
} as const;

export type EchelleFrise = keyof typeof PX_PAR_JOUR;

/** Marge à gauche d'aujourd'hui au cadrage d'ouverture, en pixels : la frise
 *  s'ouvre défilée à `xAujourdhui - CADRAGE_INITIAL`. */
export const CADRAGE_INITIAL = 130;

/** Marge intérieure de la piste qui défile, de chaque côté, en pixels : un
 *  point d'abscisse `x` est à `x + MARGE_PISTE` dans la zone de défilement.
 *  Le composant la pose, la fonction en tient compte (relecture, 2026-09-15 :
 *  sans elle, un point visible au bord se disait hors de l'écran). */
export const MARGE_PISTE = 30;

/** Seuil « proche » : une échéance à moins de 30 jours mérite l'orange.
 *  Même horizon que la promesse produit — « ce qu'il doit faire dans les
 *  30 prochains jours ». */
export const JOURS_PROCHE = 30;

/** Profondeur de passé consultable, en jours. */
export const JOURS_AVANT = 90;
/** Profondeur d'avenir consultable, en jours (~24 mois). */
export const JOURS_APRES = 730;

const JOUR_MS = 86400000;

// `minuit` et `joursEntre` servent la **géométrie** de l'axe (abscisses,
// largeurs de mois, « derrière nous / à venir ») : ce sont des mesures
// d'écran, pas des règles métier. La qualification d'un événement — en
// retard, à planifier, à venir — arrive déjà faite dans `tone`, calculée par
// les prédicats partagés (`@/lib/dates/retard`, ADR-011).
function minuit(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Jours pleins entre deux dates — insensible aux changements d'heure. */
function joursEntre(a: Date, b: Date): number {
  return Math.round((minuit(b).getTime() - minuit(a).getTime()) / JOUR_MS);
}

// Fuseau épinglé sur les libellés de l'axe : une échéance stockée à
// minuit UTC s'affichait « 23 SEPT. » au lieu de « 24 SEPT. » dès que le
// serveur tournait en UTC, alors que son marqueur était bien placé au
// 24 (la géométrie, elle, passe par `minuit`).
const FMT_JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "numeric",
  month: "short",
});

const FMT_JOUR_MOIS_AN = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

function libelleDate(d: Date): string {
  return FMT_JOUR_MOIS.format(d).toUpperCase();
}

function libelleDateLong(d: Date): string {
  return FMT_JOUR_MOIS_AN.format(d).toUpperCase();
}

export function construireFrise({
  evenements,
  aujourdhui,
  echelle = "jours",
  joursAvant = JOURS_AVANT,
  joursApres = JOURS_APRES,
}: {
  evenements: EvenementFrise[];
  aujourdhui: Date;
  echelle?: EchelleFrise;
  joursAvant?: number;
  joursApres?: number;
}): Frise {
  const pxParJour = PX_PAR_JOUR[echelle];

  // La fenêtre s'aligne sur des mois entiers : les graduations mensuelles
  // sont alors des blocs pleins, jamais un « Août » tronqué à cinq jours.
  const brutDebut = new Date(minuit(aujourdhui).getTime() - joursAvant * JOUR_MS);
  const debut = new Date(brutDebut.getFullYear(), brutDebut.getMonth(), 1);
  const brutFin = new Date(minuit(aujourdhui).getTime() + joursApres * JOUR_MS);
  const fin = new Date(brutFin.getFullYear(), brutFin.getMonth() + 1, 0);

  const x = (d: Date) => joursEntre(debut, d) * pxParJour;
  const largeur = (joursEntre(debut, fin) + 1) * pxParJour;

  // La frise ne compte rien : elle place. Les nombres de retard du board
  // viennent tous de `bundle.echeances` (`lib/calendrier/retards`), qui suit
  // le filtre bâtiment et sert aussi la sidebar et le calendrier. Cette
  // fonction a longtemps rendu son propre `nbEnRetard`, que plus personne ne
  // lisait — un second compteur en sommeil finit toujours par diverger du
  // premier le jour où quelqu'un le rebranche.
  // OÙ POSER UNE OPÉRATION COMMENCÉE AVANT LA FENÊTRE. Filtrée sur son début,
  // une opération démarrée il y a plus de trois mois et finissant dans dix
  // jours n'apparaissait pas, quand le « sous 30 j » du tableau de bord la
  // comptait (2026-09-15). Tant que sa fin n'est pas antérieure à la fenêtre
  // — en cours, ou échue pendant elle —, elle y entre, posée au bord gauche ;
  // sa carte garde sa vraie date de début, année comprise.
  const place = (e: EvenementFrise): Date =>
    e.date < debut && e.dateFin && e.dateFin >= debut ? debut : e.date;
  const dansFenetre = evenements
    .filter((e) => place(e) >= debut && place(e) <= fin)
    .sort((a, b) => place(a).getTime() - place(b).getTime());

  // Regroupement : rien n'est écarté. Tout ce qui tomberait à moins de
  // ECART_MIN_PX de la première échéance du groupe rejoint ce groupe, et
  // la carte annonce alors un compte et une plage de dates au lieu d'un
  // libellé. Le groupe suivant démarre forcément au-delà du seuil, donc
  // deux cartes ne se recouvrent jamais.
  const groupes: EvenementFrise[][] = [];
  for (const e of dansFenetre) {
    const groupe = groupes[groupes.length - 1];
    if (groupe && x(place(e)) - x(place(groupe[0])) < ECART_MIN_PX) {
      groupe.push(e);
    } else {
      groupes.push([e]);
    }
  }

  const xCadrage = Math.max(0, x(aujourdhui) - CADRAGE_INITIAL);
  const horsCadrage: Frise["horsCadrage"] = [];

  const marqueurs: MarqueurFrise[] = groupes.map((groupe, i) => {
    for (const e of groupe) {
      // Une opération, hors de l'écran à l'ouverture (`horsCadrage`).
      if (e.dateFin && x(place(e)) + MARGE_PISTE < xCadrage) {
        horsCadrage.push({
          libelle: raccourcirLibelle(e.libelle),
          cle: groupe[0].id,
          x: x(place(e)),
        });
      }
    }
    const evenements: EvenementMarqueur[] = groupe.map((e) => ({
      id: e.id,
      // Les cartes font 172 px : un libellé réglementaire entier s'y fait
      // couper au milieu d'un mot.
      libelle: raccourcirLibelle(e.libelle),
      equipement: e.equipement,
      tone: e.tone,
      type: e.type,
      libelleDate: libelleDate(e.date),
      passe: joursEntre(aujourdhui, e.date) < 0,
      href: e.href,
    }));
    const premier = groupe[0];
    const dernier = groupe[groupe.length - 1];

    return {
      cle: premier.id,
      evenements,
      titre:
        groupe.length === 1
          ? evenements[0].libelle
          : `${groupe.length} échéances`,
      type: groupe.every((e) => e.type === premier.type)
        ? premier.type
        : undefined,
      sousTitre:
        groupe.length === 1
          ? libelleDateLong(premier.date)
          : // Posée au bord, la première peut dater d'une autre année : la
            // plage courte « 3 → 20 JUIN » se lirait alors sur la même.
            place(premier).getTime() !== premier.date.getTime()
            ? `${libelleDateLong(premier.date)} → ${libelleDateLong(dernier.date)}`
            : libellePlage(premier.date, dernier.date),
      // Une alerte au milieu d'un groupe calme reste visible : c'est elle
      // qui décide de la couleur de la carte.
      tone: groupe.some((e) => e.tone === "alerte")
        ? "alerte"
        : groupe.some((e) => e.tone === "warn")
          ? "warn"
          : "ok",
      x: x(place(premier)),
      xFin: x(place(dernier)),
      cote: i % 2 === 0 ? "haut" : "bas",
      passe: evenements.every((e) => e.passe),
      proche: groupe.some((e) => {
        // Une opération démarrée sans alerte se lit sur sa fin, comme au
        // « sous 30 j » du tableau de bord (`dateEnJeuAutre`) : posée sur son
        // début passé, elle restait grise à dix jours de son terme.
        const enJeu = dateEnJeuEvenement(e, aujourdhui);
        const j = joursEntre(aujourdhui, enJeu);
        return j >= 0 && j <= JOURS_PROCHE;
      }),
    };
  });

  return {
    debut,
    fin,
    largeur,
    xAujourdhui: x(aujourdhui),
    marqueurs,
    nbPlaces: dansFenetre.length,
    xCadrage,
    horsCadrage,
    mois: construireMois(debut, fin, aujourdhui, pxParJour),
  };
}

/** « 24 SEPT. », « 6 → 24 JUIL. », « 28 JUIL. → 3 SEPT. ».
 *
 *  Jour et mois lus au fuseau de référence (`composantesCiviles`, ADR-011
 *  règle 1), comme `libelleDate` qui écrit l'autre bout. Ils se lisaient par
 *  `getDate()`/`getMonth()`, dans le fuseau du PROCESSUS : sur un serveur en
 *  UTC, une plage qui commence à minuit de Paris affichait la veille
 *  (« 8 → 14 AOÛT » pour le 9), corrigé le 2026-09-19. */
function libellePlage(debut: Date, fin: Date): string {
  const a = composantesCiviles(debut);
  const b = composantesCiviles(fin);
  if (a.mois === b.mois && a.jour === b.jour) {
    return libelleDate(debut);
  }
  if (a.mois === b.mois) {
    return `${a.jour} → ${libelleDate(fin)}`;
  }
  return `${libelleDate(debut)} → ${libelleDate(fin)}`;
}

// Noms de mois capitalisés, indexés comme `Date#getMonth()` (0 = janvier).
// Pas d'`Intl` ici, volontairement : le curseur des graduations est un
// repère **local** (`new Date(annee, mois, 1)`), cohérent avec la
// géométrie de l'axe. Le formater dans un fuseau fixe l'aurait désynchronisé
// du bloc qu'il légende sur tout serveur qui n'est pas à Paris — un bloc
// « Août » posé sur les pixels de juillet. Une table statique n'a ni
// fuseau ni locale à négocier.
const MOIS_LONGS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

/** Graduations mensuelles : un bloc par mois couvert par la fenêtre. */
function construireMois(
  debut: Date,
  fin: Date,
  aujourdhui: Date,
  pxParJour: number,
): GraduationMois[] {
  const out: GraduationMois[] = [];

  const curseur = new Date(debut.getFullYear(), debut.getMonth(), 1);
  while (curseur <= fin) {
    const finMois = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0);
    const nbJours = finMois.getDate();
    // L'année n'est rappelée qu'aux frontières : en janvier, et sur le
    // premier bloc de la fenêtre — ailleurs elle ne fait qu'encombrer.
    const marqueAnnee =
      out.length === 0 || curseur.getMonth() === 0;
    out.push({
      cle: `${curseur.getFullYear()}-${String(curseur.getMonth() + 1).padStart(2, "0")}`,
      label: marqueAnnee
        ? `${MOIS_LONGS[curseur.getMonth()]} ${String(curseur.getFullYear()).slice(2)}`
        : MOIS_LONGS[curseur.getMonth()],
      x: joursEntre(debut, curseur) * pxParJour,
      largeur: nbJours * pxParJour,
      estMoisCourant:
        curseur.getFullYear() === aujourdhui.getFullYear() &&
        curseur.getMonth() === aujourdhui.getMonth(),
    });
    curseur.setMonth(curseur.getMonth() + 1);
  }
  return out;
}
