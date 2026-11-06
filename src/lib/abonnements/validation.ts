import "server-only";
// « Valider = s'abonner » (ADR-053 § 15) : pendant l'essai et sans
// abonnement, tout s'utilise, SAUF les gestes qui produisent un document
// officiel ou engagent un tiers — valider une version du DUERP, exporter le
// dossier de contrôle ou le registre consolidé, publier le registre
// d'accessibilité, signer (une signature de test permise), envoyer un lien
// à un tiers (l'envoi à soi-même permis). Ils demandent un premier paiement
// CONFIRMÉ (`debutPayantLe`, la première facture payée), pas un simple
// `active`. Refusé : la page « S'abonner », où l'essai s'arrête et le
// premier mois se prélève (`?immediat=1`, session « stripe »). Un ancien
// abonné garde ses exports (ADR-053 § 3) : il a payé.

import { redirect } from "next/navigation";
import type { Db } from "@/lib/auth/compte";
import { contexteDroits, offreLancee } from "./lancement";

export const PAGE_S_ABONNER = "/compte/abonnement?immediat=1";

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
 * La signature de test d'un compte qui n'a jamais payé : une seule, la
 * première du compte (aucune au journal des signatures, demandes comprises).
 */
export async function signatureDEssaiDisponible(db: Db): Promise<boolean> {
  return (await db.consommationQuota.count({ where: { quota: "signaturesParAn" } })) === 0;
}
