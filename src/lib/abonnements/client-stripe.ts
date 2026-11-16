import "server-only";
// Le client Stripe d'un compte, créé au moment de s'abonner (ADR-053 § 9,
// amendé le 2026-11-16 : rien chez Stripe pendant l'essai). La ligne
// `Abonnement` du compte le RÉSERVE par une écriture conditionnelle : c'est
// elle, et non la clé d'idempotence (24 heures), qui empêche un second
// client — deux onglets reprennent le client enregistré.

import type Stripe from "stripe";
import type { Db } from "@/lib/auth/compte";
import { creerClientStripe } from "@/lib/stripe/parcours";
import { codePrisma } from "@/lib/stripe/synchronisation";
import { nomProvisoire } from "./droits";

export async function clientStripeDuCompte(
  stripe: Stripe,
  db: Db,
  { compteId, email }: { compteId: string; email: string },
): Promise<string> {
  const ligne = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
  if (ligne?.stripeCustomerId) return ligne.stripeCustomerId;
  const customerId = await creerClientStripe(stripe, {
    email,
    nom: nomProvisoire(email),
    metadata: { compteId },
    idempotence: compteId,
  });
  if (ligne) {
    await db.abonnement.updateMany({ where: { compteId, stripeCustomerId: null }, data: { stripeCustomerId: customerId } });
  } else {
    // Un compte sans ligne (jamais d'essai) : elle naît avec son client.
    try {
      await db.abonnement.create({ data: { compteId, stripeCustomerId: customerId } });
    } catch (e) {
      if (codePrisma(e) !== "P2002") throw e;
      await db.abonnement.updateMany({ where: { compteId, stripeCustomerId: null }, data: { stripeCustomerId: customerId } });
    }
  }
  const reservee = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
  if (!reservee?.stripeCustomerId) throw new Error("client Stripe non réservé");
  return reservee.stripeCustomerId;
}
