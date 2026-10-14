// Helper du proxy : rafraîchit la session Supabase à chaque requête et
// redirige vers /login si aucun user et que la route n'est pas whitelistée.
// Appelé depuis src/proxy.ts (ex-middleware.ts racine, renommé pour Next 16).
// Le fichier garde son nom : il disparaîtra avec Supabase Auth.

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
];

// Un préfixe s'entend par segment entier : `/auth` ouvre `/auth` et
// `/auth/callback`, jamais `/authorisations` (audit du 2026-10-13, C7). Une
// comparaison par début de chaîne rendait publique, sans que personne l'ait
// décidé, toute route future dont le nom commencerait comme une route ouverte.
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Exporté pour les tests — la règle mérite d'être vérifiée directement. */
export const cheminPublic = isPublicPath;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ne pas intercaler de logique entre createServerClient et getUser :
  // la doc @supabase/ssr insiste là-dessus (sinon risque de déconnexion aléatoire).
  // `getUser()` peut échouer — throw ou `error` — quand le cookie porte un
  // refresh token que le serveur Auth ne connaît plus (« Invalid Refresh Token:
  // Refresh Token Not Found »). On traite ça comme « pas de user » pour ne pas
  // 500 chaque requête, et on purge le cookie : tant qu'il traîne, le navigateur
  // rejoue le même jeton mort à chaque navigation et l'erreur revient en boucle.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  let sessionMorte = false;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (error && refreshTokenPerime(error)) sessionMorte = true;
  } catch (erreur) {
    user = null;
    sessionMorte = refreshTokenPerime(erreur);
  }

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    const redirection = NextResponse.redirect(url);
    if (sessionMorte) purgerCookiesAuth(request, redirection);
    return redirection;
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
