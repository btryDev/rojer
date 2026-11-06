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
