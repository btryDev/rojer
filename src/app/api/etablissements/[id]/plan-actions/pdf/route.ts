import { requireEtablissement } from "@/lib/auth/scope";
import { construirePlanActionsData } from "@/lib/pdf/builders";
import { PlanActionsDocument } from "@/lib/pdf/PlanActionsDocument";
import { slugifyFilename } from "@/lib/pdf/styles";
import { reponsePdf } from "@/lib/pdf/reponse";

/**
 * Plan d'actions de conformité en PDF.
 *
 * `requireEtablissement` borne la route au périmètre du user connecté (cf.
 * `controle-zip/route.ts`) : l'en-tête du document porte la raison sociale,
 * l'adresse et le nom d'établissement d'un tiers si on ne le vérifie pas.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, db } = await requireEtablissement(id);

  const data = await construirePlanActionsData(db, id, user);
  if (!data) return new Response("Établissement introuvable", { status: 404 });

  return reponsePdf(
    PlanActionsDocument({ data }),
    `Plan_actions_${slugifyFilename(data.etablissement)}.pdf`,
  );
}
