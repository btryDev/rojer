import { redirect } from "next/navigation";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import { requireUser } from "@/lib/auth/require-user";

/**
 * Aiguilleur : vers l'établissement ACTIF si le compte en a un, sinon vers
 * l'onboarding. La route reste atteinte depuis d'anciens liens et signets — on
 * ne la casse pas, on la redirige.
 *
 * Elle ne devient pas une liste d'entreprises : ~~un compte reste une
 * entreprise (`Entreprise.userId @unique`)~~ [2026-10-26 : un compte en suit
 * plusieurs, une par SIREN, mais l'interface ne connaît que des
 * établissements]. Le sélecteur de la gélule est l'endroit où l'on commute.
 */
export default async function EntreprisesPage() {
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
