/**
 * Le site est-il ouvert aux moteurs de recherche ?
 *
 * Oui (décision de la propriétaire du 2026-11-06, quand `cc` préparait la
 * production). [2026-11-17 : `cc` est devenue `main` et Vercel est retiré ;
 * la préproduction est donc ouverte aussi — à régler au passage en
 * production, décision de la propriétaire du même jour.]
 *
 * Fermé, le site pose trois verrous : `robots.txt` qui interdit tout
 * (`app/robots.ts`), la balise `noindex, nofollow` (`app/layout.tsx`) et
 * l'en-tête `X-Robots-Tag` (`lib/securite/entetes.ts`). Ce seul booléen les
 * lève ou les pose ; `robots.test.ts` et `entetes.test.ts` vérifient l'un et
 * l'autre état.
 */
export const OUVERT_AUX_MOTEURS = true;

/** La valeur de `X-Robots-Tag` et de la balise `robots` tant que le site est fermé. */
export const NOINDEX = "noindex, nofollow";
