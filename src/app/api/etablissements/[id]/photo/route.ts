import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { requireEtablissement } from "@/lib/auth/scope";
import { servirFichier } from "@/lib/storage/servir";

/**
 * La photo du lieu, déposée pour le hero du tableau de bord (2026-10-25).
 *
 * GET `/api/etablissements/[id]/photo`. Servie seulement si l'établissement
 * appartient au compte connecté (`requireEtablissement` remonte jusqu'à
 * `Entreprise.userId`) ; un établissement d'autrui et un établissement sans
 * photo répondent le même 404, sans oracle d'existence — la règle des autres
 * routes de fichiers. Jamais publique, jamais passée par l'optimiseur
 * d'images de Next (qui la demanderait sans la session).
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { etablissement } = await requireEtablissement(id);
  if (!etablissement.photoCle || !etablissement.photoMime) notFound();
  const extension = etablissement.photoMime === "image/png" ? "png" : "jpg";
  return servirFichier({
    cle: etablissement.photoCle,
    nomOriginal: `photo-etablissement.${extension}`,
    mime: etablissement.photoMime,
    contexte: `etablissements/photo ${id}`,
  });
}
