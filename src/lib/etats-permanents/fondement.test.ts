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
    // Borne basse, pas un compte : 53 obligations au 2026-09-27.
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

  it("une pastille qui nomme plusieurs articles ne montre le texte d'aucun (M1)", () => {
    // Les cas relevés : un intervalle, une conjonction, un « art. » de code.
    expect(referenceNommeLArticle("R. 4544-9 à R. 4544-11", "R. 4544-10")).toBe(false);
    expect(referenceNommeLArticle("R. 4323-1 à R. 4323-5", "R. 4323-1")).toBe(false);
    expect(referenceNommeLArticle("R. 4224-12 et R. 4224-13", "R. 4224-13")).toBe(false);
    expect(referenceNommeLArticle("CCH, art. R. 134-6 et R. 134-7", "CCH R. 134-6")).toBe(false);
    expect(referenceNommeLArticle("Arrêté du 1er août 2006, art. 12 à 15", "Arrêté 2006-08-01 art. 12")).toBe(false);
    expect(referenceNommeLArticle("R. 4544-11", "R. 4544-1")).toBe(false);
  });

  it("une pastille qui nomme l'article seul le cite, quelle que soit la forme de la clé", () => {
    expect(referenceNommeLArticle("R. 4323-56, alinéa 2 (attestation médicale)", "R. 4323-56")).toBe(true);
    expect(
      referenceNommeLArticle("Arrêté du 31 janvier 1986, art. 103 (registre)", "Arrêté 1986-01-31 art. 103"),
    ).toBe(true);
    expect(referenceNommeLArticle("CCH, art. R. 134-6 (contrat d'entretien)", "CCH R. 134-6")).toBe(true);
    expect(referenceNommeLArticle("Arrêté du 25 juin 1980, art. MS 38 § 4", "MS 38")).toBe(true);
  });

  it.each([
    "elec-travail-habilitation-personnel",
    "esp-personnel-formation",
    "porte-auto-maintien-en-etat",
    "ascenseur-entretien-contrat",
  ])("%s : plusieurs articles nommés, aucun texte montré", (id) => {
    const o = obligationsConformite.find((x) => x.id === id);
    expect(o, `${id} a quitté le référentiel`).toBeDefined();
    expect(fondementDe(o!)?.extrait).toBeNull();
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
