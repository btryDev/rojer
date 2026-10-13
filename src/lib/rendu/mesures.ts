/**
 * Une mesure écrite en français : « 53,0 °C », « 67 % », « 1 000 UFC/L ».
 *
 * Le contrôle visuel du 2026-10-13 relevait sur le carnet sanitaire
 * « 53.0° », « 67% », « 320UFC/L » et des axes en « 50° ». Trois défauts
 * distincts, une seule cause : chaque écran assemblait le nombre et l'unité à
 * la main — `toFixed(1)` rend un point décimal, et l'espace entre le nombre et
 * son unité était oubliée, ou portée par une marge CSS qui ne survit ni à la
 * copie ni à la lecture d'écran.
 *
 * Deux règles, et elles ne se négocient pas écran par écran :
 *
 *   - la **virgule décimale** et le séparateur de milliers du français — ce que
 *     rend `Intl.NumberFormat("fr-FR")` (une espace fine insécable entre les
 *     milliers) ;
 *   - une **espace insécable** (U+00A0) entre le nombre et l'unité, y compris
 *     devant `%` et `°C` : « 67 % », jamais « 67% » ; « 53,0 °C », jamais
 *     « 53,0° ». Insécable, pour que l'unité ne passe jamais seule à la ligne.
 *
 * Le degré seul (« 50° ») n'est pas une unité de température : c'est un angle.
 * Une température s'écrit toujours avec `°C`.
 */

/** Espace insécable entre un nombre et son unité. */
export const ESPACE_UNITE = " ";

/**
 * Un nombre à la française. `decimales` fixe le nombre de chiffres après la
 * virgule (aucun par défaut) : 53 avec une décimale rend « 53,0 », ce qui dit
 * la précision du relevé au lieu de la perdre.
 */
export function formaterNombreFr(valeur: number, decimales = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valeur);
}

/** Un nombre suivi de son unité, séparés par une espace insécable. */
export function formaterMesure(
  valeur: number,
  unite: "°C" | "%" | "UFC/L",
  decimales = 0,
): string {
  return `${formaterNombreFr(valeur, decimales)}${ESPACE_UNITE}${unite}`;
}
