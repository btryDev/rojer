import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Activer un compte = confirmer l'adresse ET choisir le mot de passe, dans le
 * même geste (audit de sécurité du 2026-11-10, pré-détournement de compte).
 *
 * Le défaut corrigé : n'importe qui peut s'inscrire avec l'adresse d'un tiers
 * et y fixer SON mot de passe. Le compte reste non confirmé ; une nouvelle
 * inscription sur la même adresse ne remplace pas ce mot de passe (Better Auth
 * le jette, `onExistingUserSignUp` renvoie seulement un lien), et la
 * confirmation ne faisait que passer `emailVerified` à vrai. Le jour où le
 * vrai titulaire cliquait — invité par une entreprise, il s'inscrivait comme
 * le mail le lui demandait —, c'était le mot de passe du premier inscrit qui
 * ouvrait le compte, et les invitations adressées à cette adresse avec.
 *
 * Le clic sur le lien prouve qu'on tient la boîte ; c'est donc à celui qui
 * clique de fixer le mot de passe. La page `/auth/verification` le demande, et
 * l'action l'installe ici, AVANT que l'adresse soit marquée confirmée : Better
 * Auth juge le jeton, puis appelle `beforeEmailVerification`, puis confirme.
 * À aucun instant un compte n'est confirmé avec un mot de passe que le
 * titulaire n'a pas choisi.
 *
 * Hors d'une activation, le crochet REFUSE : une confirmation qui ne pose pas
 * de mot de passe rouvrirait le défaut, quel que soit l'appelant.
 *
 * Un compte déjà confirmé n'appelle pas le crochet (Better Auth s'arrête
 * avant) : un vieux lien ne vaut pas réinitialisation du mot de passe.
 */

type Activation = { motDePasse: string; applique: boolean };

const enCours = new AsyncLocalStorage<Activation>();

/** Ce dont le crochet a besoin du contexte de Better Auth (`auth.$context`). */
export type ContexteActivation = {
  password: { hash(motDePasse: string): Promise<string> };
  internalAdapter: {
    findAccounts(userId: string): Promise<{ providerId: string }[]>;
    updatePassword(userId: string, hash: string): Promise<unknown>;
    linkAccount(compte: { userId: string; providerId: string; accountId: string; password: string }): Promise<unknown>;
    deleteUserSessions(userId: string): Promise<unknown>;
  };
};

/**
 * Exécute `confirmer` (l'appel à `verifyEmail`) avec le mot de passe choisi.
 * `applique` dit si le mot de passe a été posé : faux quand le compte était
 * déjà confirmé.
 */
export async function avecActivation<T>(
  motDePasse: string,
  confirmer: () => Promise<T>,
): Promise<{ resultat: T; applique: boolean }> {
  const activation: Activation = { motDePasse, applique: false };
  const resultat = await enCours.run(activation, confirmer);
  return { resultat, applique: activation.applique };
}

/**
 * `emailVerification.beforeEmailVerification` : pose le mot de passe choisi
 * sur le compte, ferme ses sessions, puis laisse Better Auth confirmer.
 */
export async function poserMotDePasseAvantConfirmation(
  user: { id: string },
  contexte: ContexteActivation,
): Promise<void> {
  const activation = enCours.getStore();
  if (!activation) {
    throw new Error(
      "Confirmation d'adresse hors de l'activation : refusée (le mot de passe doit être choisi par qui confirme)",
    );
  }
  const hash = await contexte.password.hash(activation.motDePasse);
  const comptes = await contexte.internalAdapter.findAccounts(user.id);
  // Un utilisateur sans identifiant par mot de passe (créé hors de
  // l'inscription) en reçoit un : sinon l'adresse serait confirmée sans
  // aucun mot de passe pour entrer. `accountId = userId`, comme l'inscription.
  if (comptes.some((c) => c.providerId === "credential")) {
    await contexte.internalAdapter.updatePassword(user.id, hash);
  } else {
    await contexte.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
  }
  // Pas de transaction avec la confirmation qui suit (Better Auth l'écrit
  // après ce crochet) : interrompu entre les deux, le compte reste NON
  // confirmé, avec le mot de passe de qui tient la boîte — l'état sûr ; le
  // même lien le termine.
  await contexte.internalAdapter.deleteUserSessions(user.id);
  activation.applique = true;
}
