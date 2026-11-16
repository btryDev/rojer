import "server-only";
// Le nom et l'adresse que la facture porte (audit Stripe du 2026-11-16) : une
// facture entre professionnels porte la raison sociale et l'adresse du client
// (art. 242 nonies A de l'annexe II du CGI). Le client Stripe naît à l'essai
// avec l'adresse e-mail pour nom et sans adresse (`essai.ts`) ; le Checkout
// « carte » ne les demande pas. Elles sont donc posées depuis l'entreprise
// avant tout geste qui peut prélever, et à l'ouverture du portail.
//
// Ce que le client a saisi lui-même (Checkout, portail) n'est jamais écrasé :
// le nom seulement s'il est encore le provisoire, l'adresse seulement si elle
// manque. Un compte qui suit plusieurs entreprises : la première créée, comme
// avant (choix assumé, une facture par compte).

import type Stripe from "stripe";
import type { Db } from "@/lib/auth/compte";
import { aNomProvisoire } from "./droits";

/** Ce qu'il faut poser sur le client Stripe, ou `null` : rien à changer. */
export function identiteAPoser(
  client: { name?: string | null; email?: string | null; address?: { line1?: string | null } | null },
  entreprise: { raisonSociale: string; adresse: string } | null,
): Stripe.CustomerUpdateParams | null {
  if (!entreprise) return null;
  const maj: Stripe.CustomerUpdateParams = {};
  if (aNomProvisoire(client) && entreprise.raisonSociale.trim()) maj.name = entreprise.raisonSociale.trim();
  if (!client.address?.line1?.trim() && entreprise.adresse.trim()) {
    maj.address = { line1: entreprise.adresse.trim(), country: "FR" };
  }
  return Object.keys(maj).length > 0 ? maj : null;
}

/**
 * Pose la raison sociale et l'adresse de l'entreprise du compte sur son
 * client Stripe, là où elles manquent. Lève si Stripe ne répond pas :
 * l'appelant ne prélève pas sans elles.
 */
export async function poserIdentiteDeFacturation(stripe: Stripe, db: Db, customerId: string): Promise<void> {
  const client = await stripe.customers.retrieve(customerId);
  if (client.deleted) return;
  const entreprise = await db.entreprise.findFirst({
    orderBy: { createdAt: "asc" },
    select: { raisonSociale: true, adresse: true },
  });
  const maj = identiteAPoser(client, entreprise);
  if (maj) await stripe.customers.update(customerId, maj);
}
