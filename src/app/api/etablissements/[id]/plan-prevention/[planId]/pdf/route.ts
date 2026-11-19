import { requireEtablissement } from "@/lib/auth/scope";
import { construirePlanPreventionData } from "@/lib/pdf/builder-plan-prevention";
import { nomFichierPlanPrevention } from "@/lib/pdf/PlanPreventionDocument";
import { reponsePdf } from "@/lib/pdf/reponse";

/**
 * Un plan de prévention en PDF, rendu à la demande depuis ses données
 * (ADR-061 § 7 : ni scellé, ni horodaté). `requireEtablissement` borne la
 * route au compte connecté ; le plan est relu dans cet établissement par le
 * builder — un identifiant d'autrui répond 404.
 *
 * Pas de garde de paiement : « les brouillons de permis de feu et de plans
 * de prévention restent imprimables » (ADR-053 § 15).
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; planId: string }> },
) {
  const { id, planId } = await context.params;
  const { db, user } = await requireEtablissement(id);
  const data = await construirePlanPreventionData(db, id, planId);
  if (!data) return new Response("Introuvable", { status: 404 });
  return reponsePdf(
    { type: "plan-prevention", props: { data } },
    nomFichierPlanPrevention(data.numero, data.etablissement),
    user.id,
  );
}
