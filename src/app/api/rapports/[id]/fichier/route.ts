import type { NextRequest } from "next/server";
import { requireRapportVerification } from "@/lib/auth/scope";
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
 * par `requireRapportVerification` (`auth/scope.ts`). Avant ce garde, un
 * simple identifiant suffisait à télécharger le rapport de vérification de
 * n'importe quel client : un rapport porte la raison sociale, l'adresse et
 * les écarts constatés chez un tiers.
 *
 * Même réponse pour un rapport hors périmètre et pour un rapport inexistant,
 * sans quoi elle devient un oracle d'existence : ~~403~~ 404 depuis le
 * 2026-10-14 (audit Next.js, B6), celui de toutes les gardes de `scope.ts`.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { rapport } = await requireRapportVerification(id);

  // Lecture et réponse : `storage/servir.ts`, commun aux trois routes de
  // fichiers (2026-09-27).
  return servirFichier({
    cle: rapport.fichierCle,
    nomOriginal: rapport.fichierNomOriginal,
    mime: rapport.fichierMime,
    contexte: `rapports/fichier ${id}`,
  });
}
