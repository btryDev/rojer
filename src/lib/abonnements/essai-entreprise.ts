import "server-only";
// Un essai par entreprise (ADR-053 § 8, grille du 2026-11-05) : l'essai est
// limité à un par compte (`essaiUtiliseLe`) ET à un par SIREN. L'essai démarre
// avant l'onboarding, quand le SIREN n'est pas encore connu : la règle se
// tient donc à la création de l'entreprise. Si le SIREN a déjà servi l'essai
// d'un AUTRE compte, l'essai en cours finit aussitôt — l'établissement créé
// reste, en lecture, et s'abonner rouvre la saisie.

import { prisma } from "@/lib/prisma";
import type { Db } from "@/lib/auth/compte";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { synchroniserClientStripe } from "@/lib/stripe/synchronisation";

/**
 * Note le SIREN sous ce compte s'il est neuf, puis rend vrai s'il appartient
 * à un AUTRE compte. L'insertion d'abord : de deux créations simultanées,
 * une seule ligne gagne, et l'autre compte la lit.
 */
export async function sirenEssayeAilleurs(siren: string, compteId: string): Promise<boolean> {
  await prisma.essaiEntreprise.createMany({ data: [{ siren, compteId }], skipDuplicates: true });
  const premier = await prisma.essaiEntreprise.findUnique({ where: { siren }, select: { compteId: true } });
  return premier !== null && premier.compteId !== compteId;
}

/**
 * À la création d'une entreprise : rien hors d'un essai en cours. Pendant un
 * essai, note le SIREN ; s'il a déjà servi un autre compte, finit l'essai
 * chez Stripe (`trial_end: now` : sans carte, l'abonnement se met en pause ;
 * avec une carte, la première facture part) et rend vrai. Stripe injoignable :
 * l'essai continue, journalisé — refuser la création pour un défaut réseau
 * punirait le client d'une panne.
 */
export async function finirLEssaiSiEntrepriseDejaEssayee(db: Db, compteId: string, siren: string): Promise<boolean> {
  const ligne = await db.abonnement.findUnique({
    where: { compteId },
    select: { statut: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (ligne?.statut !== "trialing" || !ligne.stripeSubscriptionId) return false;
  if (!(await sirenEssayeAilleurs(siren, compteId))) return false;

  const config = configurationStripe();
  if (!config.active) return false;
  const stripe = clientStripe(config);
  try {
    await stripe.subscriptions.update(
      ligne.stripeSubscriptionId,
      { trial_end: "now" },
      { idempotencyKey: `essai-entreprise-${ligne.stripeSubscriptionId}` },
    );
  } catch (e) {
    console.error(`essai : fin anticipée impossible (entreprise déjà essayée) — ${e instanceof Error ? e.name : "erreur"}`);
    return false;
  }
  // La relecture ferme la saisie sans attendre le webhook, qui s'en charge sinon.
  await synchroniserClientStripe(stripe, ligne.stripeCustomerId).catch((e: unknown) =>
    console.error(`essai : relecture différée au webhook — ${e instanceof Error ? e.name : "erreur"}`),
  );
  return true;
}
