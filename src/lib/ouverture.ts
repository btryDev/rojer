// L'ouverture de Rojer au public — UN SEUL interrupteur.
//
// 2026-11-23, décision de la propriétaire : la page publique part en ligne
// pour que Stripe vérifie le site, mais le compte Stripe n'est pas encore
// validé. Fermé, l'interrupteur :
//  - mène chaque bouton d'inscription de la page publique à `/bientot`, où
//    l'on laisse son adresse pour être prévenu (`DemandeOuverture`) ;
//  - ferme le paiement : « S'abonner » (`sAbonnerAction`, seul chemin vers
//    `ouvrirCheckout`) ne mène pas à Stripe, la page Abonnement le dit — ni
//    carte réelle, ni carte de test en préproduction.
//
// ~~`/signup` renvoie à /bientot, l'action d'inscription refuse côté serveur,
// sauf l'adresse qu'une invitation attend~~ [2026-11-23, décision de la
// propriétaire, sur la relecture : cette fermeture disait qui est invité (un
// essai d'adresse suffisait) et cassait le parcours d'un invité dont le lien
// avait expiré. On ferme le paiement à la place : `/signup` reste servi
// (invitations, testeurs) ; qui le tape à la main ouvre un essai, sans pouvoir
// payer.]
//
// ROUVRIR : passer `OUVERT_AU_PUBLIC` à `true`. Les boutons retrouvent
// `/signup`, le paiement s'ouvre, `/bientot` renvoie à l'inscription et sort
// du plan du site. Pas de variable d'environnement, par décision : l'état se
// lit dans le code et s'ouvre par un commit.
//
// Module sans `server-only` : les cartes d'offres, composant client, le lisent.

// [2026-11-26, décision de la propriétaire : Stripe validé et vérifié en production
// (`pnpm verifier-stripe-prod`, #385) — Rojer ouvre.]
export const OUVERT_AU_PUBLIC: boolean = true;

/** La page « Rojer ouvre bientôt ». */
export const PAGE_BIENTOT = "/bientot";

/** Le retour demandé mène-t-il à une invitation à rejoindre un compte ? */
export function versInvitation(next: string | null | undefined): boolean {
  return typeof next === "string" && next.startsWith("/invitation/");
}

/**
 * Le lien d'un bouton d'inscription : `cheminInscription` (vers `/signup`)
 * une fois Rojer ouvert, ou pour revenir à une invitation (ADR-054 § 5) ;
 * `/bientot` sinon. `ouvert` : pour les tests.
 */
export function lienInscription(
  cheminInscription: string,
  { next, ouvert = OUVERT_AU_PUBLIC }: { next?: string | null; ouvert?: boolean } = {},
): string {
  return ouvert || versInvitation(next) ? cheminInscription : PAGE_BIENTOT;
}
