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
 * (`<EnTetePage item titre>`, lu par l'arbre syntaxique : un commentaire ne
 * compte pas) à ce que la table annonce pour son adresse.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { ITEMS_ILLUSTRES } from "./illustrations";
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
  const visiter = (n: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) &&
      n.tagName.getText() === "EnTetePage"
    ) {
      const titre = lire(n, "titre");
      trouves.push({
        item: lire(n, "item") as RepliSection["item"],
        ...(titre === undefined ? {} : { titre }),
      });
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
    const fautes = avecEnTete.flatMap((page) => {
      const attendus = new Set(entetes(page).map((e) => JSON.stringify(e)));
      const annonce = JSON.stringify(repliDeChargement(adresse(page)));
      return attendus.size === 1 && attendus.has(annonce)
        ? []
        : [`${adresse(page)} : en-tête ${[...attendus].join(" / ")}, repli ${annonce}`];
    });
    expect(fautes).toEqual([]);
  });

  it("une page sans en-tête de section (tableau de bord, fiche, formulaire) prend le repli neutre", () => {
    const fautes = pages
      .filter((p) => !avecEnTete.includes(p))
      .map(adresse)
      .filter((a) => repliDeChargement(a) !== null);
    expect(fautes).toEqual([]);
  });

  // Le repli montre toujours le panneau teinté : une page sans dessin n'en a
  // pas, et l'en-tête changerait de forme à son arrivée.
  it("chaque en-tête annoncé a son dessin, donc son panneau", () => {
    const sansDessin = avecEnTete
      .map((p) => repliDeChargement(adresse(p))?.item)
      .filter((item) => item && !ITEMS_ILLUSTRES.includes(item));
    expect(sansDessin).toEqual([]);
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
