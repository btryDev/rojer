import "server-only";
// Helper utilisé par les Server Actions et les RSC qui accèdent à de la data
// utilisateur. Lit la session Supabase côté serveur et redirige vers /login
// si aucun user. À appeler AU DÉBUT de chaque action/loader, avant toute
// requête Prisma sensible.

import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AuthedUser = {
  id: string;
  email: string | null;
};

// `getUser()` peut throw un `AuthApiError` (« Invalid Refresh Token ») quand
// le cookie de session contient un refresh token périmé. On traite ça comme
// « pas de user » plutôt que de faire 500 le RSC qui consomme ce helper.
async function safeGetUser(supabase: SupabaseClient) {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Lecture mémoïsée de l'utilisateur courant, source unique de `requireUser`
 * et `getOptionalUser`.
 *
 * `supabase.auth.getUser()` n'est pas une lecture de cookie : il interroge le
 * serveur Auth pour valider le JWT — c'est précisément ce qui le rend sûr, et
 * ce qui le rend coûteux. Or les helpers de requêtes appellent chacun
 * `requireUser()` en préambule, si bien qu'un seul rendu du tableau de bord en
 * déclenchait une douzaine : le layout, puis chaque fonction du `Promise.all`
 * de la page, chacune rouvrant sa propre session pour le même utilisateur.
 *
 * `cache()` de React donne une mémoïsation **portée à la requête** : deux
 * appels dans le même rendu partagent un aller-retour, deux requêtes HTTP
 * distinctes n'ont rien en commun. La distinction importe ici — une mémoïsation
 * de portée module ferait fuiter l'identité d'un visiteur vers le suivant.
 *
 * Hors contexte de requête (tests unitaires), React n'a pas de dispatcher de
 * cache : la fonction s'exécute alors normalement, sans mémoïsation.
 */
const lireUserCourant = cache(async (): Promise<AuthedUser | null> => {
  const supabase = await createClient();
  const user = await safeGetUser(supabase);

  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
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
