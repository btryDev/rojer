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
  return enPaquetsPeses(items, taille, () => 1);
}

/**
 * Coupe une liste en paquets consécutifs de `taille` lignes PESÉES au plus
 * (`poidsDe`), sans rien perdre ni réordonner. Un élément n'est jamais coupé :
 * plus lourd à lui seul que `taille`, il fait son paquet.
 */
export function enPaquetsPeses<T>(
  items: readonly T[],
  taille: number,
  poidsDe: (item: T) => number,
): T[][] {
  verifierTaille(taille);
  const paquets: T[][] = [];
  let courant: T[] = [];
  let poidsCourant = 0;
  for (const item of items) {
    const poids = poidsDe(item);
    if (courant.length > 0 && poidsCourant + poids > taille) {
      paquets.push(courant);
      courant = [];
      poidsCourant = 0;
    }
    courant.push(item);
    poidsCourant += poids;
  }
  if (courant.length > 0) paquets.push(courant);
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
 * Range les éléments en `<Page>` de `taille` lignes PESÉES au plus (`poidsDe`,
 * une par défaut), chacune faite de segments annuels : une année courte
 * partage sa `<Page>` avec la suivante, une année longue s'étend sur
 * plusieurs. Un élément n'est jamais coupé : plus lourd à lui seul que
 * `taille`, il occupe sa `<Page>`.
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
  poidsDe: (item: T) => number = () => 1,
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
  let poidsCourant = 0;
  for (const { annee, lignes } of suites) {
    let segment: SegmentAnnuel<T> | null = null;
    lignes.forEach((item, rang) => {
      const poids = poidsDe(item);
      // Feuille pleine : la suite de l'année ouvre la suivante. Une feuille
      // vide accepte toujours un élément, même trop lourd.
      if (poidsCourant > 0 && poidsCourant + poids > taille) {
        feuilles.push(courante);
        courante = [];
        poidsCourant = 0;
        segment = null;
      }
      if (!segment) {
        segment = { annee, total: lignes.length, suite: rang > 0, lignes: [] };
        courante.push(segment);
      }
      segment.lignes.push(item);
      poidsCourant += poids;
    });
  }
  if (courante.length > 0) feuilles.push(courante);
  return feuilles;
}

function verifierTaille(taille: number) {
  if (!Number.isInteger(taille) || taille < 1) {
    throw new Error("La taille d'un paquet est un entier ≥ 1.");
  }
}
