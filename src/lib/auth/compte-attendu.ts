// Le compte que la page montrait (audit de sécurité du 2026-11-10, point 8).
// Le compte actif est une préférence de la session, partagée par les onglets :
// un geste sans identifiant de ressource poste le compte de sa page
// (`ChampCompteAttendu`), pris dans le rendu de la PAGE — un layout ne se rend
// pas de nouveau à la navigation —, et le serveur refuse s'il a changé.
// Garde : `compte-attendu-garde.test.ts`.

export const CHAMP_COMPTE_ATTENDU = "compteAttendu";

/** Le refus. La page est rendue de nouveau sur le compte actif, et le formulaire le poste désormais. */
export const MESSAGE_COMPTE_CHANGE =
  "Rien n'a été fait : vous avez changé de compte dans un autre onglet. La page montre maintenant ce compte ; refaites le geste si c'est bien celui-ci.";

/**
 * Le compte de la page est-il celui que la garde vient de vérifier ? `null` :
 * aucun compte encore (onboarding, essai). Sans le champ (un onglet ouvert
 * avant le déploiement), refusé : on ne sait pas ce que la page montrait.
 */
export function memeCompteQueLaPage(formData: FormData, compteId: string | null): boolean {
  return formData.get(CHAMP_COMPTE_ATTENDU) === (compteId ?? "");
}
