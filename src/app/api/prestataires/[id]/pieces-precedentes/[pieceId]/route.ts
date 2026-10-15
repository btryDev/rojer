import type { NextRequest } from "next/server";
import { requirePiecePrestataire } from "@/lib/auth/scope";
import { servirFichier } from "@/lib/storage/servir";
import { PIECES, type TypePiece } from "@/lib/prestataires/pieces";

/**
 * Une pièce REMPLACÉE d'un prestataire (`PiecePrestataire`, 2026-10-12).
 *
 * GET `/api/prestataires/[id]/pieces-precedentes/[pieceId]`
 *
 * **Appartenance** : comme la route des pièces en cours,
 * `PiecePrestataire → Prestataire → Etablissement → Entreprise → userId`, par
 * `requirePiecePrestataire` (`auth/scope.ts`), et la pièce doit être de CE
 * prestataire. ~~403~~ 404 hors périmètre comme pour une pièce inexistante
 * (2026-10-14, audit Next.js B6).
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await context.params;
  const { piece } = await requirePiecePrestataire(pieceId, id);

  const repli = Object.hasOwn(PIECES, piece.type)
    ? PIECES[piece.type as TypePiece].repli
    : "piece-prestataire";
  return servirFichier({
    cle: piece.fichierCle,
    nomOriginal: piece.fichierNom ?? repli,
    contexte: `prestataires/piece-precedente ${id} ${pieceId}`,
  });
}
