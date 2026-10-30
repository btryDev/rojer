import { prisma } from "@/lib/prisma";
import type { Db } from "@/lib/auth/compte";

/**
 * Le dernier libellé connu des obligations RETIRÉES qu'une prescription vise
 * encore : celui que portaient leurs lignes de suivi (revue du 2026-10-07).
 * La page des prescriptions affichait sinon l'identifiant brut.
 *
 * Une requête pour toutes les cibles d'un dossier, aucune s'il n'y en a pas.
 * Ce n'est pas une lecture de preuve (`lecture-preuves.ts`) : elle ne décide
 * de rien, elle nomme.
 *
 * Par le client brut, pour les appelants qui ne passent pas encore le client
 * borné (ADR-051, lot 2b) : elle délègue à `derniersLibellesConnusDuCompte`.
 */
export async function derniersLibellesConnus(
  etablissementId: string,
  obligationIds: readonly string[],
): Promise<Map<string, string>> {
  return derniersLibellesConnusDuCompte(prisma, etablissementId, obligationIds);
}

/** La même lecture, par le client borné au compte de l'appelant (ADR-051). */
export async function derniersLibellesConnusDuCompte(
  db: Db,
  etablissementId: string,
  obligationIds: readonly string[],
): Promise<Map<string, string>> {
  const libelles = new Map<string, string>();
  if (obligationIds.length === 0) return libelles;
  const lignes = await db.verification.findMany({
    where: { etablissementId, obligationId: { in: [...obligationIds] } },
    select: { obligationId: true, libelleObligation: true },
    orderBy: { updatedAt: "desc" },
  });
  for (const l of lignes) {
    if (!libelles.has(l.obligationId)) libelles.set(l.obligationId, l.libelleObligation);
  }
  return libelles;
}
