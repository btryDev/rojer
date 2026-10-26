import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * Une entreprise n'existe que par ses établissements (2026-10-26) : restée
 * seule, elle garderait un SIREN, une raison sociale et un effectif que plus
 * rien n'affiche ni ne corrige — et qu'un futur établissement du même SIREN
 * reprendrait tels quels.
 *
 * Supprime l'entreprise si elle n'a plus aucun établissement. À appeler dans
 * la transaction qui vient de retirer ou de déplacer un établissement.
 *
 * LE VERROU EST LE POINT. Sans lui, la suppression du dernier établissement et un
 * parcours qui rattache un nouvel établissement à la même entreprise se croisent : le
 * comptage ne voit pas l'établissement que l'autre transaction n'a pas encore
 * validé, l'entreprise est supprimée, et la cascade emporte l'établissement à peine
 * créé. `FOR UPDATE` attend la transaction qui a inséré un établissement (elle
 * tient un verrou de clé sur la ligne de l'entreprise) ; le comptage qui suit
 * la voit donc. Dans l'autre ordre, c'est l'insertion qui échoue sur la clé
 * étrangère, et le parcours recommence (`finaliserOnboarding`).
 */
export async function supprimerEntrepriseSiVide(
  tx: Prisma.TransactionClient,
  entrepriseId: string,
): Promise<boolean> {
  await tx.$queryRaw`SELECT "id" FROM "Entreprise" WHERE "id" = ${entrepriseId} FOR UPDATE`;
  const restants = await tx.etablissement.count({ where: { entrepriseId } });
  if (restants > 0) return false;
  await tx.entreprise.delete({ where: { id: entrepriseId } });
  return true;
}
