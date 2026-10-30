// Hôtes et origines acceptés par le serveur MCP distant.
//
// Extrait de `./acces-http` pour être partagé avec ~~`./acces-oauth`~~ [retiré
// le 2026-10-30, ADR-052] l'accès par compte à venir (`@better-auth/mcp`) : la
// validation `Host`/`Origin` est une garde de transport, elle ne dépend pas
// de la façon dont on authentifie derrière.
//
// Pourquoi cette garde existe : sans validation de `Host`, une page web
// visitée par l'utilisateur peut faire parler son navigateur au serveur
// (attaque par reliaison DNS). Le SDK MCP se déclare explicitement
// « validation-free » sur ce point — c'est à nous de la poser devant.

/** Retire le schéma et le chemin d'une URL pour n'en garder que l'hôte. */
function versHote(valeur: string): string {
  return valeur.replace(/^https?:\/\//, "").split("/")[0];
}

const BOUCLE_LOCALE = ["localhost", "127.0.0.1"];

/**
 * Hôte de `PUBLIC_APP_URL`, ou `null`. La boucle locale est écartée : elle
 * est déjà acceptée, et l'URL de développement (`http://localhost:3000`) ne
 * doit pas devenir l'hôte « public » de l'identifiant de ressource. La
 * validation `Host` compare des noms d'hôte sans port : on rend `hostname`.
 */
function hoteDeLApplication(env: NodeJS.ProcessEnv): string | null {
  const url = env.PUBLIC_APP_URL?.trim();
  if (!url) return null;
  try {
    const hote = new URL(url).hostname;
    return hote && !BOUCLE_LOCALE.includes(hote) ? hote : null;
  } catch {
    return null;
  }
}

/**
 * Rend la liste des hôtes autorisés, dans l'ordre de préférence :
 *
 *   1. `MCP_HOTES`, déclarés à la main (liste séparée par des virgules) ;
 *   2. l'hôte de `PUBLIC_APP_URL` — l'adresse publique de l'application, déjà
 *      exigée en production pour les liens et QR codes (`email/index.ts`) ;
 *   3. les domaines que Vercel pose lui-même (`VERCEL_PROJECT_PRODUCTION_URL`,
 *      `VERCEL_URL`) ;
 *   4. la boucle locale, pour le développement.
 *
 * Le 2 existe pour la bascule Clever Cloud (audit Next.js du 2026-10-14, H5) :
 * hors Vercel, il n'y a ni 3 ni rien d'autre, et une production sans
 * `MCP_HOTES` refusait son propre hôte. Elle sert désormais le domaine de
 * `PUBLIC_APP_URL` sans configuration de plus ; `MCP_HOTES` ne sert plus qu'à
 * ajouter un domaine (un sous-domaine `mcp.` par exemple).
 */
export function lireHotesAutorises(env: NodeJS.ProcessEnv): string[] {
  const declares =
    env.MCP_HOTES?.split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .map(versHote) ?? [];

  const application = hoteDeLApplication(env);

  const vercel = [env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_URL]
    .filter((v): v is string => Boolean(v))
    .map(versHote);

  return [
    ...new Set([
      ...declares,
      ...(application ? [application] : []),
      ...vercel,
      ...BOUCLE_LOCALE,
    ]),
  ];
}

/**
 * Hôte public du déploiement — celui sous lequel les clients distants
 * atteignent le serveur. Sert à construire l'identifiant de ressource
 * (RFC 9728), qui doit être une URL absolue et non un chemin.
 *
 * On prend le premier hôte déclaré, en écartant la boucle locale : un
 * identifiant de ressource en `localhost` n'a de sens qu'en développement,
 * et seulement à défaut d'autre chose.
 */
export function lireHotePublic(env: NodeJS.ProcessEnv): string | null {
  const hotes = lireHotesAutorises(env);
  const distant = hotes.find((h) => !BOUCLE_LOCALE.includes(h));
  return distant ?? hotes[0] ?? null;
}
