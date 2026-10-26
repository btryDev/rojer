import "server-only";
import { cookies } from "next/headers";
import { COOKIE_ETABLISSEMENT_ACTIF } from "@/lib/auth/scope";

/**
 * Pose le cookie de l'établissement actif (ADR-028).
 *
 * Module serveur et non action serveur : il n'est jamais appelable depuis le
 * client. Ses appelants ont vérifié l'appartenance avant de l'appeler — le
 * sélecteur (`choisirEtablissementActif`) et le parcours qui vient de créer
 * l'établissement (`finaliserOnboarding`).
 *
 * `httpOnly` : rien côté client n'a à le lire. Il ne porte aucun droit — le
 * scoping le revalide à chaque lecture (`getOptionalUserEtablissement`) — mais
 * un cookie que du JavaScript peut écrire est un cookie qu'une extension ou un
 * script tiers écrit aussi, et le premier symptôme serait un dirigeant qui
 * atterrit chez lui sur le mauvais dossier sans comprendre pourquoi.
 *
 * Un an : c'est une préférence de navigateur, pas une session. La reperdre à
 * chaque déconnexion obligerait à recommuter à chaque retour.
 */
export async function poserEtablissementActif(etablissementId: string): Promise<void> {
  (await cookies()).set(COOKIE_ETABLISSEMENT_ACTIF, etablissementId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
