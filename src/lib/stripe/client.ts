import "server-only";
// Le client Stripe du serveur (ADR-053). Un seul par clé, réutilisé : il garde
// ses connexions ouvertes d'une requête à l'autre.
//
// - Version d'API ÉPINGLÉE : le comportement ne change pas quand Stripe
//   publie une version, ni quand le tableau de bord change la version par
//   défaut du compte. `satisfies LatestApiVersion` refuse une autre valeur
//   que celle du SDK installé : monter le SDK oblige à relire le journal des
//   changements et à monter cette constante dans le même geste.
// - Dix secondes au plus par tentative (80 par défaut).
// - Deux nouvelles tentatives sur erreur réseau — la valeur par défaut du SDK
//   sous Node, écrite pour être lue : le SDK les accompagne d'une clé
//   d'idempotence, une écriture n'est pas faite deux fois. Au pire, un appel
//   dure donc 35 à 40 secondes (trois tentatives et leurs attentes) : la
//   route du webhook et le passage au paiement réduiront ces valeurs par
//   requête (`{ timeout, maxNetworkRetries }`).

import Stripe from "stripe";
import { configurationStripe } from "./config";

export const VERSION_API_STRIPE = "2026-10-28.endive" satisfies Stripe.LatestApiVersion;

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
