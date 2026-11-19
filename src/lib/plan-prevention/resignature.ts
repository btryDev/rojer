import type { ObjetSignable, PartieSignataire, Prisma } from "@prisma/client";

/**
 * Une re-signature après correction ne compte pas dans le plafond annuel de
 * signatures de la formule (ADR-061 § 6, décision de la propriétaire du
 * 2026-11-19) : le client ne paie pas deux fois le même plan, et une
 * correction demandée par l'entreprise extérieure ne le pénalise pas.
 *
 * **Module pur, sans `"use server"`.**
 *
 * La partie a déjà été comptée sur ce plan si elle y porte une signature
 * révoquée, ou un lien de signature révoqué par une remise en correction
 * (proposition ou correction — `MOTIF_REVOCATION_PLAN`, dont le motif du lien
 * commence par l'un de ces deux textes).
 */

/** Les débuts de motif d'un lien révoqué par une remise en correction. */
export const MOTIFS_REMISE_EN_CORRECTION = [
  "l'entreprise extérieure a proposé une modification du plan",
  "l'entreprise utilisatrice corrige le plan",
] as const;

export async function signatureDejaComptee(
  /** Le client borné au compte, ou sa transaction (ADR-051). */
  db: Prisma.TransactionClient,
  params: {
    etablissementId: string;
    objetType: ObjetSignable | string;
    objetId: string;
    partie?: PartieSignataire | null;
  },
): Promise<boolean> {
  if (params.objetType !== "plan_prevention" || !params.partie) return false;
  const objet = { etablissementId: params.etablissementId, objetId: params.objetId, partie: params.partie };
  const [signatures, liens] = await Promise.all([
    db.signature.count({ where: { ...objet, objetType: "plan_prevention", active: null } }),
    db.accessToken.count({
      where: {
        ...objet,
        objetType: "plan_prevention",
        scope: "signature",
        OR: MOTIFS_REMISE_EN_CORRECTION.map((m) => ({ revoqueMotif: { startsWith: m } })),
      },
    }),
  ]);
  return signatures + liens > 0;
}
