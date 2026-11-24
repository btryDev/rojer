// ADR-005 : proxy (convention `proxy` de Next 16, ex-`middleware`, runtime
// Node imposé). Le fichier vit dans `src/`, au niveau de `app/` : à la racine
// du dépôt, `proxy.ts` n'est pas détecté et la garde saute en silence (le
// build ne liste plus « Proxy »). Le matcher exclut les assets statiques et
// les routes internes Next.
//
// En tête, avant tout (2026-11-24, bascule de rojer.fr) : « www. » + l'hôte
// de `PUBLIC_APP_URL` est renvoyé vers l'adresse publique, en 308
// (`lib/securite/hote-canonique.ts`). Tout autre hôte que celui de
// `PUBLIC_APP_URL` — l'adresse technique de Clever Cloud — reçoit
// `X-Robots-Tag: noindex` : une seule copie du site chez les moteurs.
//
// Deux rôles :
//   - la session (présence du cookie, refus sans session hors chemins
//     publics, IP du visiteur pour Better Auth) : `src/lib/auth/proxy-session.ts`. Ce n'est PAS la garde d'accès, qui
//     vit dans `requireUser()` et `lib/auth/scope.ts` ;
//   - la CSP bloquante à nonce (audit OWASP S7) : un nonce neuf par requête,
//     posé sur l'en-tête de requête — Next l'y lit et l'appose à ses scripts —
//     et sur la réponse. Pas sur `/api/*` : des route handlers qui rendent du
//     JSON ou des fichiers, et dont la CSP (`frame-ancestors`, `sandbox` des
//     fichiers déposés) vient de `next.config.ts`.

import { NextResponse, type NextRequest } from "next/server";
import { garderSession } from "@/lib/auth/proxy-session";
import { nonceCsp, politiqueContenu } from "@/lib/securite/entetes";
import { NOINDEX } from "@/lib/indexation";
import { hoteOuvertAuxMoteurs, redirectionWww } from "@/lib/securite/hote-canonique";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const versAdressePublique = redirectionWww(
    request.headers.get("host"),
    pathname,
    request.nextUrl.search,
    process.env.PUBLIC_APP_URL || null,
  );
  if (versAdressePublique) return NextResponse.redirect(versAdressePublique, 308);
  const fermerAuxMoteurs = (reponse: NextResponse) => {
    if (!hoteOuvertAuxMoteurs(request.headers.get("host"), process.env.PUBLIC_APP_URL || null)) {
      reponse.headers.set("X-Robots-Tag", NOINDEX);
    }
    return reponse;
  };

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return fermerAuxMoteurs(garderSession(request));
  }

  const csp = politiqueContenu({
    developpement: process.env.NODE_ENV !== "production",
    nonce: nonceCsp(),
  });
  const reponse = garderSession(request, {
    entetesRequete: { "Content-Security-Policy": csp },
  });
  reponse.headers.set("Content-Security-Policy", csp);
  return fermerAuxMoteurs(reponse);
}

export const config = {
  matcher: [
    /*
     * Tout sauf :
     * - _next/static / _next/image (assets Next)
     * - favicon.ico
     * - fichiers avec extension (.svg, .png, .jpg, .webp, .woff2, .mp4…)
     *   Les vidéos de `public/` (2026-11-07) : sans elles, la vidéo de la
     *   page publique passait par le proxy et était redirigée vers /login
     *   pour un visiteur sans session — elle ne se lisait qu'une fois
     *   connecté. Les fichiers déposés passent par /api, jamais par ici.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf|mp4|webm)$).*)",
  ],
};
