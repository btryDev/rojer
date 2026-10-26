import { redirect } from "next/navigation";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import { requireUser } from "@/lib/auth/require-user";

/**
 * Ancienne page de détail entreprise : redirigée vers l'établissement ACTIF
 * (ADR-028) — il n'y a plus « l'établissement du compte » à désigner, mais il y
 * a toujours celui sur lequel on travaillait. Les modifications d'entreprise
 * restent accessibles via /entreprises/[id]/modifier (URL directe).
 */
export default async function EntrepriseDetailPage() {
  await requireUser();
  const etab = await getOptionalUserEtablissement();
  if (etab) redirect(`/etablissements/${etab.id}`);
  // ~~Un compte peut garder son entreprise sans établissement, et l'onboarding
  // la recréerait (P2002).~~ [2026-10-26 : plus d'entreprise sans
  // établissement — supprimer le dernier supprime l'entreprise —, et le
  // parcours rattache par SIREN au lieu de recréer.] Sans établissement, on
  // en ouvre un.
  redirect("/onboarding");
}
