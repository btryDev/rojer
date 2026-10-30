/**
 * Les « appareils de confiance » de la double authentification (ADR-052 § 7) :
 * le plugin `twoFactor` les écrit dans `AuthVerification`, identifiant
 * `trust-device-<aléa>`, valeur = l'id du compte, et vérifie la ligne à
 * chaque connexion.
 *
 * Le préfixe est écrit en dur par Better Auth, non exporté : à relire à chaque
 * montée de version (`appareils-de-confiance.test.ts` le compare au code du
 * paquet installé).
 */
export const PREFIXE_APPAREIL_DE_CONFIANCE = "trust-device-";

type Adaptateur = {
  deleteMany(arg: {
    model: string;
    where: { field: string; value: string; operator?: "starts_with" }[];
  }): Promise<number>;
};

/** Oublie tous les appareils de confiance d'un compte. */
export async function oublierAppareilsDeConfiance(adapter: Adaptateur, userId: string): Promise<void> {
  await adapter.deleteMany({
    model: "verification",
    where: [
      { field: "value", value: userId },
      { field: "identifier", operator: "starts_with", value: PREFIXE_APPAREIL_DE_CONFIANCE },
    ],
  });
}
