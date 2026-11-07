/**
 * Le contact de la page publique : l'adresse, et les sujets que le
 * formulaire propose (pied de page, tarif « Sur mesure », mise en route
 * accompagnée).
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

/**
 * Le message tient dans un lien `mailto:` : encodé, il triple ou presque, et
 * au-delà d'environ 2 000 caractères d'adresse certaines messageries
 * (Outlook sous Windows) tronquent ou n'ouvrent rien.
 */
export const MESSAGE_MAX = 1000;

/** La longueur du lien `mailto:` au-delà de laquelle le formulaire refuse d'ouvrir. */
export const MAILTO_MAX = 1900;

export type SujetContact = (typeof SUJETS_CONTACT)[number];

/**
 * Le message du formulaire, prêt à partir de la messagerie du visiteur.
 *
 * Provisoire : aucun e-mail ne part encore du serveur en production. Le
 * formulaire ouvre donc la messagerie du visiteur, message rédigé — rien
 * n'est enregistré, rien ne transite par Rojer. Le jour où l'envoi existe,
 * le formulaire poste vers une action serveur et cette fonction disparaît.
 */
export function mailtoContact(m: {
  sujet: SujetContact;
  nom: string;
  email: string;
  structure: string;
  message: string;
}): string {
  const signature = [m.nom, m.structure, m.email].map((t) => t.trim()).filter(Boolean);
  // CRLF : la forme que la RFC 6068 demande dans un corps de `mailto:`.
  const corps = [m.message.trim(), "", "—", ...signature].join("\r\n");
  return `mailto:${CONTACT}?subject=${encodeURIComponent(m.sujet)}&body=${encodeURIComponent(corps)}`;
}
