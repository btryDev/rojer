import { type NextRequest, NextResponse } from "next/server";
import { requirePrestataire } from "@/lib/auth/scope";
import { servirFichier } from "@/lib/storage/servir";
import { PIECES, type TypePiece } from "@/lib/prestataires/pieces";

/**
 * Une pièce d'un prestataire — attestation URSSAF, RC Pro, Kbis (2026-09-27,
 * `lot/relire-fichiers-deposes`). Elles ne se relisaient que par le ZIP de
 * contrôle.
 *
 * GET `/api/prestataires/[id]/pieces/{urssaf|rcpro|kbis}`
 *
 * **Appartenance** : `Prestataire → Etablissement → Entreprise → userId`,
 * par `requirePrestataire` (`auth/scope.ts`). ~~403~~ 404 hors périmètre
 * comme pour un prestataire inexistant (2026-10-14, audit Next.js B6) ; 404
 * pour une pièce non fournie ou un type inconnu.
 */

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; piece: string }> },
) {
  const { id, piece } = await context.params;
  // `Object.hasOwn`, pas `in` : « toString » est « dans » tout objet. Avant
  // la garde : un type inconnu ne va pas jusqu'à la base.
  if (!Object.hasOwn(PIECES, piece)) {
    return new NextResponse("Type de pièce inconnu", { status: 404 });
  }
  const champs = PIECES[piece as TypePiece];

  const { prestataire: p } = await requirePrestataire(id);
  const cle = p[champs.cle];
  if (!cle) {
    return new NextResponse("Cette pièce n'a pas été fournie", { status: 404 });
  }

  return servirFichier({
    cle,
    nomOriginal: p[champs.nom] ?? champs.repli,
    contexte: `prestataires/piece ${id} ${piece}`,
  });
}
