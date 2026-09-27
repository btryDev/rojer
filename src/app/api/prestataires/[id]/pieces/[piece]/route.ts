import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
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
 * dans le `findFirst` même. 403 hors périmètre comme pour un prestataire
 * inexistant ; 404 pour une pièce non fournie ou un type inconnu.
 */

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; piece: string }> },
) {
  const user = await requireUser();
  const { id, piece } = await context.params;
  // `Object.hasOwn`, pas `in` : « toString » est « dans » tout objet.
  if (!Object.hasOwn(PIECES, piece)) {
    return new NextResponse("Type de pièce inconnu", { status: 404 });
  }
  const champs = PIECES[piece as TypePiece];

  const p = await prisma.prestataire.findFirst({
    where: { id, etablissement: { entreprise: { userId: user.id } } },
    select: {
      attestationUrssafCle: true,
      attestationUrssafNom: true,
      assuranceRcProCle: true,
      assuranceRcProNom: true,
      kbisCle: true,
      kbisNom: true,
    },
  });
  if (!p) {
    return new NextResponse("Prestataire introuvable ou hors périmètre", { status: 403 });
  }
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
