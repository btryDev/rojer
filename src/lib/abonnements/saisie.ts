import "server-only";
// Les droits du compte connecté (ADR-053 § 3) et la garde des écritures.
//
// `verifierSaisie()` ouvre chaque server action qui écrit pour le titulaire
// du compte (garde : `abonnements/saisie-gardee.test.ts`). Tant que
// l'abonnement n'est pas exigé, elle ne lit RIEN : aucun coût avant le
// lancement de l'offre. Exigé et refusé : redirection vers la page de
// l'abonnement, qui dit pourquoi — la lecture et l'export restent ouverts.

import { cache } from "react";
import { redirect } from "next/navigation";
import { getOptionalCompte, type Db } from "@/lib/auth/compte";
import { requireUser } from "@/lib/auth/require-user";
import { etatStripe } from "@/lib/stripe/config";
import type { Env } from "@/lib/environnement";
import { droitsDe, type ContexteDroits, type Droits } from "./droits";

export const PAGE_ABONNEMENT = "/compte/abonnement";

/** `ABONNEMENT_EXIGE=oui` (espaces et casse tolérés, comme `env.ts`) : l'offre est lancée. */
export function abonnementExige(env: Env = process.env): boolean {
  return env.ABONNEMENT_EXIGE?.trim().toLowerCase() === "oui";
}

export function contexteDroits(): ContexteDroits {
  return { stripeActif: etatStripe().active, exige: abonnementExige(), maintenant: new Date() };
}

/** L'offre est lancée et Stripe est actif : seule condition pour lire l'abonnement. */
export const offreLancee = (ctx: ContexteDroits) => ctx.stripeActif && ctx.exige;

const COLONNES = {
  statut: true,
  formule: true,
  finEssai: true,
  finPeriode: true,
  resilieEnFinDePeriode: true,
  finPrevueLe: true,
} as const;

/** La ligne d'abonnement du compte (ADR-054 : une par compte), lue seulement une fois l'offre lancée. */
export const abonnementDuCompte = cache(async (db: Db, compteId: string) =>
  offreLancee(contexteDroits()) ? db.abonnement.findUnique({ where: { compteId }, select: COLONNES }) : null,
);

/** Les droits d'un compte ; aucune lecture tant que l'offre n'est pas lancée. */
export async function droitsDuCompte(db: Db, compteId: string): Promise<Droits> {
  return droitsDe(await abonnementDuCompte(db, compteId), contexteDroits());
}

/**
 * La garde d'une écriture : sans effet tant que l'offre n'est pas lancée.
 * Sans compte (personne inscrite qui n'a encore rien créé, ADR-054), pas
 * d'abonnement non plus : page de l'abonnement — et surtout pas
 * `requireCompte`, qui renverrait à l'onboarding qu'on vient de quitter.
 */
export async function verifierSaisie(): Promise<void> {
  if (!offreLancee(contexteDroits())) return;
  const c = await getOptionalCompte();
  if (!c) {
    await requireUser();
    redirect(`${PAGE_ABONNEMENT}?saisie=fermee`);
  }
  if (!(await droitsDuCompte(c.db, c.compte.compteId)).saisie) redirect(`${PAGE_ABONNEMENT}?saisie=fermee`);
}
