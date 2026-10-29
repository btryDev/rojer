import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * CE QUE CE FICHIER DÉFEND (plan performance, 2026-10-29).
 *
 * `lignesDuDossierDeLaPage` (`queries.ts`) est mémoïsée sur le rendu. La page
 * du tableau de bord répare le calendrier PUIS la lit ; le layout est rendu EN
 * PARALLÈLE et ne répare pas. Si le layout l'atteignait, il pourrait remplir
 * l'entrée du rendu avant la réparation, et la page lirait les lignes d'avant
 * — le défaut retiré au lot 1 (`navigation/sidebar-counts.ts`). Aucune
 * exécution ne le montre : `cache()` ne mémoïse rien hors rendu. D'où la
 * lecture des sources, comme `fraicheur-sorties.test.ts`.
 *
 * POURQUOI UNE CLÔTURE À SOI, ET PAS CELLE DE `fraicheur-sorties`. Celle-là
 * suit les APPELS dans `src/lib` et `src/app`. Or le layout rend la barre par
 * un COMPOSANT (`<SidebarAvecPastilles>`, `src/components`), qui appelle les
 * compteurs : un élément JSX n'est pas un appel, et le chemin lui échappait.
 * Celle-ci suit les appels ET les éléments JSX, sur les trois dossiers — et
 * vérifie qu'elle retrouve ce chemin-là, sans quoi elle ne prouverait rien.
 *
 * Par NOM, comme l'autre : deux homonymes se confondent, ce qui ne peut
 * qu'élargir ce qu'on croit atteint — l'erreur se fait du côté qui fait
 * échouer la garde.
 */

const RACINE = join(__dirname, "..", "..", "..");
const DOSSIERS = ["src/lib", "src/app", "src/components"] as const;
const CIBLE = "lignesDuDossierDeLaPage";

function fichiersSources(dossier: string): string[] {
  const trouves: string[] = [];
  const descendre = (d: string) => {
    for (const entree of readdirSync(d)) {
      const p = join(d, entree);
      if (statSync(p).isDirectory()) {
        if (entree !== "node_modules" && entree !== "generated") descendre(p);
      } else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) && !/\.d\.ts$/.test(p)) {
        trouves.push(p);
      }
    }
  };
  descendre(join(RACINE, dossier));
  return trouves;
}

function arbre(chemin: string): ts.SourceFile {
  return ts.createSourceFile(
    chemin,
    readFileSync(chemin, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** Les noms appelés, et les composants rendus, sous `racine`. */
function atteints(racine: ts.Node): Set<string> {
  const noms = new Set<string>();
  const visiter = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      noms.add(n.expression.text);
    }
    if (
      (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) &&
      ts.isIdentifier(n.tagName)
    ) {
      noms.add(n.tagName.text);
    }
    ts.forEachChild(n, visiter);
  };
  visiter(racine);
  return noms;
}

/** Les fonctions de premier niveau d'un fichier, et ce que chacune atteint. */
function fonctionsDe(sf: ts.SourceFile): { nom: string; atteint: Set<string> }[] {
  const out: { nom: string; atteint: Set<string> }[] = [];
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) {
      out.push({ nom: st.name.text, atteint: atteints(st) });
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer) {
          out.push({ nom: d.name.text, atteint: atteints(d.initializer) });
        }
      }
    }
  }
  return out;
}

const fichiers = DOSSIERS.flatMap(fichiersSources);
const arbres = new Map(fichiers.map((f) => [f, arbre(f)]));
const fonctions = [...arbres.values()].flatMap(fonctionsDe);

/** Les noms de fonction qui atteignent `cible`, elle comprise. */
function quiAtteint(cible: string): Set<string> {
  const ensemble = new Set([cible]);
  let change = true;
  while (change) {
    change = false;
    for (const { nom, atteint } of fonctions) {
      if (!ensemble.has(nom) && [...atteint].some((a) => ensemble.has(a))) {
        ensemble.add(nom);
        change = true;
      }
    }
  }
  return ensemble;
}

const layouts = fichiers.filter((f) => /[\\/](layout|template)\.tsx?$/.test(f));
const relatif = (f: string) => f.slice(RACINE.length + 1);

describe("la lecture des lignes de la page n'est jamais atteinte depuis un layout", () => {
  const versLaCible = quiAtteint(CIBLE);

  it("borne basse : ses lecteurs connus l'atteignent", () => {
    for (const f of [
      "compterEtatCalendrierDeLaPage",
      "compterEtatEcheances",
      "compterVerifsParEquipement",
      "compterVerificationsDuDossier",
    ]) {
      expect(versLaCible.has(f), f).toBe(true);
    }
  });

  it("la clôture voit à travers les composants : le layout atteint les pastilles de la barre", () => {
    // Le chemin réel layout → <SidebarAvecPastilles> → chargerSidebarCounts.
    // Sans le JSX, la clôture ne le trouve pas, et le test suivant serait vert
    // pour rien.
    const versLesPastilles = quiAtteint("chargerSidebarCounts");
    const layoutEtablissement = layouts.find((f) =>
      /etablissements[\\/]\[id\][\\/]layout\.tsx$/.test(f),
    );
    expect(layoutEtablissement).toBeDefined();
    const direct = atteints(arbres.get(layoutEtablissement!)!);
    expect([...direct].some((n) => versLesPastilles.has(n))).toBe(true);
  });

  it("la barre latérale ne l'atteint pas : elle garde sa lecture", () => {
    for (const f of ["chargerSidebarCounts", "compterEnRetardParFamille"]) {
      expect(versLaCible.has(f), f).toBe(false);
    }
  });

  it("aucun layout ne l'atteint, par un appel ni par un composant", () => {
    expect(layouts.length).toBeGreaterThanOrEqual(1);
    const fautifs = layouts.flatMap((f) =>
      [...atteints(arbres.get(f)!)]
        .filter((n) => versLaCible.has(n))
        .map((n) => `${relatif(f)} → ${n}`),
    );
    expect(
      fautifs,
      "Ces layouts atteignent `lignesDuDossierDeLaPage`. Le layout est rendu " +
        "en parallèle de la page qui répare le calendrier : il pourrait remplir " +
        "la lecture partagée avant la réparation. Donnez-lui sa propre lecture " +
        "(`compterEtatCalendrier`).",
    ).toEqual([]);
  });
});
