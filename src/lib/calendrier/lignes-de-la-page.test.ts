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
 * Celle-ci suit TOUT NOM RÉFÉRENCÉ — appel direct ou par méthode
 * (`q.lecteur()`), fonction passée en argument (`.then(lecteur)`), composant,
 * y compris à espace de noms (`<Ui.Barre>`) — sur les trois dossiers, et
 * vérifie qu'elle retrouve le chemin de la barre, sans quoi elle ne
 * prouverait rien.
 *
 * CE QUI TOURNE EN PARALLÈLE DE LA PAGE, ET QUE LA GARDE REGARDE : les
 * layouts et templates, les fichiers d'attente et d'erreur, les routes
 * parallèles (`@slot/…`, `default.tsx`), et les `generateMetadata` /
 * `generateViewport` des pages, que Next résout à part du corps de la page —
 * donc sans la réparation qu'il fait.
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
    false,
    chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/**
 * Tous les noms référencés sous `racine` : appels, références passées en
 * argument, membres (`q.lecteur`), composants (`<Barre>`, `<Ui.Barre>`).
 * Large à dessein — un nom de trop ne peut que faire échouer la garde.
 */
function atteints(racine: ts.Node): Set<string> {
  const noms = new Set<string>();
  const visiter = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) noms.add(n.text);
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

const relatif = (f: string) => f.slice(RACINE.length + 1);

/** Les fichiers de `src/app` que Next rend à côté de la page, en entier. */
const RENDUS_A_COTE =
  /[\\/](layout|template|default|loading|error|not-found|global-error)\.tsx?$/;
const dansSrcApp = (f: string) => relatif(f).startsWith("src/app/");
const layouts = fichiers.filter((f) => dansSrcApp(f) && RENDUS_A_COTE.test(f));
const slots = fichiers.filter(
  (f) => dansSrcApp(f) && /[\\/]@[^\\/]+[\\/]/.test(relatif(f)),
);

/** Les fonctions de page que Next résout à part du corps, sans sa réparation. */
const A_PART_DE_LA_PAGE = new Set(["generateMetadata", "generateViewport"]);
const fonctionsAPart = fichiers
  .filter((f) => dansSrcApp(f) && /[\\/](page|layout)\.tsx?$/.test(f))
  .flatMap((f) =>
    fonctionsDe(arbres.get(f)!)
      .filter(({ nom }) => A_PART_DE_LA_PAGE.has(nom))
      .map((fn) => ({ chemin: f, ...fn })),
  );

describe("la lecture des lignes de la page n'est jamais atteinte depuis un layout", () => {
  const versLaCible = quiAtteint(CIBLE);

  it("borne basse : ses lecteurs connus l'atteignent", () => {
    for (const f of [
      "compterEtatCalendrierDeLaPage",
      "compterEtatEcheancesDeLaPage",
      "compterVerifsParEquipementDeLaPage",
      "compterLignesDeLaPage",
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
    for (const f of [
      "chargerSidebarCounts",
      "compterEnRetardParFamille",
      "compterEtatEcheances",
      "compterEtatCalendrier",
    ]) {
      expect(versLaCible.has(f), f).toBe(false);
    }
  });

  it("aucun rendu parallèle à la page ne l'atteint, par un appel ni par un composant", () => {
    expect(layouts.length).toBeGreaterThanOrEqual(1);
    const fautifs = [
      ...[...layouts, ...slots].flatMap((f) =>
        [...atteints(arbres.get(f)!)]
          .filter((n) => versLaCible.has(n))
          .map((n) => `${relatif(f)} → ${n}`),
      ),
      ...fonctionsAPart.flatMap(({ chemin, nom, atteint }) =>
        [...atteint]
          .filter((n) => n !== nom && versLaCible.has(n))
          .map((n) => `${relatif(chemin)} (${nom}) → ${n}`),
      ),
    ];
    expect(
      fautifs,
      "Ces layouts atteignent `lignesDuDossierDeLaPage`. Le layout est rendu " +
        "en parallèle de la page qui répare le calendrier : il pourrait remplir " +
        "la lecture partagée avant la réparation. Donnez-lui sa propre lecture " +
        "(`compterEtatCalendrier`).",
    ).toEqual([]);
  });
});
