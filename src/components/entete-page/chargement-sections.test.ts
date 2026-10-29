/**
 * Chaque page attend sous le BON repli (plan performance, lot 3, 2026-10-28).
 *
 * Le repli de `etablissements/[id]/loading.tsx` choisit son en-tête sur
 * l'adresse (`repliDeChargement`). Deux fautes possibles, invisibles à la
 * lecture d'un seul fichier :
 *  - une page d'entrée que la table annonce sous une autre section, ou pas du
 *    tout (une page neuve, une page déplacée) : le titre et la teinte
 *    changent à l'arrivée ;
 *  - une fiche ou un formulaire annoncé sous l'en-tête d'une section : la
 *    fiche d'un équipement s'annoncerait « Équipements ».
 *
 * La garde balaie toutes les pages sous `etablissements/[id]` — une page
 * neuve y tombe sans inscription — et compare l'en-tête de la page
 * (`<EnTetePage item titre>` et sa bascule, lus par l'arbre syntaxique : un commentaire ne
 * compte pas) à ce que la table annonce pour son adresse.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { repliDeChargement, type RepliSection } from "./repli-de-chargement";

const RACINE = path.resolve(__dirname, "../../app/etablissements/[id]");

/** Les en-têtes rendus par une page : chaque `<EnTetePage item="…" titre="…">`. */
function entetes(fichier: string): RepliSection[] {
  const source = ts.createSourceFile(
    fichier,
    readFileSync(fichier, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const trouves: RepliSection[] = [];
  const lire = (el: ts.JsxOpeningLikeElement, nom: string) => {
    const attr = el.attributes.properties.find(
      (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === nom,
    );
    const init = attr?.initializer;
    if (!init) return undefined;
    // Une valeur calculée ne se compare pas : on la rend telle quelle, et
    // l'égalité échouera — à la garde d'être élargie, pas contournée.
    return ts.isStringLiteral(init) ? init.text : init.getText();
  };
  // `toEqual` ignore les clés `undefined` : pas de titre, pas de bascule,
  // c'est la même chose que des clés absentes dans la table.
  const noter = (el: ts.JsxOpeningLikeElement, bascule: boolean) =>
    trouves.push({
      item: lire(el, "item") as RepliSection["item"],
      titre: lire(el, "titre"),
      bascule: bascule || undefined,
    });
  const visiter = (n: ts.Node) => {
    // Des enfants à l'en-tête, c'est sa bascule de vue (`EnTetePage`).
    if (ts.isJsxElement(n) && n.openingElement.tagName.getText() === "EnTetePage") {
      noter(
        n.openingElement,
        n.children.some((c) => !(ts.isJsxText(c) && !c.text.trim())),
      );
    } else if (ts.isJsxSelfClosingElement(n) && n.tagName.getText() === "EnTetePage") {
      noter(n, false);
    }
    ts.forEachChild(n, visiter);
  };
  visiter(source);
  return trouves;
}

function fichiers(dossier: string, nom: string, acc: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    const chemin = path.join(dossier, entree);
    if (statSync(chemin).isDirectory()) fichiers(chemin, nom, acc);
    else if (entree === nom) acc.push(chemin);
  }
  return acc;
}

/** L'adresse servie par une page : `equipements/[equipementId]/page.tsx`
 *  → `/etablissements/e1/equipements/x`. */
const adresse = (page: string) => {
  const dossier = path.relative(RACINE, path.dirname(page));
  const suite = dossier
    .split(path.sep)
    .filter(Boolean)
    .map((s) => (s.startsWith("[") ? "x" : s));
  return ["", "etablissements", "e1", ...suite].join("/");
};

describe("chaque page attend sous le repli de son propre en-tête", () => {
  const pages = fichiers(RACINE, "page.tsx").sort();
  const avecEnTete = pages.filter((p) => entetes(p).length > 0);

  it("balaie bien les pages (borne basse)", () => {
    expect(pages.length).toBeGreaterThanOrEqual(45);
    expect(avecEnTete.length).toBeGreaterThanOrEqual(22);
  });

  it("une page d'entrée est annoncée sous son en-tête", () => {
    // Chaque en-tête de la page (l'accessibilité en rend deux, un par
    // branche) face à ce que la table annonce pour son adresse.
    const lu = avecEnTete.map((page) => [adresse(page), entetes(page)]);
    const annonce = avecEnTete.map((page) => [
      adresse(page),
      entetes(page).map(() => repliDeChargement(adresse(page), "e1")),
    ]);
    expect(annonce).toEqual(lu);
  });

  it("une page sans en-tête de section (tableau de bord, fiche, formulaire) prend le repli neutre", () => {
    const fautes = pages
      .filter((p) => !avecEnTete.includes(p))
      .map(adresse)
      .filter((a) => repliDeChargement(a, "e1") !== null);
    expect(fautes).toEqual([]);
  });

  // Un `loading.tsx` dans le dossier d'une page est rattaché par Next à une
  // clé qui contient les paramètres d'URL : il remplacerait la page par son
  // squelette à chaque filtre (voir `etablissements/[id]/loading.tsx`).
  it("un seul repli, à la racine de l'établissement", () => {
    expect(fichiers(RACINE, "loading.tsx").map((f) => path.relative(RACINE, f))).toEqual([
      "loading.tsx",
    ]);
  });
});
