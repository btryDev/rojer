import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import {
  FichierIntrouvable,
  getStorage,
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_FICHIER_INTROUVABLE,
  StockageNonConfigure,
} from "@/lib/storage";

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

  // Trois échecs, trois réponses (2026-09-27, `lot/stockage-supabase`) :
  // stockage non configuré sur ce serveur (503, le motif exact), fichier que
  // le stockage ne rend pas — une ligne qui pointe vers une clé absente —
  // (410), panne du service (502, journalisée). `getStorage()` est DANS le
  // `try` : il lève quand la configuration manque, et une route qui plante
  // en 500 ne dit rien à personne.
  let data: Buffer;
  try {
    data = await getStorage().get(rapport.fichierCle);
  } catch (e) {
    if (e instanceof StockageNonConfigure) {
      return new NextResponse(MESSAGE_DEPOT_NON_CONFIGURE, { status: 503 });
    }
    if (e instanceof FichierIntrouvable) {
      return new NextResponse(MESSAGE_FICHIER_INTROUVABLE, { status: 410 });
    }
    console.error(`[rapports/fichier] lecture impossible pour ${id}`, e);
    return new NextResponse(
      "Le fichier n'a pas pu être lu. Réessayez dans un instant.",
      { status: 502 },
    );
  }

  // Encodage RFC 5987 du filename pour gérer les accents et caractères spéciaux.
  const filenameAscii = rapport.fichierNomOriginal
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "_");
  const filenameUtf8 = encodeURIComponent(rapport.fichierNomOriginal);

  const blob = new Blob([new Uint8Array(data)], { type: rapport.fichierMime });
  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": rapport.fichierMime,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `inline; filename="${filenameAscii}"; filename*=UTF-8''${filenameUtf8}`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
