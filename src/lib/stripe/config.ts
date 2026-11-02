import "server-only";
// La configuration Stripe (ADR-053 § 7), seule décision : la clé et
// l'environnement vont ensemble, et la clé avec le secret du webhook.
//
// - Rien de posé : abonnements désactivés sciemment, l'app sert le reste.
// - Clé `live` : seulement sur un serveur de production (`NODE_ENV`) qui se
//   déclare production (`APP_ENV`) — un `.env` de production copié sur un
//   poste ne débite pas de vraie carte —, et restreinte (`rk_live_`).
// - Clé de test : jamais en production (des clients y « paieraient » sans
//   être débités).
//
// Tout refus, forme comprise, ferme les abonnements et non le serveur ; le
// motif est signalé au démarrage (`avertissementsEnvironnement`) et ne cite
// jamais une valeur. `configurationStripe` rend les secrets : serveur seul.
// Un écran ne reçoit que `etatStripe`, la même décision sans secret.

import { environnementApp, type Env } from "@/lib/environnement";

/** Clé secrète (`sk_`) ou restreinte (`rk_`), de test ou de production. */
const FORME_CLE_STRIPE = /^(sk|rk)_(test|live)_\w+$/;
/** Secret de signature d'un endpoint de webhook. */
const FORME_SECRET_WEBHOOK_STRIPE = /^whsec_\S+$/;

export type ModeStripe = "test" | "live";

export type ConfigurationStripe =
  | { active: true; cle: string; secretWebhook: string; mode: ModeStripe }
  /** `motif` nul : rien n'est posé, les abonnements sont désactivés sciemment. */
  | { active: false; motif: string | null };

const posee = (v: string | undefined): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

export function configurationStripe(env: Env = process.env): ConfigurationStripe {
  const cle = posee(env.STRIPE_SECRET_KEY);
  const secretWebhook = posee(env.STRIPE_WEBHOOK_SECRET);

  if (!cle && !secretWebhook) return { active: false, motif: null };
  if (!cle) return refus("STRIPE_SECRET_KEY absente alors que STRIPE_WEBHOOK_SECRET est posée : les deux vont ensemble");
  if (!secretWebhook) {
    return refus("STRIPE_WEBHOOK_SECRET absente alors que STRIPE_SECRET_KEY est posée : les deux vont ensemble");
  }

  const forme = FORME_CLE_STRIPE.exec(cle);
  if (!forme) return refus("STRIPE_SECRET_KEY n'a pas la forme d'une clé Stripe (sk_ ou rk_, test ou live)");
  if (!FORME_SECRET_WEBHOOK_STRIPE.test(secretWebhook)) {
    return refus("STRIPE_WEBHOOK_SECRET n'a pas la forme d'un secret de webhook Stripe (whsec_)");
  }

  const restreinte = forme[1] === "rk";
  const mode: ModeStripe = forme[2] === "live" ? "live" : "test";
  const production = environnementApp(env) === "production";
  const serveurDeProduction = posee(env.NODE_ENV) === "production";

  if (mode === "live" && !(production && serveurDeProduction)) {
    return refus(
      "clé Stripe de production refusée : l'environnement n'est pas une production déclarée (APP_ENV et NODE_ENV)",
    );
  }
  if (mode === "test" && production) {
    return refus("clé Stripe de test refusée en production : aucun paiement n'y serait encaissé");
  }
  if (mode === "live" && !restreinte) {
    return refus("clé Stripe de production non restreinte : utiliser une clé restreinte (rk_live_)");
  }

  return { active: true, cle, secretWebhook, mode };
}

/** La décision, sans secret : ce qu'un écran ou un journal peut recevoir. */
export type EtatStripe = { active: true; mode: ModeStripe } | { active: false; motif: string | null };

export function etatStripe(env: Env = process.env): EtatStripe {
  const c = configurationStripe(env);
  return c.active ? { active: true, mode: c.mode } : c;
}

function refus(motif: string): ConfigurationStripe {
  return { active: false, motif: `abonnements désactivés — ${motif}` };
}
