import { redirect } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { requireUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";

/**
 * Parcours de mise en place — wizard mono-page (client component) qui
 * pilote 3 étapes :
 *   1. Identité & lieu (raison sociale, SIRET, adresse structurée, NAF, effectif)
 *   2. Typologie (ERP / IGH / habitation, via assistant)
 *   3. Résumé + création transactionnelle
 *
 * Entreprise + premier Etablissement sont créés atomiquement à la fin.
 * Nom d'usage de l'établissement = raison sociale par défaut, modifiable
 * plus tard depuis la page établissement.
 *
 * L'écran a son propre chrome — le header global n'est pas rendu sur
 * `/onboarding` (`LayoutAvecEnTete`, 2026-10-14) —, donc il porte lui-même la barre de compte : sans l'email
 * et la déconnexion rendus ici, un compte qui n'a pas encore d'établissement
 * n'avait aucune porte de sortie, ni sur cet écran ni sur l'accueil.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  // Un compte = une entreprise (ADR-005, ADR-028) : le parcours ne se joue
  // qu'une fois. L'action d'enregistrement le refusait déjà
  // (`finaliserOnboarding`), mais seulement APRÈS les trois étapes — le
  // dirigeant remplissait tout pour être renvoyé à son dossier (contrôle
  // visuel du 2026-10-13). La même garde, à l'ouverture. Les établissements
  // suivants naissent de `/etablissements/nouveau`.
  const existant = await getOptionalUserEtablissement();
  if (existant) redirect(`/etablissements/${existant.id}`);
  return <WizardShell email={user.email} />;
}
