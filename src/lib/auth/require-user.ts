import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./better-auth";

export type AuthedUser = {
  id: string;
  email: string | null;
};

/**
 * Lecture mémoïsée de l'utilisateur courant, source unique de `requireUser`
 * et `getOptionalUser` — et le seul endroit qui sait d'où vient l'identité
 * (ADR-052 : Better Auth, ADR-051 : le client borné au compte s'appuie dessus).
 *
 * `auth.api.getSession` lit la session EN BASE à partir du cookie (pas de
 * cache de cookie : une session fermée l'est tout de suite). Une requête par
 * appel, d'où `cache()` de React : deux appels dans le même rendu partagent un
 * aller-retour, deux requêtes HTTP distinctes n'ont rien en commun — une
 * mémoïsation de portée module ferait fuiter l'identité d'un visiteur vers le
 * suivant. `cache()` ne mémoïse rien dans les actions et les routes (M7).
 *
 * Une erreur de lecture vaut « pas de session » : la page redirige vers la
 * connexion au lieu de casser.
 */
const lireUserCourant = cache(async (): Promise<AuthedUser | null> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;
    return { id: session.user.id, email: session.user.email ?? null };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<AuthedUser> {
  const user = await lireUserCourant();

  if (!user) {
    redirect("/login");
  }

  return user;
}

// Variante non-redirect : retourne null si pas de user. Utile pour un header
// qui doit s'afficher en mode "connecté / déconnecté" sans forcer un redirect.
export async function getOptionalUser(): Promise<AuthedUser | null> {
  return lireUserCourant();
}
