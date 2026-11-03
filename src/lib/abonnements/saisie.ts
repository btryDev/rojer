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
/** Où une écriture refusée à un membre en lecture seule renvoie (ADR-054 § 4). */
export const PAGE_LECTURE_SEULE = "/compte/lecture-seule";
/** Où un geste réservé au propriétaire renvoie un autre membre. */
export const PAGE_MEMBRES = "/compte/membres";

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
 * La garde du rôle seul (ADR-054 § 4) : un membre en lecture seule est renvoyé
 * à la page qui le dit. En tête des écritures qui restent ouvertes à un compte
 * impayé mais pas à la lecture seule (suppressions, retrait d'un accès ou
 * d'une page publique) ; `verifierSaisie` la contient.
 */
export async function verifierRole(): Promise<void> {
  refuserLaLecture(await getOptionalCompte());
}

function refuserLaLecture(c: Awaited<ReturnType<typeof getOptionalCompte>>): void {
  if (c?.compte?.role === "lecture") redirect(PAGE_LECTURE_SEULE);
}

/**
 * Un geste réservé au PROPRIÉTAIRE du compte (ADR-054 § 2, § 8) : l'abonnement
 * (Checkout, portail, essai). Un membre ou un lecteur est renvoyé à la page des
 * membres, qui le dit. À placer après `verifierSaisie`, ou seule pour un geste
 * ouvert à un impayé.
 */
export async function verifierProprietaire(): Promise<void> {
  const c = await getOptionalCompte();
  if (c?.compte?.role !== "owner") redirect(`${PAGE_MEMBRES}?reserve=proprietaire`);
}

/**
 * La garde d'une écriture : le rôle d'abord, toujours (une lecture de
 * `Membre`) ; puis l'abonnement, sans effet tant que l'offre n'est pas lancée.
 * Sans compte (personne inscrite qui n'a encore rien créé, ADR-054), pas
 * d'abonnement non plus : page de l'abonnement — et surtout pas
 * `requireCompte`, qui renverrait à l'onboarding qu'on vient de quitter.
 * Le client borné refuse de toute façon l'écriture d'un membre en lecture
 * seule : cette garde n'en est que la réponse lisible.
 */
export async function verifierSaisie(): Promise<void> {
  // Une seule lecture de l'appartenance : le rôle, puis l'abonnement.
  const c = await getOptionalCompte();
  refuserLaLecture(c);
  if (!offreLancee(contexteDroits())) return;
  if (!c) {
    await requireUser();
    redirect(`${PAGE_ABONNEMENT}?saisie=fermee`);
  }
  if (!(await droitsDuCompte(c.db, c.compte.compteId)).saisie) redirect(`${PAGE_ABONNEMENT}?saisie=fermee`);
}
