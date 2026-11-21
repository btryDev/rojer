// La route HTTP de Better Auth, en liste blanche (ADR-062 § 2).
//
// Seuls les points d'entrée qu'un client OAuth appelle lui-même passent
// (`CHEMINS_AUTH_SERVIS`) : autorisation, jeton, enregistrement, révocation,
// découverte. Connexion, inscription, double authentification et membres ne
// sont PAS servis ici : ils restent des actions serveur, avec leurs gardes
// (limites de débit, quotas, refus), que le gestionnaire de Better Auth
// contournerait. Tout autre chemin répond 404, sans corps qui renseigne.

import { auth } from "@/lib/auth/better-auth";
import { estCheminAuthServi } from "@/lib/mcp/oauth";
import { ipPourLimite } from "@/lib/securite/ip-client";
import { cleLimite, consommer, LIMITES } from "@/lib/securite/limite-debit";

export const dynamic = "force-dynamic";

const absent = () => new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

async function servirOAuth(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (!estCheminAuthServi(pathname)) return absent();

  if (pathname.endsWith("/oauth2/register")) {
    const ip = ipPourLimite(request.headers);
    if (ip) {
      const verdict = await consommer([
        { cle: cleLimite("oauth-enregistrement", "ip", ip), limite: LIMITES.oauthEnregistrementIp },
      ]);
      if (!verdict.ok) {
        return Response.json(
          { error: "too_many_requests", error_description: "Trop d'enregistrements depuis cette adresse." },
          { status: 429, headers: { "retry-after": String(verdict.reessayerDansSecondes), "cache-control": "no-store" } },
        );
      }
    }
  }

  return auth.handler(request);
}

export async function GET(request: Request) {
  return servirOAuth(request);
}

export async function POST(request: Request) {
  return servirOAuth(request);
}
