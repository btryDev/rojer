/**
 * Les pages d'information de la page publique, servies par
 * `app/legal/[page]`. Leur texte reste à écrire (cadre juridique en cours) :
 * en attendant, chacune le dit et renvoie au contact.
 */
export const PAGES_LEGALES = [
  { slug: "mentions-legales", titre: "Mentions légales" },
  { slug: "confidentialite", titre: "Confidentialité" },
  { slug: "conditions", titre: "Conditions d'utilisation" },
  { slug: "cookies", titre: "Cookies" },
] as const;
