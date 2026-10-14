// Dans quel environnement l'application tourne — sans dépendre de l'hébergeur.
//
// POURQUOI CE MODULE (audit Next.js du 2026-10-14, H5). La seule garde
// « environnement » du code lisait `VERCEL_ENV === "preview"`. Chez Clever
// Cloud, la variable n'existe pas : la condition y est toujours fausse, et une
// préversion se serait mise à RÉÉCRIRE le calendrier en base — exactement ce
// que la garde devait empêcher, sans qu'aucune erreur ne le dise.
//
// LA RÈGLE, dans cet ordre :
//   1. `APP_ENV` (production | preview | development), posée à la main sur
//      chaque déploiement. C'est la source à venir, et elle prime partout.
//   2. À défaut, `VERCEL_ENV`, que Vercel pose lui-même : la production
//      actuelle n'a donc rien à configurer.
//   3. À défaut des deux, hors build de production (`next dev`, tests) :
//      développement.
//   4. Sinon — un serveur de production qui ne dit pas ce qu'il est —
//      `null` : INDÉTERMINÉ. Ce n'est pas « production par défaut ».
//
// Une valeur inconnue (`APP_ENV=prod`, faute de frappe) rend aussi `null`,
// sans retomber sur `VERCEL_ENV` : qui a posé `APP_ENV` a voulu trancher, et
// un repli silencieux lui donnerait tort sans le lui dire. `src/env.ts`
// refuse de toute façon ce cas au démarrage.
//
// Pas de `server-only` : le module ne lit que l'environnement qu'on lui passe
// et ne porte aucun secret ; les tests et `src/env.ts` le partagent.

export const ENVIRONNEMENTS_APP = ["production", "preview", "development"] as const;
export type EnvironnementApp = (typeof ENVIRONNEMENTS_APP)[number];

type Env = Record<string, string | undefined>;

function estEnvironnementApp(v: string): v is EnvironnementApp {
  return (ENVIRONNEMENTS_APP as readonly string[]).includes(v);
}

/** L'environnement de l'application, ou `null` s'il est indéterminé. */
export function environnementApp(env: Env = process.env): EnvironnementApp | null {
  const app = env.APP_ENV?.trim();
  if (app) return estEnvironnementApp(app) ? app : null;

  const vercel = env.VERCEL_ENV?.trim();
  if (vercel) return estEnvironnementApp(vercel) ? vercel : null;

  return env.NODE_ENV === "production" ? null : "development";
}

/**
 * Ce déploiement peut-il écrire en base de lui-même, sans geste de
 * l'utilisateur (réparer un calendrier périmé à l'affichage) ?
 *
 * Oui en production et en développement. Non depuis une préversion, qui porte
 * le code de sa branche. Et NON dans le doute : un environnement indéterminé
 * lit et n'écrit pas — le pire qui arrive alors est un calendrier recalé à la
 * mutation suivante plutôt qu'à l'ouverture, pas des dossiers réels recalculés
 * par un référentiel non fusionné.
 */
export function ecritureAutomatiqueAutorisee(env: Env = process.env): boolean {
  const e = environnementApp(env);
  return e === "production" || e === "development";
}
