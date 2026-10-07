// La vérification du corpus contre des réponses d'API simulées : résolution
// de la cible, lecture de la version en vigueur, et les quatre comparaisons.

import { describe, expect, it } from "vitest";
import type { ArticleDepouille, Corpus } from "../referentiels/corpus/types";
import type { ArticleApi } from "./client";
import { ErreurLegifrance } from "./client";
import {
  analyser,
  cleTexte,
  ecartsParImportance,
  estEcart,
  jourCivil,
  lireArticle,
  memeTexte,
  rendreRapport,
  resoudreCible,
  verifierCorpus,
  type SourceArticles,
} from "./verification";

const J = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

const CORPUS_CT: Pick<Corpus, "id" | "url"> = {
  id: "code-travail-incendie",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489127/",
};

function article(p: Partial<ArticleDepouille>): ArticleDepouille {
  return { ref: "R. 4227-26", statut: "retenu", obligations: ["x"], lecture: "agent_verbatim", ...p } as ArticleDepouille;
}

const TEXTE = "L'employeur fait procéder au moins une fois par an à la vérification des extincteurs.";

/** R. 4227-26 en vigueur, version du 1er mai 2008 (décret 2008-244). */
const EN_VIGUEUR: ArticleApi = {
  id: "LEGIARTI000018531912",
  num: "R4227-26",
  etat: "VIGUEUR",
  texte: TEXTE,
  dateDebut: J("2008-05-01"),
  dateFin: J("2999-01-01"),
  articleVersions: [{ id: "LEGIARTI000018531912", etat: "VIGUEUR", dateDebut: J("2008-05-01") }],
  lienModifications: [
    {
      linkType: "CREATION",
      linkOrientation: "cible",
      textCid: "JORFTEXT000018225298",
      textTitle: "Décret n°2008-244 du 7 mars 2008 - art. (V)",
      dateSignaTexte: J("2008-03-07"),
      dateDebutCible: J("2008-05-01"),
    },
  ],
};

function source(articles: Record<string, ArticleApi | null>, parNum: Record<string, ArticleApi> = {}) {
  const appels: string[] = [];
  const s: SourceArticles = {
    async getArticle(id) {
      appels.push(`get:${id}`);
      return articles[id] ?? null;
    },
    async getArticleWithIdAndNum(t, n) {
      appels.push(`num:${t}:${n}`);
      return parNum[`${t}|${n}`] ?? null;
    },
  };
  return { s, appels };
}

async function verifier(a: ArticleDepouille, src: SourceArticles, c = CORPUS_CT) {
  const cible = resoudreCible(a, c);
  return analyser(a, c.id, cible, await lireArticle(src, cible));
}

describe("resoudreCible", () => {
  it("une norme se reconnaît à son statut de corpus, pas à son préfixe (revue du 2026-10-07)", () => {
    const norme = (ref: string) =>
      resoudreCible(article({ ref, statut: "norme", motif: "m" } as Partial<ArticleDepouille>), { id: "normes", url: "" });
    expect(norme("NF S 61-919 § 5.1.1")).toMatchObject({ par: "aucun", raison: expect.stringMatching(/^norme homologuée/) });
    expect(norme("EN 3-7 § 4")).toMatchObject({ par: "aucun", raison: expect.stringMatching(/^norme homologuée/) });
    // Une clé de droit qui commencerait par « NF » n'est pas une norme.
    expect(
      resoudreCible(article({ ref: "NF 12" }), { id: "arrete-1980-livre-2", url: "" }),
    ).not.toMatchObject({ raison: expect.stringMatching(/^norme homologuée/) });
  });

  it.each<[string, string | undefined, string, unknown]>([
    ["R. 4227-26", "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531912", "code-travail-incendie", { par: "id", id: "LEGIARTI000018531912" }],
    ["R. 4227-29", "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489127/", "code-travail-incendie", { par: "texte_et_numero", textes: ["LEGITEXT000006072050"], nums: ["R4227-29"], code: true }],
    ["L. 4711-5", undefined, "code-travail-incendie", { par: "texte_et_numero", textes: ["LEGITEXT000006072050"], nums: ["L4711-5"], code: true }],
    ["CCH R. 143-41", undefined, "cch-registre-securite", { par: "texte_et_numero", textes: ["LEGITEXT000006074096"], nums: ["R143-41"], code: true }],
    ["C. env. R. 543-79", undefined, "froid-fluides", { par: "texte_et_numero", textes: ["LEGITEXT000006074220"], nums: ["R543-79"], code: true }],
    ["Arrêté 21-12-2004 art. 5", "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000001654308", "x", { par: "id", id: "JORFARTI000001654308" }],
  ])("%s", (ref, url, corpusId, attendu) => {
    expect(resoudreCible(article({ ref, url }), { id: corpusId, url: "" })).toEqual(attendu);
  });

  it("règlement ERP : les deux identifiants du texte, les deux graphies du numéro", () => {
    expect(resoudreCible(article({ ref: "GH U 16" }), { id: "arrete-1980-livre-2", url: "" })).toEqual({
      par: "texte_et_numero",
      textes: ["JORFTEXT000000290033", "LEGITEXT000020303557"],
      nums: ["GH U 16", "GHU16"],
      code: false,
    });
  });

  it("article d'arrêté « 1er » : les deux numéros", () => {
    const c = resoudreCible(article({ ref: "Arrêté 2017-04-19 art. 1er" }), { id: "a", url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000034454237/" });
    expect(c).toMatchObject({ nums: ["1er", "1"], textes: ["JORFTEXT000034454237"] });
  });

  it.each([
    ["INRS ED 6127", "https://www.inrs.fr/media.html?refINRS=ED%206127", /INRS/],
    ["Règlement UE 2024/573 art. 5", undefined, /européen/],
    ["Arrêté 2004-03-01 annexe", undefined, /annexe/],
    ["Arrêté 2004-03-01 art. 19", undefined, /sans identifiant de texte/],
  ])("non vérifiable : %s", (ref, url, raison) => {
    const c = resoudreCible(article({ ref, url }), { id: "a", url: "" });
    expect(c.par).toBe("aucun");
    if (c.par === "aucun") expect(c.raison).toMatch(raison);
  });
});

describe("analyser", () => {
  const URL_ART = "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531912";

  it("tout concorde : OK, trois comparaisons faites", async () => {
    const { s } = source({ LEGIARTI000018531912: EN_VIGUEUR });
    const r = await verifier(
      article({
        url: URL_ART,
        citationCle: "au moins une fois par an à la vérification",
        versionEnVigueur: "2008-05-01",
        modifiePar: { texte: "Décret n° 2008-244 du 7 mars 2008" },
      }),
      s,
    );
    expect(r.constats).toEqual([]);
    expect(r.categorie).toBe("ok");
    expect(r.compare).toEqual({ citation: true, version: true, modificateur: true });
  });

  it("écart de citation : un mot changé est détecté et nommé", async () => {
    const { s } = source({ LEGIARTI000018531912: EN_VIGUEUR });
    const r = await verifier(article({ url: URL_ART, citationCle: "au moins une fois par mois à la vérification" }), s);
    expect(r.categorie).toBe("ecart_citation");
    expect(r.constats[0].detail).toContain("[-mois-]");
    expect(r.constats[0].detail).toContain("{+an+}");
  });

  it("version différente", async () => {
    const { s } = source({ LEGIARTI000018531912: EN_VIGUEUR });
    const r = await verifier(article({ url: URL_ART, versionEnVigueur: "2012-01-01" }), s);
    expect(r.categorie).toBe("version_differente");
    expect(r.constats[0].detail).toBe("corpus 2012-01-01, Légifrance 2008-05-01");
  });

  it("modificateur différent ; même texte reconnu par numéro, par date, par JORFTEXT", async () => {
    const { s } = source({ LEGIARTI000018531912: EN_VIGUEUR });
    const autre = await verifier(article({ url: URL_ART, modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025" } }), s);
    expect(autre.categorie).toBe("modificateur_different");
    for (const m of [
      { texte: "Décret du 7 mars 2008" },
      { texte: "le décret de recodification", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000018225298" },
    ]) {
      expect((await verifier(article({ url: URL_ART, modifiePar: m }), s)).categorie).toBe("ok");
    }
  });

  it("modifiePar null : une CRÉATION ne le contredit pas, une MODIFICATION si", async () => {
    const { s } = source({ LEGIARTI000018531912: EN_VIGUEUR });
    expect((await verifier(article({ url: URL_ART, modifiePar: null }), s)).categorie).toBe("ok");
    const modifie = { ...EN_VIGUEUR, lienModifications: [{ ...EN_VIGUEUR.lienModifications![0], linkType: "MODIFIE" }] };
    const { s: s2 } = source({ LEGIARTI000018531912: modifie });
    expect((await verifier(article({ url: URL_ART, modifiePar: null }), s2)).categorie).toBe("modificateur_different");
  });

  it("identifiant d'une version ancienne : la version en vigueur est lue et comparée", async () => {
    const ancienne: ArticleApi = {
      id: "LEGIARTI000000000001",
      etat: "MODIFIE",
      texte: "Ancien texte.",
      dateDebut: J("2000-01-01"),
      articleVersions: [
        { id: "LEGIARTI000000000001", etat: "MODIFIE", dateDebut: J("2000-01-01") },
        { id: "LEGIARTI000018531912", etat: "VIGUEUR", dateDebut: J("2008-05-01") },
      ],
    };
    const { s, appels } = source({ LEGIARTI000000000001: ancienne, LEGIARTI000018531912: EN_VIGUEUR });
    const r = await verifier(
      article({ url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000000000001", citationCle: "Ancien texte.", versionEnVigueur: "2000-01-01" }),
      s,
    );
    expect(appels).toEqual(["get:LEGIARTI000000000001", "get:LEGIARTI000018531912"]);
    expect(r.officiel?.idDemandePerime).toBe(true);
    expect(r.constats.map((c) => c.categorie)).toEqual(["ecart_citation", "version_differente"]);
  });

  it("article abrogé", async () => {
    const abroge: ArticleApi = {
      ...EN_VIGUEUR,
      etat: "ABROGE",
      dateFin: J("2021-07-01"),
      articleVersions: [{ id: EN_VIGUEUR.id, etat: "ABROGE", dateDebut: J("2008-05-01"), dateFin: J("2021-07-01") }],
    };
    const { s } = source({ LEGIARTI000018531912: abroge });
    const r = await verifier(article({ url: URL_ART }), s);
    expect(r.categorie).toBe("abroge");
    expect(r.constats[0].detail).toContain("2021-07-01");
  });

  it("introuvable : identifiant sans article, ou article de code absent ; arrêté cherché par numéro : non vérifiable", async () => {
    const { s } = source({});
    expect((await verifier(article({ url: URL_ART }), s)).categorie).toBe("introuvable");
    expect((await verifier(article({ ref: "R. 4227-99" }), s)).categorie).toBe("introuvable");
    const r = await verifier(article({ ref: "PE 4" }), s, { id: "arrete-1980-livre-3", url: "" });
    expect(r.categorie).toBe("non_verifiable");
    expect(r.tentatives).toHaveLength(4);
  });

  it("recherche par texte et numéro : trouvée au second numéro", async () => {
    const { s } = source({}, { "JORFTEXT000000290033|PE4": { ...EN_VIGUEUR, id: "LEGIARTI000024766555" } });
    const r = await verifier(article({ ref: "PE 4", citationCle: TEXTE }), s, { id: "arrete-1980-livre-3", url: "" });
    expect(r.categorie).toBe("ok");
    expect(r.officiel?.id).toBe("LEGIARTI000024766555");
  });
});

describe("orchestration et rapport", () => {
  const corpus = (articles: ArticleDepouille[]): Corpus => ({ ...CORPUS_CT, intitule: "t", portee: "t", etendue: "articles_cites", articles });

  it("une erreur d'authentification arrête tout", async () => {
    const s: SourceArticles = {
      getArticle: async () => {
        throw new ErreurLegifrance("authentification", "Jeton PISTE refusé (HTTP 400).");
      },
      getArticleWithIdAndNum: async () => null,
    };
    const c = corpus([article({ url: "https://x/LEGIARTI000018531912" })]);
    await expect(verifierCorpus(s, [{ corpus: c, article: c.articles[0] }])).rejects.toMatchObject({ nature: "authentification" });
  });

  it("une erreur HTTP sur un article : non vérifiable, marquée, la suite continue", async () => {
    let n = 0;
    const s: SourceArticles = {
      getArticle: async () => {
        if (n++ === 0) throw new ErreurLegifrance("http", "HTTP 500");
        return EN_VIGUEUR;
      },
      getArticleWithIdAndNum: async () => null,
    };
    const c = corpus([
      article({ url: "https://x/LEGIARTI000000000009" }),
      article({ url: "https://x/LEGIARTI000018531912" }),
    ]);
    const rs = await verifierCorpus(s, c.articles.map((a) => ({ corpus: c, article: a })));
    expect(rs.map((r) => [r.categorie, r.erreurApi ?? false])).toEqual([
      ["non_verifiable", true],
      ["ok", false],
    ]);
  });

  it("un même article dans deux corpus : une seule lecture", async () => {
    const { s, appels } = source({ LEGIARTI000018531912: EN_VIGUEUR });
    const a = article({ url: "https://x/LEGIARTI000018531912" });
    const c = corpus([a]);
    await verifierCorpus(s, [{ corpus: c, article: a }, { corpus: { ...c, id: "autre" }, article: a }]);
    expect(appels).toEqual(["get:LEGIARTI000018531912"]);
  });

  it("écarts : non vérifiable et OK n'en sont pas ; ordre de gravité", () => {
    expect(["ok", "non_verifiable"].map((c) => estEcart(c as never))).toEqual([false, false]);
    const r = (categorie: string, statut = "retenu") => ({ categorie, statut, constats: [{}], ref: categorie }) as never;
    expect(ecartsParImportance([r("version_differente"), r("ok"), r("abroge"), r("ecart_citation", "sans_objet"), r("ecart_citation")]).map((x: { ref: string; statut: string }) => `${x.ref}/${x.statut}`)).toEqual([
      "abroge/retenu",
      "ecart_citation/retenu",
      "ecart_citation/sans_objet",
      "version_differente/retenu",
    ]);
  });

  it("le rapport compte et ne contient rien d'autre que le constat", async () => {
    const { s } = source({ LEGIARTI000018531912: EN_VIGUEUR });
    const c = corpus([article({ url: "https://x/LEGIARTI000018531912", versionEnVigueur: "2012-01-01" })]);
    const rs = await verifierCorpus(s, [{ corpus: c, article: c.articles[0] }]);
    const md = rendreRapport(rs, { date: "2026-09-27", env: "sandbox", selection: "test", appels: 1, reprises: 0 });
    expect(md).toContain("| version différente | 1 | 1 |");
    expect(md).toContain("corpus 2012-01-01, Légifrance 2008-05-01");
    expect(md).not.toMatch(/Bearer|client_secret|access_token/);
  });
});

describe("dates et textes", () => {
  it("jourCivil : minuit UTC comme minuit Paris donnent le même jour", () => {
    expect(jourCivil(J("2008-05-01"))).toBe("2008-05-01");
    expect(jourCivil(Date.parse("2008-04-30T22:00:00Z"))).toBe("2008-05-01");
    expect(jourCivil("2008-05-01")).toBe("2008-05-01");
    expect(jourCivil(undefined)).toBeUndefined();
  });

  it("cleTexte / memeTexte", () => {
    expect(cleTexte("Arrêté du 1er décembre 2025 (NOR INTE2529354A) - art. 3")).toEqual({ jorftext: undefined, numero: undefined, nature: "arrêté", date: "2025-12-01" });
    expect(memeTexte(cleTexte("Décret n° 2025-482 du 27 mai 2025"), cleTexte("Décret n°2025-482 du 27 mai 2025 - art. 1"))).toBe(true);
    expect(memeTexte(cleTexte("Arrêté du 4 février 2026"), cleTexte("Décret du 4 février 2026"))).toBe(false);
    expect(memeTexte(cleTexte("le texte"), cleTexte("un autre"))).toBeUndefined();
  });
});

// C51 — ce que les réponses RÉELLES ont appris au script. Les fixtures
// reprennent la forme relevée (dates en chaîne, sentinelle 2999-01-01).
describe("C51 : modificateur, liens réels", () => {
  const URL_ART = "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053629124";
  /** CCH R. 134-6, version du 2026-04-01 : le lien porte dateDebutCible 2026-03-07. */
  const R134_6: ArticleApi = {
    id: "LEGIARTI000053629124",
    etat: "VIGUEUR",
    texte: "Le contrat d'entretien comporte la vérification du bon état des câbles.",
    dateDebut: J("2026-04-01"),
    articleVersions: [
      { id: "LEGIARTI000043818737", etat: "MODIFIE", dateDebut: J("2021-07-01") },
      { id: "LEGIARTI000053629124", etat: "VIGUEUR", dateDebut: J("2026-04-01") },
    ],
    lienModifications: [
      { linkType: "CODIFICATION", linkOrientation: "source", textCid: "JORFTEXT000043808633", textTitle: "Décret n°2021-872 du 30 juin 2021 - art.", dateSignaTexte: undefined, dateDebutCible: undefined },
      { linkType: "MODIFIE", linkOrientation: "cible", textCid: "JORFTEXT000053626113", textTitle: "Décret n°2026-166 du 4 mars 2026 - art. 1", dateSignaTexte: "2026-03-04", dateDebutCible: "2026-03-07" },
    ],
  };

  it("dateDebutCible n'est pas la date de la version : le texte modificateur est reconnu", async () => {
    const { s } = source({ LEGIARTI000053629124: R134_6 });
    const r = await verifier(article({ ref: "CCH R. 134-6", url: URL_ART, modifiePar: { texte: "Décret n° 2026-166 du 4 mars 2026 - art. 1" } }), s);
    expect(r.categorie).toBe("ok");
    expect(r.officiel?.modificateurs.map((m) => m.titre)).toEqual(["Décret n°2026-166 du 4 mars 2026 - art. 1"]);
  });

  it("épreuve : un autre décret, ou le texte de codification, reste un écart", async () => {
    const { s } = source({ LEGIARTI000053629124: R134_6 });
    for (const texte of ["Décret n° 2025-1100 du 19 novembre 2025 - art. 1", "Décret n° 2021-872 du 30 juin 2021"]) {
      expect((await verifier(article({ url: URL_ART, modifiePar: { texte } }), s)).categorie).toBe("modificateur_different");
    }
  });

  it("lien « v. init. » signé APRÈS la date de la version (GC 21, règlement ERP reconsolidé) : reconnu", async () => {
    const gc21: ArticleApi = {
      ...R134_6,
      id: "LEGIARTI000020344053",
      dateDebut: J("1980-08-15"),
      articleVersions: [{ id: "LEGIARTI000020344053", etat: "VIGUEUR", dateDebut: J("1980-08-15") }],
      textTitles: [{ cid: "JORFTEXT000000290033", titre: "Arrêté du 25 juin 1980" }],
      lienModifications: [{ linkType: "MODIFICATION", linkOrientation: "source", textCid: "JORFTEXT000000786494", textTitle: "Arrêté du 10 octobre 2005 - art. Annexe, v. init.", dateSignaTexte: "2005-10-10", dateDebutCible: "2999-01-01" }],
    };
    const { s } = source({ LEGIARTI000020344053: gc21 });
    const url = "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020344053";
    expect((await verifier(article({ url, modifiePar: { texte: "Arrêté du 10 octobre 2005 - art. Annexe, v. init." } }), s)).categorie).toBe("ok");
    // épreuve : le texte porteur n'est plus pris pour le modificateur
    expect((await verifier(article({ url, modifiePar: { texte: "Arrêté du 25 juin 1980" } }), s)).categorie).toBe("modificateur_different");
  });

  it("DEPLACE contredit un null ; le texte de codification seul ne le contredit pas", async () => {
    const deplace = { ...R134_6, lienModifications: [{ linkType: "DEPLACE", linkOrientation: "cible", textCid: "JORFTEXT000045365883", textTitle: "Décret n°2022-372 du 16 mars 2022 - art. 5", dateSignaTexte: "2022-03-16" }] };
    const { s } = source({ LEGIARTI000053629124: deplace });
    expect((await verifier(article({ url: URL_ART, modifiePar: null }), s)).categorie).toBe("modificateur_different");
    const codif = { ...R134_6, lienModifications: [R134_6.lienModifications![0]] };
    const { s: s2 } = source({ LEGIARTI000053629124: codif });
    expect((await verifier(article({ url: URL_ART, modifiePar: null }), s2)).categorie).toBe("ok");
  });

  it("MODIFICATION / source, sentinelle 2999-01-01 (règlement ERP, MS 38) : reconnu", async () => {
    const ms38: ArticleApi = {
      ...R134_6,
      id: "LEGIARTI000020382888",
      dateDebut: J("2008-10-08"),
      lienModifications: [{ linkType: "MODIFICATION", linkOrientation: "source", textCid: "JORFTEXT000019140491", textTitle: "Arrêté du 26 juin 2008 - art. 2, v. init.", dateSignaTexte: "2008-06-26", dateDebutCible: "2999-01-01" }],
    };
    const { s } = source({ LEGIARTI000020382888: ms38 });
    const url = "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020382888";
    expect((await verifier(article({ url, modifiePar: { texte: "Arrêté du 26 juin 2008 - art. 2, v. init." } }), s)).categorie).toBe("ok");
    expect((await verifier(article({ url, modifiePar: { texte: "Arrêté du 25 juin 1980" } }), s)).categorie).toBe("modificateur_different");
  });

  it("le titre concorde mais l'URL du corpus pointe un autre JORFTEXT : écart, et c'est l'URL qui est nommée", async () => {
    const { s } = source({ LEGIARTI000053629124: R134_6 });
    const r = await verifier(
      article({ url: URL_ART, modifiePar: { texte: "Décret n° 2026-166 du 4 mars 2026", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000000001" } }),
      s,
    );
    expect(r.categorie).toBe("modificateur_different");
    expect(r.constats[0].detail).toContain("l'URL du corpus pointe JORFTEXT000000000001, Légifrance JORFTEXT000053626113");
  });

  it("cleTexte lit la graphie ISO de l'API (« Arrêté 1993-06-04 art. 1 JORF 15 juin 1993 »)", () => {
    expect(cleTexte("Arrêté 1993-06-04 art. 1 JORF 15 juin 1993").date).toBe("1993-06-04");
    expect(memeTexte(cleTexte("Arrêté du 4 juin 1993 - art. 1"), cleTexte("Arrêté 1993-06-04 art. 1 JORF 15 juin 1993"))).toBe(true);
    expect(memeTexte(cleTexte("Arrêté du 15 juin 1993"), cleTexte("Arrêté 1993-06-04 art. 1 JORF 15 juin 1993"))).toBe(false);
  });
});

describe("C51 : nota, versions futures, résolutions", () => {
  const URL_ART = "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531912";

  it("le nota suit le texte : une citation qui le reprend est exacte ; un mot changé dans le nota, non", async () => {
    const avecNota = { ...EN_VIGUEUR, nota: "Conformément à l'article 11 de l'arrêté du 19 juin 2015, les présentes dispositions sont applicables." };
    const { s } = source({ LEGIARTI000018531912: avecNota });
    const ok = await verifier(article({ url: URL_ART, citationCle: "des extincteurs. Conformément à l'article 11 de l'arrêté du 19 juin 2015" }), s);
    expect(ok.categorie).toBe("ok");
    const ko = await verifier(article({ url: URL_ART, citationCle: "Conformément à l'article 12 de l'arrêté du 19 juin 2015" }), s);
    expect(ko.categorie).toBe("ecart_citation");
  });

  const programme = (dateSuivante: string): ArticleApi => ({
    ...EN_VIGUEUR,
    etat: "ABROGE_DIFF",
    dateFin: J(dateSuivante),
    articleVersions: [
      { id: EN_VIGUEUR.id, etat: "ABROGE_DIFF", dateDebut: J("2008-05-01"), dateFin: J(dateSuivante) },
      { id: "LEGIARTI000052645197", etat: "VIGUEUR_DIFF", dateDebut: J(dateSuivante) },
    ],
  });

  it("ABROGE_DIFF suivi d'une VIGUEUR_DIFF : version future, pas abrogation", async () => {
    const { s } = source({ LEGIARTI000018531912: programme("2027-01-01") });
    const connue = await verifier(article({ url: URL_ART, versionFuture: "2027-01-01" }), s);
    expect(connue.categorie).toBe("ok");
    expect(connue.officiel?.versionSuivante).toEqual({ id: "LEGIARTI000052645197", dateDebut: "2027-01-01" });
    const ignoree = await verifier(article({ url: URL_ART }), s);
    expect(ignoree.categorie).toBe("version_differente");
    expect(ignoree.constats[0].detail).toContain("version future programmée au 2027-01-01");
  });

  it("date conventionnelle 2222-02-22 : signalée au rapport, pas comparée", async () => {
    const { s } = source({ LEGIARTI000018531912: programme("2222-02-22") });
    const r = await verifier(article({ url: URL_ART }), s);
    expect(r.categorie).toBe("ok");
    expect(rendreRapport([r], { date: "d", env: "sandbox", selection: "s", appels: 1, reprises: 0 })).toContain("date non fixée (2222-02-22)");
  });

  it("épreuve : ABROGE_DIFF sans version suivante reste une abrogation", async () => {
    const seul = { ...programme("2027-01-01"), articleVersions: [programme("2027-01-01").articleVersions![0]] };
    const { s } = source({ LEGIARTI000018531912: seul });
    expect((await verifier(article({ url: URL_ART, versionFuture: "2027-01-01" }), s)).categorie).toBe("abroge");
  });

  it("résolution : « PO 1 § 3 — … », annexes, plages, arrêté balisé", () => {
    const erp = { id: "arrete-1980-livre-3", url: "" };
    expect(resoudreCible(article({ ref: "PO 1 § 3 — contrôle biennal" }), erp)).toMatchObject({ par: "texte_et_numero", nums: ["PO 1", "PO1"] });
    expect(resoudreCible(article({ ref: "Annexe à l'article PO 11" }), erp)).toMatchObject({ nums: ["Annexe à l'article PO 11"] });
    const arrete = { id: "a", url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000025046978/" };
    expect(resoudreCible(article({ ref: "Arrêté 2011-12-26 annexe II" }), arrete)).toMatchObject({ nums: ["Annexe II"] });
    expect(resoudreCible(article({ ref: "Arrêté 2004-03-01 annexe" }), arrete)).toMatchObject({ nums: ["Annexe"] });
    expect(resoudreCible(article({ ref: "Arrêté 2017-11-20 art. 26-28" }), arrete)).toEqual({ par: "plage", textes: ["JORFTEXT000025046978"], nums: [["26"], ["27"], ["28"]] });
    // « 78-1 » est un article, pas une plage
    expect(resoudreCible(article({ ref: "Arrêté 1986-01-31 art. 78-1" }), arrete)).toMatchObject({ par: "texte_et_numero", nums: ["78-1"] });
    expect(resoudreCible(article({ ref: "Arrêté 2012-08-07", citationCle: "(art. 1er) Le propriétaire […] (art. 3) Le contrôleur" }), arrete)).toEqual({
      par: "plage",
      textes: ["JORFTEXT000025046978"],
      nums: [["1er", "1"], ["3"]],
    });
    const nu = resoudreCible(article({ ref: "Arrêté 2025-12-01" }), arrete);
    expect(nu.par).toBe("aucun");
  });

  it("plage : chaque article lu, textes mis bout à bout ; un article absent rend la plage introuvable", async () => {
    const art = (id: string, texte: string, d: string): ArticleApi => ({ ...EN_VIGUEUR, id, texte, dateDebut: J(d), articleVersions: [{ id, etat: "VIGUEUR", dateDebut: J(d) }] });
    const T = "JORFTEXT000036128632";
    const parNum = {
      [`${T}|26`]: art("A26", "Un équipement peut faire l'objet d'interventions.", "2018-01-01"),
      [`${T}|27`]: art("A27", "Les réparations sont notées.", "2025-09-08"),
    };
    const { s } = source({}, parNum);
    const c = { id: "esp", url: `https://www.legifrance.gouv.fr/loda/id/${T}` };
    const r = await verifier(article({ ref: "Arrêté 2017-11-20 art. 26-27", citationCle: "(art. 26) Un équipement peut faire l'objet d'interventions. (art. 27) Les réparations sont notées.", versionEnVigueur: "2025-09-08" }), s, c);
    expect(r.categorie).toBe("ok");
    expect(r.officiel?.id).toBe("A26+A27");
    const { s: s2 } = source({}, { [`${T}|26`]: parNum[`${T}|26`] });
    expect((await verifier(article({ ref: "Arrêté 2017-11-20 art. 26-27" }), s2, c)).categorie).toBe("non_verifiable");
  });
});
