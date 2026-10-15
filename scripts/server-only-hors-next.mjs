// Préchargé par les scripts `tsx` du dépôt : `tsx --import ./scripts/server-only-hors-next.mjs …`
// (voir `package.json`). Résout `import "server-only"` vers son module vide.
//
// POURQUOI. `server-only` est un marqueur pour le BUNDLER de Next : un module
// qui l'importe fait échouer le build s'il entre dans un paquet client. Le
// paquet n'est pas installé — Next le fournit (`next/dist/compiled/server-only`)
// et le résout lui-même, vers `empty.js` côté serveur. Un script lancé par
// `tsx` n'a ni bundler ni paquet client : sans ce préchargement, il ne trouve
// pas le module, ou, installé, en reçoit la version qui lève toujours. Vitest
// fait exactement la même chose par un alias (`vitest.config.ts`). La garde
// côté client est intacte : elle se joue au `next build`, que ce fichier ne
// touche pas.
//
// POURQUOI PAS `--conditions=react-server` (essayé le 2026-10-14, audit
// Next.js, M3). La condition change la résolution de TOUS les paquets, pas
// seulement celle de `server-only` : `react` passe à sa version RSC, sans
// `createContext` ni moteur de rendu. Deux scripts cassaient :
// `mcp-server.ts` dès l'import (`next/navigation`, tiré par
// `auth/require-user.ts`, appelle `React.createContext`) et
// `generer-grille-equipements.tsx` au rendu du PDF (@react-pdf). Les quatorze
// autres ne tenaient que parce qu'aucun ne rend de React.
//
// `registerHooks` (synchrone) et non `register` : `tsx` compile ces scripts en
// CommonJS (pas de `"type": "module"`), et seul le crochet synchrone voit les
// `require()`. Node ≥ 22.15.

import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const vide = pathToFileURL(
  createRequire(import.meta.url).resolve("next/dist/compiled/server-only/empty.js"),
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: vide, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
