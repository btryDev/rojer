import "server-only";
// Le client Stripe du serveur (ADR-053), un seul pour le processus : il garde
// ses connexions ouvertes d'une requête à l'autre.
//
// - Version d'API épinglée : ni une publication de Stripe ni le réglage du
//   compte ne changent le comportement ; `satisfies` refuse une autre valeur
//   que celle du SDK installé, monter l'un oblige à monter l'autre.
// - 10 s par tentative (80 par défaut) ; deux relances réseau (le défaut du
//   SDK), idempotentes. Au pire 35 à 40 s : la route du webhook et le passage
//   au paiement réduiront ces valeurs par requête.

import Stripe from "stripe";
import { configurationStripe } from "./config";

export const VERSION_API_STRIPE = "2026-10-28.endive" satisfies Stripe.LatestApiVersion;

let client: Stripe | undefined;

/** Le client Stripe, ou `null` si les abonnements sont désactivés (`config.ts`). */
export function clientStripe(): Stripe | null {
  const config = configurationStripe();
  if (!config.active) return null;
  return (client ??= new Stripe(config.cle, {
    apiVersion: VERSION_API_STRIPE,
    maxNetworkRetries: 2,
    timeout: 10_000,
    appInfo: { name: "Rojer" },
  }));
}
