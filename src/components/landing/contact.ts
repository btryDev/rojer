/**
 * Adresse de contact de la page publique (tarif : Sur mesure et mise en
 * route accompagnée).
 *
 * ⚠︎ À confirmer avant la mise en ligne : c'est l'adresse du compte, pas
 * forcément celle qu'on veut exposer publiquement. La même adresse est le
 * point d'entrée RGPD (`docs/rgpd.md`) : si elle change, vérifier si celle-ci
 * suit.
 */
export const CONTACT = "contact@btry.fr";

/** Le lien `mailto:` vers cette adresse, avec un objet. */
export function lienContact(objet: string) {
  return `mailto:${CONTACT}?subject=${encodeURIComponent(objet)}`;
}
