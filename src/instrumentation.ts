// Démarrage du serveur et erreurs de requête (audit Next.js du 2026-10-14, M6).
//
// `register()` : Next l'exécute une fois, au démarrage d'une instance, avant
// de servir la moindre requête. On y valide l'environnement (`src/env.ts`) :
// une variable requise manquante empêche le serveur de démarrer, avec son nom.
// Côté Node seulement — le module de validation est `server-only` et lit des
// variables serveur ; le runtime edge n'est pas utilisé par l'application.
//
// `onRequestError` : une ligne JSON par erreur serveur, sur stderr
// (`lib/journal/erreur-requete.ts`) — ce que collectent Vercel comme un drain
// Clever Cloud, sans service tiers.

import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validerEnvironnementAuDemarrage } = await import("./env");
  validerEnvironnementAuDemarrage();
}

export const onRequestError: Instrumentation.onRequestError = async (
  erreur,
  requete,
  contexte,
) => {
  const { ligneErreurRequete } = await import("./lib/journal/erreur-requete");
  // Une chaîne seule : `console.error` l'écrit telle quelle sur stderr, en une
  // ligne (le JSON échappe les retours à la ligne de la pile). Pas
  // `process.stderr`, absent du runtime edge si une erreur y naissait.
  console.error(ligneErreurRequete(erreur, requete, contexte));
};
