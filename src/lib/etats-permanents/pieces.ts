import "server-only";

// La règle de conservation des écrits annexés au registre (ADR-056 § 4) :
// deux fichiers au plus par ligne, celui en cours et le précédent.
//
// Une seule fonction, appelée au dépôt et au retrait de la déclaration : le
// fichier en cours devient le précédent, et l'ancien précédent part. Elle
// rend les clés à libérer — APRÈS la transaction, jamais dedans : un stockage
// effacé pour une base qui finit par refuser laisserait une ligne sans
// fichier (`suppression/fichiers.ts`).

import type { Prisma } from "@prisma/client";

type Client = Prisma.TransactionClient;

export async function faireDuFichierEnCoursLePrecedent(
  tx: Client,
  etablissementId: string,
  obligationId: string,
  maintenant: Date,
): Promise<string[]> {
  const enCours = await tx.pieceEtatPermanent.findFirst({
    where: { etablissementId, obligationId, remplaceeLe: null },
    select: { id: true },
  });
  // Sans fichier en cours, rien ne remplace le précédent : il reste. Un
  // « Pas encore » sur une ligne déjà sans fichier n'efface pas la seule
  // version gardée.
  if (!enCours) return [];

  const precedents = await tx.pieceEtatPermanent.findMany({
    where: { etablissementId, obligationId, remplaceeLe: { not: null } },
    select: { id: true, fichierCle: true },
  });
  if (precedents.length > 0) {
    await tx.pieceEtatPermanent.deleteMany({
      where: { id: { in: precedents.map((p) => p.id) } },
    });
  }
  await tx.pieceEtatPermanent.update({
    where: { id: enCours.id },
    data: { remplaceeLe: maintenant },
  });
  return precedents.map((p) => p.fichierCle);
}
