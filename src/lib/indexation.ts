/**
 * Le site est-il ouvert aux moteurs de recherche ?
 *
 * **Sur `cc` : oui** (décision de la propriétaire du 2026-11-06) — `cc` est la
 * future production, celle qui doit être indexée. Sur `main` : non. Cette
 * ligne diffère entre les deux branches ; un report de `main` vers `cc` ne la
 * touche pas tant que `main` ne la modifie pas, et s'il la modifie, garder
 * `true` ici.
 *
 * Sur `main` (production Vercel actuelle), fermé : la page publique
 * est refaite mais pas ouverte, et l'URL de production Vercel répond à qui a
 * le lien. Fermé, le site pose les trois verrous de la page d'attente de
 * rojer.fr : `robots.txt` qui interdit tout (`app/robots.ts`), la balise
 * `noindex, nofollow` (`app/layout.tsx`) et l'en-tête `X-Robots-Tag`
 * (`lib/securite/entetes.ts`).
 *
 * Le jour de l'ouverture : passer à `true`, et ce seul changement lève les
 * trois. `robots.test.ts` et `entetes.test.ts` vérifient l'un et l'autre état.
 */
export const OUVERT_AUX_MOTEURS = true;

/** La valeur de `X-Robots-Tag` et de la balise `robots` tant que le site est fermé. */
export const NOINDEX = "noindex, nofollow";
