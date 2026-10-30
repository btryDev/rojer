// La règle du mot de passe, côté application (audit OWASP B4, 2026-10-14).
//
// Douze caractères au moins (ASVS 5.0.0 V6.2.1, niveau 2), vérifiés côté
// SERVEUR à l'inscription et à la réinitialisation (`lib/auth/actions.ts`),
// et annoncés dans le formulaire. Pas de règle de composition (V6.2.5 : ni
// majuscule ni chiffre imposés). Pas de plafond ici : c'est le fournisseur qui
// le fixe (128 caractères, `better-auth.ts`).
//
// À la CONNEXION, aucune règle de longueur : les comptes créés sous l'ancienne
// règle (8 caractères) doivent pouvoir entrer, et refuser avant même d'avoir
// interrogé le fournisseur renseignerait sur la règle sans rien protéger.
//
// ~~LIMITE : la règle de l'app ne lie pas le fournisseur d'identité. Un porteur
// de session peut appeler directement l'API Auth de Supabase
// (`PUT /auth/v1/user`) avec un mot de passe court ; seul le réglage
// « Minimum password length » du projet Supabase (Authentication → Policies)
// le refuse. → bascule : `minPasswordLength: 12` dans `emailAndPassword` de
// Better Auth, qui vérifie alors côté serveur sur tous les chemins.~~
// [2026-10-30, ADR-052 : fait — `better-auth.ts` reprend cette constante, et
// aucune route HTTP de Better Auth n'est exposée.]
//
// Module sans dépendance : il est lu par les formulaires clients comme par les
// actions serveur.

export const LONGUEUR_MIN_MOT_DE_PASSE = 12;

export const AIDE_MOT_DE_PASSE = `${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum`;

/** Le message d'erreur à afficher, ou `null` si le mot de passe convient. */
export function erreurMotDePasse(motDePasse: string): string | null {
  // Longueur en points de code, pas en unités UTF-16 : un émoji compte pour
  // un, comme le compte le fournisseur.
  const longueur = [...motDePasse].length;
  if (longueur < LONGUEUR_MIN_MOT_DE_PASSE) {
    return `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères (${longueur} saisi${longueur > 1 ? "s" : ""}).`;
  }
  return null;
}
