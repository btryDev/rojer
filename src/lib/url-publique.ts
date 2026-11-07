import "server-only";

/**
 * Pourquoi l'URL publique manque, ou `null` si elle est connue.
 *
 * LE REPLI SUR LOCALHOST EST REFUSÉ EN PRODUCTION (audit du 2026-10-12, B7).
 * Sans `PUBLIC_APP_URL`, le QR code de l'affiche d'accessibilité, l'URL du
 * ZIP de contrôle et le lien d'accès d'un prestataire pointaient en silence
 * sur `http://localhost:3000` — une affiche collée à la porte qui ne mène
 * nulle part, sans qu'aucune trace ne le dise. Le patron est celui de
 * `refusDuDriver` : une règle, lue par `publicAppUrl` (qui lève) et par
 * `refusUrlPublique` (que les écrans interrogent avant d'afficher). En
 * développement, le repli reste.
 */
export function refusUrlPublique(): string | null {
  if (process.env.PUBLIC_APP_URL) return null;
  return process.env.NODE_ENV === "production"
    ? "PUBLIC_APP_URL n'est pas définie en production : l'adresse publique de " +
        "l'application est inconnue, et un lien, un QR code ou une affiche " +
        "pointerait vers localhost. La définir dans les variables " +
        "d'environnement du déploiement."
    : null;
}

/** Le message montré à l'écran à la place d'une URL publique inconnue. */
export const MESSAGE_URL_PUBLIQUE_ABSENTE =
  "L'adresse publique de l'application n'est pas configurée sur ce serveur : le lien et le QR code ne peuvent pas être produits. Prévenez l'équipe Rojer.";

export function publicAppUrl(): string {
  const refus = refusUrlPublique();
  if (refus) throw new Error(refus);
  // `||` et non `??` : une variable posée vide n'est pas une adresse. Le « / »
  // final est retiré : tous les appelants écrivent `${publicAppUrl()}/…`.
  return (process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}
