// Garde-fou 1 (décision de la propriétaire du 2026-10-17) : la table des
// matières de Légifrance et le corpus disent-ils la même chose, chapitre par
// chapitre ?
//
// Le cas qui l'a fait naître. Le 2026-10-16, une lecture a classé les
// chapitres de types du livre II, titre II, et écrit que le titre Ier était
// « construction ou dotation ». Le corpus du titre Ier n'en portait que 39
// articles sur 313 : l'affirmation n'avait de trace pour aucun des 274 autres,
// et aucun test ne pouvait le voir, parce que le corpus était `articles_cites`
// et ne prétendait rien. Un corpus `integral` le prétend ; ce test le fait
// prouver contre la donnée officielle (`table-des-matieres-1980.ts`).
//
// Ce qu'il vérifie, et ce qu'il ne vérifie pas. Il compare des ENSEMBLES DE
// NUMÉROS : un article de la table absent du corpus, ou une entrée du corpus
// qu'aucun article de la table ne porte, le font échouer. Il ne dit rien du
// classement de chaque article — c'est l'affaire de la lecture et de
// `pnpm legifrance:verifier`. La table elle-même vient du bac à sable PISTE ;
// son égalité avec la production n'est pas vérifiée.

import { describe, expect, it } from "vitest";
import { ARRETE_1980_LIVRE_2 } from "./arrete-1980-livre-2";
import { ARRETE_1980_LIVRE_2_TITRE_2 } from "./arrete-1980-livre-2-titre-2";
import { CHAPITRES_LIVRE_2, type ChapitreTable } from "./table-des-matieres-1980";
import type { ArticleDepouille, Corpus } from "./types";

/**
 * Les chapitres que la table liste et que le corpus ne porte pas ENCORE.
 * Chacun est une dette nommée, pas une exception : le test exige qu'un
 * chapitre listé ici n'ait AUCUNE entrée au corpus, de sorte qu'on ne puisse
 * pas l'y laisser après l'avoir lu.
 *
 * - `L` (2026-10-17) : lu le 2026-10-16 (`propositions/lecture-chapitre-L-2026-10-16.md`),
 *   entre au corpus avec le sous-lot G du plan « mise à jour du référentiel ».
 */
const CHAPITRES_PAS_ENCORE_AU_CORPUS = ["L"] as const;

function corpusDuTitre(titre: ChapitreTable["titre"]): Corpus {
  return titre === "I" ? ARRETE_1980_LIVRE_2 : ARRETE_1980_LIVRE_2_TITRE_2;
}

/**
 * Le numéro d'article d'une entrée : une entrée qui ne classe qu'un paragraphe
 * (« MS 58 § 3 et § 4 — … », « MS 69 — stock … ») vaut pour son article.
 */
function articleDe(ref: string): string {
  return ref.split(/\s+§|\s+—/)[0].trim();
}

function chapitreDe(ref: string): string {
  return ref.split(" ")[0];
}

function entreesDuChapitre(c: Corpus, chapitre: string): ArticleDepouille[] {
  return c.articles.filter((a) => chapitreDe(a.ref) === chapitre);
}

/** Écart entre la table et le corpus pour un chapitre — vide si égaux. */
function ecartChapitre(
  ch: ChapitreTable,
  entrees: readonly Pick<ArticleDepouille, "ref">[],
): { absentsDuCorpus: string[]; inconnusDeLaTable: string[] } {
  const table = new Set(ch.articles.map((a) => a.ref));
  const exactes = new Set(entrees.map((e) => e.ref));
  return {
    // Chaque article de la table a une entrée qui le classe EN ENTIER.
    absentsDuCorpus: [...table].filter((r) => !exactes.has(r)),
    // Chaque entrée du corpus désigne un article de la table.
    inconnusDeLaTable: [...new Set(entrees.map((e) => articleDe(e.ref)))].filter((r) => !table.has(r)),
  };
}

describe("garde-fou 1 — table des matières ↔ corpus, chapitre par chapitre", () => {
  const aComparer = CHAPITRES_LIVRE_2.filter(
    (c) => !(CHAPITRES_PAS_ENCORE_AU_CORPUS as readonly string[]).includes(c.chapitre),
  );

  it.each(aComparer.map((c) => [`${c.titre} — ${c.chapitre}`, c] as const))(
    "chapitre %s : mêmes articles à la table et au corpus",
    (_nom, ch) => {
      const ecart = ecartChapitre(ch, entreesDuChapitre(corpusDuTitre(ch.titre), ch.chapitre));
      expect(ecart).toEqual({ absentsDuCorpus: [], inconnusDeLaTable: [] });
    },
  );

  it("un chapitre « pas encore au corpus » n'y a aucune entrée", () => {
    for (const chapitre of CHAPITRES_PAS_ENCORE_AU_CORPUS) {
      const ch = CHAPITRES_LIVRE_2.find((c) => c.chapitre === chapitre);
      expect(ch, `${chapitre} n'est pas un chapitre de la table`).toBeDefined();
      expect(entreesDuChapitre(corpusDuTitre(ch!.titre), chapitre).map((a) => a.ref)).toEqual([]);
    }
  });

  it("aucune entrée des deux corpus n'appartient à un chapitre inconnu de la table", () => {
    for (const titre of ["I", "II"] as const) {
      const connus = new Set(CHAPITRES_LIVRE_2.filter((c) => c.titre === titre).map((c) => c.chapitre));
      const egares = corpusDuTitre(titre).articles.map((a) => a.ref).filter((r) => !connus.has(chapitreDe(r)));
      expect(egares, `titre ${titre}`).toEqual([]);
    }
  });

  it("un article abrogé à la table est classé « sans objet » au corpus, son texte abrogeant nommé", () => {
    const mal: string[] = [];
    for (const ch of CHAPITRES_LIVRE_2) {
      for (const a of ch.articles.filter((x) => x.etat === "ABROGE")) {
        const e = corpusDuTitre(ch.titre).articles.find((x) => x.ref === a.ref);
        if (e && e.statut !== "sans_objet") mal.push(`${a.ref} : ${e.statut}`);
        // 2026-10-17 (revue) : le texte abrogeant est nommé — c'est ce que
        // \`legifrance:verifier\` lit pour ne plus compter l'abrogé comme un écart.
        if (e && !e.modifiePar) mal.push(`${a.ref} : texte abrogeant non nommé (modifiePar)`);
      }
    }
    expect(mal).toEqual([]);
  });

  it("les deux corpus se disent intégraux, sans article non dépouillé", () => {
    for (const c of [ARRETE_1980_LIVRE_2, ARRETE_1980_LIVRE_2_TITRE_2]) {
      expect(c.etendue, c.id).toBe("integral");
      expect(c.articles.filter((a) => a.statut === "non_depouille").map((a) => a.ref), c.id).toEqual([]);
    }
  });

  // La comparaison voit-elle vraiment un écart ? Sur une copie du chapitre CO.
  describe("cassures", () => {
    const co = CHAPITRES_LIVRE_2.find((c) => c.chapitre === "CO")!;
    const entrees = co.articles.map((a) => ({ ref: a.ref }));

    it("un article retiré du corpus (CO 12) est vu", () => {
      const ecart = ecartChapitre(co, entrees.filter((e) => e.ref !== "CO 12"));
      expect(ecart.absentsDuCorpus).toEqual(["CO 12"]);
    });

    it("une entrée qu'aucun article ne porte (CO 99) est vue", () => {
      const ecart = ecartChapitre(co, [...entrees, { ref: "CO 99" }]);
      expect(ecart.inconnusDeLaTable).toEqual(["CO 99"]);
    });

    it("un paragraphe classé seul ne tient pas lieu de son article", () => {
      const ecart = ecartChapitre(co, [
        ...entrees.filter((e) => e.ref !== "CO 48"),
        { ref: "CO 48 § 3 e) — contrat d'entretien des portes automatiques" },
      ]);
      expect(ecart).toEqual({ absentsDuCorpus: ["CO 48"], inconnusDeLaTable: [] });
    });
  });
});
