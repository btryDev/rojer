/**
 * Adresse de contact de la page publique (« Une prise en main rapide »,
 * tarif : Sur mesure et mise en route accompagnée).
 *
 * ⚠︎ À confirmer avant la mise en ligne : c'est l'adresse du compte, pas
 * forcément celle qu'on veut exposer publiquement. Un seul endroit à
 * changer si elle bouge.
 */
export const CONTACT = "contact@btry.fr";

/** Le lien `mailto:` vers cette adresse, avec un objet. */
export function lienContact(objet: string) {
  return `mailto:${CONTACT}?subject=${encodeURIComponent(objet)}`;
}
