import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { requireAction } from "@/lib/auth/scope";
import { servirFichier } from "@/lib/storage/servir";

/**
 * La pièce qui prouve la correction d'un point à corriger (ADR-048).
 *
 * GET `/api/points/[id]/piece`. Servie seulement si le point appartient au
 * compte connecté (`requireAction` remonte jusqu'à `Entreprise.userId`) ; un
 * point d'autrui et un point sans pièce répondent le même 404, sans oracle
 * d'existence — la règle des autres routes de fichiers.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { action } = await requireAction(id);
  if (!action.leveeFichierCle || !action.leveeFichierNom || !action.leveeFichierMime) {
    notFound();
  }
  return servirFichier({
    cle: action.leveeFichierCle,
    nomOriginal: action.leveeFichierNom,
    mime: action.leveeFichierMime,
    contexte: `points/piece ${id}`,
  });
}
