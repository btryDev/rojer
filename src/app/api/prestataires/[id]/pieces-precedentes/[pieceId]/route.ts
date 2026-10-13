import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { servirFichier } from "@/lib/storage/servir";
import { PIECES, type TypePiece } from "@/lib/prestataires/pieces";

/**
 * Une pièce REMPLACÉE d'un prestataire (`PiecePrestataire`, 2026-10-12).
 *
 * GET `/api/prestataires/[id]/pieces-precedentes/[pieceId]`
 *
 * **Appartenance** : comme la route des pièces en cours,
 * `PiecePrestataire → Prestataire → Etablissement → Entreprise → userId`, dans
 * le `findFirst` même, et la pièce doit être de CE prestataire. 403 hors
 * périmètre comme pour une pièce inexistante.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; pieceId: string }> },
) {
  const user = await requireUser();
  const { id, pieceId } = await context.params;

  const piece = await prisma.piecePrestataire.findFirst({
    where: {
      id: pieceId,
      prestataireId: id,
      prestataire: { etablissement: { entreprise: { userId: user.id } } },
    },
    select: { type: true, fichierCle: true, fichierNom: true },
  });
  if (!piece) {
    return new NextResponse("Pièce introuvable ou hors périmètre", { status: 403 });
  }

  const repli = Object.hasOwn(PIECES, piece.type)
    ? PIECES[piece.type as TypePiece].repli
    : "piece-prestataire";
  return servirFichier({
    cle: piece.fichierCle,
    nomOriginal: piece.fichierNom ?? repli,
    contexte: `prestataires/piece-precedente ${id} ${pieceId}`,
  });
}
