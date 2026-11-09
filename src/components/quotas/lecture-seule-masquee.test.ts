// Ce qui mène à une écriture est masqué au membre en lecture seule (ADR-054
// § 4, décision de la propriétaire du 2026-11-09) : la garde relit le code.
//
// 1. Tout lien (`<Link>`, `<a>`) dont l'adresse mène à une page de création,
//    de modification ou d'import porte `data-ecriture`, sauf exception
//    FERMÉE, avec son motif — une exception qui ne désigne plus rien fait
//    échouer le test.
// 2. Chaque page qui porte la gélule du compte, ou ferme la saisie, rend la marque
//    (`MarqueLectureSeule`), et la feuille de style masque `data-ecriture`
//    sous elle.
//
// LIMITE : la garde lit l'adresse écrite dans la balise. Un lien dont
// l'adresse vient d'une variable ou d'une fonction (`href={lien}`), et les
// boutons qui ouvrent un panneau, ne se reconnaissent pas au texte : ils ont
// été marqués à l'inventaire du 2026-11-09, et un ajout se marque à la main.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const RACINE = process.cwd();
const SRC = join(RACINE, "src");

/** Une adresse qui mène à une page d'écriture. */
const VERS_UNE_ECRITURE = /\/(nouveau|modifier|importer)\b/;

/** Fichiers hors du dossier d'un compte, où la lecture seule n'existe pas. */
const HORS_PERIMETRE = [/^src\/components\/landing\//, /^src\/app\/onboarding\//, /^src\/app\/\(public\)\//];

/** Liens vers une écriture laissés visibles, chacun avec son motif. Clé : `fichier:adresse`. */
const EXCEPTIONS: Record<string, string> = {};

function fichiersTsx(): string[] {
  return execFileSync("git", ["ls-files", "src/**/*.tsx"], { cwd: RACINE, encoding: "utf8" })
    .split("\n")
    .filter((f) => f && !f.includes(".test.") && !HORS_PERIMETRE.some((r) => r.test(f)));
}

type Lien = { fichier: string; ligne: number; href: string; marque: boolean };

function liensVersUneEcriture(fichier: string): Lien[] {
  const texte = readFileSync(join(RACINE, fichier), "utf8");
  const source = ts.createSourceFile(fichier, texte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const liens: Lien[] = [];
  const visiter = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const nom = n.tagName.getText(source);
      if (nom === "Link" || nom === "a") {
        const attributs = n.attributes.properties.filter(ts.isJsxAttribute);
        const href = attributs.find((a) => a.name.getText(source) === "href");
        const valeur = href?.initializer?.getText(source) ?? "";
        if (VERS_UNE_ECRITURE.test(valeur))
          liens.push({
            fichier,
            ligne: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1,
            href: valeur,
            marque: attributs.some((a) => a.name.getText(source) === "data-ecriture"),
          });
      }
    }
    ts.forEachChild(n, visiter);
  };
  visiter(source);
  return liens;
}

describe("lecture seule : ce qui mène à une écriture est masqué", () => {
  const liens = fichiersTsx().flatMap(liensVersUneEcriture);

  it("tout lien vers une page de création, de modification ou d'import porte data-ecriture", () => {
    const nonMarques = liens
      .filter((l) => !l.marque && !(`${l.fichier}:${l.href}` in EXCEPTIONS))
      .map((l) => `${l.fichier}:${l.ligne} ${l.href}`);
    expect(nonMarques).toEqual([]);
  });

  it("chaque exception désigne encore un lien non marqué", () => {
    const presents = new Set(liens.filter((l) => !l.marque).map((l) => `${l.fichier}:${l.href}`));
    expect(Object.keys(EXCEPTIONS).filter((k) => !presents.has(k))).toEqual([]);
  });

  it("la garde voit des liens : elle ne passe pas à vide", () => {
    expect(liens.length).toBeGreaterThan(10);
  });

  it("chaque page qui porte la gélule du compte, ou ferme la saisie, rend la marque de la lecture seule", () => {
    const avecGelule = fichiersTsx().filter(
      (f) => f.startsWith("src/app/") && /<(BarreCompte|SaisieDuSite)\b/.test(readFileSync(join(RACINE, f), "utf8")),
    );
    expect(avecGelule.length).toBeGreaterThan(0);
    for (const f of avecGelule) expect(readFileSync(join(RACINE, f), "utf8"), f).toMatch(/<MarqueLectureSeule \/>/);
  });

  it("la feuille de style masque data-ecriture sous la marque", () => {
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    expect(css).toMatch(/body:has\(\[data-lecture-seule\]\) \[data-ecriture\] \{\s*display: none !important;/);
    expect(css).toMatch(/body:has\(\[data-lecture-seule\]\) \[data-ecriture-inerte\] \{\s*pointer-events: none;/);
  });
});
