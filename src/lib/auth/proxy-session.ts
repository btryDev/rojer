// Ce que le proxy (`src/proxy.ts`) fait de la session (ADR-052) : un test de
// PRÉSENCE du cookie de Better Auth, pour rediriger tôt — jamais une
// validation. La garde d'accès vit dans `requireUser()` et `lib/auth/scope.ts`,
// sur chaque page, action et route (audit Next.js, H4) : un cookie forgé passe
// le proxy et s'arrête là.
//
// Le proxy publie aussi l'IP du visiteur pour Better Auth (`ENTETE_IP_CLIENT`).
//
// ~~Supabase : rafraîchissement du jeton, purge d'un refresh token mort~~
// [2026-10-30, ADR-052 : la session est en base, rien à rafraîchir ici.]

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { ipClient } from "@/lib/securite/ip-client";
import { ENTETE_IP_CLIENT } from "./entete-ip";

// Préfixes publics (non authentifiés), comparés par segment entier.
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/_next",
  "/favicon.ico",
  // ADR-007 : accès prestataire par lien magique.
  "/acces",
  // ADR-006 : vérification publique d'une preuve de signature.
  "/verifier",
  // ADR-006 : accusé de réception après signature (public).
  "/signe",
  // Registre public d'accessibilité.
  "/accessibilite",
  // Route API qui sert l'affiche A4 du registre (QR + URL).
  "/api/accessibilite",
  // Le serveur MCP par clé (`/api/mcp/[cle]`) porte sa propre garde.
  "/api/mcp",
  "/robots.txt",
];

function sousPrefixe(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Exporté pour les tests — la règle mérite d'être vérifiée directement. */
export function cheminPublic(pathname: string): boolean {
  return pathname === "/" || sousPrefixe(pathname, PUBLIC_PREFIXES);
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

export type OptionsSession = {
  /** En-têtes à ajouter à la requête transmise au rendu (la CSP à nonce). */
  entetesRequete?: Record<string, string>;
};

export function garderSession(
  request: NextRequest,
  options: OptionsSession = {},
): NextResponse {
  const pathname = request.nextUrl.pathname;
  if (!cheminPublic(pathname) && !getSessionCookie(request)) {
    return pathname === "/api" || pathname.startsWith("/api/")
      ? refusApi()
      : versConnexion(request);
  }

  const entetes = new Headers(request.headers);
  for (const [nom, valeur] of Object.entries(options.entetesRequete ?? {})) {
    entetes.set(nom, valeur);
  }
  // Toujours écrasé : la valeur qu'aurait envoyée le client disparaît, et sans
  // IP lisible l'en-tête est retiré plutôt que laissé au client.
  const ip = ipClient(request.headers);
  if (ip) entetes.set(ENTETE_IP_CLIENT, ip);
  else entetes.delete(ENTETE_IP_CLIENT);
  return NextResponse.next({ request: { headers: entetes } });
}
