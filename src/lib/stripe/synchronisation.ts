import "server-only";
// Recopier chez Rojer l'état d'un client Stripe (ADR-053 § 5). Une seule
// voie, quel que soit l'événement reçu : relire le client et ses abonnements
// par l'API, retenir l'abonnement courant, l'écrire. L'ordre d'arrivée des
// événements, que Stripe ne garantit pas, cesse de compter.
//
// - Le compte est le `metadata.compteId` posé par Rojer sur le client Stripe
//   relu, ou à défaut sur l'abonnement (seul encore lisible d'un client
//   supprimé) — jamais un identifiant pris dans la notification. Un client
//   créé avant l'ADR-054 ne porte que `metadata.userId` : le compte est alors
//   celui dont cette personne est l'unique propriétaire.
// - La ligne n'est écrite que si elle porte CE client Stripe ; un conflit
//   (autre client, autre compte, compte disparu) ne s'écrit pas : il se
//   signale (`alerte`).
// - Écriture conditionnelle sur `relueLe`, l'heure à laquelle la relecture
//   commence : une relecture lancée plus tôt n'écrase pas une lancée plus
//   tard. Limite connue : deux relectures croisées dont la plus récente
//   reviendrait avec l'état le plus ancien (latence réseau inégale) laissent
//   cet état jusqu'à l'événement suivant — Stripe en envoie plusieurs par
//   changement (abonnement, facture).

import type Stripe from "stripe";
import { clientDuClientStripe } from "@/lib/auth/compte-hors-session";
import { compteDontEstProprietaire } from "@/lib/auth/membres";
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

/** Ce que le client Stripe RELU désigne : un compte, ou (avant l'ADR-054) son propriétaire. */
export type CompteDesigne = { compteId: string } | { proprietaire: string };

/**
 * Le compte d'un client Stripe RELU : le `metadata.compteId` posé par Rojer
 * sur le client, ou à défaut sur l'abonnement courant (seul encore lisible
 * d'un client supprimé). Sans lui, le `metadata.userId` d'avant l'ADR-054,
 * qui désigne le propriétaire. Seule déduction du compte.
 */
export function compteDuClientStripe(
  client: Stripe.Customer | Stripe.DeletedCustomer,
  courant: Stripe.Subscription | null,
): CompteDesigne | null {
  const lire = (cle: string) => {
    const v = (client.deleted ? undefined : client.metadata?.[cle]) ?? courant?.metadata?.[cle];
    return typeof v === "string" && UUID.test(v) ? v : null;
  };
  const compteId = lire("compteId");
  if (compteId) return { compteId };
  const proprietaire = lire("userId");
  return proprietaire ? { proprietaire } : null;
}

/** Code d'une erreur Prisma, reconnu à sa forme (aussi lu par `motifDErreur`). */
export const codePrisma = (e: unknown) => {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : null;
};

export type Synchronisation =
  | { issue: "ecrit" | "inchange" }
  | { issue: "ignore"; motif: string; alerte?: true };

const ECRIT = { issue: "ecrit" } as const;
const INCHANGE = { issue: "inchange" } as const;
const SANS_COMPTE = { issue: "ignore", motif: "client Stripe sans compte Rojer (metadata.compteId)" } as const;
const INTROUVABLE = { issue: "ignore", motif: "compte Rojer introuvable", alerte: true } as const;
const DEJA_LIE = { issue: "ignore", motif: "client ou abonnement Stripe déjà lié à un autre compte", alerte: true } as const;
const AUTRE_CLIENT = { issue: "ignore", motif: "le compte est lié à un autre client Stripe", alerte: true } as const;

type Db = ReturnType<typeof clientDuClientStripe>;
type Donnees = ReturnType<typeof colonnesDe> & { relueLe: Date; essaiUtiliseLe: Date | null };

/** `null` : une livraison simultanée a créé la ligne du compte — passer à la mise à jour. */
async function creerLigne(db: Db, compteId: string, customerId: string, donnees: Donnees) {
  try {
    await db.abonnement.create({ data: { compteId, stripeCustomerId: customerId, ...donnees } });
    return ECRIT;
  } catch (e) {
    switch (codePrisma(e)) {
      // Compte disparu : clé étrangère (P2003), ou la liaison au compte que
      // pose la borne (P2025, enregistrement requis introuvable).
      case "P2003":
      case "P2025":
        return INTROUVABLE;
      case "P2002":
        break;
      default:
        throw e;
    }
  }
  // Unicité : la ligne du compte vient d'être créée, ou ce client Stripe est
  // déjà à un autre compte.
  const creee = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
  if (!creee) return DEJA_LIE;
  return creee.stripeCustomerId !== customerId ? AUTRE_CLIENT : null;
}

async function mettreAJour(db: Db, compteId: string, customerId: string, donnees: Donnees) {
  try {
    const { count } = await db.abonnement.updateMany({
      where: { compteId, stripeCustomerId: customerId, OR: [{ relueLe: null }, { relueLe: { lt: donnees.relueLe } }] },
      data: donnees,
    });
    return count === 1 ? ECRIT : INCHANGE;
  } catch (e) {
    // L'abonnement relu est déjà sur la ligne d'un autre compte.
    if (codePrisma(e) === "P2002") return DEJA_LIE;
    throw e;
  }
}

export async function synchroniserClientStripe(
  stripe: Stripe,
  customerId: string,
  options: { abonnementLu?: Stripe.Subscription | null; maintenant?: () => Date } = {},
): Promise<Synchronisation> {
  // L'heure de la relecture, prise AVANT les deux lectures, lancées ensemble.
  const relueLe = options.maintenant?.() ?? new Date();
  const [client, liste] = await Promise.allSettled([
    stripe.customers.retrieve(customerId, {}, OPTIONS_WEBHOOK),
    stripe.subscriptions
      .list({ customer: customerId, status: "all", limit: 100 }, OPTIONS_WEBHOOK)
      .autoPagingToArray({ limit: 10_000 }),
  ]);
  if (client.status === "rejected") throw client.reason;
  // Client supprimé : la liste peut être refusée ; l'abonnement relu depuis
  // la notification reste la seule trace du compte et de la résiliation.
  const supprime = client.value.deleted === true;
  const abonnements =
    liste.status === "fulfilled" ? liste.value
    : supprime ? (options.abonnementLu ? [options.abonnementLu] : [])
    : null;
  if (!abonnements) throw (liste as PromiseRejectedResult).reason;

  const { courant, plusieurs } = abonnementCourant(abonnements);
  const designe = compteDuClientStripe(client.value, courant);
  if (!designe) return SANS_COMPTE;
  // Un client d'avant l'ADR-054 : le compte dont la personne est l'unique
  // propriétaire ; aucun, ou plusieurs, ne se devinent pas.
  const compteId = "compteId" in designe ? designe.compteId : await compteDontEstProprietaire(designe.proprietaire);
  if (!compteId) return INTROUVABLE;
  if (plusieurs) console.error(`stripe : plusieurs abonnements en cours pour un même client (${customerId})`);

  const db = clientDuClientStripe(compteId);
  const ligne = await db.abonnement.findUnique({
    where: { compteId },
    select: { stripeCustomerId: true, essaiUtiliseLe: true },
  });
  if (ligne && ligne.stripeCustomerId !== customerId) return AUTRE_CLIENT;

  const donnees: Donnees = {
    ...colonnesDe(courant),
    relueLe,
    essaiUtiliseLe: ligne?.essaiUtiliseLe ?? premierEssai(abonnements),
  };
  if (!ligne) {
    const issue = await creerLigne(db, compteId, customerId, donnees);
    if (issue) return issue;
  }
  return mettreAJour(db, compteId, customerId, donnees);
}
