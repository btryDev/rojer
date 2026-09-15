// Construction des grilles d'échéances — mensuelle et annuelle.
//
// Pure et déterministe, comme la frise : on injecte le mois affiché et la
// date du jour, on ne lit jamais l'horloge. La semaine commence le lundi
// (convention française), et la grille est complétée par les jours
// débordants du mois précédent et du suivant pour former des semaines
// entières.
//
// Tout le découpage se fait en **jours civils de Paris** (ADR-011). Les
// dates d'échéance sont stockées à minuit UTC : lues avec `getDate()` sur
// un serveur en UTC elles tombent juste par hasard, mais un horodatage
// réel de soirée (23:30 à Paris en été = 21:30 UTC) et, surtout, un
// serveur dans un autre fuseau font glisser la case d'un jour — et le
// libellé du mois d'un mois entier, un 1er tombant à 22:00 UTC la veille.

import {
  MS_PAR_JOUR,
  cleJourCivil,
  composantesCiviles,
  instantCivil,
} from "@/lib/dates";
import type {
  BatimentEcheance,
  FamilleEcheance,
  TypeEcheance,
} from "./echeances";
// La date où la grille pose un événement : sa date EN JEU. Une opération
// démarrée sans alerte se pose sur sa FIN, comme dans la liste mensuelle du
// calendrier ; posée à son début, elle grisait la tuile de mars quand la page
// Calendrier la rangeait en septembre (relecture, 2026-09-15).
import { dateEnJeuEvenement } from "./etats";

export type EvenementGrille = {
  id: string;
  libelle: string;
  date: Date;
  /** La fin d'une opération (`EcheanceCalendrier.dateFin`) : la frise et les
   *  grilles la lisent (`dateEnJeuEvenement`). */
  dateFin?: Date;
  tone: "alerte" | "warn" | "ok";
  equipement: string;
  /** Ce que c'est (ADR-016) — absent = vérification (compat board). */
  type?: TypeEcheance;
  /** Famille de l'échéance — absente = contrôle (compat board). */
  famille?: FamilleEcheance;
  /** Porte de la pastille — absente = `hrefEvenement` de l'appelant. */
  href?: string;
  /** Où ça se passe (ADR-019) — `null` = tout l'établissement, absent =
   *  non renseigné par l'appelant (compat board). */
  batiment?: BatimentEcheance | null;
};

export type JourGrille = {
  /** Clé stable « 2026-08-24 ». */
  cle: string;
  date: Date;
  numero: number;
  /** false pour les jours de débordement (mois précédent / suivant). */
  dansLeMois: boolean;
  estAujourdhui: boolean;
  evenements: EvenementGrille[];
};

export type GrilleMois = {
  /** 1er du mois affiché. */
  mois: Date;
  /** « Août 2026 ». */
  libelle: string;
  semaines: JourGrille[][];
  /** Nombre d'événements tombant dans le mois affiché. */
  nbEvenements: number;
};

export const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Repère de calcul : le jour civil (année, mois, jour) projeté sur l'axe
 * UTC. UTC ignore les changements d'heure, l'arithmétique en jours y est
 * donc exacte ; l'instant réel n'est reconstruit qu'à la fin, par
 * `instantCivil`.
 */
function reperUtc(annee: number, mois: number, jour: number): Date {
  return new Date(Date.UTC(annee, mois - 1, jour));
}

/** Décalage du 1er du mois par rapport au lundi précédent (0 à 6). */
function decalageLundi(annee: number, mois: number): number {
  return (reperUtc(annee, mois, 1).getUTCDay() + 6) % 7;
}

/** Nombre de jours du mois civil — le « jour 0 » du mois suivant. */
function joursDansLeMois(annee: number, mois: number): number {
  return reperUtc(annee, mois + 1, 0).getUTCDate();
}

export function construireGrilleMois({
  mois,
  evenements,
  aujourdhui,
}: {
  /** N'importe quelle date du mois à afficher. */
  mois: Date;
  evenements: EvenementGrille[];
  aujourdhui: Date;
}): GrilleMois {
  const c = composantesCiviles(mois);
  const premier = instantCivil(c.annee, c.mois, 1);

  // Regroupement par jour : une seule passe sur les événements, la grille
  // ne fait ensuite que des lectures de map.
  const parJour = new Map<string, EvenementGrille[]>();
  for (const e of evenements) {
    const cle = cleJourCivil(dateEnJeuEvenement(e, aujourdhui));
    const liste = parJour.get(cle);
    if (liste) liste.push(e);
    else parJour.set(cle, [e]);
  }
  for (const liste of parJour.values()) {
    liste.sort(
      (a, b) =>
        dateEnJeuEvenement(a, aujourdhui).getTime() -
        dateEnJeuEvenement(b, aujourdhui).getTime(),
    );
  }

  const decalage = decalageLundi(c.annee, c.mois);
  // Semaines entières couvrant tout le mois : 4 à 6 lignes selon le mois.
  const nbCases =
    Math.ceil((decalage + joursDansLeMois(c.annee, c.mois)) / 7) * 7;
  const originUtc = reperUtc(c.annee, c.mois, 1).getTime();

  const cleAujourdhui = cleJourCivil(aujourdhui);
  const semaines: JourGrille[][] = [];
  let nbEvenements = 0;

  for (let i = 0; i < nbCases; i += 1) {
    const utc = new Date(originUtc + (i - decalage) * MS_PAR_JOUR);
    const d = instantCivil(
      utc.getUTCFullYear(),
      utc.getUTCMonth() + 1,
      utc.getUTCDate(),
    );
    const cle = cleJourCivil(d);
    const dansLeMois = utc.getUTCMonth() + 1 === c.mois;
    const evts = parJour.get(cle) ?? [];
    if (dansLeMois) nbEvenements += evts.length;

    const jour: JourGrille = {
      cle,
      date: d,
      numero: utc.getUTCDate(),
      dansLeMois,
      estAujourdhui: cle === cleAujourdhui,
      evenements: evts,
    };

    if (i % 7 === 0) semaines.push([jour]);
    else semaines[semaines.length - 1].push(jour);
  }

  const libelle = FMT_MOIS_LONG.format(premier);

  return {
    mois: premier,
    libelle: libelle.charAt(0).toUpperCase() + libelle.slice(1),
    semaines,
    nbEvenements,
  };
}

// Formateurs instanciés une fois, fuseau explicite : sans `timeZone`, un
// 1er du mois pris à minuit heure de Paris (22:00 UTC la veille en été)
// s'affiche avec le mois **précédent** sur un serveur en UTC.
const FMT_MOIS_LONG = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  month: "long",
  year: "numeric",
});

const FMT_MOIS_COURT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  month: "short",
});

/** Point d'un mois de la vue année : le ton porte l'urgence, la famille
 *  la forme du marqueur. Ordonnés alerte → warn → ok, pour que le
 *  dépassé reste visible quand la place manque. */
export type PointAnnee = {
  tone: EvenementGrille["tone"];
  famille: FamilleEcheance;
};

export type MoisAnnee = {
  /** 1er du mois. */
  mois: Date;
  /** « Janv. », « Août ». */
  libelle: string;
  estMoisCourant: boolean;
  /** false si le mois est entièrement hors de la fenêtre chargée. */
  dansFenetre: boolean;
  nbParTon: Record<EvenementGrille["tone"], number>;
  points: PointAnnee[];
  nbTotal: number;
};

export type GrilleAnnee = {
  annee: number;
  mois: MoisAnnee[];
  /** Nombre d'événements tombant dans l'année affichée. */
  nbEvenements: number;
};

export function construireGrilleAnnee({
  annee,
  evenements,
  aujourdhui,
  fenetre,
}: {
  annee: number;
  evenements: EvenementGrille[];
  aujourdhui: Date;
  /** Bornes de la période chargée — un mois qui n'y touche pas est grisé. */
  fenetre?: { debut: Date; fin: Date };
}): GrilleAnnee {
  const parMois: Record<EvenementGrille["tone"], number>[] = Array.from(
    { length: 12 },
    () => ({ alerte: 0, warn: 0, ok: 0 }),
  );
  const pointsParMois: PointAnnee[][] = Array.from({ length: 12 }, () => []);
  let nbEvenements = 0;
  for (const e of evenements) {
    const c = composantesCiviles(dateEnJeuEvenement(e, aujourdhui));
    if (c.annee !== annee) continue;
    const index = c.mois - 1;
    parMois[index][e.tone] += 1;
    pointsParMois[index].push({
      tone: e.tone,
      famille: e.famille ?? "controle",
    });
    nbEvenements += 1;
  }

  // Le dépassé d'abord : quand la place manque, c'est lui qu'on montre.
  const ORDRE_TONS: Record<EvenementGrille["tone"], number> = {
    alerte: 0,
    warn: 1,
    ok: 2,
  };
  for (const points of pointsParMois) {
    points.sort((a, b) => ORDRE_TONS[a.tone] - ORDRE_TONS[b.tone]);
  }

  const cAujourdhui = composantesCiviles(aujourdhui);
  const mois = parMois.map((nbParTon, m): MoisAnnee => {
    const premier = instantCivil(annee, m + 1, 1);
    const dernier = instantCivil(annee, m + 1, joursDansLeMois(annee, m + 1));
    const brut = FMT_MOIS_COURT.format(premier);
    return {
      mois: premier,
      libelle: brut.charAt(0).toUpperCase() + brut.slice(1),
      estMoisCourant: cAujourdhui.annee === annee && cAujourdhui.mois === m + 1,
      dansFenetre: fenetre
        ? dernier >= fenetre.debut && premier <= fenetre.fin
        : true,
      nbParTon,
      points: pointsParMois[m],
      nbTotal: nbParTon.alerte + nbParTon.warn + nbParTon.ok,
    };
  });

  return { annee, mois, nbEvenements };
}
