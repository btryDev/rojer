// La fiche équipement n'embarque pas le corpus (revue du 2026-10-16).
//
// Le renvoi « suivi par personne » y est entré en important
// `suiviParPersonne` depuis `pdf/textes-grille-relecture.ts`, qui tire
// `referentiels/corpus/` — soixante-cinq modules, près de 2 Mo de textes de
// loi dans le bundle d'une page qui n'en lit aucun. La fonction vit désormais
// dans `transmissions.ts`, qui ne lit que `transmet`.
//
// Ce test suit les imports EXÉCUTÉS de la page — déclarations `import` et
// `export … from` qui ne sont pas `type`, et appels `import()` dynamiques —,
// les résout comme le compilateur (`tsconfig.json`, alias `@/`), et tombe si
// l'un d'eux atteint un module de `referentiels/corpus/`. Lu dans l'arbre
// syntaxique, pas dans le texte : un reformatage ne le trompe pas
// (relecture groupée du 2026-10-16).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const RACINE = process.cwd();
const CORPUS = `${join(RACINE, "src/lib/referentiels/corpus")}/`;
const config = ts.readConfigFile(join(RACINE, "tsconfig.json"), ts.sys.readFile);
const options = ts.parseJsonConfigFileContent(config.config, ts.sys, RACINE).options;

/** Les spécificateurs importés à l'exécution par un fichier. */
function specificateurs(fichier: string): string[] {
  const source = ts.createSourceFile(
    fichier,
    readFileSync(fichier, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    fichier.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const trouves: string[] = [];
  const visiter = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n) && !n.importClause?.isTypeOnly && ts.isStringLiteral(n.moduleSpecifier)) {
      trouves.push(n.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(n) && !n.isTypeOnly && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      trouves.push(n.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(n) &&
      n.expression.kind === ts.SyntaxKind.ImportKeyword &&
      n.arguments[0] &&
      ts.isStringLiteralLike(n.arguments[0])
    ) {
      trouves.push(n.arguments[0].text);
    }
    ts.forEachChild(n, visiter);
  };
  visiter(source);
  return trouves;
}

/** Les modules du dépôt atteints par des imports exécutés, depuis `entree`. */
function atteints(entree: string): Set<string> {
  const vus = new Set<string>();
  const pile = [entree];
  while (pile.length > 0) {
    const f = pile.pop()!;
    if (vus.has(f)) continue;
    vus.add(f);
    for (const spec of specificateurs(f)) {
      const r = ts.resolveModuleName(spec, f, options, ts.sys).resolvedModule;
      if (!r || r.isExternalLibraryImport || r.resolvedFileName.endsWith(".d.ts")) continue;
      pile.push(r.resolvedFileName);
    }
  }
  return vus;
}

const versLeCorpus = (vus: Set<string>) => [...vus].filter((f) => f.startsWith(CORPUS));

describe("la fiche équipement n'embarque pas le corpus", () => {
  it("contre-épreuve : la grille de relecture, elle, l'atteint — le parcours voit bien le chemin", () => {
    expect(versLeCorpus(atteints(join(RACINE, "src/lib/pdf/textes-grille-relecture.ts")))).not.toEqual([]);
  });

  it("la page de la fiche équipement n'atteint aucun module de referentiels/corpus/", () => {
    const page = join(RACINE, "src/app/etablissements/[id]/equipements/[equipementId]/page.tsx");
    expect(versLeCorpus(atteints(page))).toEqual([]);
  });
});
