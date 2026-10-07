import { prisma } from "@/lib/prisma";

/**
 * Le dernier libellé connu des obligations RETIRÉES qu'une prescription vise
 * encore : celui que portaient leurs lignes de suivi (revue du 2026-10-07).
 * La page des prescriptions affichait sinon l'identifiant brut.
 *
 * Une requête pour toutes les cibles d'un dossier, aucune s'il n'y en a pas.
 * Ce n'est pas une lecture de preuve (`lecture-preuves.ts`) : elle ne décide
 * de rien, elle nomme.
 */
export async function derniersLibellesConnus(
  etablissementId: string,
  obligationIds: readonly string[],
): Promise<Map<string, string>> {
  const libelles = new Map<string, string>();
  if (obligationIds.length === 0) return libelles;
  const lignes = await prisma.verification.findMany({
    where: { etablissementId, obligationId: { in: [...obligationIds] } },
    select: { obligationId: true, libelleObligation: true },
    orderBy: { updatedAt: "desc" },
  });
  for (const l of lignes) {
    if (!libelles.has(l.obligationId)) libelles.set(l.obligationId, l.libelleObligation);
  }
  return libelles;
}
