import "server-only";
// Client Supabase côté serveur (RSC, Server Actions, Route Handlers).
// `cookies()` de next/headers est lu en readonly dans un RSC : set/remove
// peuvent throw, on les try/catch comme recommandé par la doc @supabase/ssr.
// Le refresh effectif de la session se fait dans src/proxy.ts.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Lancé depuis un Server Component — le proxy rafraîchit.
          }
        },
      },
    },
  );
}
