// La notification d'un changement chez Stripe (ADR-053 § 5). Sans session :
// la preuve est la signature, vérifiée sur le corps brut avant toute lecture
// en base (`stripe/webhook.ts`). Abonnements désactivés : 503, pour que
// Stripe relance au lieu de perdre une résiliation.

import { configurationStripe } from "@/lib/stripe/config";
import { clientStripeWebhook } from "@/lib/stripe/client";
import { lireCorpsBorne, traiterNotificationStripe, verifierNotificationStripe } from "@/lib/stripe/webhook";

const reponse = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const config = configurationStripe();
  if (!config.active) {
    console.error("stripe : notification reçue alors que les abonnements sont désactivés");
    return reponse(503);
  }

  const corps = await lireCorpsBorne(request);
  if (corps === null) return reponse(413);

  const stripe = clientStripeWebhook(config);
  const verification = verifierNotificationStripe(
    stripe,
    corps,
    request.headers.get("stripe-signature"),
    config.secretWebhook,
  );
  if (!verification.ok) {
    console.warn(`stripe : notification refusée — ${verification.motif}`);
    return reponse(400);
  }
  return reponse(await traiterNotificationStripe(stripe, verification.notification, config.mode));
}
