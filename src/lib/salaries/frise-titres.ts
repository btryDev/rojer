/**
 * La frise des titres d'une personne (refonte de la fiche, 2026-10-24).
 *
 * Un axe commun à tous les titres : chacun y couvre sa période de validité,
 * de la délivrance à l'échéance — celle de `echeanceDuTitre`, la même que le
 * calendrier. Un titre sans échéance (aucun texte n'en écrit) reste ouvert
 * jusqu'au bout de l'axe : il n'expire pas, et la frise ne lui invente pas de
 * fin.
 *
 * Module pur : aucune horloge (`now` est passé), aucune base. Il ne décide que
 * de positions ; l'état de chaque titre reste celui de `etatDuTitre`.
 */

export type TitreSurLaFrise = {
  cle: string;
  delivreLe: Date;
  /** L'échéance saisie ou calculée ; `null` = aucune. */
  echeance: Date | null;
};

export type CouloirTitre = {
  /** Position de la délivrance, dans [0, 1]. */
  debut: number;
  /** Position de l'échéance, ou `null` : le titre court jusqu'au bout. */
  fin: number | null;
};

export type FriseTitres = {
  debut: Date;
  fin: Date;
  aujourdhui: number;
  /** Position de l'entrée dans l'effectif, quand elle est connue. */
  entree: number | null;
  graduations: { annee: number; position: number }[];
  couloirs: Record<string, CouloirTitre>;
};

const premierJanvier = (annee: number) => new Date(Date.UTC(annee, 0, 1));

/**
 * Le pas des graduations : une par an tant que l'axe tient en huit ans, puis
 * deux, puis cinq — au-delà, les années se chevauchent sur un écran étroit.
 */
function pas(annees: number): number {
  if (annees <= 8) return 1;
  if (annees <= 16) return 2;
  return 5;
}

export function friseDesTitres({
  entreLe,
  titres,
  now,
}: {
  entreLe: Date | null;
  titres: readonly TitreSurLaFrise[];
  now: Date;
}): FriseTitres {
  const dates = [
    now,
    ...(entreLe ? [entreLe] : []),
    ...titres.flatMap((t) => (t.echeance ? [t.delivreLe, t.echeance] : [t.delivreLe])),
  ];
  const min = Math.min(...dates.map((d) => d.getTime()));
  const max = Math.max(...dates.map((d) => d.getTime()));
  const anneeDebut = new Date(min).getUTCFullYear();
  // Au moins deux ans devant aujourd'hui : une échéance proche doit se lire
  // comme proche, pas collée au bord droit.
  const anneeFin = Math.max(new Date(max).getUTCFullYear() + 1, now.getUTCFullYear() + 2);
  const debut = premierJanvier(anneeDebut);
  const fin = premierJanvier(anneeFin);
  const etendue = fin.getTime() - debut.getTime();
  const position = (d: Date) => (d.getTime() - debut.getTime()) / etendue;

  const p = pas(anneeFin - anneeDebut);
  const graduations: FriseTitres["graduations"] = [];
  for (let a = anneeDebut; a <= anneeFin; a += p) {
    graduations.push({ annee: a, position: position(premierJanvier(a)) });
  }

  const couloirs: Record<string, CouloirTitre> = {};
  for (const t of titres) {
    couloirs[t.cle] = {
      debut: position(t.delivreLe),
      // Une échéance saisie AVANT la délivrance (erreur de saisie) ne doit pas
      // dessiner une barre à l'envers : elle se réduit à un point.
      fin: t.echeance ? Math.max(position(t.echeance), position(t.delivreLe)) : null,
    };
  }

  return {
    debut,
    fin,
    aujourdhui: position(now),
    entree: entreLe ? position(entreLe) : null,
    graduations,
    couloirs,
  };
}
