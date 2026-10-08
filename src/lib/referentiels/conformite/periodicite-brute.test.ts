import { beforeAll, describe, expect, it } from "vitest";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/**
 * GARDE DES LECTURES BRUTES DE `periodicite` (ADR-039, 2026-10-08).
 *
 * `Obligation.periodicite` est le rythme DU TEXTE. Le rythme qui date une
 * ligne est `periodiciteEffective(o)` : celui du texte, sinon le rythme retenu
 * (norme ou défaut annuel). Un lecteur qui lit `o.periodicite` voit « autre »
 * sur les obligations à rythme retenu (dix le 2026-10-08, C66) — et l'échéance DISPARAÎT de sa
 * surface, sans que personne ne la voie manquer. C'est l'argument qui a fait
 * proposer d'inverser l'ADR-039 ; la propriétaire a choisi cette garde à la
 * place.
 *
 * Elle suit la PROPRIÉTÉ jusqu'à sa déclaration dans `ObligationCommune`, par
 * le vérificateur de types — pas un grep : un `Pick<Obligation, …>`, une
 * intersection ou une déstructuration y remontent. Deux règles :
 *
 *  1. Aucune lecture de `periodicite` sur une obligation hors de la liste
 *     ci-dessous (chaque entrée dit pourquoi elle veut le rythme du TEXTE).
 *  2. Aucun PASSAGE d'une obligation à un paramètre qui déclare sa propre
 *     `periodicite` (type structurel écrit à la main) : la lecture se ferait
 *     là-bas, hors de portée de la règle 1. Un tel paramètre se type
 *     `Pick<Obligation, …>`.
 *
 * Les fichiers de test sont hors du champ : ils lisent le rythme du texte
 * pour le comparer.
 */

/** `fichier#fonction` → pourquoi cette fonction veut le rythme du TEXTE. */
const LECTURES_AUTORISEES: Readonly<Record<string, string>> = {
  "src/lib/referentiels/conformite/rythme-retenu.ts#periodiciteEffective":
    "la définition même : le texte, sinon le rythme retenu",
  "src/lib/referentiels/conformite/rythme-retenu.ts#controlerRythmeRetenu":
    "la règle « un rythme retenu ne se pose que sur periodicite: autre »",
  "src/lib/referentiels/conformite/index.ts#empreinteReferentiel":
    "l'empreinte porte le rythme du texte ; le rythme retenu y entre à part",
  "src/lib/referentiels/conformite/renvoi-aux-normes.ts#renvoiAuxNormes":
    "le renvoi aux normes ne vaut que si le texte n'écrit aucun rythme",
  "scripts/export-relecture.ts#lignes":
    "la colonne « rythme du texte » de l'export ; le rythme retenu est à côté",
  "src/lib/calendrier/generateur.ts#periodicitesEffectives":
    "teste si le rythme du texte est CONNU (fixtures sans périodicité), puis passe par periodiciteEffective",
};

type Constat = { cle: string; ou: string; quoi: string };

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

function nomEnglobant(n: ts.Node): string {
  for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
    if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)) && p.name) {
      return p.name.getText();
    }
    if (
      (ts.isArrowFunction(p) || ts.isFunctionExpression(p)) &&
      ts.isVariableDeclaration(p.parent)
    ) {
      return p.parent.name.getText();
    }
  }
  return "(module)";
}

const lectures: Constat[] = [];
const passages: Constat[] = [];

beforeAll(() => {
  const chemin = ts.findConfigFile(RACINE, ts.sys.fileExists, "tsconfig.json");
  if (!chemin) throw new Error("tsconfig.json introuvable");
  const cfg = ts.parseJsonConfigFileContent(
    ts.readConfigFile(chemin, ts.sys.readFile).config,
    ts.sys,
    RACINE,
  );
  const programme = ts.createProgram(cfg.fileNames, cfg.options);
  const checker = programme.getTypeChecker();

  // La propriété est-elle CELLE d'`ObligationCommune` ? On copie le tableau :
  // `declarations` appartient au compilateur.
  const vientDObligation = (sym: ts.Symbol | undefined): boolean => {
    if (!sym) return false;
    const s = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
    return [...(s.declarations ?? [])].some((d) => {
      const alias = d.parent?.parent;
      return (
        !!alias &&
        ts.isTypeAliasDeclaration(alias) &&
        alias.name.text === "ObligationCommune"
      );
    });
  };

  for (const sf of programme.getSourceFiles()) {
    if (sf.isDeclarationFile || sf.fileName.includes("node_modules")) continue;
    const fichier = relative(RACINE, sf.fileName).split("\\").join("/");
    if (/\.test\.tsx?$/.test(fichier)) continue;
    const ou = (n: ts.Node) =>
      `${fichier}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;

    const visiter = (n: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(n) &&
        n.name.text === "periodicite" &&
        vientDObligation(checker.getSymbolAtLocation(n.name))
      ) {
        lectures.push({ cle: `${fichier}#${nomEnglobant(n)}`, ou: ou(n), quoi: n.getText() });
      }
      if (
        ts.isBindingElement(n) &&
        ts.isObjectBindingPattern(n.parent) &&
        (n.propertyName ?? n.name).getText() === "periodicite" &&
        vientDObligation(checker.getTypeAtLocation(n.parent).getProperty("periodicite"))
      ) {
        lectures.push({ cle: `${fichier}#${nomEnglobant(n)}`, ou: ou(n), quoi: "{ periodicite }" });
      }
      // Passage : une expression typée Obligation, posée là où le contexte
      // attend un type qui déclare SA propre `periodicite` — argument, attribut
      // ou spread JSX, propriété d'objet, retour, initialiseur annoté. Les deux
      // côtés débarrassés d'`undefined` : `X | undefined` n'a pas de propriété
      // (revue du 2026-10-08, `etatDuTitre`).
      if (
        (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n) || ts.isCallExpression(n)) &&
        !(ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n) &&
        vientDObligation(
          checker.getNonNullableType(checker.getTypeAtLocation(n)).getProperty("periodicite"),
        )
      ) {
        const attendu = checker.getContextualType(n as ts.Expression);
        const prop = attendu && checker.getNonNullableType(attendu).getProperty("periodicite");
        if (prop && !vientDObligation(prop)) {
          passages.push({
            cle: `${fichier}#${nomEnglobant(n)}`,
            ou: ou(n),
            quoi: n.getText().slice(0, 60),
          });
        }
      }
      ts.forEachChild(n, visiter);
    };
    visiter(sf);
  }
}, 120_000);

describe("garde des lectures brutes de `periodicite` (ADR-039)", () => {
  it("aucune lecture du rythme du texte hors des fonctions qui le veulent", () => {
    const horsListe = lectures
      .filter((l) => !(l.cle in LECTURES_AUTORISEES))
      .map((l) => `${l.ou}  ${l.quoi}  — lire periodiciteEffective(o), ou justifier ici`);
    expect(horsListe).toEqual([]);
  });

  it("aucune obligation passée à un type structurel qui déclare sa propre `periodicite`", () => {
    expect(
      passages.map((p) => `${p.ou}  ${p.quoi}  — typer le paramètre Pick<Obligation, …>`),
    ).toEqual([]);
  });

  it("aucune entrée anonyme : `#(module)` autoriserait toutes les lectures anonymes du fichier", () => {
    expect(Object.keys(LECTURES_AUTORISEES).filter((k) => k.endsWith("#(module)"))).toEqual([]);
  });

  it("chaque entrée de la liste sert encore (une liste périmée cache une lecture)", () => {
    const servies = new Set(lectures.map((l) => l.cle));
    expect(Object.keys(LECTURES_AUTORISEES).filter((k) => !servies.has(k))).toEqual([]);
  });

  it("le relevé voit à travers un Pick : `periodiciteEffective` y figure", () => {
    // Borne basse : si la détection cessait de remonter les types dérivés,
    // la première règle passerait au vert sans rien regarder.
    expect(
      lectures.some(
        (l) => l.cle === "src/lib/referentiels/conformite/rythme-retenu.ts#periodiciteEffective",
      ),
    ).toBe(true);
  });
});
