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
import { ADRESSE_MANQUES_ANNONCES, ADRESSE_MATERIELS_NON_COUVERTS } from "./adresses";

const CHEMIN = "docs/couverture-declaree-du-produit.md";

/** Les deux adresses où une annonce a pu être déplacée le 2026-10-14. */
function estAdresseDeplacee(declareA: string): boolean {
  return declareA.includes("DESCRIPTION_CATEGORIE.") || declareA === ADRESSE_MATERIELS_NON_COUVERTS;
}

function documentCouverture(): string {
  return readFileSync(path.join(process.cwd(), CHEMIN), "utf8");
}

/**
 * Le titre de la section HORS CADRE (C45, 2026-09-27). Elle liste des
 * `obligation_manquante`, pas des `non_couvert` : ses références ne sont pas
 * des surnuméraires du § 3, elles ont leur propre égalité, tenue plus bas.
 */
const HORS_CADRE = "## 7. Hors cadre — couvert par la clause générale des mentions légales (à rédiger)";

/**
 * La section des manques entrés dans la cible le 2026-10-12, quand elle a cessé
 * d'être `CATEGORIES_COUVERTES` pour devenir ce que l'onboarding ne refuse pas.
 * ~~Ouverts, non classés : ni hors cadre, ni annoncés.~~ Classés le
 * 2026-10-13 par la propriétaire : encodés, annoncés ou hors cadre.
 */
const A_EVALUER = "## 8. Classés le 2026-10-13 — entrés dans la cible le 2026-10-12";

/**
 * 2026-10-16 — les manques nés de la lecture des chapitres de types d'ERP,
 * OUVERTS : ni encodés, ni annoncés, ni hors cadre, en attente de la décision
 * de la propriétaire. Même mécanisme que le § 8 du 2026-10-12 : le § 7 et
 * cette section, disjoints, font ensemble les `obligation_manquante` de la
 * cible. Quand la propriétaire aura tranché, chaque ligne sort d'ici.
 */
const OUVERTS_1016 = "## 9. À évaluer — lecture des chapitres de types d'ERP du 2026-10-16";

/** Le document sans ses sections hors cadre et à évaluer, et chacune seule. */
function decoupe(doc: string): {
  avant: string;
  horsCadre: string;
  aEvaluer: string;
  ouverts: string;
} {
  const i = doc.indexOf(HORS_CADRE);
  const j = doc.indexOf(A_EVALUER);
  const k = doc.indexOf(OUVERTS_1016);
  const finHorsCadre = j >= 0 ? j : k >= 0 ? k : doc.length;
  const finAEvaluer = k < 0 ? doc.length : k;
  return {
    avant: i < 0 ? doc : doc.slice(0, i),
    horsCadre: i < 0 ? "" : doc.slice(i, finHorsCadre),
    aEvaluer: j < 0 ? "" : doc.slice(j, finAEvaluer),
    ouverts: k < 0 ? "" : doc.slice(k),
  };
}

/**
 * Les références telles que le document doit les citer : entre accents graves,
 * la forme qu'il emploie pour toutes.
 *
 * On cherche la référence **exacte** entre délimiteurs, et non le texte nu :
 * « PE 3 » est un préfixe de « PE 30 », et une recherche par sous-chaîne
 * tiendrait le second pour une citation du premier.
 */
/** Les références de la première colonne d'un tableau du document. */
function refsDuTableau(section: string): string[] {
  return [...section.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
}

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
    // ~~La section hors cadre seule~~ jusqu'au 2026-10-12 : la cible redéfinie
    // (ce que l'onboarding ne refuse pas) y avait fait entrer quinze manques
    // non classés, tenus au § 8. ~~Hors cadre et à évaluer, disjoints~~ — le
    // 2026-10-13, la propriétaire les a classés : l'égalité revient au § 7 seul.
    // Décision de la propriétaire du 2026-09-27 : sur les quarante-deux, quinze
    // relèvent de la clause générale des mentions légales, et restent
    // `obligation_manquante`. La liste du document et celle du corpus ne
    // doivent diverger dans aucun sens : un article encodé ou annoncé depuis
    // qui y resterait promettrait une exclusion qui n'est plus ; un manque
    // de la cible entré depuis et absent d'ici ne serait couvert par rien.
    // [2026-10-16 : le § 9 rouvre le mécanisme du 2026-10-12 — dix-huit
    // manques de la lecture des chapitres de types, non classés. Le § 7 et le
    // § 9, DISJOINTS, font ensemble les manques de la cible.]
    const { horsCadre, ouverts } = decoupe(documentCouverture());
    expect(horsCadre, `${CHEMIN} n'a plus de section « ${HORS_CADRE} ».`).not.toBe("");
    const duCorpus = CORPUS.flatMap((c) =>
      c.articles.flatMap((a) =>
        a.statut === "obligation_manquante" && a.toucheLaCible ? [a.ref] : [],
      ),
    ).sort();
    const auSeptieme = refsDuTableau(horsCadre);
    const auNeuvieme = refsDuTableau(ouverts);
    expect(auSeptieme.filter((r) => auNeuvieme.includes(r))).toEqual([]);
    expect([...auSeptieme, ...auNeuvieme].sort()).toEqual(duCorpus);
  });

  it("2026-10-13 — chaque ligne du § 8 a reçu un sort que le corpus porte", () => {
    // Le § 8 dit, ligne par ligne, ce que la décision du 2026-10-13 a fait de
    // chaque manque. La garde lit le sort dans le CORPUS, pas dans la colonne
    // du document : encodé (`retenu`), annoncé (`non_couvert` à l'adresse de
    // la page) ou hors cadre (au § 7). Une ligne qui n'aurait aucun des trois
    // serait un manque de la cible resté ouvert, ce que la décision a fermé.
    const { horsCadre, aEvaluer } = decoupe(documentCouverture());
    expect(aEvaluer, `${CHEMIN} n'a plus de section « ${A_EVALUER} ».`).not.toBe("");
    const auSeptieme = new Set(refsDuTableau(horsCadre));
    const statut = new Map(
      CORPUS.flatMap((c) => c.articles.map((a) => [a.ref, a] as const)),
    );
    const sansSort = refsDuTableau(aEvaluer).filter((ref) => {
      const a = statut.get(ref);
      if (!a) return true;
      if (a.statut === "retenu") return false;
      if (a.statut === "non_couvert" && a.declareA === ADRESSE_MANQUES_ANNONCES) return false;
      // 2026-10-14 : les annonces du gaz et des escaliers mécaniques ont été
      // DÉPLACÉES vers l'aide de leur catégorie ou la liste des matériels non
      // couverts (décision de la propriétaire). Annoncé reste annoncé, à une
      // autre adresse visible — que `manques-annonces.test.ts` et
      // `materiels-non-couverts.test.ts` vérifient.
      if (a.statut === "non_couvert" && a.declareA && estAdresseDeplacee(a.declareA)) {
        return false;
      }
      return !auSeptieme.has(ref);
    });
    expect(sansSort).toEqual([]);
    expect(refsDuTableau(aEvaluer)).toHaveLength(15);
  });
});
