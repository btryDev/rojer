// La fiche équipement n'embarque pas le corpus (revue du 2026-10-16).
//
// Le renvoi « suivi par personne » y est entré en important
// `suiviParPersonne` depuis `pdf/textes-grille-relecture.ts`, qui tire
// `referentiels/corpus/index.ts` — soixante-cinq modules, près de 2 Mo de
// textes de loi dans le bundle d'une page qui n'en lit aucun. La fonction vit
// désormais dans `transmissions.ts`, qui ne lit que `transmet`. Ce test suit
// les imports EXÉCUTÉS de la page (pas les `import type`, effacés à la
// compilation) et tombe s'ils atteignent le corpus.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RACINE = process.cwd();
const CORPUS = join(RACINE, "src/lib/referentiels/corpus/index.ts");

function resoudre(depuis: string, cible: string): string | null {
  let base: string;
  if (cible.startsWith("@/")) base = join(RACINE, "src", cible.slice(2));
  else if (cible.startsWith(".")) base = resolve(dirname(depuis), cible);
  else return null; // paquet npm : hors de la question
  for (const f of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (f.match(/\.tsx?$/) && existsSync(f)) return f;
  }
  return null;
}

/** Les modules atteints par des imports exécutés, depuis `entree`. */
function atteints(entree: string): Set<string> {
  const vus = new Set<string>();
  const pile = [entree];
  const IMPORT = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^;'"]*?\s+from\s+)?["']([^"']+)["']/g;
  while (pile.length > 0) {
    const f = pile.pop()!;
    if (vus.has(f)) continue;
    vus.add(f);
    const source = readFileSync(f, "utf8");
    for (const m of source.matchAll(IMPORT)) {
      if (m[1]) continue; // `import type` / `export type` : effacé
      const cible = resoudre(f, m[2]);
      if (cible) pile.push(cible);
    }
  }
  return vus;
}

describe("la fiche équipement n'embarque pas le corpus", () => {
  it("contre-épreuve : la grille de relecture, elle, l'atteint — le parcours voit bien le chemin", () => {
    expect(atteints(join(RACINE, "src/lib/pdf/textes-grille-relecture.ts")).has(CORPUS)).toBe(true);
  });

  it("la page de la fiche équipement ne l'atteint pas", () => {
    const page = join(RACINE, "src/app/etablissements/[id]/equipements/[equipementId]/page.tsx");
    expect(atteints(page).has(CORPUS)).toBe(false);
  });
});
