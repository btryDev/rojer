/**
 * L'en-tête où le proxy publie l'IP du visiteur, calculée par `ipClient` (la
 * dernière entrée de la chaîne des proxys, celle que le proxy de l'hébergeur
 * ajoute ; règle dans `securite/ip-client.ts`, seul lecteur de ces en-têtes).
 * Better Auth lit la PREMIÈRE entrée, que le client écrit lui-même :
 * sans cet en-tête, l'IP notée sur une session serait celle que l'appelant
 * choisit (plan de bascule, § 5 bis). Le proxy l'écrase à chaque requête,
 * qu'elle soit venue du client ou non (`src/proxy.ts`).
 *
 * Module à part, sans dépendance : le proxy le lit sans charger Better Auth.
 */
export const ENTETE_IP_CLIENT = "x-rojer-ip-client";
