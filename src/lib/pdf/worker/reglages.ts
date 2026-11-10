// Les deux réglages du rendu des PDF (lot pdf-b1, ADR-059), lus dans
// l'environnement par la règle commune des réglages d'export
// (`exports/reglage-entier.ts`), que `src/env.ts` applique au démarrage.

import { lireEntierPositif } from "@/lib/exports/reglage-entier";

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

export function tasMaxMo(valeur = process.env.EXPORT_TAS_MAX_MO): number {
  return lireEntierPositif("EXPORT_TAS_MAX_MO", valeur, TAS_MAX_MO_DEFAUT);
}

export function delaiMaxMs(valeur = process.env.EXPORT_DELAI_MAX_MS): number {
  return lireEntierPositif("EXPORT_DELAI_MAX_MS", valeur, DELAI_MAX_MS_DEFAUT);
}
