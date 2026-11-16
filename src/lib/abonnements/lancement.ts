import "server-only";
// Le lancement de l'offre (ADR-053 § 3) : sans dépendance à la session, pour
// être lu par la couche qui construit la portée du compte (le gel, § 14).

import { etatStripe } from "@/lib/stripe/config";
import type { Env } from "@/lib/environnement";
import type { ContexteDroits } from "./droits";

/** `ABONNEMENT_EXIGE=oui` (espaces et casse tolérés, comme `env.ts`) : l'offre est lancée. */
export function abonnementExige(env: Env = process.env): boolean {
  return env.ABONNEMENT_EXIGE?.trim().toLowerCase() === "oui";
}

export function contexteDroits(): ContexteDroits {
  return { stripeActif: etatStripe().active, exige: abonnementExige(), maintenant: new Date() };
}

/** L'offre est lancée et Stripe est actif : seule condition pour lire l'abonnement. */
export const offreLancee = (ctx: ContexteDroits) => ctx.stripeActif && ctx.exige;

/**
 * L'offre exigée alors que Stripe est refusé : la saisie s'ouvre à tous,
 * sans abonnement et sans bruit (revue de la mécanique, 2026-11-16). Lu au
 * démarrage (`env.ts`) et chaque jour par la tâche quotidienne, qui l'envoie
 * par e-mail. `null` : rien à dire.
 */
export function offreOuverteParErreur(env: Env = process.env): string | null {
  return abonnementExige(env) && !etatStripe(env).active
    ? "ABONNEMENT_EXIGE=oui alors que Stripe est désactivé : la saisie reste ouverte à tous, sans abonnement (abonnements/droits.ts)."
    : null;
}
