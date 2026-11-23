// L'ouverture des inscriptions au public — UN SEUL interrupteur.
//
// 2026-11-23, décision de la propriétaire : la page publique part en ligne
// pour que Stripe vérifie le site, mais le compte Stripe n'est pas encore
// validé. Personne ne doit pouvoir s'inscrire ni s'abonner depuis le site
// public : chaque bouton qui menait à l'inscription mène à `/bientot`, où
// l'on laisse son adresse pour être prévenu (`DemandeOuverture`). `/signup`
// renvoie là aussi, et l'action d'inscription refuse côté serveur.
//
// ROUVRIR : passer `INSCRIPTIONS_OUVERTES` à `true`. Rien d'autre à toucher —
// les boutons retrouvent `/signup`, la page et l'action se rouvrent. Pas de
// variable d'environnement, par décision : l'état se lit dans le code et
// s'ouvre par un commit.
//
// Ce qui reste ouvert, fermé ou non : la connexion, et l'inscription d'une
// personne INVITÉE à rejoindre un compte (ADR-054 § 5) — son e-mail lui dit
// de créer son compte, et le parcours passe par `/signup?next=/invitation/…`.
// L'action ne la laisse passer que si une invitation valable attend cette
// adresse (`signUpAction`) : le `next` seul ne prouve rien.
//
// Module sans `server-only` : les cartes d'offres, composant client, le lisent.

export const INSCRIPTIONS_OUVERTES: boolean = false;

/** La page « Rojer ouvre bientôt ». */
export const PAGE_BIENTOT = "/bientot";

/** Le retour demandé mène-t-il à une invitation à rejoindre un compte ? */
export function versInvitation(next: string | null | undefined): boolean {
  return typeof next === "string" && next.startsWith("/invitation/");
}

type Options = { next?: string | null; ouvertes?: boolean };

/**
 * La page `/signup` s'affiche-t-elle ? Oui tant que les inscriptions sont
 * ouvertes, ou quand le parcours revient à une invitation.
 */
export function inscriptionAffichee({ next, ouvertes = INSCRIPTIONS_OUVERTES }: Options = {}): boolean {
  return ouvertes || versInvitation(next);
}

/**
 * Le lien d'un bouton d'inscription : `cheminInscription` (vers `/signup`)
 * quand la page s'affiche (`inscriptionAffichee`), `/bientot` sinon.
 */
export function lienInscription(cheminInscription: string, options: Options = {}): string {
  return inscriptionAffichee(options) ? cheminInscription : PAGE_BIENTOT;
}
