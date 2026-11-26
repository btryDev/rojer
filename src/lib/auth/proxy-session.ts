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
import { CHEMIN_AUTH, estCheminAuthServi } from "@/lib/mcp/oauth";

// Préfixes publics (non authentifiés), comparés par segment entier.
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/_next",
  "/favicon.ico",
  // ADR-007 : accès prestataire par lien magique.
  "/acces",
  // ADR-006, amendée le 2026-11-21 : `/verifier` et `/signe` n'ont plus de
  // page — la vérification se fait dans l'application. Les adresses restent
  // sans session pour répondre 404 à tous, tiers compris : un lien d'un
  // ancien PDF ou d'un ancien e-mail ne mène pas à un écran de connexion.
  // (Une adresse retirée dont une page reprend le rôle se redirige plutôt,
  // dans `next.config.ts` : `/bientot` → `/signup`, 2026-11-26.)
  "/verifier",
  "/signe",
  // Registre public d'accessibilité.
  "/accessibilite",
  // Route API qui sert l'affiche A4 du registre (QR + URL).
  "/api/accessibilite",
  // Le serveur MCP porte sa propre garde : ~~la clé de `/api/mcp/[cle]`~~
  // [2026-11-21 : route retirée, ADR-062] le jeton OAuth de `/api/mcp`
  // (ADR-062), qui doit répondre 401 avec son défi et non le refus JSON du
  // proxy.
  "/api/mcp",
  // ADR-062 : la découverte OAuth (RFC 8414, RFC 9728). Les points d'entrée
  // de `/api/auth` sont publics un par un (`estCheminAuthServi`), pas le
  // préfixe : le reste de Better Auth n'est pas monté.
  "/.well-known",
  // ADR-062 : la page de connexion du fournisseur OAuth ; sans session, elle
  // renvoie elle-même vers `/login` avec la requête signée en `next`.
  "/oauth/reprendre",
  // ADR-053 § 8 : les conditions générales, lues avant l'essai et au paiement.
  "/conditions",
  // Mentions légales, confidentialité, cookies : lues avant tout compte.
  "/legal",
  // ADR-053 : le webhook Stripe, sans session ; la signature est sa garde.
  "/api/stripe/webhook",
  // Les tâches (file Stripe, tâches du jour), appelées chaque minute par la crontab ; le secret partagé est leur garde.
  "/api/taches/chaque-minute",
  "/robots.txt",
  // Le plan du site, pour les moteurs (2026-11-23, `app/sitemap.ts`).
  "/sitemap.xml",
  // Le résumé du site pour les assistants (2026-11-24, `app/llms.txt`).
  "/llms.txt",
];

function sousPrefixe(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Exporté pour les tests — la règle mérite d'être vérifiée directement. */
export function cheminPublic(pathname: string): boolean {
  return pathname === "/" || sousPrefixe(pathname, PUBLIC_PREFIXES) || estCheminAuthServi(pathname);
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

/**
 * Un chemin de `/api/auth` que la route ne sert pas (ADR-062 § 2) : `404`,
 * avec ou sans session, comme la route elle-même. Un `401` y laissait croire
 * qu'une session ouvrirait la porte (`openid-configuration`, relevé par un
 * contrôle externe le 2026-11-23) ; la route reste la garde.
 */
function horsListeAuth(pathname: string): boolean {
  return (pathname === CHEMIN_AUTH || pathname.startsWith(`${CHEMIN_AUTH}/`)) && !estCheminAuthServi(pathname);
}

function versConnexion(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/**
 * Un POST sur une page est une action serveur (avec JavaScript, l'en-tête
 * `Next-Action` ; sans, un formulaire multipart). Sans cookie, le proxy la
 * laisse passer au lieu de la rediriger : le navigateur suit un 307 en
 * rejouant le POST sur `/login`, qui ne connaît pas l'action, et
 * l'utilisateur dont la session a expiré, onglet ouvert, voyait une erreur
 * (audit du proxy, 2026-11-05). L'action appelle `requireUser()`, dont le
 * `redirect("/login")` est la redirection que le client d'action sait suivre.
 * Rien ne s'ouvre : le proxy n'a jamais été la garde (voir en tête).
 */
function actionServeur(request: NextRequest, api: boolean): boolean {
  return !api && request.method === "POST";
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
  const api = pathname === "/api" || pathname.startsWith("/api/");
  if (horsListeAuth(pathname)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (!cheminPublic(pathname) && !getSessionCookie(request) && !actionServeur(request, api)) {
    return api ? refusApi() : versConnexion(request);
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
