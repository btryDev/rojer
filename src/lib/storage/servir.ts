import "server-only";
import { NextResponse } from "next/server";
import {
  FichierIntrouvable,
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_FICHIER_INTROUVABLE,
  StockageNonConfigure,
} from "./erreurs";
import { getStorage } from "./index";

/**
 * Sert un fichier stocké, APRÈS que l'appelant a vérifié l'appartenance.
 *
 * Écrit une fois pour les trois routes de lecture — rapport de vérification,
 * rapport d'analyse de légionelles, pièce de prestataire (2026-09-27,
 * `lot/relire-fichiers-deposes`) : la première en portait seule la logique,
 * et deux copies d'une règle d'erreur divergent en silence.
 *
 * Trois échecs, trois réponses : stockage non configuré sur ce serveur (503,
 * le motif exact), fichier que le stockage ne rend pas — une ligne qui pointe
 * vers une clé absente — (410), panne du service (502, journalisée).
 */
export async function servirFichier(opts: {
  cle: string;
  nomOriginal: string;
  /** Le type enregistré au dépôt ; sinon déduit de l'extension du nom. */
  mime?: string | null;
  contexte: string;
}): Promise<NextResponse> {
  let data: Buffer;
  try {
    data = await getStorage().get(opts.cle);
  } catch (e) {
    if (e instanceof StockageNonConfigure)
      return new NextResponse(MESSAGE_DEPOT_NON_CONFIGURE, { status: 503 });
    if (e instanceof FichierIntrouvable)
      return new NextResponse(MESSAGE_FICHIER_INTROUVABLE, { status: 410 });
    console.error(`[${opts.contexte}] lecture impossible (${opts.cle})`, e);
    return new NextResponse(
      "Le fichier n'a pas pu être lu. Réessayez dans un instant.",
      { status: 502 },
    );
  }

  const mime = opts.mime || mimeDepuisNom(opts.nomOriginal);
  // Encodage RFC 5987 du nom, pour les accents et caractères spéciaux.
  const filenameAscii = opts.nomOriginal
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/"/g, "_");
  const filenameUtf8 = encodeURIComponent(opts.nomOriginal);
  // Un type inconnu ne s'affiche pas dans le navigateur : il se télécharge.
  const disposition = mime === "application/octet-stream" ? "attachment" : "inline";

  const blob = new Blob([new Uint8Array(data)], { type: mime });
  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `${disposition}; filename="${filenameAscii}"; filename*=UTF-8''${filenameUtf8}`,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Le type d'un fichier dont seul le nom a été gardé (pièces de prestataire,
 * rapports d'analyse). Les quatre types que le dépôt accepte
 * (`rapports/validator.ts`) ; tout le reste se télécharge.
 */
export function mimeDepuisNom(nom: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(nom)?.[1]?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}
