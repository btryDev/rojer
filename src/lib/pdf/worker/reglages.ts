// Les deux réglages du rendu des PDF (lot pdf-b1, ADR-059), lus dans
// l'environnement, validés au démarrage par `src/env.ts` avec la MÊME règle :
// les deux lectures ne peuvent pas se contredire. Une valeur mal formée est
// une erreur, jamais un repli silencieux (comme `EXPORTS_SIMULTANES`).

/** Un entier ≥ 1 écrit en chiffres. */
export const FORME_REGLAGE_WORKER = /^[1-9]\d*$/;

/**
 * Tas JS maximal du processus de rendu, en Mo (`--max-old-space-size` de
 * l'enfant). Le dépasser fait mourir l'ENFANT, pas le serveur.
 *
 * Défaut PROVISOIRE, à caler sur le banc (B3) : en XS (1 152 Mo), le serveur
 * web tient 220 à 320 Mo sous charge ; un processus de rendu coûte environ
 * 100 Mo de base, puis 1,3 à 2 fois son tas en mémoire réelle (wasm de yoga,
 * Buffers). 384 Mo de tas étaient calculés pour un worker_thread, qui
 * partageait la base du serveur : en processus, la valeur sera sans doute à
 * baisser — le banc tranche. Ne borne PAS la mémoire hors tas : un conteneur
 * saturé reste possible, d'où le garde-fou de volume en amont (`rendre.ts`).
 */
export const TAS_MAX_MO_DEFAUT = 384;

/**
 * Délai maximal d'un rendu, en millisecondes : au-delà, le processus de
 * rendu est tué. Défaut PROVISOIRE (B3) : le registre au seuil du garde-fou
 * prend environ 10 s en XS dans le serveur, le rendu séparé coûte environ
 * 50 % de plus (étude de viabilité) ; 60 s laissent une large marge.
 */
export const DELAI_MAX_MS_DEFAUT = 60_000;

function lire(nom: string, valeur: string | undefined, defaut: number): number {
  const v = valeur?.trim();
  if (!v) return defaut;
  if (!FORME_REGLAGE_WORKER.test(v)) throw new Error(`${nom} doit être un entier ≥ 1.`);
  return Number(v);
}

export function tasMaxMo(valeur = process.env.EXPORT_TAS_MAX_MO): number {
  return lire("EXPORT_TAS_MAX_MO", valeur, TAS_MAX_MO_DEFAUT);
}

export function delaiMaxMs(valeur = process.env.EXPORT_DELAI_MAX_MS): number {
  return lire("EXPORT_DELAI_MAX_MS", valeur, DELAI_MAX_MS_DEFAUT);
}
