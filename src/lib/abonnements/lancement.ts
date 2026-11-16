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
 * Ce qui, dans la configuration, fait tourner l'offre de travers sans
 * empêcher de servir (revue de la mécanique, 2026-11-16) — lu au démarrage
 * (`env.ts`) et chaque jour par la tâche quotidienne, qui l'envoie par
 * e-mail. Vide : rien à dire.
 */
export function avertissementsDeConfiguration(env: Env = process.env): string[] {
  const stripe = etatStripe(env);
  const problemes: string[] = [];
  if (abonnementExige(env) && !stripe.active) {
    problemes.push(
      `ABONNEMENT_EXIGE=oui alors que Stripe est désactivé${stripe.motif ? ` (${stripe.motif})` : ""} : la saisie reste ouverte à tous, sans abonnement (abonnements/droits.ts).`,
    );
  }
  if (stripe.active && !env.TACHES_SECRET?.trim()) {
    problemes.push(
      "Stripe actif sans TACHES_SECRET : la route des tâches répond 404, la file Stripe n'est pas reprise et les tâches quotidiennes ne tournent pas.",
    );
  }
  if (stripe.active && !env.ALERTES_EMAIL?.trim()) {
    problemes.push("Stripe actif sans ALERTES_EMAIL : les alertes (échecs durables, litiges, remboursements) ne vont qu'au journal.");
  }
  return problemes;
}
