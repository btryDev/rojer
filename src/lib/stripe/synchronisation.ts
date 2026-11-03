import "server-only";
// Recopier chez Rojer l'état d'un client Stripe (ADR-053 § 5). Une seule
// voie, quel que soit l'événement reçu : relire le client et ses abonnements
// par l'API, retenir l'abonnement courant, l'écrire. L'ordre d'arrivée des
// événements, que Stripe ne garantit pas, cesse de compter.
//
// - Le compte est le `metadata.userId` posé par Rojer sur le client Stripe
//   relu, ou à défaut sur l'abonnement (seul encore lisible d'un client
//   supprimé) — jamais un identifiant pris dans la notification.
// - La ligne n'est écrite que si elle porte CE client Stripe ; un conflit
//   (autre client, autre compte, compte disparu) ne s'écrit pas : il se
//   signale (`alerte`).
// - Écriture conditionnelle sur `relueLe` : une relecture plus ancienne que la
//   dernière écrite (deux livraisons croisées) n'écrase rien.

import type Stripe from "stripe";
import { clientDuClientStripe } from "@/lib/auth/compte-hors-session";
import { OPTIONS_WEBHOOK } from "./client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Rang d'un état pour retenir l'abonnement courant : celui qui paie d'abord,
 * puis l'impayé ou suspendu, puis celui qui attend son premier paiement,
 * puis les terminés. Un état inconnu passe avec les impayés.
 */
const RANGS: Record<string, number> = {
  active: 0,
  trialing: 0,
  past_due: 0,
  unpaid: 1,
  paused: 1,
  incomplete: 2,
  canceled: 3,
  incomplete_expired: 3,
};
const rang = (s: Stripe.Subscription) => RANGS[s.status] ?? 1;

const date = (s: number | null | undefined) => (s ? new Date(s * 1000) : null);

/**
 * L'abonnement qui fait foi pour le client : le meilleur rang, puis le plus
 * récent. Un abonnement neuf en attente de paiement ne remplace donc pas celui
 * qui paie, et un ancien résilié ne ferme rien. `plusieurs` : deux abonnements
 * en cours à la fois, ce que le parcours doit empêcher — à signaler.
 */
export function abonnementCourant(abonnements: Stripe.Subscription[]): {
  courant: Stripe.Subscription | null;
  plusieurs: boolean;
} {
  const tries = [...abonnements].sort((a, b) => rang(a) - rang(b) || b.created - a.created);
  return { courant: tries[0] ?? null, plusieurs: abonnements.filter((s) => rang(s) <= 1).length > 1 };
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

/** Le premier essai pris par ce client, sur quelque abonnement que ce soit. */
export function premierEssai(abonnements: Stripe.Subscription[]): Date | null {
  const debuts = abonnements.map((s) => s.trial_start).filter((t): t is number => !!t);
  return debuts.length ? date(Math.min(...debuts)) : null;
}

/**
 * Le compte d'un client Stripe RELU : le `metadata.userId` posé par Rojer sur
 * le client, ou à défaut sur l'abonnement courant (seul encore lisible d'un
 * client supprimé). Seule déduction du compte : le multi-utilisateurs y
 * lira `metadata.compteId`.
 */
export function compteDuClientStripe(
  client: Stripe.Customer | Stripe.DeletedCustomer,
  courant: Stripe.Subscription | null,
): string | null {
  const userId = (client.deleted ? undefined : client.metadata?.userId) ?? courant?.metadata?.userId;
  return typeof userId === "string" && UUID.test(userId) ? userId : null;
}

/** Code d'une erreur Prisma, reconnu à sa forme (sans charger le client généré). */
const codePrisma = (e: unknown) => {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : null;
};

export type Synchronisation =
  | { issue: "ecrit" | "inchange" }
  | { issue: "ignore"; motif: string; alerte?: true };

const DEJA_LIE = { issue: "ignore", motif: "client ou abonnement Stripe déjà lié à un autre compte", alerte: true } as const;
const AUTRE_CLIENT = { issue: "ignore", motif: "le compte est lié à un autre client Stripe", alerte: true } as const;

export async function synchroniserClientStripe(
  stripe: Stripe,
  customerId: string,
  maintenant: () => Date = () => new Date(),
): Promise<Synchronisation> {
  const client = await stripe.customers.retrieve(customerId, {}, OPTIONS_WEBHOOK);
  // L'heure de la relecture est prise AVANT de lister : une relecture qui
  // commence plus tard voit un état au moins aussi récent.
  const relueLe = maintenant();
  const liste = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 }, OPTIONS_WEBHOOK);
  const { courant, plusieurs } = abonnementCourant(liste.data);

  const userId = compteDuClientStripe(client, courant);
  if (!userId) return { issue: "ignore", motif: "client Stripe sans compte Rojer (metadata.userId)" };
  if (plusieurs) console.error(`stripe : plusieurs abonnements en cours pour un même client (${customerId})`);

  const db = clientDuClientStripe(userId);
  const ligne = await db.abonnement.findUnique({
    where: { userId },
    select: { stripeCustomerId: true, essaiUtiliseLe: true },
  });
  if (ligne && ligne.stripeCustomerId !== customerId) return AUTRE_CLIENT;

  const donnees = {
    ...colonnesDe(courant),
    relueLe,
    essaiUtiliseLe: ligne?.essaiUtiliseLe ?? premierEssai(liste.data),
  };

  try {
    if (!ligne) {
      try {
        await db.abonnement.create({ data: { userId, stripeCustomerId: customerId, ...donnees } });
        return { issue: "ecrit" };
      } catch (e) {
        // Compte disparu : clé étrangère (P2003), ou la liaison au compte que
        // pose la borne (P2025, enregistrement requis introuvable).
        const code = codePrisma(e);
        if (code === "P2003" || code === "P2025") return { issue: "ignore", motif: "compte Rojer introuvable", alerte: true };
        if (code !== "P2002") throw e;
        // Unicité : une livraison simultanée a créé la ligne du compte — on
        // passe à la mise à jour —, ou ce client est déjà à un autre compte.
        const creee = await db.abonnement.findUnique({ where: { userId }, select: { stripeCustomerId: true } });
        if (!creee) return DEJA_LIE;
        if (creee.stripeCustomerId !== customerId) return AUTRE_CLIENT;
      }
    }
    const { count } = await db.abonnement.updateMany({
      where: { userId, stripeCustomerId: customerId, OR: [{ relueLe: null }, { relueLe: { lt: relueLe } }] },
      data: donnees,
    });
    return { issue: count === 1 ? "ecrit" : "inchange" };
  } catch (e) {
    // L'abonnement relu est déjà sur la ligne d'un autre compte.
    if (codePrisma(e) === "P2002") return DEJA_LIE;
    throw e;
  }
}
