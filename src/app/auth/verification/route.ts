import { NextResponse, type NextRequest } from "next/server";
import { isAPIError } from "better-auth/api";
import { auth } from "@/lib/auth/better-auth";

/**
 * Le lien de confirmation d'adresse (ADR-052) : `/auth/verification?token=…`,
 * construit dans `better-auth.ts`. Le jeton est vérifié en base par Better
 * Auth ; l'adresse confirmée, on renvoie vers la connexion — aucune session
 * n'est ouverte par un lien (`autoSignInAfterVerification: false`).
 *
 * Remplace `/auth/callback`, l'échange de code de Supabase.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const vers = (etat: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?${etat}`;
    return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
  };

  if (!token) return vers("confirmation=invalide");
  try {
    await auth.api.verifyEmail({ query: { token } });
    return vers("confirmed=1");
  } catch (e) {
    // Un jeton refusé est un lien invalide ; une panne de base, elle, se voit.
    if (isAPIError(e)) return vers("confirmation=invalide");
    throw e;
  }
}
