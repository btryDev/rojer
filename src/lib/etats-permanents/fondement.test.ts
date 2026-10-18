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
import { contexteFondementDe, fondementDe, referenceNommeLArticle } from "./fondement";
import type { CategorieErp, TypeErp } from "@/lib/referentiels/types-communs";

/** Un contexte d'ERP, fabriqué par la seule voie permise. */
const ctx = (
  typeErp: TypeErp | null,
  categorieErp: CategorieErp | null,
  typesErpAutres: TypeErp[] = [],
) => contexteFondementDe({ estERP: typeErp !== null, typeErp, typesErpAutres, categorieErp });

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
    // ~~"esp-personnel-formation"~~ — retirée le 2026-10-07 (périmètre,
    // relecture préventeur du 30/09, décision de la propriétaire du 07/10).
    // ~~"porte-auto-maintien-en-etat"~~ — 2026-10-18 : ses références sont
    // séparées, R. 4224-12 en tête, entré au corpus ; la ligne montre son
    // texte (test plus bas).
    "ascenseur-entretien-contrat",
  ])("%s : plusieurs articles nommés, aucun texte montré", (id) => {
    const o = obligationsConformite.find((x) => x.id === id);
    expect(o, `${id} a quitté le référentiel`).toBeDefined();
    expect(fondementDe(o!)?.extrait).toBeNull();
  });

  it("porte-auto-maintien-en-etat montre R. 4224-12, le texte que sa description cite (2026-10-18)", () => {
    const o = obligationsConformite.find((x) => x.id === "porte-auto-maintien-en-etat")!;
    expect(fondementDe(o)?.extrait).toMatch(/^Les portes et portails sont entretenus et contrôlés régulièrement\./);
    expect(o.description).toContain("« entretenus et contrôlés régulièrement » (R. 4224-12)");
    expect(o.description).not.toContain("maintenus en bon état de fonctionnement");
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

describe("livre II, titre II — l'article affiché est celui du type de l'établissement (2026-10-14)", () => {
  const ob = (id: string) => obligationsConformite.find((o) => o.id === id)!;
  const PERSONNEL = ob("incendie-erp-personnel-designe-moyens-secours");
  const FUMER = ob("incendie-erp-interdiction-fumer-affichee");
  const CONSIGNE = ob("incendie-travail-consigne-affichee");

  it.each([
    ["N", "N 17"],
    ["M", "M 29"],
    ["O", "O 18"],
    ["W", "W 13"],
  ] as const)("personnel désigné, type %s : %s", (type, article) => {
    const f = fondementDe(PERSONNEL, ctx(type, "N3"))!;
    expect(f.reference).toContain(`art. ${article}`);
    // Le texte montré est celui de cet article, au corpus.
    expect(f.extrait).toBe(INDEX.get(article)?.article.citationCle);
  });

  it.each([
    ["M", "M 44"],
    ["O", "O 21"],
    ["W", "W 16"],
  ] as const)("interdiction de fumer, type %s : %s", (type, article) => {
    const f = fondementDe(FUMER, ctx(type, "N4"))!;
    expect(f.reference).toContain(`art. ${article}`);
  });

  it("sans contexte, la règle d'avant : le premier article", () => {
    expect(fondementDe(PERSONNEL)!.reference).toBe(PERSONNEL.referencesLegales[0].reference);
  });

  it("N 20 en complément de la consigne, pour un restaurant N1–N4 seulement", () => {
    const n3 = fondementDe(CONSIGNE, ctx("N", "N3"))!;
    expect(n3.reference).toBe(CONSIGNE.referencesLegales[0].reference);
    expect(n3.complement?.map((c) => c.reference)).toEqual([expect.stringContaining("art. N 20")]);
    expect(n3.complement?.[0].extrait).toBe(INDEX.get("N 20")?.article.citationCle);
    expect(fondementDe(CONSIGNE, ctx("N", "N5"))!.complement).toBeUndefined();
    expect(fondementDe(CONSIGNE, ctx("M", "N3"))!.complement).toBeUndefined();
    expect(fondementDe(CONSIGNE, ctx(null, null))!.complement).toBeUndefined();
  });
});

describe("plusieurs types d'ERP — l'article de chacun (ADR-045, lot 3)", () => {
  // Éprouvé en ne gardant que le premier type du contexte : rouge.
  const ob = (id: string) => obligationsConformite.find((o) => o.id === id)!;
  const PERSONNEL = ob("incendie-erp-personnel-designe-moyens-secours");
  const CONSIGNE = ob("incendie-travail-consigne-affichee");

  it("un hôtel-restaurant voit N 17 et O 18, quel que soit l'ordre de déclaration", () => {
    for (const f of [
      fondementDe(PERSONNEL, ctx("O", "N3", ["N"]))!,
      fondementDe(PERSONNEL, ctx("N", "N3", ["O"]))!,
    ]) {
      expect(f.reference).toContain("art. N 17");
      expect(f.complement?.map((c) => c.reference)).toEqual([expect.stringContaining("art. O 18")]);
      expect(f.complement?.[0].extrait).toBe(INDEX.get("O 18")?.article.citationCle);
    }
  });

  it("trois types que la ligne cite : un principal, DEUX compléments, dans l'ordre de TYPES_ERP", () => {
    // Revue du lot 3, C4 : un cas à deux compléments, sans quoi une liste
    // réduite à son premier élément passait. Éprouvé avec complement.slice(0, 1).
    const f = fondementDe(PERSONNEL, ctx("W", "N3", ["O", "N"]))!;
    expect(f.reference).toContain("art. N 17");
    expect(f.complement?.map((c) => c.reference)).toEqual([
      expect.stringContaining("art. O 18"),
      expect.stringContaining("art. W 13"),
    ]);
  });

  it("un type que la ligne ne cite pas n'ajoute rien", () => {
    // ~~L : le chapitre n'est pas cité par cette ligne.~~ — 2026-10-17, sous-lot
    // G : L 14 l'est désormais. V (lieux de culte), lu sans être servi, prend
    // sa place.
    expect(fondementDe(PERSONNEL, ctx("N", "N3", ["V"]))!.complement).toBeUndefined();
  });

  it("une salle L avec un restaurant : L 14 en complément, avec sa citation (sous-lot G)", () => {
    const f = fondementDe(PERSONNEL, ctx("N", "N3", ["L"]))!;
    expect(f.reference).toContain("art. N 17");
    expect(f.complement?.map((c) => c.reference)).toEqual([expect.stringContaining("art. L 14")]);
    expect(f.complement?.[0].extrait).toBe(INDEX.get("L 14")?.article.citationCle);
  });

  it("la consigne d'un hôtel-restaurant de 3ᵉ : N 20 en complément, O n'en a pas", () => {
    expect(fondementDe(CONSIGNE, ctx("O", "N3", ["N"]))!.complement?.map((c) => c.reference)).toEqual([
      expect.stringContaining("art. N 20"),
    ]);
  });
});

describe("contexteFondementDe — le contexte d'un établissement qui n'est pas un ERP est vide", () => {
  it("un ERP garde ses types, dans l'ordre de TYPES_ERP (l'ordre du produit), et sa catégorie", () => {
    expect(
      contexteFondementDe({ estERP: true, typeErp: "O", typesErpAutres: ["N"], categorieErp: "N3" }),
    ).toEqual({ typesErp: ["N", "O"], categorieErp: "N3" });
  });

  it("un établissement qui n'est plus un ERP ne garde rien de ses anciennes colonnes", () => {
    expect(
      contexteFondementDe({ estERP: false, typeErp: "N", typesErpAutres: ["O"], categorieErp: "N3" }),
    ).toEqual({ typesErp: [], categorieErp: null });
  });
});

describe("entrée scindée du corpus : la ligne cite le paragraphe (2026-10-17, sous-lot G)", () => {
  // Une référence dont la clé vise une entrée scindée (« MS 70 § 5 — … »)
  // perdait sa citation : la pastille ouvrait Légifrance sans rien citer.
  // Éprouvé en retirant le découpage de `designation` : chaque moitié (« — »,
  // puis « § ») retirée seule fait rougir au moins une ligne (revue de G).
  it.each([
    ["incendie-erp-modalites-appel-pompiers-affichees", "MS 70 § 5 — modalités d'appel des sapeurs-pompiers affichées"],
    ["porte-auto-erp-contrat-entretien", "CO 48 § 3 e) — contrat d'entretien des portes automatiques"],
    ["elec-erp-presence-personne-qualifiee-scene-n3", "L 57 § 7 — présence d'une personne qualifiée en 3e catégorie"],
    // Revue du sous-lot G (point 2) : une clé SANS paragraphe (« EC 13 — … »)
    // ne se garde que par le découpage « — » ; une clé biennale du livre III
    // (« PO 1 § 3 — … ») par les deux.
    ["incendie-erp-eclairage-securite-notice-registre", "EC 13 — notice annexée au registre et entretiens consignés"],
    ["incendie-hotel-po-controle-biennal-installations", "PO 1 § 3 — contrôle biennal des installations techniques"],
    // Revue de G (R1) : le dépoussiérage cite son § 3, imprimé au PDF.
    ["scene-erp-depoussierage-annuel", "L 57 § 3 — dépoussiérage annuel de l'espace scénique"],
  ])("%s cite l'entrée « %s »", (id, ref) => {
    const o = obligationsConformite.find((x) => x.id === id)!;
    const attendu = INDEX.get(ref)?.article.citationCle;
    expect(attendu).toBeTruthy();
    expect(fondementDe(o)!.extrait).toBe(attendu);
  });

  it("la sœur de 3ᵉ ne cite pas la phrase des vérifications triennales (§ 1 a)", () => {
    const o = obligationsConformite.find((x) => x.id === "elec-erp-presence-personne-qualifiee-scene-n3")!;
    expect(fondementDe(o)!.extrait).not.toContain("tous les trois ans");
  });
});

describe("GN 10 aggravé par le type (revue du sous-lot G, B1)", () => {
  const PERSONNEL = obligationsConformite.find((o) => o.id === "incendie-erp-personnel-designe-moyens-secours")!;
  // L 14 § 4 : « En aggravation des dispositions de l'article GN 10, les
  // dispositions du présent article sont applicables à tous les établissements
  // existants ». Éprouvé en vidant `GN10_AGGRAVE_PAR_TYPE` : les deux
  // premiers rougissent.
  it("une salle L de 3ᵉ ne voit pas la mention GN 10 sur le personnel désigné", () => {
    expect(fondementDe(PERSONNEL, ctx("L", "N3"))!.gn10).toBeUndefined();
  });

  it("un restaurant qui déclare aussi L ne la voit pas non plus", () => {
    expect(fondementDe(PERSONNEL, ctx("N", "N3", ["L"]))!.gn10).toBeUndefined();
  });

  it("un restaurant seul la voit toujours (borne haute)", () => {
    expect(fondementDe(PERSONNEL, ctx("N", "N3"))!.gn10).toBe(true);
  });
});
