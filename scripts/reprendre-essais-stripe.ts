#!/usr/bin/env tsx
//
// Reprise des essais tenus chez Stripe, au passage à l'essai compté chez
// Rojer (ADR-053 § 9, amendé le 2026-11-16). Avant ce lot, un essai était un
// abonnement Stripe (`trialing`, puis `paused` faute de carte) ; il n'existe
// plus que des comptes de TEST (préproduction) dans ce cas — aucune
// production.
//
// Pour chaque ligne dont l'abonnement Stripe est encore un essai (`trialing`)
// ou une pause de fin d'essai (`paused`) et qui n'a jamais payé :
// 1. le client et l'abonnement Stripe perdent leur `compteId` : leurs
//    notifications (dont la résiliation qui suit) ne désignent plus le
//    compte, la relecture les ignore sans alerte (client sans compte) ;
// 2. l'abonnement Stripe est résilié tout de suite (rien n'est facturé) ;
// 3. la ligne est délestée de Stripe : plus de client ni d'abonnement liés,
//    `statut` vide ; la date de l'essai et sa fin sont gardées, l'horloge de
//    suppression repart de la fin de l'essai. Le compte se retrouve « en
//    essai » ou « essai terminé » selon sa date, et s'abonne par Checkout,
//    avec un client neuf. Le client Stripe d'avant reste chez Stripe, non
//    relié.
//
// `--dry-run` par défaut : compte les lignes concernées, n'appelle pas
// Stripe, n'écrit rien. La base lue est celle de `DATABASE_URL`, affichée en
// tête, mot de passe masqué ; seuls des nombres s'impriment. Refuse une clé
// Stripe de production : ce script n'est écrit que pour des données de test.
//
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-essais-stripe.ts
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-essais-stripe.ts --appliquer

import { PrismaClient } from "@prisma/client";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";

const appliquer = process.argv.includes("--appliquer");
const prisma = new PrismaClient();
const ESSAIS_STRIPE = ["trialing", "paused"];

async function main() {
  console.log(`base : ${(process.env.DATABASE_URL ?? "").replace(/(:\/\/[^:]+:)[^@]+@/, "$1***@")}`);
  const lignes = await prisma.abonnement.findMany({
    where: { statut: { in: ESSAIS_STRIPE }, debutPayantLe: null },
    select: { id: true, stripeCustomerId: true, stripeSubscriptionId: true, finEssai: true },
  });
  console.log(`essais tenus chez Stripe : ${lignes.length}`);
  if (!appliquer) return console.log("(essai à blanc : relancer avec --appliquer pour résilier chez Stripe et délester les lignes)");

  const config = configurationStripe();
  if (!config.active) throw new Error("Stripe n'est pas configuré (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)");
  if (config.mode !== "test") throw new Error("clé Stripe de production : ce script ne touche que des données de test");
  const stripe = clientStripe(config);
  let repris = 0;
  let echecs = 0;
  for (const l of lignes) {
    try {
      if (l.stripeCustomerId) await stripe.customers.update(l.stripeCustomerId, { metadata: { compteId: "", userId: "" } });
      if (l.stripeSubscriptionId) {
        const s = await stripe.subscriptions.retrieve(l.stripeSubscriptionId);
        if (s.status !== "canceled" && s.status !== "incomplete_expired") {
          await stripe.subscriptions.update(s.id, { metadata: { compteId: "", userId: "" } });
          await stripe.subscriptions.cancel(s.id);
        }
      }
      await prisma.abonnement.update({
        where: { id: l.id },
        data: {
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          statut: null,
          formule: null,
          stripePriceId: null,
          finPeriode: null,
          resilieEnFinDePeriode: false,
          finPrevueLe: null,
          sansAbonnementDepuis: l.finEssai,
          suppressionPrevueLe: null,
          avertiSuppression30Le: null,
          avertiSuppression7Le: null,
        },
      });
      repris++;
    } catch {
      echecs++;
    }
  }
  console.log(`repris : ${repris}, en échec : ${echecs}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "erreur");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
