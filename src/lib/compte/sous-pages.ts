/**
 * Les sous-pages de l'espace « Compte » (2026-11-17, décision de la
 * propriétaire : deux espaces, Compte et Abonnement, chacun avec son menu de
 * côté). Les adresses historiques restent : les renvois (`PAGE_MEMBRES`,
 * `revalidatePath`) et les e-mails y mènent.
 *
 * Sans import serveur : le menu interne, composant client, les lit.
 */
export const PAGE_MEMBRES = "/compte/membres";
export const PAGE_SECURITE = "/compte/securite";

export const SOUS_PAGES_COMPTE = [
  { href: PAGE_MEMBRES, libelle: "Membres" },
  { href: PAGE_SECURITE, libelle: "Sécurité" },
] as const;
