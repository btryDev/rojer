import { WizardShell } from "@/components/onboarding/WizardShell";
import { requireUser } from "@/lib/auth/require-user";
import { listerEntreprisesConnues } from "@/lib/entreprises/queries";

/**
 * Parcours de mise en place — wizard mono-page (client component) qui
 * pilote 3 étapes :
 *   1. Identité & lieu (raison sociale, SIRET, adresse structurée, NAF, effectif)
 *   2. Typologie (ERP / IGH / habitation, via assistant)
 *   3. Résumé + création transactionnelle
 *
 * L'établissement est créé à la fin, avec son entreprise si le SIREN est
 * nouveau pour le compte, rattaché à l'existante sinon — en une transaction.
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
  // ~~Un compte = une entreprise : le parcours ne se joue qu'une fois.~~
  // [2026-10-26 : chaque établissement passe par ce parcours. Un compte suit
  // plusieurs entreprises, une par SIREN ; un SIRET qui reprend le SIREN de
  // l'une d'elles y rattache le nouveau site (`finaliserOnboarding`).]
  const entreprisesConnues = await listerEntreprisesConnues();
  return <WizardShell email={user.email} entreprisesConnues={entreprisesConnues} />;
}
