import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { servirFichier } from "@/lib/storage/servir";

/**
 * Le rapport de laboratoire d'une analyse de légionelles (2026-09-27,
 * `lot/relire-fichiers-deposes`). `AnalyseLegionelle.rapportCle` s'écrivait
 * et ne se relisait nulle part : un rapport déposé ne se rouvrait plus.
 *
 * GET `/api/analyses-legionelles/[id]/rapport`
 *
 * **Appartenance** : l'analyse n'est servie que si
 * `AnalyseLegionelle → CarnetSanitaire → Etablissement → Entreprise → userId`
 * est celui de la session, dans le `findFirst` même. 403 pour une analyse
 * hors périmètre comme pour une analyse inexistante : pas d'oracle
 * d'existence. 404 pour une analyse à soi sans rapport déposé.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await context.params;

  const analyse = await prisma.analyseLegionelle.findFirst({
    where: {
      id,
      carnet: { etablissement: { entreprise: { userId: user.id } } },
    },
    select: { rapportCle: true, rapportNom: true },
  });
  if (!analyse) {
    return new NextResponse("Analyse introuvable ou hors périmètre", { status: 403 });
  }
  if (!analyse.rapportCle) {
    return new NextResponse("Aucun rapport de laboratoire déposé pour cette analyse", {
      status: 404,
    });
  }

  return servirFichier({
    cle: analyse.rapportCle,
    nomOriginal: analyse.rapportNom ?? "rapport-analyse",
    contexte: `analyses-legionelles/rapport ${id}`,
  });
}
