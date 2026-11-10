import "server-only";
import { reserverPlaceExport } from "@/lib/exports/limite";
import type { DemandePdf } from "./documents";
import { messageTropVolumineux, PdfTropVolumineux, rendrePdf } from "./rendre";

/**
 * La réponse d'une route PDF : rendu, puis `Response` (audit Next.js du
 * 2026-10-14, B8). Les cinq routes répétaient le même squelette, et c'est ici
 * que passe le sémaphore des exports (H3) : le rendu `@react-pdf` est du
 * calcul synchrone, il ne se mène qu'à `EXPORTS_SIMULTANES` à la fois dans le
 * processus (`exports/limite.ts`).
 *
 * La place n'est tenue que pendant le rendu : les lectures en base, faites
 * avant par la route, ne bloquent pas la boucle.
 *
 * Les en-têtes sont ceux que les cinq routes écrivaient, à l'identique :
 * `inline`, le nom de fichier, `no-store` (ASVS V14.3.2, audit du 2026-10-13).
 *
 * La route passe une DEMANDE (`{ type, props }`), plus un élément React (lot
 * pdf-b0, 2026-11-10) : `rendrePdf` la pèse, la refuse si elle dépasse le
 * garde-fou, la met en page et la journalise. Un refus répond 503 SANS
 * `Retry-After` : réessayer ne changerait rien, et le document reste à l'écran.
 */
/** Un document personnel ne se garde jamais en cache, PDF comme refus. */
const SANS_CACHE = { "Cache-Control": "no-store" } as const;

export async function reponsePdf(
  demande: DemandePdf,
  nomFichier: string,
  /** L'utilisateur connecté (`user.id`) : sa part de la file (`exports/limite.ts`). */
  demandeur: string,
): Promise<Response> {
  const liberer = await reserverPlaceExport(demandeur);
  if (liberer instanceof Response) return liberer;
  let pdf: Buffer;
  try {
    pdf = await rendrePdf(demande);
  } catch (e) {
    if (e instanceof PdfTropVolumineux) return reponseTropVolumineux(e);
    throw e;
  } finally {
    liberer();
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomFichier}"`,
      ...SANS_CACHE,
    },
  });
}

/** Le refus du garde-fou : 503, texte, jamais en cache, sans `Retry-After`. */
function reponseTropVolumineux(e: PdfTropVolumineux): Response {
  return new Response(messageTropVolumineux(e.type), {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...SANS_CACHE,
    },
  });
}
