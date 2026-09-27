// L'article cité sous une ligne de « Ce qui doit être en place » (écran et
// widget), et son texte.
//
// `extraits-affiches.test.ts` confronte les extraits ÉCRITS dans le source ;
// celui-ci est calculé, et la garde du source l'inscrit parmi ses expressions
// « confrontées ailleurs ». C'est ici : pour chaque obligation que l'écran
// peut lister, la pastille nomme l'article dont elle montre le texte, et ce
// texte est la `citationCle` du corpus, mot pour mot.
//
// CE QUE LA GARDE NE PROUVE PAS : que la `citationCle` est juste (elle se relit
// sur Légifrance), ni que l'article en tête des références est le plus
// parlant — c'est l'ordre du référentiel, que ce module ne juge pas.

import { describe, expect, it } from "vitest";
import {
  obligationsConformite,
  type Obligation,
} from "@/lib/referentiels/conformite";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import { figureSurLEcranEnPlace } from "./regle";
import { fondementDe, referenceNommeLArticle } from "./fondement";

const SUR_L_ECRAN = obligationsConformite.filter(figureSurLEcranEnPlace);
const INDEX = indexArticlesParRef();

describe("l'article cité sous une ligne « Ce qui doit être en place »", () => {
  it("le relevé voit les lignes de l'écran — sinon ce test ne contrôle rien", () => {
    // Borne basse, pas un compte : 40 obligations au 2026-09-27.
    expect(SUR_L_ECRAN.length).toBeGreaterThanOrEqual(30);
  });

  it.each(SUR_L_ECRAN.map((o) => [o.id, o] as const))(
    "%s : la pastille nomme l'article dont elle montre le texte",
    (_id, o) => {
      const f = fondementDe(o);
      const r = o.referencesLegales[0];
      expect(f, "une obligation de l'écran sans référence").not.toBeNull();
      expect(f!.reference).toBe(r.reference);
      if (f!.extrait === null) return;
      // L'article dont on montre le texte est celui que la pastille nomme.
      expect(r.article, "un extrait sans clé d'article").toBeTruthy();
      expect(referenceNommeLArticle(r.reference, r.article!)).toBe(true);
      const lu = INDEX.get(r.article!);
      expect(lu?.article.statut).not.toBe("non_depouille");
      // Le texte entier, pas un morceau choisi : rien n'est recomposé, donc
      // rien ne peut s'écarter du verbatim.
      expect(f!.extrait).toBe(lu!.article.citationCle);
    },
  );

  it("un article absent du corpus n'invente pas de citation", () => {
    const o = SUR_L_ECRAN[0];
    const sansCorpus: Obligation = {
      ...o,
      referencesLegales: [{ ...o.referencesLegales[0], article: "R. 9999-99" }],
    } as Obligation;
    expect(fondementDe(sansCorpus)?.extrait).toBeNull();
  });

  it("une pastille qui nomme un intervalle ne montre pas le texte d'un seul de ses articles", () => {
    // Le cas qui a fait écrire `referenceNommeLArticle` (2026-09-27).
    expect(referenceNommeLArticle("R. 4544-9 à R. 4544-11", "R. 4544-10")).toBe(false);
    expect(referenceNommeLArticle("R. 4544-11", "R. 4544-1")).toBe(false);
    // Et les formes de clé qui ne sont pas celles de la référence passent.
    expect(
      referenceNommeLArticle("Arrêté du 31 janvier 1986, art. 103 (registre)", "Arrêté 1986-01-31 art. 103"),
    ).toBe(true);
    expect(referenceNommeLArticle("CCH, art. R. 134-6 et R. 134-7", "CCH R. 134-6")).toBe(true);
    const intervalle = obligationsConformite.find(
      (o) => o.id === "elec-travail-habilitation-personnel",
    );
    if (intervalle) expect(fondementDe(intervalle)?.extrait).toBeNull();
  });

  it("le CSE et le règlement intérieur citent leur texte — le constat de C40", () => {
    // Les deux lignes que le guide nommait en disant qu'elles ne citaient
    // rien. Borne sur la présence, pas sur la phrase : celle-ci est au corpus.
    const cites = SUR_L_ECRAN.filter((o) => fondementDe(o)?.extrait).map(
      (o) => o.id,
    );
    expect(cites.some((id) => /cse/.test(id))).toBe(true);
    expect(cites.some((id) => /reglement-interieur/.test(id))).toBe(true);
  });
});
