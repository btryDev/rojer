import "server-only";
// « Valider = s'abonner » (ADR-053 § 15) : pendant l'essai et sans
// abonnement, tout s'utilise, SAUF les gestes qui produisent un document
// officiel ou engagent un tiers — valider une version du DUERP, exporter le
// dossier de contrôle ou le registre consolidé, publier le registre
// d'accessibilité, signer (une signature de test permise), envoyer un lien
// à un tiers (l'envoi à soi-même permis). Ils demandent un premier paiement
// CONFIRMÉ (`debutPayantLe`, la première facture payée), pas un simple
// `active`. Refusé : la page « S'abonner » (`?document=1` : elle dit
// pourquoi), où s'abonner arrête l'essai et prélève le premier mois. Un ancien
// abonné garde ses exports (ADR-053 § 3) : il a payé.

import { redirect } from "next/navigation";
import type { Db } from "@/lib/auth/compte";
import { contexteDroits, offreLancee } from "./lancement";
import { signatureDEssaiDisponible } from "./quotas";

export const PAGE_S_ABONNER = "/compte/abonnement?document=1";

/** Le compte a-t-il payé au moins une fois ? Avant le lancement de l'offre, oui. */
export async function aDejaPaye(db: Db, compteId: string): Promise<boolean> {
  if (!offreLancee(contexteDroits())) return true;
  const ligne = await db.abonnement.findUnique({ where: { compteId }, select: { debutPayantLe: true } });
  return ligne?.debutPayantLe != null;
}

/** En tête d'un geste de validation : la page « S'abonner » à un compte qui n'a jamais payé. */
export async function exigerUnPaiement(db: Db, compteId: string): Promise<void> {
  if (!(await aDejaPaye(db, compteId))) redirect(PAGE_S_ABONNER);
}

/**
 * La règle des signatures sans abonnement payé : une signature de test, et
 * un lien seulement à soi-même (`destinataire` : l'adresse du lien, déjà
 * normalisée ; absente pour une signature en compte connecté). Sinon, la
 * page « S'abonner ».
 */
export async function exigerSignatureDEssai(
  db: Db,
  compteId: string,
  emailDuCompte: string | null | undefined,
  destinataire?: string,
): Promise<void> {
  if (!(await signatureDEssaiPermise(db, compteId, emailDuCompte, destinataire))) redirect(PAGE_S_ABONNER);
}

/**
 * La même règle, sans redirection : pour un lien émis en marge d'un autre
 * geste (le nouveau lien d'un refus de proposition, ADR-061), qui ne part
 * pas plutôt que d'interrompre le geste.
 */
export async function signatureDEssaiPermise(
  db: Db,
  compteId: string,
  emailDuCompte: string | null | undefined,
  destinataire?: string,
): Promise<boolean> {
  if (await aDejaPaye(db, compteId)) return true;
  const aSoiMeme = destinataire === undefined || destinataire === (emailDuCompte ?? "").toLowerCase();
  return aSoiMeme && (await signatureDEssaiDisponible(db, compteId));
}
