// Écrire un cookie depuis le navigateur, avec les attributs du produit :
// `SameSite=Lax`, `Secure` en HTTPS, un an par défaut. Un seul endroit, pour
// que deux préférences mémorisées ne divergent pas sur ces attributs.
//
// La valeur est encodée ici ; Next la décode à la lecture (`cookies()`).
// `null` efface le cookie.

export const UN_AN_EN_SECONDES = 60 * 60 * 24 * 365;

export function ecrireCookieClient(
  nom: string,
  valeur: string | null,
  { chemin = "/", maxAge = UN_AN_EN_SECONDES }: { chemin?: string; maxAge?: number } = {},
): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${nom}=${valeur === null ? "" : encodeURIComponent(valeur)}` +
    `; Path=${chemin}; Max-Age=${valeur === null ? 0 : maxAge}; SameSite=Lax${secure}`;
}
