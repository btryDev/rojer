import "server-only";
// Recopier chez Rojer l'état d'un client Stripe (ADR-053 § 5). Une seule
// voie, quel que soit l'événement reçu : relire le client et ses abonnements
// par l'API, retenir l'abonnement courant, l'écrire. L'ordre d'arrivée des
// événements, que Stripe ne garantit pas, cesse de compter.
//
// - Le compte est le `metadata.userId` du client Stripe RELU, posé par Rojer
//   à sa création — jamais un identifiant pris dans la notification.
// - La ligne n'est écrite que si elle porte CE client Stripe : un client qui
//   ne serait pas celui du compte ne la touche pas.
// - Écriture conditionnelle sur `relueLe` : une relecture plus ancienne que la
//   dernière écrite (deux livraisons croisées) n'écrase rien.
// - Délais courts et sans relance (3 s par appel, au plus trois appels) :
//   la relance, c'est Stripe qui la fait, sur toute la livraison.

import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { clientDuClientStripe } from "@/lib/auth/compte-hors-session";

export const OPTIONS_WEBHOOK: Stripe.RequestOptions = { timeout: 3_000, maxNetworkRetries: 0 };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** États dont on ne revient pas : un abonnement neuf les remplace. */
const TERMINES = new Set(["canceled", "incomplete_expired"]);

const date = (s: number | null | undefined) => (s ? new Date(s * 1000) : null);

/**
 * L'abonnement qui fait foi pour le client : le plus récent non terminé, sinon
 * le plus récent tout court (pour enregistrer une résiliation). `plusieurs` :
 * deux abonnements non terminés à la fois, ce que le parcours doit empêcher —
 * à signaler, pas à trancher en silence.
 */
export function abonnementCourant(abonnements: Stripe.Subscription[]): {
  courant: Stripe.Subscription | null;
  plusieurs: boolean;
} {
  const recents = [...abonnements].sort((a, b) => b.created - a.created);
  const vivants = recents.filter((s) => !TERMINES.has(s.status));
  return { courant: vivants[0] ?? recents[0] ?? null, plusieurs: vivants.length > 1 };
}

/** Les colonnes d'`Abonnement` que porte un abonnement Stripe (ou son absence). */
export function colonnesDe(s: Stripe.Subscription | null) {
  const item = s?.items.data[0];
  return {
    stripeSubscriptionId: s?.id ?? null,
    statut: s?.status ?? null,
    formule: item?.price.lookup_key ?? null,
    stripePriceId: item?.price.id ?? null,
    finPeriode: date(item?.current_period_end),
    finEssai: date(s?.trial_end),
    resilieEnFinDePeriode: s?.cancel_at_period_end ?? false,
    finPrevueLe: date(s?.cancel_at),
  };
}

export type Synchronisation = { issue: "ecrit" | "inchange" } | { issue: "ignore"; motif: string };

export async function synchroniserClientStripe(
  stripe: Stripe,
  customerId: string,
  maintenant: () => Date = () => new Date(),
): Promise<Synchronisation> {
  const client = await stripe.customers.retrieve(customerId, {}, OPTIONS_WEBHOOK);
  if ("deleted" in client && client.deleted) return { issue: "ignore", motif: "client Stripe supprimé" };
  const userId = client.metadata?.userId;
  if (typeof userId !== "string" || !UUID.test(userId)) {
    return { issue: "ignore", motif: "client Stripe sans compte Rojer (metadata.userId)" };
  }

  // L'heure de la relecture est prise AVANT de lister : une relecture qui
  // commence plus tard voit un état au moins aussi récent.
  const relueLe = maintenant();
  const liste = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 }, OPTIONS_WEBHOOK);
  const { courant, plusieurs } = abonnementCourant(liste.data);
  if (plusieurs) {
    console.error(`stripe : plusieurs abonnements en cours pour un même client (${customerId})`);
  }

  const db = clientDuClientStripe(userId);
  const ligne = await db.abonnement.findUnique({
    where: { userId },
    select: { stripeCustomerId: true, essaiUtiliseLe: true },
  });
  if (ligne && ligne.stripeCustomerId !== customerId) {
    return { issue: "ignore", motif: "le compte est lié à un autre client Stripe" };
  }

  const essai = date(courant?.trial_start);
  const donnees = { ...colonnesDe(courant), relueLe, essaiUtiliseLe: ligne?.essaiUtiliseLe ?? essai };

  if (!ligne) {
    try {
      await db.abonnement.create({ data: { userId, stripeCustomerId: customerId, ...donnees } });
      return { issue: "ecrit" };
    } catch (e) {
      // Une livraison simultanée l'a créée : on passe à la mise à jour.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  const { count } = await db.abonnement.updateMany({
    where: { userId, stripeCustomerId: customerId, OR: [{ relueLe: null }, { relueLe: { lt: relueLe } }] },
    data: donnees,
  });
  return { issue: count === 1 ? "ecrit" : "inchange" };
}
