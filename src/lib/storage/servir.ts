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

  // LISTE BLANCHE (contre-lecture du 2026-09-27, M2) : le type enregistré en
  // base était servi tel quel ; un `text/html` ou un `image/svg+xml` serait
  // sorti en `inline`, et une page servie depuis notre domaine est une porte
  // vers du XSS stocké. Hors des quatre types acceptés au dépôt : on déduit
  // du nom, et à défaut on télécharge.
  const mime =
    opts.mime && (TYPES_SERVIS as readonly string[]).includes(opts.mime)
      ? opts.mime
      : mimeDepuisNom(opts.nomOriginal);
  // Encodage RFC 5987 du nom, pour les accents et caractères spéciaux.
  const filenameAscii = opts.nomOriginal
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
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
      // `no-store` : une pièce nominative ne reste dans aucun cache.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      // Même servi `inline`, le document n'exécute rien dans notre origine.
      "Content-Security-Policy": "sandbox",
    },
  });
}

/**
 * Le type d'un fichier dont seul le nom a été gardé (pièces de prestataire,
 * rapports d'analyse). Les quatre types que le dépôt accepte
 * (`rapports/validator.ts`) ; tout le reste se télécharge.
 */
/** Les seuls types servis tels quels : ceux que le dépôt accepte (`rapports/validator.ts`). */
export const TYPES_SERVIS = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

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
