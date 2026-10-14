import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { reserverPlaceExport } from "@/lib/exports/limite";

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
 */
export async function reponsePdf(
  document: Parameters<typeof renderToBuffer>[0],
  nomFichier: string,
): Promise<Response> {
  const liberer = await reserverPlaceExport();
  if (liberer instanceof Response) return liberer;
  let pdf: Buffer;
  try {
    pdf = await renderToBuffer(document);
  } finally {
    liberer();
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
