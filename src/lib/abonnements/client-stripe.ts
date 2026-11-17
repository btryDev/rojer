import "server-only";
// Le client Stripe d'un compte, créé au moment de s'abonner (ADR-053 § 9,
// amendé le 2026-11-16 : rien chez Stripe pendant l'essai). La ligne
// `Abonnement` du compte le RÉSERVE par une écriture conditionnelle : c'est
// elle, et non la clé d'idempotence (24 heures), qui empêche un second
// client — deux onglets reprennent le client enregistré.

import type Stripe from "stripe";
import type { Db } from "@/lib/auth/compte";
import { creerClientStripe } from "@/lib/stripe/parcours";
import { sha256Hex } from "@/lib/signatures/hash";
import { nomProvisoire } from "./droits";

/**
 * Le client Stripe du compte : celui de la ligne (déjà lue par l'appelant),
 * sinon un client créé et réservé. La ligne existe toujours ici : sans elle,
 * `sAbonnerAction` renvoie à l'essai.
 */
export async function clientStripeDuCompte(
  stripe: Stripe,
  db: Db,
  { compteId, email, enregistre }: { compteId: string; email: string; enregistre: string | null },
): Promise<string> {
  if (enregistre) return enregistre;
  const customerId = await creerClientStripe(stripe, {
    email,
    nom: nomProvisoire(email),
    metadata: { compteId },
    // L'adresse entre dans la clé : une adresse changée dans les 24 heures ne
    // bute pas sur une requête rejouée différemment (relecture du
    // 2026-11-17) ; la réservation ci-dessous garde un seul client lié.
    idempotence: `${compteId}-${sha256Hex(email).slice(0, 12)}`,
  });
  const pris = await db.abonnement.updateMany({ where: { compteId, stripeCustomerId: null }, data: { stripeCustomerId: customerId } });
  if (pris.count === 1) return customerId;
  // Un autre onglet a réservé le sien d'abord : on le reprend.
  const reservee = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
  if (!reservee?.stripeCustomerId) throw new Error("client Stripe non réservé");
  return reservee.stripeCustomerId;
}
