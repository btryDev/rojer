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
 * Adresses de retour des assistants VÉRIFIÉS (ADR-062 § 12), à l'identique.
 * ~~Admis~~ [2026-11-23 : la liste ne décide plus de l'entrée, seulement du
 * niveau de confiance.] Claude (web, Desktop, mobile) revient sur l'une des
 * deux premières — la seconde est annoncée par Anthropic comme le futur
 * domaine ; ChatGPT sur son adresse stable (doc OpenAI, « Authentication »).
 * Vérifier un assistant de plus, c'est l'ajouter ici, par décision.
 */
export const ADRESSES_VERIFIEES: readonly string[] = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "https://chatgpt.com/connector_platform_oauth_redirect",
];

/** ChatGPT revient aussi sur une adresse propre à chaque connecteur : `…/connector/oauth/{identifiant}`. */
const PREFIXES_VERIFIES: readonly string[] = ["https://chatgpt.com/connector/oauth/"];

/** Boucle locale des adresses de retour d'un client natif (RFC 8252 § 7.3), `[::1]` compris. */
const BOUCLE_LOCALE_RETOUR = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Le niveau de confiance d'une adresse de retour (ADR-062 § 12), là où part
 * le code d'autorisation :
 * - `verifie` : celle d'un assistant vérifié (liste ci-dessus) ;
 * - `local` : la boucle locale d'un client en ligne de commande (Claude Code,
 *   RFC 8252 : `http`, port éphémère donc libre) ;
 * - `non_verifie` : toute autre adresse `https` ;
 * - `refuse` : le reste — `http` hors boucle locale, schéma d'application,
 *   identifiants dans l'URL, fragment, adresse illisible.
 */
export type NiveauDeConfiance = "verifie" | "local" | "non_verifie" | "refuse";

export function niveauAdresseDeRetour(adresse: string): NiveauDeConfiance {
  if (ADRESSES_VERIFIEES.includes(adresse)) return "verifie";
  let url: URL;
  try {
    url = new URL(adresse);
  } catch {
    return "refuse";
  }
  if (url.username !== "" || url.password !== "" || url.hash !== "") return "refuse";
  if (url.protocol === "http:") return BOUCLE_LOCALE_RETOUR.has(url.hostname) ? "local" : "refuse";
  if (url.protocol !== "https:" || url.hostname === "") return "refuse";
  // Le préfixe se compare sur l'adresse relue (chemin normalisé), suivi d'un identifiant.
  const relue = url.href;
  if (PREFIXES_VERIFIES.some((p) => relue.startsWith(p) && relue.length > p.length && !relue.slice(p.length).includes("/"))) {
    return "verifie";
  }
  return "non_verifie";
}

/** Une adresse de retour s'enregistre et s'autorise si elle n'est pas refusée — son niveau décide du reste. */
export function estAdresseDeRetourAdmise(adresse: string): boolean {
  return niveauAdresseDeRetour(adresse) !== "refuse";
}

const RANG: Record<NiveauDeConfiance, number> = { verifie: 0, local: 1, non_verifie: 2, refuse: 3 };

/** Le niveau d'un client : celui de la moins sûre de ses adresses de retour (aucune : refusé). */
export function niveauDuClient(adresses: readonly string[]): NiveauDeConfiance {
  if (adresses.length === 0) return "refuse";
  return adresses.map(niveauAdresseDeRetour).reduce((pire, n) => (RANG[n] > RANG[pire] ? n : pire), "verifie");
}

/**
 * Les noms qu'un client non vérifié ne peut pas porter (ADR-062 § 12) : ceux
 * des assistants vérifiés, de leurs éditeurs, et de Rojer. Comparés sans
 * casse, sans accents ni séparateurs, sur le nom entier comme sur ses mots.
 */
const NOMS_RESERVES = ["claude", "anthropic", "chatgpt", "openai", "rojer"];

export function nomReserve(nom: string): boolean {
  const plat = nom
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return NOMS_RESERVES.some((r) => plat.includes(r));
}

/**
 * Hôtes dont un document CIMD (identifiant de client en URL) est accepté :
 * ceux des éditeurs vérifiés — Anthropic (Claude Code) et OpenAI (ChatGPT,
 * `chatgpt.com/oauth/client.json`). ~~Un autre éditeur s'ajoute par
 * décision~~ [2026-11-23 : les outils non vérifiés passent par
 * l'enregistrement dynamique ; récupérer le document d'un domaine quelconque
 * ouvrirait une surface de requêtes sortantes (ADR-062 § 12).]
 */
const HOTES_CIMD_ADMIS = ["claude.ai", "claude.com", "anthropic.com", "chatgpt.com", "openai.com"];

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

/**
 * Ce que l'écran de consentement permet (ADR-062 § 12), selon le niveau de
 * l'adresse de retour de la demande et le réglage du compte :
 * - `autoriser` : l'écran d'aujourd'hui (vérifié, local) ;
 * - `confirmer` : non vérifié, compte ouvert — l'avertissement et la case à
 *   cocher, exigée par le geste ;
 * - `ferme` : non vérifié, compte fermé, ou adresse refusée — refus seul.
 * Lue par la page ET par le geste, qui ne se fie pas à la page.
 */
export type IssueDuConsentement = "autoriser" | "confirmer" | "ferme";

export function issueDuConsentement(adresseRetour: string | null, outilsNonVerifiesOuverts: boolean): IssueDuConsentement {
  const niveau = adresseRetour ? niveauAdresseDeRetour(adresseRetour) : "refuse";
  if (niveau === "verifie" || niveau === "local") return "autoriser";
  if (niveau === "non_verifie" && outilsNonVerifiesOuverts) return "confirmer";
  return "ferme";
}
