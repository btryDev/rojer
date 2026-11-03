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
import { requireCompte, type Db } from "@/lib/auth/compte";
import { etatStripe } from "@/lib/stripe/config";
import type { Env } from "@/lib/environnement";
import { droitsDe, type ContexteDroits, type Droits } from "./droits";

export const PAGE_ABONNEMENT = "/compte/abonnement";

/** `ABONNEMENT_EXIGE=oui` : l'offre est lancée. Toute autre valeur : non. */
export function abonnementExige(env: Env = process.env): boolean {
  return env.ABONNEMENT_EXIGE?.trim() === "oui";
}

function contexte(): ContexteDroits {
  return { stripeActif: etatStripe().active, exige: abonnementExige(), maintenant: new Date() };
}

/** Les droits d'un compte ; aucune lecture tant que l'abonnement n'est pas exigé. */
export const droitsDuCompte = cache(async (db: Db, userId: string): Promise<Droits> => {
  const ctx = contexte();
  if (!ctx.stripeActif || !ctx.exige) return droitsDe(null, ctx);
  const ligne = await db.abonnement.findUnique({
    where: { userId },
    select: { statut: true, finEssai: true, finPeriode: true, resilieEnFinDePeriode: true, finPrevueLe: true },
  });
  return droitsDe(ligne, ctx);
});

/** La garde d'une écriture du titulaire : sans effet tant que l'abonnement n'est pas exigé. */
export async function verifierSaisie(): Promise<void> {
  const ctx = contexte();
  if (!ctx.stripeActif || !ctx.exige) return;
  const { user, db } = await requireCompte();
  if (!(await droitsDuCompte(db, user.id)).saisie) redirect(`${PAGE_ABONNEMENT}?saisie=fermee`);
}
