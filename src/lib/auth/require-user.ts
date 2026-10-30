import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./better-auth";

export type AuthedUser = {
  id: string;
  email: string | null;
};

/**
 * Les en-têtes à donner à Better Auth pour LIRE la session pendant un rendu :
 * ceux de la requête, mais avec les cookies tels que l'action serveur qui
 * précède les a laissés. Une action qui renouvelle la session (activer ou
 * désactiver la double authentification) pose un cookie neuf et efface
 * l'ancienne session en base ; le rendu qui suit, dans la même requête,
 * lisait encore l'ancien cookie dans `headers()` et renvoyait à `/login`.
 * `cookies()` porte les écritures de l'action ; `headers()`, non.
 */
export async function entetesDeSession(): Promise<Headers> {
  const entetes = new Headers(await headers());
  entetes.set("cookie", (await cookies()).toString());
  return entetes;
}

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
 * Un cookie absent, forgé ou expiré rend `null` (Better Auth ne lève pas pour
 * ça). Une panne de base, elle, LÈVE : la page tombe en erreur et la panne se
 * voit, au lieu de déconnecter en silence un utilisateur connecté.
 */
const lireUserCourant = cache(async (): Promise<AuthedUser | null> => {
  const session = await auth.api.getSession({ headers: await entetesDeSession() });
  if (!session) return null;
  return { id: session.user.id, email: session.user.email ?? null };
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
