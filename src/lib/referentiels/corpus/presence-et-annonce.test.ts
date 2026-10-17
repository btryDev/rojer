// Deux gardes de classement posées le 2026-10-17 (revue indépendante de
// `lot/ref-a-corpus-titre-1`, décisions de c6).
//
// 1. Une présence requise pendant l'ouverture ou le fonctionnement est un ÉTAT
//    PERMANENT (`docs/notes-cadre-juridique.md`, ligne de partage 10 ; politique
//    sœur : EL 18 § 2, encodé). Un article dont la phrase décisive exige une
//    telle présence ne peut donc pas être écarté (`sans_objet`,
//    `hors_perimetre`) : il est servi, manquant, ou non couvert et dit.
// 2. « Annoncer » ne s'encode que d'une façon : `non_couvert`, avec l'adresse
//    de l'annonce, même provisoirement muette. Une annonce décidée rangée en
//    `obligation_manquante` serait comptée comme une ligne à encoder.
//
// 3. Un document consigné, annexé ou porté au registre de sécurité est un ACTE
//    (MS 75, AS 11, CH 17) : il ne peut pas être écarté. Bornée aux deux
//    corpus du livre II, que ce lot a classés ; hors de lui, `R. 4323-102`
//    (code du travail, rapports des vérifications des EPI annexés au registre)
//    est `sans_objet` et relève du sous-lot C — relevé le 2026-10-17.
//
// Les trois lisent la PHRASE du corpus (citation, motif) : elles attrapent le
// cas écrit comme les cas connus, pas une liste.

import { describe, expect, it } from "vitest";
import { CORPUS } from "./index";
import { SUITE_ANNONCE_DECIDEE } from "./motifs-livre-2";
import type { ArticleDepouille } from "./types";

const PRESENCE =
  /pendant (la présence du public|l'ouverture[^,.;]{0,20}|le fonctionnement)[^.]{0,80}\b(personne|personnel)\b|\b(personne|personnel)\b[^.]{0,80}pendant (la présence du public|l'ouverture|le fonctionnement)|sous la surveillance directe|surveillé pendant|occupé en permanence par une personne|doit être présent|doit se trouver dans l'établissement/i;

const ANNONCE_DECIDEE = /DÉCISION[^.]*\)\s*:\s*annonc|annoncé plutôt que suivi/i;

const tous = (): ArticleDepouille[] => CORPUS.flatMap((c) => [...c.articles]);

function presencesEcartees(articles: readonly ArticleDepouille[]): string[] {
  return articles
    // La citation ET le motif (revue du 2026-10-17) : une citation restée sur
    // une autre phrase de l'article (MS 52, citée sur le registre) laissait la
    // garde aveugle à la présence que le motif nomme.
    .filter(
      (a) =>
        (a.statut === "sans_objet" || a.statut === "hors_perimetre") &&
        (PRESENCE.test(a.citationCle ?? "") || PRESENCE.test("motif" in a ? (a.motif ?? "") : "")),
    )
    .map((a) => a.ref);
}

function annoncesEnManque(articles: readonly ArticleDepouille[]): string[] {
  return articles
    .filter(
      (a) =>
        a.statut === "obligation_manquante" &&
        (ANNONCE_DECIDEE.test(a.motif) || a.motif.includes(SUITE_ANNONCE_DECIDEE)),
    )
    .map((a) => a.ref);
}

describe("présence requise : un état permanent, jamais écarté", () => {
  it("aucun article écarté ne porte en citation une présence requise", () => {
    expect(presencesEcartees(tous())).toEqual([]);
  });

  it("la garde voit les présences du dépôt (borne basse)", () => {
    const vues = tous().filter((a) => PRESENCE.test(a.citationCle ?? "")).map((a) => a.ref);
    expect(vues).toEqual(expect.arrayContaining(["EL 18", "GC 15", "MS 57", "MS 66", "EL 17", "T 29", "T 33"]));
  });

  it("cassure : MS 52 rendu à `sans_objet` est vu", () => {
    const ms52 = tous().find((a) => a.ref === "MS 52")!;
    const casse = { ...ms52, statut: "sans_objet" } as ArticleDepouille;
    expect(presencesEcartees([casse])).toEqual(["MS 52"]);
  });

  it("cassure : GC 15 rendu à `sans_objet` est vu", () => {
    const gc15 = tous().find((a) => a.ref === "GC 15")!;
    const casse = { ...gc15, statut: "sans_objet", motif: "règle d'usage" } as ArticleDepouille;
    expect(presencesEcartees([casse])).toEqual(["GC 15"]);
  });
});

const AU_REGISTRE =
  /(consign|annex|joint|transcrit|inscrit|portée?s? sur|class)[^.]{0,60}(au|le|dans le|dans ce|sur le) registre/i;
const LIVRE_2 = new Set(["arrete-1980-livre-2", "arrete-1980-livre-2-titre-2"]);

function registresEcartes(articles: readonly ArticleDepouille[]): string[] {
  return articles
    .filter((a) => (a.statut === "sans_objet" || a.statut === "hors_perimetre") && AU_REGISTRE.test(a.citationCle ?? ""))
    .map((a) => a.ref);
}

describe("document consigné au registre : un acte, jamais écarté (livre II)", () => {
  const livre2 = () => CORPUS.filter((c) => LIVRE_2.has(c.id)).flatMap((c) => [...c.articles]);

  it("aucun article écarté du livre II ne porte en citation un document versé au registre", () => {
    expect(registresEcartes(livre2())).toEqual([]);
  });

  it("la garde voit les versements du livre II (borne basse)", () => {
    const vus = livre2().filter((a) => AU_REGISTRE.test(a.citationCle ?? "")).map((a) => a.ref);
    expect(vus).toEqual(expect.arrayContaining(["GC 21", "GE 10", "MS 51", "MS 75", "CH 17"]));
  });

  it("cassure : CH 17 rendu à `hors_perimetre` est vu", () => {
    const ch17 = livre2().find((a) => a.ref === "CH 17")!;
    const casse = { ...ch17, statut: "hors_perimetre", exclusion: "construction" } as ArticleDepouille;
    expect(registresEcartes([casse])).toEqual(["CH 17"]);
  });
});

// 4. Une règle d'usage n'est pas une règle de construction (revue du
//    2026-10-17) : une entrée écartée comme `construction` ne peut pas se
//    motiver par la ligne de partage 3 (« sans acte ni pièce »), qui fonde un
//    `sans_objet`.
function usagesEnConstruction(articles: readonly ArticleDepouille[]): string[] {
  return articles
    .filter((a) => a.statut === "hors_perimetre" && a.exclusion === "construction" && /ligne de partage 3/.test(a.motif ?? ""))
    .map((a) => a.ref);
}

describe("règle d'usage : `sans_objet`, jamais `construction` (livre II)", () => {
  const livre2 = () => CORPUS.filter((c) => LIVRE_2.has(c.id)).flatMap((c) => [...c.articles]);

  it("aucune entrée « construction » du livre II ne se motive par la ligne de partage 3", () => {
    expect(usagesEnConstruction(livre2())).toEqual([]);
  });

  it("cassure : EL 5 rendu à `construction` est vu", () => {
    const el5 = livre2().find((a) => a.ref === "EL 5")!;
    const casse = { ...el5, statut: "hors_perimetre", exclusion: "construction" } as ArticleDepouille;
    expect(usagesEnConstruction([casse])).toEqual(["EL 5"]);
  });
});

describe("annonce décidée : `non_couvert`, jamais `obligation_manquante`", () => {
  it("aucun manque ne porte une décision d'annoncer", () => {
    expect(annoncesEnManque(tous())).toEqual([]);
  });

  it("une annonce encore muette ne cite aucune adresse structurée (sinon elle passerait pour annoncée)", () => {
    // Relevé le 2026-10-17 : « Non déclaré … (`DESCRIPTION_CATEGORIE.X`) »
    // était lu comme une citation d'aide par `manques-annonces.test.ts`, et
    // compté comme annoncé par `doc-couverture.test.ts`.
    const fautifs = tous()
      .filter((a) => a.statut === "non_couvert" && (a.declareA ?? "").startsWith("Non déclaré") && (a.declareA ?? "").includes("DESCRIPTION_CATEGORIE."))
      .map((a) => a.ref);
    expect(fautifs).toEqual([]);
  });

  it("chaque annonce encore muette du livre II porte la phrase de la décision (~~les onze~~ ~~les sept~~ ~~les six, sous-lot C~~ les deux, sous-lot D)", () => {
    // 2026-10-17, sous-lot B : `AS 5`, `AS 8`, `CH 23` et `CH 24` sont
    // annoncés (aide de catégorie, liste des matériels) ; 11 − 4 = 7.
    // 2026-10-17, sous-lot C : `CO 10` reçoit son adresse ; 7 − 1 = 6.
    // 2026-10-17, sous-lot D : `T 29`, `T 33`, `T 43`, `T 44` sont dits dans
    // l'aide du type T (`AIDE_TYPE_ERP.T`) ; 6 − 4 = 2.
    // Revue du 2026-10-17 : la reconnaissance par la seule formulation du motif
    // ne voyait que 4 des 11 annonces décidées. Une phrase commune les nomme
    // toutes ; une annonce muette qui ne la porte pas est hors de la garde.
    const livre2 = CORPUS.filter((c) => LIVRE_2.has(c.id)).flatMap((c) => [...c.articles]);
    const muettes = livre2.filter((a) => a.statut === "non_couvert" && (a.declareA ?? "").startsWith("Non déclaré au 2026-10-17"));
    expect(muettes.filter((a) => !("motif" in a && (a.motif ?? "").includes(SUITE_ANNONCE_DECIDEE))).map((a) => a.ref)).toEqual([]);
    expect(muettes.map((a) => a.ref).sort()).toEqual(
      // ~~"AS 5", "AS 8", "CH 23", "CH 24"~~ — annoncés au sous-lot B.
      // ~~"CO 10"~~ — sous-lot C : adresse posée (rubrique « Règlement de sécurité,
      // catégories 1 à 4 »).
      // ~~"T 29", "T 33", "T 43", "T 44"~~ — sous-lot D : aide du type T.
      ["AM 18", "MS 42"].sort(),
    );
  });

  it("cassure : T 43 rendu à `obligation_manquante` est vu", () => {
    const t43 = tous().find((a) => a.ref === "T 43")!;
    const casse = { ...t43, statut: "obligation_manquante", cause: "libre", toucheLaCible: true } as ArticleDepouille;
    expect(annoncesEnManque([casse])).toEqual(["T 43"]);
  });

  it("cassure : CH 23 rendu à `obligation_manquante` est vu", () => {
    const ch23 = tous().find((a) => a.ref === "CH 23")!;
    const casse = { ...ch23, statut: "obligation_manquante", cause: "libre", toucheLaCible: true } as ArticleDepouille;
    expect(annoncesEnManque([casse])).toEqual(["CH 23"]);
  });
});
