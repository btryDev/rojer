// Règles du connecteur MCP en OAuth (ADR-062), sans dépendance : la
// configuration du fournisseur (`auth/better-auth.ts`), la route en liste
// blanche (`/api/auth/[...all]`) et le serveur de ressource (`/api/mcp`) les
// lisent toutes ici, pour qu'aucune ne se décide en deux endroits.

/** La seule portée métier : tous les outils lisent, aucun n'écrit (ADR-062 § 4). */
export const PORTEE_LECTURE = "rojer:lecture";

/**
 * Portées que le fournisseur connaît : la lecture, et `offline_access` pour
 * le jeton de rafraîchissement (Claude l'ajoute s'il est annoncé). Le plugin
 * retire `offline_access` des métadonnées de la ressource, comme le veut la
 * spécification.
 */
export const PORTEES_FOURNISSEUR = [PORTEE_LECTURE, "offline_access"] as const;

/** Durées, en secondes (ADR-062 § 6). */
export const DUREES_OAUTH = {
  /**
   * ~~Un JWT d'accès ne se révoque pas : il vit peu.~~ [2026-11-23 : il se
   * révoque — `/api/mcp` relit son consentement à chaque requête
   * (`acces-compte.ts`). Il vit peu quand même.] Claude le rafraîchit cinq
   * minutes avant.
   */
  jetonAcces: 15 * 60,
  /** Glissant : repart de zéro à chaque rafraîchissement. */
  jetonRafraichissement: 30 * 24 * 60 * 60,
  codeAutorisation: 10 * 60,
} as const;

/** Chemin du serveur MCP ; l'URL absolue est l'audience des jetons. */
export const CHEMIN_MCP = "/api/mcp";

/** Chemin de base de Better Auth (son défaut, que l'on ne change pas). */
export const CHEMIN_AUTH = "/api/auth";

/** L'identifiant de ressource (RFC 8707 / RFC 9728) : l'URL exacte du serveur MCP. */
export function ressourceMcp(adresseApp: string): string {
  return `${adresseApp.replace(/\/+$/, "")}${CHEMIN_MCP}`;
}

/**
 * Adresses de retour des assistants admis (ADR-062 § 3). Claude (web,
 * Desktop, mobile) revient sur l'une des deux premières — la seconde est
 * annoncée par Anthropic comme le futur domaine. Ajouter un assistant, c'est
 * ajouter son adresse ici, par décision.
 */
export const ADRESSES_DE_RETOUR_ADMISES: readonly string[] = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
];

/** Boucle locale des adresses de retour d'un client natif (RFC 8252 § 7.3), `[::1]` compris. */
const BOUCLE_LOCALE_RETOUR = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Une adresse de retour est admise si elle figure à la liste, à l'identique,
 * ou si c'est la boucle locale d'un client en ligne de commande (Claude Code,
 * RFC 8252 : port éphémère, donc libre) : `http`, hôte de boucle locale, sans
 * identifiants ni fragment. Tout le reste est refusé — à l'enregistrement
 * comme à l'autorisation.
 */
export function estAdresseDeRetourAdmise(adresse: string): boolean {
  if (ADRESSES_DE_RETOUR_ADMISES.includes(adresse)) return true;
  let url: URL;
  try {
    url = new URL(adresse);
  } catch {
    return false;
  }
  return (
    url.protocol === "http:" &&
    BOUCLE_LOCALE_RETOUR.has(url.hostname) &&
    url.username === "" &&
    url.password === "" &&
    url.hash === ""
  );
}

/**
 * Hôtes dont un document CIMD (identifiant de client en URL) est accepté :
 * ceux d'Anthropic, qui publie celui de Claude Code. Un autre éditeur
 * s'ajoute par décision, comme une adresse de retour.
 */
const HOTES_CIMD_ADMIS = ["claude.ai", "claude.com", "anthropic.com"];

export function estDocumentCimdAdmis(identifiantClient: string): boolean {
  let url: URL;
  try {
    url = new URL(identifiantClient);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") return false;
  return HOTES_CIMD_ADMIS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

/**
 * Chemins de Better Auth que la route HTTP sert (ADR-062 § 2), relatifs à
 * `CHEMIN_AUTH` : ceux qu'un client OAuth appelle lui-même, et rien d'autre.
 * Le consentement et la reprise après le choix du compte passent par nos
 * actions serveur (`auth.api.*`). ~~Le JWKS est lu en mémoire par le serveur
 * de ressource~~ [2026-11-23 : il l'est toujours, mais `/jwks` est servi —
 * les métadonnées annoncent `jwks_uri`, et une adresse annoncée qui répond
 * 401 est relevée par tout contrôle externe ; ce sont des clés publiques.]
 * Connexion, inscription, double authentification, membres
 * restent aux actions serveur, avec leurs gardes : la route répond `404`.
 */
export const CHEMINS_AUTH_SERVIS: readonly string[] = [
  "/oauth2/authorize",
  "/oauth2/token",
  "/oauth2/register",
  "/oauth2/revoke",
  "/jwks",
  "/.well-known/oauth-authorization-server",
];

/**
 * Les modes d'obtention d'un jeton : le code d'autorisation (PKCE) et son
 * rafraîchissement. `client_credentials` — un client qui agit pour lui-même,
 * sans personne ni compte — n'a pas de sens ici : il est fermé au guichet des
 * jetons et retiré des métadonnées.
 */
export const MODES_DE_JETON = ["authorization_code", "refresh_token"] as const;

/** Le chemin demandé (sous `CHEMIN_AUTH`) est-il servi ? Comparaison exacte. */
export function estCheminAuthServi(pathname: string): boolean {
  if (!pathname.startsWith(`${CHEMIN_AUTH}/`)) return false;
  const relatif = pathname.slice(CHEMIN_AUTH.length).replace(/\/+$/, "");
  return CHEMINS_AUTH_SERVIS.includes(relatif);
}
