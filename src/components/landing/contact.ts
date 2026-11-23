/**
 * Le contact de la page publique : les sujets que le formulaire propose (pied
 * de page, tarif « Sur mesure », mise en route accompagnée), et les bornes des
 * champs, lues par le formulaire et par la règle du serveur
 * (`lib/contact/message.ts`). Sans zod, à dessein : ce module part dans le
 * JavaScript de chaque page publique.
 *
 * [2026-11-23 : l'adresse de destination (`CONTACT`) n'est plus ici, décision
 * de la propriétaire — ce module part dans le navigateur ; elle vit côté
 * serveur, `lib/contact/message.ts`.]
 */

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
