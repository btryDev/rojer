import "server-only";
// Une baisse de formule planifiée (ADR-053 § 10) borne déjà les utilisateurs :
// sans cela, on la planifierait en règle (assez peu d'utilisateurs), puis on
// en inviterait d'autres avant la date de la baisse, et on les garderait
// après — les utilisateurs ne sont jamais gelés (§ 14). Les invitations déjà
// en attente au moment de la planification sont comptées par elle
// (`depassements`) ; seules les nouvelles sont à refuser ici.

import type { Db } from "@/lib/auth/compte";
import { invitationsDuCompte, membresDuCompte } from "@/lib/auth/membres";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { baissePrevue } from "@/lib/stripe/parcours";
import { formaterDateLongueFr } from "@/lib/dates";
import { FORMULES, LIBELLES_PLAFONDS } from "./formules";
import { formuleDesPlafonds, plafondDe } from "./quotas";
import { contexteDroits, offreLancee } from "./saisie";

/**
 * La baisse de formule planifiée chez Stripe (ADR-053 § 10), ou `null` — offre
 * non lancée, Stripe désactivé, pas d'abonnement, pas de baisse. La copie de
 * Rojer ne la garde pas : elle se relit chez Stripe, qui lève si injoignable.
 */
export async function lireBaissePrevue(
  stripeSubscriptionId: string | null | undefined,
): Promise<Awaited<ReturnType<typeof baissePrevue>>> {
  if (!stripeSubscriptionId || !offreLancee(contexteDroits())) return null;
  const config = configurationStripe();
  if (!config.active) return null;
  const stripe = clientStripe(config);
  return baissePrevue(stripe, await stripe.subscriptions.retrieve(stripeSubscriptionId));
}

/**
 * Le refus d'une invitation de plus quand une baisse planifiée ne la
 * permettrait pas, ou `null`. Stripe injoignable : refus (on ne sait pas s'il
 * y a une baisse, et une invitation peut attendre).
 */
export async function refusInvitationBaissePrevue(
  db: Db,
  compteId: string,
  { apresCreation = false }: { apresCreation?: boolean } = {},
): Promise<string | null> {
  if (!offreLancee(contexteDroits()) || !configurationStripe().active) return null;
  const ligne = await db.abonnement.findUnique({ where: { compteId }, select: { stripeSubscriptionId: true } });
  let prevue: Awaited<ReturnType<typeof baissePrevue>>;
  try {
    prevue = await lireBaissePrevue(ligne?.stripeSubscriptionId);
  } catch {
    return "Les invitations sont momentanément indisponibles. Réessayez dans quelques minutes.";
  }
  if (!prevue?.lookupKey) return null;
  const formule = formuleDesPlafonds(prevue.lookupKey);
  const plafond = plafondDe({ formule, essai: null }, "membres");
  if (plafond === null) return null;
  const [membres, invitations] = await Promise.all([membresDuCompte(compteId), invitationsDuCompte(compteId)]);
  // Avant de créer : il faut une place libre. Après (contrôle de la course
  // avec une baisse planifiée au même instant) : la nouvelle est comptée.
  const occupes = membres.length + invitations.length;
  if (apresCreation ? occupes <= plafond : occupes < plafond) return null;
  return `Le passage à ${FORMULES[formule].libelle} est prévu le ${formaterDateLongueFr(prevue.le)} : cette formule permet ${LIBELLES_PLAFONDS.membres(plafond)}. Gardez votre formule actuelle (page Abonnement) pour inviter quelqu'un de plus.`;
}
