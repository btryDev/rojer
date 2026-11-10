import "server-only";
// Les droits du compte connecté (ADR-053 § 3) et la garde des écritures.
//
// `verifierSaisie()` ouvre chaque server action qui écrit pour le titulaire
// du compte (garde : `abonnements/saisie-gardee.test.ts`). Tant que
// l'abonnement n'est pas exigé, elle ne lit RIEN : aucun coût avant le
// lancement de l'offre. Exigé et refusé : redirection vers la page de
// l'abonnement, qui dit pourquoi — la lecture reste ouverte (l'export d'un
// document officiel demande d'avoir payé une fois, ADR-053 § 15).

import { cache } from "react";
import { redirect } from "next/navigation";
import { getOptionalCompte, type Compte, type Db } from "@/lib/auth/compte";
import { requireUser } from "@/lib/auth/require-user";
import { droitsDe, type Droits } from "./droits";

export const PAGE_ABONNEMENT = "/compte/abonnement";
import { PAGE_SAISIE_FERMEE } from "@/lib/auth/portee/gel";
/** Où une écriture refusée à un membre en lecture seule renvoie (ADR-054 § 4). */
export const PAGE_LECTURE_SEULE = "/compte/lecture-seule";
/** Où un geste réservé au propriétaire renvoie un autre membre. */
export const PAGE_MEMBRES = "/compte/membres";

// Le lancement de l'offre vit à part (`lancement.ts`), sans dépendance à la
// session : les plafonds le lisent depuis la couche qui construit la portée.
export { abonnementExige, contexteDroits, offreLancee } from "./lancement";
import { contexteDroits, offreLancee } from "./lancement";

const COLONNES = {
  statut: true,
  formule: true,
  stripeSubscriptionId: true,
  essaiUtiliseLe: true,
  debutPayantLe: true,
  finEssai: true,
  finPeriode: true,
  resilieEnFinDePeriode: true,
  finPrevueLe: true,
  // La suppression du compte sans abonnement (ADR-058), dite sur la page Abonnement.
  sansAbonnementDepuis: true,
  suppressionPrevueLe: true,
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
 *
 * Rend le compte qu'elle a vérifié, et l'action agit sur CELUI-LÀ : relire le
 * compte actif après elle (`requireCompte`) laissait un autre onglet en changer
 * entre les deux lectures, et le geste passait sur un compte où la personne
 * n'est que membre, voire lectrice (audit de sécurité du 2026-11-10).
 */
export async function verifierProprietaire(): Promise<Proprietaire> {
  const c = await getOptionalCompte();
  if (c?.compte?.role !== "owner") redirect(`${PAGE_MEMBRES}?reserve=proprietaire`);
  return c as Proprietaire;
}

/** Un compte dont `verifierProprietaire` a vérifié que la personne est propriétaire. */
export type Proprietaire = Compte & { compte: Compte["compte"] & { role: "owner" } };

/**
 * La garde d'une écriture : le rôle d'abord, toujours (une lecture de
 * `Membre`) ; puis l'abonnement, sans effet tant que l'offre n'est pas lancée.
 * Sans compte (personne inscrite qui n'a encore rien créé, ADR-054), pas
 * d'abonnement non plus : page de l'abonnement — et surtout pas
 * `requireCompte`, qui renverrait à l'onboarding qu'on vient de quitter.
 * Le client borné refuse de toute façon l'écriture d'un membre en lecture
 * seule, et celle d'un compte dont la saisie est fermée : cette garde n'en est
 * que la réponse lisible. Rend le compte qu'elle a jugé : une écriture qui ne
 * passe pas par le client borné (le plugin des invitations) le compare au
 * compte qu'elle vise (audit de cc, 2026-11-10, piste 2).
 */
export async function verifierSaisie(): Promise<string | null> {
  // Une seule lecture de l'appartenance : le rôle, puis l'abonnement.
  const c = await getOptionalCompte();
  refuserLaLecture(c);
  if (!offreLancee(contexteDroits())) return c?.compte.compteId ?? null;
  if (!c) {
    await requireUser();
    redirect(PAGE_SAISIE_FERMEE);
  }
  if (!(await droitsDuCompte(c.db, c.compte.compteId)).saisie) redirect(PAGE_SAISIE_FERMEE);
  return c.compte.compteId;
}
