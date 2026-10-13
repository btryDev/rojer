// Callback OAuth / email confirmation Supabase.
// Invoqué après clic sur le lien de confirmation reçu par mail.
// Échange le code contre une session, puis redirige vers ?next ou /entreprises.

import { NextResponse, type NextRequest } from "next/server";
import { cheminDeRetour } from "@/lib/auth/chemin-de-retour";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = cheminDeRetour(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Échange impossible (lien expiré / déjà utilisé). Pour une réinitialisation
  // de mot de passe, la page dédiée affiche l'état « lien invalide ».
  if (next.startsWith("/auth/reinitialisation")) {
    return NextResponse.redirect(`${origin}/auth/reinitialisation#error=lien_invalide`);
  }

  return NextResponse.redirect(`${origin}/login?confirmed=1`);
}
