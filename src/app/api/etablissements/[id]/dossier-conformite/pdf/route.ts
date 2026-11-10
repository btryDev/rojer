import { aDejaPaye } from "@/lib/abonnements/validation";
import { requireEtablissement } from "@/lib/auth/scope";
import { construireDossierConformiteData } from "@/lib/pdf/builders";
import { DossierConformiteDocument } from "@/lib/pdf/DossierConformiteDocument";
import { slugifyFilename } from "@/lib/pdf/styles";
import { reponsePdf } from "@/lib/pdf/reponse";

/**
 * Dossier de conformité en PDF.
 *
 * `requireEtablissement` borne la route au périmètre du user connecté —
 * même garde que `controle-zip/route.ts`. Le document imprime l'identité de
 * l'entreprise (raison sociale, SIRET, adresse, effectif) : sans ce garde,
 * un identifiant d'établissement suffisait à obtenir la carte d'identité
 * d'un tiers, dans un document par ailleurs incohérent puisque les listes,
 * elles, étaient déjà scopées et revenaient vides.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { compte, db, user } = await requireEtablissement(id);

  const data = await construireDossierConformiteData(db, id);
  if (!data) return new Response("Établissement introuvable", { status: 404 });

  return reponsePdf(
    // Sans abonnement payé, un aperçu marqué « Projet – non validé » (ADR-053 § 15).
    DossierConformiteDocument({ data, projet: !(await aDejaPaye(db, compte.compteId)) }),
    `Dossier_conformite_${slugifyFilename(data.etablissement)}.pdf`,
    user.id,
  );
}
