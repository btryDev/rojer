import { requireEtablissement } from "@/lib/auth/scope";
import { construirePointsEquipementData } from "@/lib/pdf/builders";
import { PointsACorrigerDocument } from "@/lib/pdf/PointsACorrigerDocument";
import { slugifyFilename } from "@/lib/pdf/styles";
import { reponsePdf } from "@/lib/pdf/reponse";

/**
 * Les points à corriger d'un appareil en PDF (ADR-048). `requireEtablissement`
 * borne la route au compte connecté ; l'appareil est relu dans cet
 * établissement par le builder — un identifiant d'autrui répond 404.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; equipementId: string }> },
) {
  const { id, equipementId } = await context.params;
  const { user, db } = await requireEtablissement(id);
  const data = await construirePointsEquipementData(db, id, equipementId, user);
  if (!data) return new Response("Introuvable", { status: 404 });
  return reponsePdf(
    PointsACorrigerDocument({ data }),
    `Points_a_corriger_${slugifyFilename(data.appareil)}.pdf`,
  );
}
