// Démarrage du serveur et erreurs de requête (audit Next.js du 2026-10-14, M6).
//
// `register()` : Next l'exécute une fois, au démarrage d'une instance, avant
// de servir la moindre requête. On y valide l'environnement (`src/env.ts`) :
// une variable requise manquante ~~empêche le serveur de démarrer~~ fait
// répondre 500 à toute requête, avec son nom. De même pour le rendu des PDF
// (ADR-059) : sans son fichier (`dist-pdf/pdf-worker.mjs`). [2026-11-10, vérifié sur le serveur autonome : Next ne
// s'arrête pas quand `register()` lève, le processus reste à l'écoute. Le
// contrôle de santé de Clever Cloud face à ces 500 reste à vérifier —
// `docs/chantiers-ouverts.md` § 23.]
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
  // Le rendu des PDF (ADR-059) : son fichier, vérifié ici plutôt qu'au
  // premier export. Pas pendant `next build`, qui ne sert rien et précède la
  // construction du paquet.
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    const { verifierRenduDesPdfAuDemarrage } = await import("./lib/pdf/worker/demarrage");
    verifierRenduDesPdfAuDemarrage();
  }
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
