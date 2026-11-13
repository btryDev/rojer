import "./polices.css";

/**
 * Les quatre polices de l'application, posées sur `<html>` par la mise en
 * page racine ET par `global-error.tsx`, qui la remplace quand elle tombe et
 * doit porter son propre document.
 *
 * Hébergées dans le dépôt (2026-11-13) : `next/font/google` allait les
 * chercher chez Google à chaque `next build`, en CI comme au déploiement
 * Clever Cloud, et une réponse vide de Google a fait tomber le job
 * `build-cc` (« Cannot read properties of null (reading '1') »,
 * next-font-loader). `polices.css` reprend les feuilles de Google Fonts
 * telles quelles — tous les sous-ensembles, chacun avec son unicode-range :
 * le navigateur ne charge que ceux dont la page a besoin, comme avant —, les
 * fichiers étant dans `polices/`. Régénérer : `scripts/polices/regenerer.py`.
 *
 * Ce que `next/font` faisait en plus et que cette feuille ne fait pas : le
 * préchargement des fichiers et la police de secours aux métriques ajustées.
 * Avec `font-display: swap`, le texte s'affiche aussitôt dans la police du
 * système, puis bascule.
 */

/** La classe qui pose les variables des quatre polices, à mettre sur `<html>`. */
export const variablesPolices = "polices";
