// Le document de couverture cite-t-il encore les bons articles ?
//
// `docs/couverture-declaree-du-produit.md` a remplacé une surface **vivante**
// — une carte du tableau de bord, recalculée à chaque rendu — par une surface
// **figée**. Il porte donc une liste vraie aujourd'hui et fausse le jour où le
// corpus bouge, sans que rien ne le signale. Un document de référence qui se
// périme en silence est pire qu'un document absent : on s'y fie.
//
// Ce test est du même genre que `frontiere-medicale.test.ts` et
// `portee.test.ts`, qui lisent déjà le texte source de `src/` et échouent sur
// des motifs interdits. Ici la cible est de la prose, mais la garantie porte
// sur des **références**, pas sur des phrases : une reformulation ne doit pas
// le casser, l'ajout ou le retrait d'un article, si.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORPUS, articlesNonCouverts } from "./index";

const CHEMIN = "docs/couverture-declaree-du-produit.md";

function documentCouverture(): string {
  return readFileSync(path.join(process.cwd(), CHEMIN), "utf8");
}

/**
 * Le titre de la section HORS CADRE (C45, 2026-09-27). Elle liste des
 * `obligation_manquante`, pas des `non_couvert` : ses références ne sont pas
 * des surnuméraires du § 3, elles ont leur propre égalité, tenue plus bas.
 */
const HORS_CADRE = "## 7. Hors cadre — couvert par la clause générale des mentions légales (à rédiger)";

/** Le document sans sa section hors cadre, et la section seule. */
function decoupe(doc: string): { avant: string; horsCadre: string } {
  const i = doc.indexOf(HORS_CADRE);
  return i < 0
    ? { avant: doc, horsCadre: "" }
    : { avant: doc.slice(0, i), horsCadre: doc.slice(i) };
}

/**
 * Les références telles que le document doit les citer : entre accents graves,
 * la forme qu'il emploie pour toutes.
 *
 * On cherche la référence **exacte** entre délimiteurs, et non le texte nu :
 * « PE 3 » est un préfixe de « PE 30 », et une recherche par sous-chaîne
 * tiendrait le second pour une citation du premier.
 */
function citeLaRef(doc: string, ref: string): boolean {
  return doc.includes(`\`${ref}\``);
}

describe(`${CHEMIN} — la liste ne se périme pas en silence`, () => {
  it("cite chacun des articles que le corpus déclare non couverts", () => {
    const doc = documentCouverture();
    const manquantes = articlesNonCouverts()
      .map((a) => a.ref)
      .filter((ref) => !citeLaRef(doc, ref));

    expect(
      manquantes,
      manquantes.length === 0
        ? ""
        : `Le corpus déclare ${articlesNonCouverts().length} articles ` +
          `\`non_couvert\`, et ${CHEMIN} n'en cite pas ${manquantes.length} : ` +
          `${manquantes.map((r) => `« ${r} »`).join(", ")}. ` +
          `Ajoutez-les au § 3 du document, dans la famille qui convient, avec ` +
          `le motif du corpus cité tel quel — un motif réécrit vieillit à part ` +
          `de sa source.`,
    ).toEqual([]);
  });

  it("ne cite aucun article que le corpus ne déclare plus", () => {
    // L'autre sens, et il compte autant : un article couvert depuis, ou
    // requalifié en `obligation_manquante`, laisserait le document affirmer
    // un manque qui n'existe plus. C'est la moitié qu'on oublie.
    // Hors de la section hors cadre (C45), qui a sa propre garde ci-dessous.
    const doc = decoupe(documentCouverture()).avant;
    const declarees = new Set(articlesNonCouverts().map((a) => a.ref));

    // Les références du document : tout ce qui ressemble à une référence
    // d'article entre accents graves. On ne ratisse pas les identifiants de
    // code (`typeErp`, `familles.ts`…), d'où l'ancrage sur la forme
    // « LETTRES chiffre » ou « Arrêté … ».
    const citees = [...doc.matchAll(/`([A-Z]{2}\s\d+[^`]*|Arrêté[^`]+)`/g)].map(
      (m) => m[1],
    );

    const surnumeraires = [...new Set(citees)].filter(
      (ref) => !declarees.has(ref),
    );

    expect(
      surnumeraires,
      surnumeraires.length === 0
        ? ""
        : `${CHEMIN} cite ${surnumeraires.length} référence(s) que le corpus ` +
          `ne déclare plus \`non_couvert\` : ` +
          `${surnumeraires.map((r) => `« ${r} »`).join(", ")}. ` +
          `Soit l'article a été couvert depuis — retirez-le du § 3 et dites-le ` +
          `au § 3 bis —, soit la référence est mal orthographiée dans le ` +
          `document.`,
    ).toEqual([]);
  });

  it("annonce le bon nombre d'articles", () => {
    // Le document répète « 27 » dans son titre de section et dans sa prose.
    // Un compte faux dans un document de référence est plus trompeur qu'une
    // liste incomplète : on lit le chiffre, pas la liste.
    const n = articlesNonCouverts().length;
    const doc = documentCouverture();
    expect(
      doc.includes(`## 3. Les ${n} articles lus et non portés`),
      `Le corpus déclare ${n} articles \`non_couvert\`, et le titre du § 3 de ` +
        `${CHEMIN} en annonce un autre nombre. Mettez-le à jour, ainsi que les ` +
        `autres occurrences du chiffre dans le document.`,
    ).toBe(true);
  });

  it("C45 — la section hors cadre liste exactement les obligations manquantes qui touchent la cible", () => {
    // Décision de la propriétaire du 2026-09-27 : sur les quarante-deux, quinze
    // relèvent de la clause générale des mentions légales, et restent
    // `obligation_manquante`. La liste du document et celle du corpus ne
    // doivent diverger dans aucun sens : un article encodé ou annoncé depuis
    // qui y resterait promettrait une exclusion qui n'est plus ; un manque
    // de la cible entré depuis et absent d'ici ne serait couvert par rien.
    const { horsCadre } = decoupe(documentCouverture());
    expect(horsCadre, `${CHEMIN} n'a plus de section « ${HORS_CADRE} ».`).not.toBe("");
    const listees = [...horsCadre.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]).sort();
    const duCorpus = CORPUS.flatMap((c) =>
      c.articles.flatMap((a) =>
        a.statut === "obligation_manquante" && a.toucheLaCible ? [a.ref] : [],
      ),
    ).sort();
    expect(listees).toEqual(duCorpus);
  });
});
