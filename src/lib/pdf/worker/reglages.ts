// Les deux réglages du rendu des PDF (lot pdf-b1, ADR-059), lus dans
// l'environnement par la règle commune des réglages d'export
// (`exports/reglage-entier.ts`), que `src/env.ts` applique au démarrage.

import { lireEntierPositif } from "@/lib/exports/reglage-entier";

/**
 * Tas JS maximal du processus de rendu, en Mo (`--max-old-space-size` de
 * l'enfant). Le dépasser fait mourir l'ENFANT, pas le serveur.
 *
 * ~~384~~ 256 [2026-11-10, préproduction XS relevée par la session du banc :
 * 1 076 Mo de RAM sans swap, le serveur au repos à 308 Mo résidents (pic
 * 394), 510 à 530 Mo disponibles ; 256 Mo de tas font environ 340 Mo
 * résidents pour l'enfant, 320 ne laisseraient presque rien. Mesuré le même
 * jour : un registre au seuil du garde-fou (1 956 lignes) se rend en 3 s
 * avec 256, échoue avec 192.] Le banc confirme. Ne borne PAS la mémoire hors
 * tas : un conteneur saturé reste possible, d'où le garde-fou de volume en
 * amont (`rendre.ts`).
 */
export const TAS_MAX_MO_DEFAUT = 256;

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
