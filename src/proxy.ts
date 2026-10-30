// ADR-005 : proxy (convention `proxy` de Next 16, ex-`middleware`, runtime
// Node imposé). Le fichier vit dans `src/`, au niveau de `app/` : à la racine
// du dépôt, `proxy.ts` n'est pas détecté et la garde saute en silence (le
// build ne liste plus « Proxy »). Le matcher exclut les assets statiques et
// les routes internes Next.
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

import type { NextRequest } from "next/server";
import { garderSession } from "@/lib/auth/proxy-session";
import { nonceCsp, politiqueContenu } from "@/lib/securite/entetes";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return garderSession(request);
  }

  const csp = politiqueContenu({
    developpement: process.env.NODE_ENV !== "production",
    nonce: nonceCsp(),
  });
  const reponse = garderSession(request, {
    entetesRequete: { "Content-Security-Policy": csp },
  });
  reponse.headers.set("Content-Security-Policy", csp);
  return reponse;
}

export const config = {
  matcher: [
    /*
     * Tout sauf :
     * - _next/static / _next/image (assets Next)
     * - favicon.ico
     * - fichiers avec extension (.svg, .png, .jpg, .webp, .woff2, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf)$).*)",
  ],
};
