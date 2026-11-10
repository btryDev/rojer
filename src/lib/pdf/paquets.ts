import { composantesCiviles } from "@/lib/dates";

/**
 * Le découpage des longs tableaux des PDF en `<Page>` successives
 * (lot pdf-a1, 2026-11-10, `docs/revues/generation-pdf-volume-2026-11-10.md`).
 *
 * LA CAUSE. Le moteur de pagination de `@react-pdf` 4.5.1 refait la mise en
 * page de TOUT le reste d'une `<Page>` à chaque saut de feuille : le coût d'un
 * tableau croît comme le carré de son nombre de lignes. Mesuré sur le banc de
 * charge : 682 rapports en 11 s, 2 274 en 105 s, au-delà le processus meurt —
 * et toute l'application est figée pendant ce temps.
 *
 * LE REMÈDE ICI. Chaque `<Page>` se pagine seule : un tableau coupé en paquets
 * de `LIGNES_PAR_PAQUET` lignes coûte linéairement (mesure synthétique :
 * 2 000 lignes, 14,8 s → 2,5 s). Le prix est visible : un paquet commence
 * toujours une nouvelle feuille, la dernière feuille d'un paquet peut rester
 * à moitié vide.
 */

/**
 * Lignes par paquet. Environ trois à quatre feuilles de tableau : assez
 * petit pour que le carré reste négligeable, assez grand pour que les
 * feuilles à moitié vides restent rares (mesure synthétique : 1 000 lignes en
 * 2,0 s par paquets de 100, contre 5,2 s d'un seul tenant).
 */
export const LIGNES_PAR_PAQUET = 100;

/** Coupe une liste en paquets consécutifs, sans rien perdre ni réordonner. */
export function enPaquets<T>(items: readonly T[], taille = LIGNES_PAR_PAQUET): T[][] {
  if (!Number.isInteger(taille) || taille < 1) {
    throw new Error("La taille d'un paquet est un entier ≥ 1.");
  }
  const paquets: T[][] = [];
  for (let i = 0; i < items.length; i += taille) {
    paquets.push(items.slice(i, i + taille));
  }
  return paquets;
}

/** Les lignes d'une année civile, coupées en paquets. */
export type TrancheAnnuelle<T> = {
  /** L'année civile, en heure de Paris (ADR-011). */
  annee: number;
  /** Le nombre de lignes de l'année, tous paquets confondus. */
  total: number;
  paquets: T[][];
};

/**
 * Regroupe par année civile (heure de Paris), dans l'ordre où les années
 * apparaissent, puis coupe chaque année en paquets. L'ordre des lignes est
 * celui de l'entrée : une liste triée du plus récent au plus ancien le reste.
 */
export function parAnneeCivile<T>(
  items: readonly T[],
  dateDe: (item: T) => Date,
  taille = LIGNES_PAR_PAQUET,
): TrancheAnnuelle<T>[] {
  const parAnnee = new Map<number, T[]>();
  for (const item of items) {
    const annee = composantesCiviles(dateDe(item)).annee;
    const lignes = parAnnee.get(annee);
    if (lignes) lignes.push(item);
    else parAnnee.set(annee, [item]);
  }
  return [...parAnnee].map(([annee, lignes]) => ({
    annee,
    total: lignes.length,
    paquets: enPaquets(lignes, taille),
  }));
}
