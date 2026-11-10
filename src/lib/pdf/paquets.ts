import { composantesCiviles } from "@/lib/dates";

/**
 * Le découpage des longs tableaux des PDF en `<Page>` successives (lot
 * pdf-a1, 2026-11-10).
 *
 * LA CAUSE. Le moteur de pagination de `@react-pdf` 4.5.1 refait la mise en
 * page de TOUT le reste d'une `<Page>` à chaque saut de feuille : le coût d'un
 * tableau croît comme le carré de son nombre de lignes. Mesuré sur le banc de
 * charge (session du test de charge, `lot/charge-k6`) : 682 rapports en 11 s,
 * 2 274 en 105 s, au-delà le processus meurt — et toute l'application est
 * figée pendant ce temps.
 *
 * LE REMÈDE ICI. Chaque `<Page>` se pagine seule : un tableau coupé en
 * `<Page>` de `LIGNES_PAR_PAQUET` lignes au plus coûte linéairement (registre
 * réel, données synthétiques : 1 500 rapports, 16,2 s → 2,5 s). Le prix est
 * visible : une `<Page>` commence toujours une nouvelle feuille, et la
 * dernière feuille d'un paquet peut rester à moitié vide.
 */

/**
 * Lignes par `<Page>`. Environ trois à neuf feuilles de tableau selon la
 * hauteur des lignes : assez petit pour que le carré reste négligeable, assez
 * grand pour que les feuilles à moitié vides restent rares.
 */
export const LIGNES_PAR_PAQUET = 100;

/** Coupe une liste en paquets consécutifs, sans rien perdre ni réordonner. */
export function enPaquets<T>(items: readonly T[], taille = LIGNES_PAR_PAQUET): T[][] {
  verifierTaille(taille);
  const paquets: T[][] = [];
  for (let i = 0; i < items.length; i += taille) {
    paquets.push(items.slice(i, i + taille));
  }
  return paquets;
}

/** Une suite de lignes d'une même année civile, sur une même `<Page>`. */
export type SegmentAnnuel<T> = {
  /** L'année civile, en heure de Paris (ADR-011). */
  annee: number;
  /** Le nombre de lignes de cette année, tous segments confondus. */
  total: number;
  /** `true` si l'année a commencé sur une `<Page>` précédente. */
  suite: boolean;
  lignes: T[];
};

/**
 * Range les lignes en `<Page>` de `taille` lignes au plus, chacune faite de
 * segments annuels : une année courte partage sa `<Page>` avec la suivante,
 * une année longue s'étend sur plusieurs.
 *
 * L'ordre de l'entrée est gardé tel quel : une année se coupe à chaque
 * changement d'année, jamais par regroupement. Une entrée triée du plus
 * récent au plus ancien donne donc un segment par année ; une entrée qui ne
 * l'est pas reste dans son ordre, quitte à montrer deux fois la même année.
 */
export function feuillesParAnnee<T>(
  items: readonly T[],
  dateDe: (item: T) => Date,
  taille = LIGNES_PAR_PAQUET,
): SegmentAnnuel<T>[][] {
  verifierTaille(taille);
  const suites: { annee: number; lignes: T[] }[] = [];
  for (const item of items) {
    const annee = composantesCiviles(dateDe(item)).annee;
    const derniere = suites.at(-1);
    if (derniere?.annee === annee) derniere.lignes.push(item);
    else suites.push({ annee, lignes: [item] });
  }

  const feuilles: SegmentAnnuel<T>[][] = [];
  let courante: SegmentAnnuel<T>[] = [];
  let place = taille;
  for (const { annee, lignes } of suites) {
    for (let debut = 0; debut < lignes.length; ) {
      if (place === 0) {
        feuilles.push(courante);
        courante = [];
        place = taille;
      }
      const n = Math.min(place, lignes.length - debut);
      courante.push({
        annee,
        total: lignes.length,
        suite: debut > 0,
        lignes: lignes.slice(debut, debut + n),
      });
      debut += n;
      place -= n;
    }
  }
  if (courante.length > 0) feuilles.push(courante);
  return feuilles;
}

function verifierTaille(taille: number) {
  if (!Number.isInteger(taille) || taille < 1) {
    throw new Error("La taille d'un paquet est un entier ≥ 1.");
  }
}
