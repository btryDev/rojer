// ADR-005 : garde d'auth (convention `proxy` de Next 16, ex-`middleware`,
// runtime Node imposé). Le fichier vit dans `src/`, au niveau de `app/` : à la
// racine du dépôt, `proxy.ts` n'est pas détecté et la garde saute en silence
// (le build ne liste plus « Proxy »). Le matcher exclut les assets statiques et les routes
// internes Next. La logique (refresh session + redirect si non connecté hors
// whitelist) vit dans src/lib/supabase/middleware.ts.

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
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
