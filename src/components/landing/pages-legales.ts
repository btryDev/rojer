/**
 * Les pages d'information de la page publique, servies par
 * `app/legal/[page]`. Leur texte reste à écrire (cadre juridique en cours) :
 * en attendant, chacune le dit et renvoie au contact.
 *
 * Les conditions générales n'en sont pas : elles ont leur page, versionnée
 * (`/conditions`, ADR-053 § 8).
 */
export const PAGES_LEGALES = [
  { slug: "mentions-legales", titre: "Mentions légales" },
  { slug: "confidentialite", titre: "Confidentialité" },
  { slug: "cookies", titre: "Cookies" },
] as const;

/** La colonne « Informations » du pied de page. */
export const LIENS_INFORMATIONS = [
  { href: "/legal/mentions-legales", label: "Mentions légales" },
  { href: "/conditions", label: "Conditions générales" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/cookies", label: "Cookies" },
];
