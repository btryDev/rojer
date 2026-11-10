import "server-only";
// Le client Stripe du serveur (ADR-053), un seul pour le processus : il garde
// ses connexions ouvertes d'une requête à l'autre.
//
// - Version d'API épinglée : ni une publication de Stripe ni le réglage du
//   compte ne changent le comportement ; `satisfies` refuse une autre valeur
//   que celle du SDK installé, monter l'un oblige à monter l'autre.
// - 10 s par tentative (80 par défaut) ; deux relances réseau (le défaut du
//   SDK), idempotentes. La file du webhook a son client à lui, plus court
//   (`clientStripeWebhook`) : tout ce qu'elle appelle en hérite.

import Stripe from "stripe";
import type { ConfigurationStripe } from "./config";

export const VERSION_API_STRIPE = "2026-10-28.endive" satisfies Stripe.LatestApiVersion;

/**
 * Par appel, dans la file Stripe (aiguillage, relecture sous bail) : 3 s,
 * sans relance du SDK — la relance est celle de la file (`ESSAIS_EN_MINUTES`).
 * Passée aussi par appel dans la relecture, que les gestes de l'utilisateur
 * lancent avec le client ordinaire : elle la tient sous son bail (`BAIL_MS`).
 */
export const OPTIONS_WEBHOOK: Stripe.RequestOptions = { timeout: 3_000, maxNetworkRetries: 0 };

/** Par appel, pour une relecture de garde dans un geste de l'utilisateur : 5 s, il attend. */
export const OPTIONS_RELECTURE: Stripe.RequestOptions = { timeout: 5_000 };

type ConfigActive = Extract<ConfigurationStripe, { active: true }>;

const nouveauClient = (config: ConfigActive, options: Stripe.RequestOptions) =>
  new Stripe(config.cle, {
    apiVersion: VERSION_API_STRIPE,
    maxNetworkRetries: options.maxNetworkRetries,
    timeout: options.timeout,
    appInfo: { name: "Rojer" },
  });

let client: Stripe | undefined;
let clientWebhook: Stripe | undefined;

/** Le client Stripe d'une configuration active (`configurationStripe`, seule décision). */
export function clientStripe(config: ConfigActive): Stripe {
  return (client ??= nouveauClient(config, { timeout: 10_000, maxNetworkRetries: 2 }));
}

/**
 * Le client de la file du webhook (`traitement.ts`) : `OPTIONS_WEBHOOK` pour
 * TOUS ses appels, y compris ceux des fonctions partagées qu'elle appelle
 * (`finaliserCarte`, `rendrePlanningEchu`), qui ne passent pas d'options.
 * Sans quoi un appel à 10 s et deux relances pourrait faire durer un
 * aiguillage plus longtemps que sa prise (`PRISE_EXPIREE_MS`), ou une
 * relecture plus longtemps que son bail (`BAIL_MS`).
 */
export function clientStripeWebhook(config: ConfigActive): Stripe {
  return (clientWebhook ??= nouveauClient(config, OPTIONS_WEBHOOK));
}
