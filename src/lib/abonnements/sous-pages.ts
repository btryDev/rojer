/**
 * Les sous-pages de l'abonnement (2026-11-17). La vue d'ensemble garde
 * l'adresse historique : les retours de Stripe, `verifierSaisie`
 * (`?saisie=…`) et `exigerUnPaiement` (`?document=1`) y arrivent.
 *
 * Sans import serveur : le menu interne, composant client, les lit
 * (`saisie.ts`, server-only, en réexporte `PAGE_ABONNEMENT`).
 */
export const PAGE_ABONNEMENT = "/compte/abonnement";
export const PAGE_FORMULES = `${PAGE_ABONNEMENT}/formules`;
export const PAGE_UTILISATION = `${PAGE_ABONNEMENT}/utilisation`;
export const PAGE_PAIEMENT = `${PAGE_ABONNEMENT}/paiement`;

export const SOUS_PAGES_ABONNEMENT = [
  { href: PAGE_ABONNEMENT, libelle: "Vue d'ensemble" },
  { href: PAGE_FORMULES, libelle: "Abonnement" },
  { href: PAGE_UTILISATION, libelle: "Utilisation" },
  { href: PAGE_PAIEMENT, libelle: "Paiement et factures" },
] as const;
