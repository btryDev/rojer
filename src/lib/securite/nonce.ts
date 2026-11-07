import "server-only";
import { headers } from "next/headers";

/**
 * Le nonce CSP de la requête, posé par le proxy dans l'en-tête de requête
 * `Content-Security-Policy` (`src/proxy.ts`) — celui que Next appose à ses
 * propres scripts. Pour un script en ligne de la page, qui serait sinon
 * refusé par la CSP bloquante. `undefined` hors proxy (route sans CSP).
 */
export async function nonceDeLaRequete(): Promise<string | undefined> {
  const csp = (await headers()).get("content-security-policy") ?? "";
  return /'nonce-([^']+)'/.exec(csp)?.[1];
}
