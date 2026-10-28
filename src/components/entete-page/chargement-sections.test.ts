/**
 * Chaque page attend sous le BON repli (plan performance, lot 3, 2026-10-28).
 *
 * Next montre, pendant le chargement d'une page, le `loading.tsx` le plus
 * proche en remontant ses dossiers. Deux fautes possibles, invisibles à la
 * lecture d'un seul fichier :
 *  - une page d'entrée dont le repli annonce une autre section (un
 *    copier-coller, ou une page déplacée) : le titre et la teinte changent
 *    à l'arrivée ;
 *  - une fiche ou un formulaire SANS repli propre, qui hérite de celui de sa
 *    liste : la fiche d'un équipement s'annoncerait « Équipements ».
 *
 * La garde balaie toutes les pages sous `etablissements/[id]` — une page
 * neuve y tombe sans inscription — et compare l'en-tête de la page
 * (`<EnTetePage item titre>`) au repli qui la couvre
 * (`<ChargementSection item titre>`), par l'arbre syntaxique : un
 * commentaire qui cite l'un ou l'autre ne compte pas.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const RACINE = path.resolve(__dirname, "../../app/etablissements/[id]");

type EnTete = { item: string; titre: string | null };

/** Les en-têtes rendus par un fichier : chaque `<Balise item="…" titre="…">`. */
function entetes(fichier: string, balise: string): EnTete[] {
  const source = ts.createSourceFile(
    fichier,
    readFileSync(fichier, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const trouves: EnTete[] = [];
  const lire = (el: ts.JsxOpeningLikeElement, nom: string) => {
    const attr = el.attributes.properties.find(
      (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === nom,
    );
    if (!attr) return null;
    const init = attr.initializer;
    // Une valeur calculée ne se compare pas : on la rend telle quelle, et
    // l'égalité échouera — à la garde d'être élargie, pas contournée.
    return init && ts.isStringLiteral(init) ? init.text : (init?.getText() ?? "");
  };
  const visiter = (n: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) &&
      n.tagName.getText() === balise
    ) {
      trouves.push({ item: lire(n, "item") ?? "", titre: lire(n, "titre") });
    }
    ts.forEachChild(n, visiter);
  };
  visiter(source);
  return trouves;
}

function pages(dossier: string, acc: string[] = []): string[] {
  for (const nom of readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) pages(chemin, acc);
    else if (nom === "page.tsx") acc.push(chemin);
  }
  return acc;
}

/** Le `loading.tsx` qui couvre une page : le plus proche en remontant. */
function repliDe(page: string): string | null {
  let dossier = path.dirname(page);
  for (;;) {
    const repli = path.join(dossier, "loading.tsx");
    if (existsSync(repli)) return repli;
    if (dossier === RACINE) return null;
    dossier = path.dirname(dossier);
  }
}

const relatif = (f: string) => path.relative(RACINE, f);

describe("chaque page attend sous le repli de son propre en-tête", () => {
  const toutes = pages(RACINE).sort();
  const avecEnTete = toutes.filter((p) => entetes(p, "EnTetePage").length > 0);

  it("balaie bien les pages (borne basse)", () => {
    expect(toutes.length).toBeGreaterThanOrEqual(45);
    expect(avecEnTete.length).toBeGreaterThanOrEqual(22);
  });

  it("une page d'entrée attend sous un repli qui porte son en-tête", () => {
    const fautes = avecEnTete.flatMap((page) => {
      const attendus = new Set(
        entetes(page, "EnTetePage").map((e) => JSON.stringify(e)),
      );
      const repli = repliDe(page);
      const rendus = repli ? entetes(repli, "ChargementSection") : [];
      const rendu = rendus.length === 1 ? JSON.stringify(rendus[0]) : null;
      return attendus.size === 1 && rendu && attendus.has(rendu)
        ? []
        : [`${relatif(page)} : en-tête ${[...attendus].join(" / ")}, repli ${repli ? relatif(repli) : "aucun"} → ${rendus.map((r) => JSON.stringify(r)).join(" / ") || "neutre"}`];
    });
    expect(fautes).toEqual([]);
  });

  it("une fiche ou un formulaire n'hérite pas du repli d'une section", () => {
    const fautes = toutes
      .filter((p) => !avecEnTete.includes(p))
      .flatMap((page) => {
        const repli = repliDe(page);
        return repli && entetes(repli, "ChargementSection").length > 0
          ? [`${relatif(page)} → ${relatif(repli)}`]
          : [];
      });
    expect(fautes).toEqual([]);
  });
});
