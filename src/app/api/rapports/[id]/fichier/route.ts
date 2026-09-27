import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { servirFichier } from "@/lib/storage/servir";

/**
 * Route de téléchargement d'un rapport de vérification.
 *
 * GET `/api/rapports/[id]/fichier`
 *   → renvoie le fichier binaire avec le Content-Type enregistré à l'upload
 *     et un Content-Disposition inline (affichage si navigateur le permet,
 *     téléchargement sinon).
 *
 * **Scoping (ADR-005).** Le rapport n'est servi que si son établissement
 * appartient au user connecté : la relation complète
 * `RapportVerification → Etablissement → Entreprise → userId` est vérifiée
 * dans le `findFirst` ci-dessous. Avant ce garde, un simple
 * identifiant suffisait à télécharger le rapport de vérification de
 * n'importe quel client : un rapport porte la raison sociale, l'adresse et
 * les écarts constatés chez un tiers.
 *
 * On répond 403 (et non 404) pour un rapport existant hors périmètre comme
 * pour un rapport inexistant : la réponse ne doit pas permettre de
 * distinguer les deux cas, sans quoi elle devient un oracle d'existence.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await context.params;

  const rapport = await prisma.rapportVerification.findFirst({
    where: {
      id,
      etablissement: { entreprise: { userId: user.id } },
    },
    select: {
      fichierCle: true,
      fichierMime: true,
      fichierNomOriginal: true,
    },
  });
  if (!rapport) {
    return new NextResponse("Rapport introuvable ou hors périmètre", {
      status: 403,
    });
  }

  // Lecture et réponse : `storage/servir.ts`, commun aux trois routes de
  // fichiers (2026-09-27).
  return servirFichier({
    cle: rapport.fichierCle,
    nomOriginal: rapport.fichierNomOriginal,
    mime: rapport.fichierMime,
    contexte: `rapports/fichier ${id}`,
  });
}
