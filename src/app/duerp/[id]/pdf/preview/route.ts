import { renderToBuffer } from "@react-pdf/renderer";
import { DuerpDocument } from "@/lib/pdf/DuerpDocument";
import { listerVersions } from "@/lib/versions/queries";
import { construireSnapshot } from "@/lib/versions/snapshot-builder";

/**
 * Aperçu PDF de l'état courant du DUERP, sans créer de version en base.
 * Utile pour vérifier le rendu avant de figer une version officielle.
 * Le document est tagué comme brouillon dans le motif.
 *
 * **Scoping (ADR-005).** Les deux lectures sont bornées au user connecté :
 * `listerVersions` l'était déjà, `construireSnapshot` l'est désormais. Ce
 * point comptait : le snapshot embarque la raison sociale, le SIRET,
 * l'adresse, les unités de travail, les risques, leurs cotations et les
 * mesures — l'aperçu rendait donc le DUERP complet d'un autre utilisateur à
 * qui connaissait un identifiant, là où la route des versions figées
 * (`/duerp/[id]/versions/[numero]/pdf`) passait, elle, par une query scopée.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // Le numéro provisoire se déduit de l'historique scopé — inutile d'aller
  // le chercher par une lecture séparée non filtrée.
  const versions = await listerVersions(id);
  const numeroProvisoire = (versions[0]?.numero ?? 0) + 1;

  const snapshot = await construireSnapshot(id, {
    numero: numeroProvisoire,
    motif: "APERÇU — brouillon non validé",
  });
  if (!snapshot) {
    return new Response("DUERP introuvable", { status: 404 });
  }

  const historique = versions.map((v) => ({
    numero: v.numero,
    genereLe: v.createdAt.toISOString(),
    motif: v.motif,
  }));

  const buffer = await renderToBuffer(
    DuerpDocument({ snapshot, historique, brouillon: true }),
  );

  const safe = snapshot.entreprise.raisonSociale
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `DUERP_${safe}_apercu.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      // Pas de cache : l'aperçu reflète l'état instantané du DUERP.
      "Cache-Control": "no-store",
    },
  });
}
