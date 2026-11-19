/**
 * Le contact de la page publique : l'adresse, les sujets que le formulaire
 * propose (pied de page, tarif « Sur mesure », mise en route accompagnée), et
 * les bornes des champs, lues par le formulaire et par la règle du serveur
 * (`lib/contact/message.ts`). Sans zod, à dessein : ce module part dans le
 * JavaScript de chaque page publique.
 *
 * L'adresse n'est pas affichée sur la page (décision de la propriétaire,
 * 2026-11-07) : elle ne sert que de destinataire au formulaire.
 *
 * ⚠︎ À confirmer avant la mise en ligne : c'est l'adresse du compte, pas
 * forcément celle qu'on veut exposer publiquement. La même adresse est le
 * point d'entrée RGPD (`docs/rgpd.md`) : si elle change, vérifier si celle-ci
 * suit.
 */

export const CONTACT = "contact@btry.fr";

export const SUJETS_CONTACT = [
  "Une question sur Rojer",
  "Mise en route accompagnée",
  "Rojer sur mesure",
  "Autre",
] as const;

export type SujetContact = (typeof SUJETS_CONTACT)[number];

/**
 * La longueur d'un message. [2026-11-19 : 1 000 tant que le message partait
 * dans un lien `mailto:` (au-delà, certaines messageries tronquaient) ; il
 * part désormais du serveur.]
 */
export const MESSAGE_MAX = 3000;
export const NOM_MAX = 120;
export const EMAIL_MAX = 200;
export const STRUCTURE_MAX = 160;

/**
 * Le champ piège : invisible pour une personne, rempli par les robots qui
 * remplissent tout. Un message qui le porte est jeté sans rien dire. Son nom
 * ne veut rien dire, à dessein : « site web », « url » ou « société », le
 * remplissage automatique du navigateur le remplirait pour un vrai visiteur.
 */
export const CHAMP_PIEGE = "rjx_tampon";
