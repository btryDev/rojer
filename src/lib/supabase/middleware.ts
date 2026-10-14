// Helper du proxy : rafraîchit la session Supabase quand il y en a une, et
// refuse l'accès sans session hors des chemins publics — redirection vers
// /login pour une page, 401 JSON pour `/api/*`.
// Appelé depuis src/proxy.ts (ex-middleware.ts racine, renommé pour Next 16).
// Le fichier garde son nom : il disparaîtra avec Supabase Auth.
//
// CE PROXY N'EST PAS UNE GARDE D'ACCÈS (audit Next.js du 2026-10-14, H4).
// La vérification réelle de l'identité est `requireUser()`
// (`lib/auth/require-user.ts`, `getUser()` contre le serveur Auth), appelée
// par les gardes de `lib/auth/scope.ts` en tête de chaque page, action et
// route — `tenancy-*.test.ts` le tiennent. Ici, on fait trois choses :
//   1. ne rien faire du tout pour qui n'a pas de session et vise un chemin
//      public (scan de QR code, client MCP, vérification de signature) : ni
//      client Supabase, ni appel réseau ;
//   2. rafraîchir le jeton d'accès expiré et réécrire les cookies — la seule
//      chose que ni une page ni un composant serveur ne savent faire, puisqu'ils
//      ne peuvent pas poser de cookie (`@supabase/ssr`, docs/design.md : « Using
//      the middleware pattern is mandatory ») ;
//   3. épargner un rendu à qui n'a manifestement pas de session.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Préfixes publics (non authentifiés)
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/_next",
  "/favicon.ico",
  // ADR-007 : accès externe par token — prestataire sans compte.
  "/acces",
  // ADR-006 : vérification publique d'intégrité d'une signature.
  "/verifier",
  // ADR-006 : accusé de réception après signature (public).
  "/signe",
  // Registre d'accessibilité ERP (arrêté 19-04-2017) — consultation publique.
  "/accessibilite",
  // Route API qui sert l'affiche A4 du registre (QR + URL).
  "/api/accessibilite",
  // ADR-013 : serveur MCP distant. Ces routes portent leur propre
  // authentification — secret d'URL ou jeton porteur OAuth — et doivent
  // répondre à des clients qui n'ont pas de session Supabase par
  // construction : ce sont des programmes, pas des navigateurs. Sans cette
  // exception, le proxy leur renvoie une redirection vers /login et le
  // serveur n'est jamais atteint. Les laisser passer ici ne les ouvre pas :
  // c'est leur propre garde qui décide, et elle refuse par défaut.
  "/api/mcp",
  // Découverte OAuth (RFC 9728) : document public par nature, lu par un
  // client *avant* qu'il ait le moindre jeton.
  "/.well-known",
  // `robots.txt` (audit Next.js, B11) : lu par des robots, sans session.
  "/robots.txt",
];

/**
 * Les chemins publics qui ne lisent JAMAIS la session Supabase : des routes
 * qui ont leur propre authentification, ou aucune. Le proxy ne touche pas à la
 * session pour elles, même quand un cookie l'accompagne — rafraîchir un jeton
 * dont personne ne se sert serait un aller-retour pour rien.
 *
 * Inventaire du 2026-10-14 (les routes publiques de `tenancy-routes.test.ts`) :
 * - `/api/mcp` et `/api/mcp/[cle]` : jeton porteur OAuth vérifié par la route
 *   (`mcp/acces-oauth.ts`), ou secret d'URL (`mcp/acces-http.ts`) ;
 * - `/.well-known/oauth-protected-resource/api/mcp` : métadonnées publiques ;
 * - `/api/accessibilite/[slug]/affiche` : affiche d'un registre publié, lue
 *   par slug sans session ;
 * - `/robots.txt`.
 *
 * Les PAGES publiques (`/`, `/login`, `/acces`, `/verifier`, `/signe`,
 * `/accessibilite`…) n'y sont pas : leur en-tête lit la session (« Mon
 * dossier » / « Se connecter »). Un jeton expiré y serait rafraîchi par le
 * rendu, qui ne peut pas réécrire le cookie : le refresh token, à usage
 * unique, serait consommé et perdu, et la session avec lui à la requête
 * suivante. Pour elles, le proxy rafraîchit dès qu'un cookie de session est
 * présent.
 */
const SANS_SESSION = ["/api/mcp", "/.well-known", "/api/accessibilite", "/robots.txt"];

function sousPrefixe(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Un préfixe s'entend par segment entier : `/auth` ouvre `/auth` et
// `/auth/callback`, jamais `/authorisations` (audit du 2026-10-13, C7). Une
// comparaison par début de chaîne rendait publique, sans que personne l'ait
// décidé, toute route future dont le nom commencerait comme une route ouverte.
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return sousPrefixe(pathname, PUBLIC_PREFIXES);
}

/** Exporté pour les tests — la règle mérite d'être vérifiée directement. */
export const cheminPublic = isPublicPath;

/** Exporté pour les tests. */
export const cheminSansSession = (pathname: string) =>
  sousPrefixe(pathname, SANS_SESSION);

/**
 * Le cookie de session de `@supabase/ssr` : `sb-<ref>-auth-token`, découpé en
 * `.0`, `.1`… quand il dépasse la taille d'un cookie. Le vérificateur PKCE
 * (`…-auth-token-code-verifier`) n'est pas une session.
 */
const COOKIE_SESSION = /^sb-.+-auth-token(?:\.\d+)?$/;

export function porteUnCookieDeSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => COOKIE_SESSION.test(c.name));
}

/** Ce que reçoit `/api/*` sans session : du JSON, pas une page de connexion. */
function refusApi(): NextResponse {
  return NextResponse.json(
    {
      error: "non_authentifie",
      message: "Session absente ou expirée : connectez-vous pour accéder à cette ressource.",
    },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function versConnexion(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function refus(request: NextRequest): NextResponse {
  const p = request.nextUrl.pathname;
  return p === "/api" || p.startsWith("/api/") ? refusApi() : versConnexion(request);
}

export type OptionsSession = {
  /**
   * En-têtes à ajouter à la requête transmise au rendu (la CSP qui porte le
   * nonce, cf. `src/proxy.ts`). Réappliqués à chaque reconstruction de la
   * réponse : `setAll` en refait une après avoir réécrit les cookies.
   */
  entetesRequete?: Record<string, string>;
};

export async function updateSession(
  request: NextRequest,
  options: OptionsSession = {},
): Promise<NextResponse> {
  const suite = () => {
    const entetes = new Headers(request.headers);
    for (const [nom, valeur] of Object.entries(options.entetesRequete ?? {})) {
      entetes.set(nom, valeur);
    }
    return NextResponse.next({ request: { headers: entetes } });
  };

  const pathname = request.nextUrl.pathname;
  const publique = isPublicPath(pathname);

  // Le chemin d'abord, l'auth ensuite (H4) : ni client ni appel réseau pour
  // une route qui ne lit pas la session, ni pour un visiteur sans session.
  if (cheminSansSession(pathname)) return suite();
  const cookie = porteUnCookieDeSession(request);
  if (!cookie) return publique ? suite() : refus(request);

  let supabaseResponse = suite();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = suite();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ne pas intercaler de logique entre createServerClient et la lecture de
  // session : la doc @supabase/ssr insiste là-dessus (sinon risque de
  // déconnexion aléatoire).
  //
  // `getClaims()` et non plus `getUser()` (H4) : il rafraîchit le jeton
  // expiré exactement comme `getUser()` (les deux passent par `getSession()`,
  // qui appelle `setAll`), mais vérifie la signature du jeton localement, par
  // la clé publique du projet (JWKS, mise en cache par processus), quand le
  // projet signe en asymétrique. En HS256, il retombe sur `getUser()` : jamais
  // plus d'appels qu'avant. Ce qu'il ne voit pas — une session révoquée dont
  // le jeton court encore —, `requireUser()` le voit au rendu.
  //
  // Une erreur peut venir d'un refresh token que le serveur Auth ne connaît
  // plus (« Invalid Refresh Token: Refresh Token Not Found ») : on la traite
  // comme « pas de session » pour ne pas 500 chaque requête, et on purge le
  // cookie — tant qu'il traîne, le navigateur rejoue le même jeton mort.
  let session = false;
  let sessionMorte = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    session = Boolean(data?.claims?.sub);
    if (error && refreshTokenPerime(error)) sessionMorte = true;
  } catch (erreur) {
    session = false;
    sessionMorte = refreshTokenPerime(erreur);
  }

  if (!session && !publique) {
    const reponse = refus(request);
    if (sessionMorte) purgerCookiesAuth(request, reponse);
    return reponse;
  }

  if (sessionMorte) purgerCookiesAuth(request, supabaseResponse);

  return supabaseResponse;
}

/**
 * Une erreur d'auth dont on ne se relèvera pas sans nouvelle connexion : le
 * refresh token présenté n'existe plus côté serveur Auth (session révoquée,
 * jeton déjà consommé, projet Supabase changé). À distinguer d'une panne
 * réseau ou d'un 5xx passager — sur ceux-là, effacer les cookies
 * déconnecterait un utilisateur parfaitement valide.
 */
export function refreshTokenPerime(erreur: unknown): boolean {
  if (typeof erreur !== "object" || erreur === null) return false;
  const e = erreur as { code?: string; message?: string };
  if (typeof e.code === "string" && e.code.startsWith("refresh_token")) {
    return true;
  }
  return /refresh token/i.test(e.message ?? "");
}

/**
 * Efface les cookies de session Supabase (`sb-<ref>-auth-token`, éventuellement
 * découpés en `.0`, `.1`…) sur la réponse. Sans ça, le navigateur continue de
 * présenter un jeton mort à chaque requête et l'application reste bloquée sur
 * la même erreur, y compris après un rechargement.
 */
function purgerCookiesAuth(request: NextRequest, reponse: NextResponse): void {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      reponse.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }
}
