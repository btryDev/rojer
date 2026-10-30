// Préchargé par `scripts/mesure-exports.ts` seulement, APRÈS
// `server-only-hors-next.mjs`. Remplace `@/lib/auth/require-user` par un
// double qui rend l'utilisateur `MESURE_USER_ID` et COMPTE les appels.
//
// Hors d'une requête Next, le vrai module appelle `headers()` (qui lève) puis
// `auth.api.getSession()` (ADR-052 ; ~~`supabase.auth.getUser()`, un
// aller-retour réseau~~). Chaque appel compté ici est, en production, une
// lecture de session en base : dans un route handler, `cache()` de React ne
// mémoïse rien (audit Next.js du 2026-10-14, M7).

import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const doublure = pathToFileURL(resolve(import.meta.dirname, "mesure-exports-auth-doublure.cjs")).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolu = nextResolve(specifier, context);
    // Par l'URL résolue : le module est importé par alias (`@/lib/auth/…`)
    // comme en relatif (`./require-user` depuis `scope.ts`).
    if (/\/src\/lib\/auth\/require-user\.ts$/.test(resolu.url)) {
      return { url: doublure, shortCircuit: true };
    }
    return resolu;
  },
});
