#!/usr/bin/env tsx
//
// Reprise du premier paiement confirmé (`Abonnement.debutPayantLe`, ADR-053
// §§ 14-15) des abonnements qui payaient déjà avant que la synchronisation
// ne l'écrive : sans elle, ils resteraient aux limites de l'essai et la
// validation leur serait refusée jusqu'au prochain événement Stripe (un mois,
// un an). À lancer au déploiement, puis au lancement de l'offre. Rejouable :
// une ligne qui a sa date n'est pas relue.
//
// `--dry-run` par défaut : compte les lignes concernées, n'appelle pas
// Stripe. Avec `--appliquer`, relit chaque client Stripe
// (`synchroniserClientStripe`, la seule écriture). La base lue est celle de
// `DATABASE_URL`, affichée en tête, mot de passe masqué ; seuls des nombres
// s'impriment.
//
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-debut-payant.ts
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-debut-payant.ts --appliquer

import { PrismaClient } from "@prisma/client";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { synchroniserClientStripe } from "@/lib/stripe/synchronisation";

const appliquer = process.argv.includes("--appliquer");
const prisma = new PrismaClient();

async function main() {
  console.log(`base : ${(process.env.DATABASE_URL ?? "").replace(/(:\/\/[^:]+:)[^@]+@/, "$1***@")}`);
  // Un abonnement qui a pu payer : pas un essai, ni un abonnement jamais
  // démarré. Les autres n'ont rien à reprendre.
  const lignes = await prisma.abonnement.findMany({
    where: { debutPayantLe: null, statut: { in: ["active", "past_due", "unpaid", "canceled", "paused"] } },
    select: { stripeCustomerId: true },
  });
  console.log(`lignes sans premier paiement : ${lignes.length}`);
  if (!appliquer) return console.log("(essai à blanc : relancer avec --appliquer pour relire chez Stripe)");

  const config = configurationStripe();
  if (!config.active) throw new Error("Stripe n'est pas configuré (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)");
  const stripe = clientStripe(config);
  let ecrits = 0;
  let echecs = 0;
  for (const { stripeCustomerId } of lignes) {
    try {
      await synchroniserClientStripe(stripe, stripeCustomerId);
      ecrits++;
    } catch {
      echecs++;
    }
  }
  const restants = await prisma.abonnement.count({
    where: { debutPayantLe: null, statut: { in: ["active", "past_due", "unpaid", "canceled", "paused"] } },
  });
  console.log(`relus : ${ecrits}, en échec : ${echecs}, encore sans date (jamais payé, ou échec) : ${restants}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.name : "erreur");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
