import "server-only";
// Le client Stripe du serveur (ADR-053). Un seul par clé, réutilisé : il garde
// ses connexions ouvertes d'une requête à l'autre.
//
// - Version d'API ÉPINGLÉE : le comportement ne change pas quand Stripe
//   publie une version, ni quand le tableau de bord change la version par
//   défaut du compte. Le type (`LatestApiVersion` du SDK) refuse une autre
//   valeur que celle du SDK installé : monter le SDK oblige à relire le
//   journal des changements et à monter cette constante dans le même geste.
// - Deux nouvelles tentatives sur erreur réseau : le SDK les accompagne d'une
//   clé d'idempotence, une écriture n'est donc pas faite deux fois.
// - Dix secondes au plus par appel (80 par défaut) : un appel qui traîne ne
//   retient pas une requête de l'app une minute et demie.

import Stripe from "stripe";
import { configurationStripe } from "./config";

export const VERSION_API_STRIPE = "2026-10-28.endive" as const;

let instance: { cle: string; client: Stripe } | null = null;

/** Le client Stripe, ou `null` si les abonnements sont désactivés (`config.ts`). */
export function clientStripe(): Stripe | null {
  const config = configurationStripe();
  if (!config.active) return null;
  if (instance?.cle !== config.cle) {
    instance = {
      cle: config.cle,
      client: new Stripe(config.cle, {
        apiVersion: VERSION_API_STRIPE,
        maxNetworkRetries: 2,
        timeout: 10_000,
        appInfo: { name: "Rojer" },
      }),
    };
  }
  return instance.client;
}
