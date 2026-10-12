import { renderToBuffer } from "@react-pdf/renderer";
import { DuerpDocument } from "@/lib/pdf/DuerpDocument";
import { getVersion, listerVersions } from "@/lib/versions/queries";
import { historiqueJusqua } from "@/lib/versions/historique";
import type { DuerpSnapshot } from "@/lib/versions/snapshot";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; numero: string }> },
) {
  const { id, numero } = await context.params;
  const numeroInt = Number.parseInt(numero, 10);
  if (!Number.isFinite(numeroInt)) {
    return new Response("Numéro invalide", { status: 400 });
  }

  const version = await getVersion(id, numeroInt);
  if (!version) {
    return new Response("Version introuvable", { status: 404 });
  }
  const snapshot = version.snapshot as DuerpSnapshot;

  // Les versions postérieures n'appartiennent pas à ce document (audit du
  // 2026-10-12) : il se rouvre tel qu'il était, sans ce qui l'a suivi.
  const historique = historiqueJusqua(await listerVersions(id), numeroInt);

  const buffer = await renderToBuffer(
    DuerpDocument({ snapshot, historique }),
  );

  const safe = snapshot.entreprise.raisonSociale
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `DUERP_${safe}_v${numeroInt}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
