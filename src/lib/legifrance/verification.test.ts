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
