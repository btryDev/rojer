import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { requireEtablissement } from "@/lib/auth/scope";
import { servirFichier } from "@/lib/storage/servir";

/**
 * Le fichier d'un écrit annexé au registre, déposé sur sa ligne de « Ce qui
 * doit être en place » (ADR-056) — en cours ou précédent.
 *
 * GET `/api/etablissements/[id]/pieces/[pieceId]`. Servi seulement si
 * l'établissement appartient au compte connecté (`requireEtablissement`) ET
 * que le fichier est le sien ; un fichier d'autrui et un identifiant inconnu
 * répondent le même 404, sans oracle d'existence — la règle des autres routes
 * de fichiers.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await context.params;
  const { db, compte } = await requireEtablissement(id);
  const piece = await db.pieceEtatPermanent.findFirst({
    where: {
      id: pieceId,
      etablissementId: id,
      etablissement: { entreprise: { compteId: compte.compteId } },
    },
    select: { fichierCle: true, fichierNom: true, fichierMime: true },
  });
  if (!piece) notFound();
  return servirFichier({
    cle: piece.fichierCle,
    nomOriginal: piece.fichierNom,
    mime: piece.fichierMime,
    contexte: `etablissements/pieces ${pieceId}`,
  });
}
