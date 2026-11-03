import "server-only";
// Le client Stripe du serveur (ADR-053), un seul pour le processus : il garde
// ses connexions ouvertes d'une requête à l'autre.
//
// - Version d'API épinglée : ni une publication de Stripe ni le réglage du
//   compte ne changent le comportement ; `satisfies` refuse une autre valeur
//   que celle du SDK installé, monter l'un oblige à monter l'autre.
// - 10 s par tentative (80 par défaut) ; deux relances réseau (le défaut du
//   SDK), idempotentes. Le webhook passe des options plus courtes par
//   requête (`OPTIONS_WEBHOOK`).

import Stripe from "stripe";
import type { ConfigurationStripe } from "./config";

export const VERSION_API_STRIPE = "2026-10-28.endive" satisfies Stripe.LatestApiVersion;

/**
 * Par appel, dans le webhook : 3 s, sans relance du SDK — la relance est celle
 * de Stripe, sur toute la livraison. Au plus trois appels par notification.
 */
export const OPTIONS_WEBHOOK: Stripe.RequestOptions = { timeout: 3_000, maxNetworkRetries: 0 };

let client: Stripe | undefined;

/** Le client Stripe d'une configuration active (`configurationStripe`, seule décision). */
export function clientStripe(config: Extract<ConfigurationStripe, { active: true }>): Stripe {
  return (client ??= new Stripe(config.cle, {
    apiVersion: VERSION_API_STRIPE,
    maxNetworkRetries: 2,
    timeout: 10_000,
    appInfo: { name: "Rojer" },
  }));
}
