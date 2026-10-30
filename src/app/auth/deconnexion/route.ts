import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/better-auth";
import { publicAppUrl } from "@/lib/email";

/**
 * La déconnexion (ADR-052, ASVS V7.4.1 / B30) : ferme la session en base, puis
 * demande au navigateur d'effacer ce qu'il garde du site — cookies, stockage
 * local, cache (`Clear-Site-Data`). Une route et non une action serveur : une
 * action ne pose pas d'en-tête de réponse.
 *
 * POST seulement, et de la même origine : un site tiers ne déconnecte
 * personne par un lien ou un formulaire caché. Le cookie de session étant
 * `SameSite=Lax`, il n'accompagnerait de toute façon pas un POST d'ailleurs.
 */
export async function POST(request: NextRequest) {
  const app = new URL(publicAppUrl());
  if (request.headers.get("origin") !== app.origin) {
    return new NextResponse(null, { status: 403 });
  }
  try {
    await auth.api.signOut({ headers: request.headers });
  } catch {
    // Session déjà fermée ou absente : l'effacement côté navigateur suffit.
  }
  const reponse = NextResponse.redirect(new URL("/login", app), 303);
  reponse.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');
  reponse.headers.set("Cache-Control", "no-store");
  return reponse;
}
