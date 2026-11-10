// Empaquette le processus de rendu des PDF (`src/lib/pdf/worker/entree.ts`) en
// un seul fichier autonome, `dist-pdf/pdf-worker.mjs` (lot pdf-b1, ADR-059).
//
// Tout y entre, react et @react-pdf compris (yoga est embarqué en base64 dans
// son module) : le fichier ne dépend ni de `node_modules` ni du traçage de
// Next. `scripts/preparer-standalone.sh` le copie dans le serveur autonome.
//
//   node scripts/construire-worker-pdf.mjs            une fois
//   node scripts/construire-worker-pdf.mjs --watch    en développement
//
// Les alias `@/…` viennent du tsconfig, qu'esbuild lit de lui-même. Le paquet
// ne doit atteindre aucun module serveur (Prisma, authentification, Next) :
// une garde le vérifie (`src/lib/pdf/worker/lancer.test.ts`).

import { build, context } from "esbuild";
import { fileURLToPath } from "node:url";

export const SORTIE = "dist-pdf/pdf-worker.mjs";

/** Les options d'esbuild, partagées par le script et par les tests. */
export function optionsWorkerPdf(outfile = SORTIE) {
  return {
    entryPoints: ["src/lib/pdf/worker/entree.ts"],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    // Des dépendances CommonJS appellent `require` : en ESM, il faut le recréer.
    banner: {
      js: 'import { createRequire as __creerRequire } from "node:module"; const require = __creerRequire(import.meta.url);',
    },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
    legalComments: "none",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--watch")) {
    const ctx = await context(optionsWorkerPdf());
    await ctx.watch();
    console.log(`pdf-worker : ${SORTIE}, reconstruit à chaque modification.`);
  } else {
    await build(optionsWorkerPdf());
    console.log(`pdf-worker : ${SORTIE}`);
  }
}
