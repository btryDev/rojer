// Relire le corpus contre Légifrance : ce que dit l'API, comparé à ce que le
// corpus a relevé. Sans réseau ici : le client est injecté (`SourceArticles`),
// ce qui rend chaque décision testable sur des réponses simulées.
//
// Pour chaque article du corpus, quatre questions (docs/outils/legifrance-api.md) :
//   1. la `citationCle` est-elle un extrait exact du texte en vigueur ?
//   2. la version en vigueur date-t-elle de `versionEnVigueur` ?
//   3. le texte qui l'a produite est-il `modifiePar` ?
//   4. l'article est-il abrogé, transféré, périmé ?
//
// Ce module ne corrige rien. Il rend des constats, et un humain décide :
// règle « contre-vérifier avant d'agir » du dépôt.

import type { ArticleDepouille, Corpus } from "../referentiels/corpus/types";
import type { ArticleApi, LienModificationApi, VersionArticleApi } from "./client";
import {
  comparerCitation,
  diffLisible,
  texteDepuisHtml,
  type ComparaisonCitation,
} from "./normalisation";

/** Ce dont la vérification a besoin du client — un sous-ensemble, pour les tests. */
export type SourceArticles = {
  getArticle(id: string): Promise<ArticleApi | null>;
  getArticleWithIdAndNum(idTexte: string, num: string): Promise<ArticleApi | null>;
};

export const CATEGORIES = [
  "abroge",
  "introuvable",
  "ecart_citation",
  "version_differente",
  "modificateur_different",
  "non_verifiable",
  "ok",
] as const;
/** Dans l'ordre de gravité : la catégorie d'un article est la plus grave de ses constats. */
export type Categorie = (typeof CATEGORIES)[number];

export const LIBELLES: Record<Categorie, string> = {
  abroge: "abrogé / transféré",
  introuvable: "introuvable",
  ecart_citation: "écart de citation",
  version_differente: "version différente",
  modificateur_different: "modificateur différent",
  non_verifiable: "non vérifiable",
  ok: "OK",
};

/** Est-ce un écart (code de sortie non nul) ? `non_verifiable` et `ok` n'en sont pas. */
export function estEcart(c: Categorie): boolean {
  return c !== "ok" && c !== "non_verifiable";
}

// ---------------------------------------------------------------------------
// 1. RÉSOUDRE : quel appel pour quel article ?
// ---------------------------------------------------------------------------

/** Les codes connus, par identifiant LEGITEXT. */
export const CODES: Record<string, string> = {
  LEGITEXT000006072050: "Code du travail",
  LEGITEXT000006074096: "Code de la construction et de l'habitation",
  LEGITEXT000006072665: "Code de la santé publique",
  LEGITEXT000006074069: "Code de l'action sociale et des familles",
  LEGITEXT000006074220: "Code de l'environnement",
};
const CODE_TRAVAIL = "LEGITEXT000006072050";
const PREFIXES_CODE: [RegExp, string][] = [
  [/^CCH\s+/, "LEGITEXT000006074096"],
  [/^C\.\s*env\.\s+/, "LEGITEXT000006074220"],
  [/^CSP\s+/, "LEGITEXT000006072665"],
  [/^CASF\s+/, "LEGITEXT000006074069"],
];
/** Le règlement de sécurité ERP (arrêté du 25 juin 1980), tel que Légifrance l'expose. */
const REGLEMENT_ERP = ["JORFTEXT000000290033", "LEGITEXT000020303557"];

export type Cible =
  | { par: "id"; id: string }
  | { par: "texte_et_numero"; textes: string[]; nums: string[]; code: boolean }
  /**
   * Plusieurs articles d'un même arrêté, lus un à un et comparés comme un
   * seul texte, dans l'ordre (C51) : « art. 26-28 », ou un arrêté cité
   * entier dont la citation balise ses articles « (art. 1er) ».
   */
  | { par: "plage"; textes: string[]; nums: string[][] }
  | { par: "aucun"; raison: string };

/** Les balises « (art. 26) », « (art. 1er) » d'une citation qui assemble plusieurs articles. */
export const BALISE_ARTICLE = /\(art\.\s*(\d+)(er)?\)/g;

const ROMAIN = /^[IVXL]+$/;

function idsTexte(url: string | undefined): string[] {
  return url ? [...url.matchAll(/(LEGITEXT|JORFTEXT)\d{12}/g)].map((m) => m[0]) : [];
}

export function resoudreCible(a: ArticleDepouille, c: Pick<Corpus, "id" | "url">): Cible {
  const url = a.url ?? "";
  const id = /(LEGIARTI|JORFARTI)\d{12}/.exec(url)?.[0];
  if (id) return { par: "id", id };

  if (/^INRS\b/.test(a.ref) || /inrs\.fr/.test(url)) {
    return { par: "aucun", raison: "brochure INRS : hors Légifrance" };
  }
  if (/^NF\s/.test(a.ref)) {
    return { par: "aucun", raison: "norme homologuée : hors Légifrance (AFNOR, ADR-039)" };
  }
  if (/^Règlement\s+UE\b/i.test(a.ref)) {
    return { par: "aucun", raison: "règlement européen : hors fonds de l'API Légifrance (EUR-Lex)" };
  }

  // Article de code : « R. 4227-26 », « CCH R. 143-41 », « C. env. L. 512-1 ».
  let reste = a.ref.trim();
  let codeParPrefixe: string | undefined;
  for (const [re, lt] of PREFIXES_CODE) {
    if (re.test(reste)) {
      codeParPrefixe = lt;
      reste = reste.replace(re, "");
    }
  }
  const art = /^([LRDA])\.\s*(\d+(?:-\d+)*)(?![\d-])/.exec(reste);
  if (art) {
    const num = `${art[1]}${art[2]}`;
    const connus = [...idsTexte(url), ...idsTexte(c.url)].filter((t) => t in CODES);
    const texte =
      codeParPrefixe ??
      connus[0] ??
      (/^code-travail/.test(c.id) ? CODE_TRAVAIL : undefined);
    if (!texte) return { par: "aucun", raison: `article de code « ${num} » sans code identifiable` };
    return { par: "texte_et_numero", textes: [texte], nums: [num], code: true };
  }

  // Règlement de sécurité ERP : « PE 4 », « MS 38 », « GH U 16 » — et
  // « PO 1 § 3 — contrôle… » : le paragraphe et le libellé ne changent pas
  // l'article à lire (C51).
  const erp = /^([A-Z]{1,3}(?: [A-Z])?) (\d+(?:-\d+)?)(?:\s+(?:§|\u2014|-|\().*)?$/.exec(a.ref.trim());
  if (/^arrete-1980/.test(c.id) && /^Annexe\b/i.test(a.ref.trim())) {
    // « Annexe à l'article PO 11 » : Légifrance la numérote ainsi (relevé C51).
    const textes = [...new Set([...idsTexte(url), ...idsTexte(c.url), ...REGLEMENT_ERP])];
    return { par: "texte_et_numero", textes, nums: [a.ref.trim()], code: false };
  }
  if (erp && /^arrete-1980/.test(c.id)) {
    const textes = [...new Set([...idsTexte(url), ...idsTexte(c.url), ...REGLEMENT_ERP])];
    return {
      par: "texte_et_numero",
      textes,
      nums: [`${erp[1]} ${erp[2]}`, `${erp[1].replace(/ /g, "")}${erp[2]}`],
      code: false,
    };
  }

  const textesArrete = [...new Set([...idsTexte(url), ...idsTexte(c.url)])];
  const numsDe = (n: string, er?: string) => (er ? [`${n}er`, n] : [n]);

  // Article d'arrêté : « Arrêté 2004-03-01 art. 19 », « … art. 1er », « … art. 26 § 3 ».
  const ar = /\bart\.\s*(\d+(?:-\d+)?)(er)?\b/.exec(a.ref);
  if (ar) {
    if (textesArrete.length === 0) {
      return { par: "aucun", raison: "article d'arrêté sans identifiant de texte (LEGITEXT/JORFTEXT) au corpus" };
    }
    // « art. 7-11 » : une PLAGE si la borne haute dépasse la basse (« 78-1 »
    // reste l'article 78-1). Relevé C51 : l'arrêté du 20 novembre 2017 n'a pas
    // d'article « 7-11 », il a les articles 7 à 11.
    const plage = /^(\d+)-(\d+)$/.exec(ar[1]);
    if (plage && Number(plage[2]) > Number(plage[1]) && Number(plage[2]) - Number(plage[1]) <= 20) {
      const nums: string[][] = [];
      for (let k = Number(plage[1]); k <= Number(plage[2]); k++) nums.push(numsDe(String(k), k === 1 ? "er" : undefined));
      return { par: "plage", textes: textesArrete, nums };
    }
    return { par: "texte_et_numero", textes: textesArrete, nums: numsDe(ar[1], ar[2]), code: false };
  }
  // Annexe d'arrêté : « Arrêté 2004-03-01 annexe », « Arrêté 2011-12-26 annexe II ».
  const an = /\bannexe(?:\s+([IVXL]+))?\s*$/i.exec(a.ref.trim());
  if (an && textesArrete.length > 0 && (an[1] === undefined || ROMAIN.test(an[1]))) {
    return { par: "texte_et_numero", textes: textesArrete, nums: [an[1] ? `Annexe ${an[1]}` : "Annexe"], code: false };
  }
  // Arrêté cité entier, citation balisée « (art. 1er) … » : ces articles-là.
  const balises = [...(a.citationCle ?? "").matchAll(BALISE_ARTICLE)];
  if (/^Arrêté\s/.test(a.ref) && balises.length > 0 && textesArrete.length > 0) {
    return { par: "plage", textes: textesArrete, nums: balises.map((b) => numsDe(b[1], b[2])) };
  }
  if (/\bannexe\b/i.test(a.ref)) return { par: "aucun", raison: "annexe sans identifiant de texte au corpus" };
  if (/^Arrêté\s/.test(a.ref)) {
    return { par: "aucun", raison: "arrêté cité entier, sans article désigné ni citation balisée « (art. N) »" };
  }
  return { par: "aucun", raison: "référence sans numéro d'article ni identifiant LEGIARTI" };
}

// ---------------------------------------------------------------------------
// 2. LIRE : la version demandée, puis la version en vigueur
// ---------------------------------------------------------------------------

/** Une date de l'API (epoch ms ou chaîne) en jour civil, à Paris. */
export function jourCivil(d: number | string | undefined | null): string | undefined {
  if (d === undefined || d === null || d === "") return undefined;
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const n = typeof d === "number" ? d : Number(d);
  if (!Number.isFinite(n)) return undefined;
  // Légifrance date à minuit (UTC ou Paris selon les champs) : le jour à Paris est le bon dans les deux cas.
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(n));
}

/** Date conventionnelle de Légifrance : entrée en vigueur différée, non encore fixée. */
export const DATE_NON_FIXEE = "2222-02-22";

const ETATS_FIN = new Set(["ABROGE", "ABROGE_DIFF", "TRANSFERE", "PERIME", "ANNULE", "DISJOINT"]);

/** La version en vigueur parmi les versions connues : VIGUEUR, la plus récente. */
export function versionEnVigueur(versions: VersionArticleApi[]): VersionArticleApi | undefined {
  const v = versions.filter((x) => x.etat === "VIGUEUR");
  const t = (x: VersionArticleApi) => jourCivil(x.dateDebut) ?? "";
  return v.sort((x, y) => t(y).localeCompare(t(x)))[0];
}

export type Lecture =
  | { trouve: false; tentatives: string[] }
  | {
      trouve: true;
      tentatives: string[];
      /** L'article tel que désigné par le corpus. */
      demande: ArticleApi;
      /** Sa version en vigueur (la même si le corpus pointait déjà dessus). */
      courant: ArticleApi;
    };

export async function lireArticle(src: SourceArticles, cible: Cible): Promise<Lecture> {
  const tentatives: string[] = [];
  let demande: ArticleApi | null = null;
  if (cible.par === "id") {
    tentatives.push(`getArticle(${cible.id})`);
    demande = await src.getArticle(cible.id);
  } else if (cible.par === "texte_et_numero") {
    boucle: for (const t of cible.textes) {
      for (const n of cible.nums) {
        tentatives.push(`getArticleWithIdAndNum(${t}, « ${n} »)`);
        demande = await src.getArticleWithIdAndNum(t, n);
        if (demande) break boucle;
      }
    }
  } else if (cible.par === "plage") {
    return lirePlage(src, cible, tentatives);
  }
  if (!demande) return { trouve: false, tentatives };
  let courant = demande;
  const v = versionEnVigueur(demande.articleVersions ?? []);
  if (v?.id && v.id !== demande.id && demande.etat !== "VIGUEUR") {
    tentatives.push(`getArticle(${v.id}) — version en vigueur`);
    courant = (await src.getArticle(v.id)) ?? demande;
  }
  return { trouve: true, tentatives, demande, courant };
}

/**
 * Une plage d'articles lue comme un seul texte : chaque article en vigueur,
 * dans l'ordre ; le texte est leur suite (nota compris), la version est la
 * plus récente, et les modificateurs sont ceux de l'article le plus récent.
 * Un article absent rend la plage introuvable : on ne compare pas un morceau.
 */
async function lirePlage(
  src: SourceArticles,
  cible: Extract<Cible, { par: "plage" }>,
  tentatives: string[],
): Promise<Lecture> {
  const lus: ArticleApi[] = [];
  for (const nums of cible.nums) {
    let trouve: ArticleApi | null = null;
    boucle: for (const t of cible.textes) {
      for (const n of nums) {
        tentatives.push(`getArticleWithIdAndNum(${t}, « ${n} »)`);
        trouve = await src.getArticleWithIdAndNum(t, n);
        if (trouve) break boucle;
      }
    }
    if (!trouve) return { trouve: false, tentatives };
    lus.push(trouve);
  }
  const date = (x: ArticleApi) => jourCivil(x.dateDebut) ?? "";
  const recent = [...lus].sort((x, y) => date(y).localeCompare(date(x)))[0];
  const texte = lus
    .map((x) => {
      const corps = x.texteHtml ? texteDepuisHtml(x.texteHtml) : (x.texte ?? "");
      const nota = x.notaHtml ? texteDepuisHtml(x.notaHtml) : (x.nota ?? "");
      return nota.trim() ? `${corps} ${nota}` : corps;
    })
    .join(" ");
  const pire = lus.find((x) => x.etat !== "VIGUEUR");
  const assemble: ArticleApi = {
    id: lus.map((x) => x.id ?? "?").join("+"),
    etat: pire?.etat ?? "VIGUEUR",
    dateFin: pire?.dateFin,
    texte,
    dateDebut: recent.dateDebut,
    articleVersions: pire?.articleVersions ?? recent.articleVersions,
    lienModifications: recent.lienModifications,
    textTitles: recent.textTitles,
  };
  return { trouve: true, tentatives, demande: assemble, courant: assemble };
}

// ---------------------------------------------------------------------------
// 3. COMPARER
// ---------------------------------------------------------------------------

/** Le texte qui a produit la version courante, selon l'API. */
export type Modificateur = {
  titre: string;
  cid?: string;
  /** `lien` : un lien de modification ; `texte` : version initiale du texte porteur. */
  source: "lien" | "texte";
  type?: string;
  dateSignature?: string;
};

/**
 * CE QUE VALENT `linkType`, `linkOrientation` et `dateDebutCible` — relevé
 * sur les réponses BRUTES du premier passage réel (2026-09-27, 83 articles
 * en écart relus, JSON gardés hors dépôt). Trois exemples au texte
 * modificateur connu :
 *
 *   CCH R. 134-6 (version du 2026-04-01) :
 *     { linkType: "CODIFICATION", linkOrientation: "source",
 *       textTitle: "Décret n°2021-872 du 30 juin 2021 - art.",
 *       dateSignaTexte: null, dateDebutCible: null }
 *     { linkType: "MODIFIE", linkOrientation: "cible",
 *       textTitle: "Décret n°2026-166 du 4 mars 2026 - art. 1",
 *       dateSignaTexte: "2026-03-04", datePubliTexte: "2026-03-06",
 *       dateDebutCible: "2026-03-07" }
 *   R. 4223-11 (version du 2018-01-01) :
 *     { linkType: "MODIFIE", linkOrientation: "cible",
 *       textTitle: "Décret n°2017-1819 du 29 décembre 2017 - art. 3",
 *       dateSignaTexte: "2017-12-29", dateDebutCible: "2017-12-31" }
 *   MS 38 (règlement ERP, version du 2008-10-08) :
 *     { linkType: "MODIFICATION", linkOrientation: "source",
 *       textTitle: "Arrêté du 26 juin 2008 - art. 2, v. init.",
 *       dateSignaTexte: "2008-06-26", dateDebutCible: "2999-01-01" }
 *
 * Ce qu'on en tire :
 *  - `dateDebutCible` N'EST PAS la date de début de la version produite.
 *    C'est l'entrée en vigueur de l'article du texte modificateur (le
 *    lendemain de sa publication : 2026-03-07, 2017-12-31), ou la sentinelle
 *    « 2999-01-01 » (liens `MODIFICATION`), ou `null` (`CODIFICATION`).
 *    Le filtre « dateDebutCible = début de la version » de C50 écartait donc
 *    à tort le bon texte. Des 49 articles touchés par un constat
 *    « modificateur différent » au premier passage, 38 ne le sont plus une
 *    fois ce filtre retiré et le texte porteur ramené au rang de dernier
 *    recours (C51, corpus inchangé) ; les 11 autres étaient des écarts du
 *    corpus (URL d'un autre texte, texte modificateur faux).
 *  - `linkOrientation` ne dit PAS à lui seul le sens : il se lit avec
 *    `linkType`. Deux conventions coexistent dans LEGI, pour le même fait
 *    (« ce texte a modifié cet article ») :
 *      · verbe au participe, orientation « cible » — `MODIFIE`, `CREE`,
 *        `DEPLACE` : l'article est la cible, le texte nommé l'auteur (codes,
 *        arrêtés consolidés récemment) ;
 *      · substantif, orientation « source » — `MODIFICATION` : le texte nommé
 *        est la source de la modification (règlement ERP, arrêtés consolidés
 *        anciennement ; « v. init. » = il a produit la version initiale de
 *        cet identifiant).
 *    `CODIFICATION` / « source » nomme le texte de codification — l'origine
 *    de l'article dans le code, pas le texte de la version courante.
 *    Observé sur 90 liens : MODIFIE/cible 44, MODIFICATION/source 23,
 *    CODIFICATION/source 16, CREE/cible 6, DEPLACE/cible 1.
 *    Vu depuis l'article du texte modificateur, les mêmes liens sont
 *    « source » : la loi n° 2026-534, art. 95 (LEGIARTI000054312195) porte
 *    { linkType: "CREE", linkOrientation: "source", articleNum: "L8222-1-1" }.
 *    L'orientation est donc celle de l'article LU dans le lien.
 *  - `lienModifications` porte les liens de la version DEMANDÉE, pas de tout
 *    l'historique : l'arrêté 1986-01-31 art. 1 (trois versions) n'en a qu'un,
 *    celui de 2020 ; CSP R. 1321-23 (sept versions), un seul, celui de 2022.
 *
 *  - Aucune date ne départage les liens : les articles du règlement ERP
 *    reconsolidés en 2009 portent une version datée du 1980-08-15 et un lien
 *    « v. init. » vers un arrêté SIGNÉ APRÈS (GC 21 : arrêté du 10 octobre
 *    2005 ; EC 15 : du 19 novembre 2001). Un filtre « signé avant le début de
 *    la version », essayé au premier correctif, les écartait à tort.
 *  - `DEPLACE` / « cible » : l'article a été renuméroté ou déplacé par le
 *    texte nommé (R. 4624-32, R. 4624-33 : décret n° 2022-372 ; R. 4121-1 :
 *    décret n° 2011-354). C'est le texte de la version en vigueur, et il
 *    contredit un `modifiePar: null`.
 *
 * Donc : les modificateurs de la version courante sont ses liens de
 * modification, de création ou de déplacement (`CODIFICATION`, citations et
 * abrogations exclues). Faute de quoi, le texte de codification ; faute de
 * quoi, pour une version unique, le texte porteur.
 */
const LIENS_HORS_MODIFICATION = /CODIFICATION|CITATION|ABROG|PERIM|ANNUL|DISJOINT|CONCORD/i;

export function modificateursCourants(a: ArticleApi): Modificateur[] {
  const liens = a.lienModifications ?? [];
  const modifiants = liens.filter((l) => !LIENS_HORS_MODIFICATION.test(l.linkType ?? ""));
  const codification = liens.filter((l) => /CODIFICATION/i.test(l.linkType ?? ""));
  const retenus = modifiants.length > 0 ? modifiants : codification;
  const vus = new Set<string>();
  const out: Modificateur[] = [];
  for (const l of retenus) {
    const cle = l.textCid ?? l.textTitle ?? "";
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push(lienEnModificateur(l));
  }
  if (out.length > 0) return out;
  const t = a.textTitles?.[0];
  // Aucun lien : si la version courante est la première, c'est le texte porteur qui l'a produite.
  const premiere = (a.articleVersions ?? []).length <= 1;
  if (t && premiere) {
    return [
      {
        titre: t.titreLong ?? t.titre ?? "(texte porteur sans titre)",
        cid: t.cid,
        source: "texte",
        dateSignature: jourCivil(t.dateTexte),
      },
    ];
  }
  return [];
}

function lienEnModificateur(l: LienModificationApi): Modificateur {
  return {
    titre: l.textTitle ?? "(sans titre)",
    cid: l.textCid,
    source: "lien",
    type: l.linkType,
    dateSignature: jourCivil(l.dateSignaTexte),
  };
}

const MOIS: Record<string, string> = {
  janvier: "01", "février": "02", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06",
  juillet: "07", "août": "08", aout: "08", septembre: "09", octobre: "10", novembre: "11",
  "décembre": "12", decembre: "12",
};

/** Ce qui identifie un texte cité en prose : son JORFTEXT, son numéro, sa nature et sa date. */
export type CleTexte = { jorftext?: string; numero?: string; nature?: string; date?: string };

export function cleTexte(titre: string, url?: string): CleTexte {
  const k: CleTexte = {};
  k.jorftext = /JORFTEXT\d{12}/.exec(url ?? "")?.[0] ?? /JORFTEXT\d{12}/.exec(titre)?.[0];
  k.numero = /n°\s*(\d{2,4}-\d+)/i.exec(titre)?.[1];
  k.nature = /^\s*(décret|arrêté|loi|ordonnance)/i.exec(titre)?.[1]?.toLowerCase();
  const d = /\bdu\s+(\d{1,2})(?:er)?\s+([a-zéû]+)\s+(\d{4})/i.exec(titre);
  if (d && MOIS[d[2].toLowerCase()]) {
    k.date = `${d[3]}-${MOIS[d[2].toLowerCase()]}-${d[1].padStart(2, "0")}`;
  } else {
    // Graphie ISO relevée à l'API (C51) : « Arrêté 1993-06-04 art. 1 JORF 15 juin 1993 ».
    // La date de SIGNATURE est la première ; celle du JORF qui suit n'est pas lue.
    const iso = /^\s*(?:décret|arrêté|loi|ordonnance)\s+(\d{4}-\d{2}-\d{2})\b/i.exec(titre);
    if (iso) k.date = iso[1];
  }
  return k;
}

/**
 * Deux mentions désignent-elles le même texte ? Par JORFTEXT si les deux en
 * ont un ; sinon par numéro ; sinon par nature ET date de signature.
 * `undefined` : pas assez d'éléments pour trancher.
 */
export function memeTexte(a: CleTexte, b: CleTexte): boolean | undefined {
  if (a.jorftext && b.jorftext) return a.jorftext === b.jorftext;
  if (a.numero && b.numero) return a.numero === b.numero;
  if (a.date && b.date) return a.date === b.date && (!a.nature || !b.nature || a.nature === b.nature);
  return undefined;
}

export type Constat = { categorie: Categorie; detail: string };

export type ResultatArticle = {
  corpusId: string;
  ref: string;
  statut: ArticleDepouille["statut"];
  url?: string;
  categorie: Categorie;
  constats: Constat[];
  /** Ce qui a été appelé — sans jeton, sans secret. */
  tentatives: string[];
  officiel?: {
    id?: string;
    etat?: string;
    dateDebut?: string;
    modificateurs: Modificateur[];
    idDemandePerime?: boolean;
    /** Version `VIGUEUR_DIFF` qui succède à une version `ABROGE_DIFF`. */
    versionSuivante?: { id?: string; dateDebut?: string };
  };
  /** Pour trier les écarts de citation : distance cumulée en mots. */
  distanceCitation?: number;
  compare: { citation: boolean; version: boolean; modificateur: boolean };
  /** L'API a échoué sur cet article (après reprises) : ni écart ni vérifié. */
  erreurApi?: boolean;
};

function plusGrave(cs: Constat[]): Categorie {
  for (const c of CATEGORIES) if (cs.some((x) => x.categorie === c)) return c;
  return "ok";
}

export function analyser(
  a: ArticleDepouille,
  corpusId: string,
  cible: Cible,
  lecture: Lecture,
): ResultatArticle {
  const base = {
    corpusId,
    ref: a.ref,
    statut: a.statut,
    url: a.url,
    tentatives: lecture.tentatives,
    compare: { citation: false, version: false, modificateur: false },
  };
  if (cible.par === "aucun") {
    const constats: Constat[] = [{ categorie: "non_verifiable", detail: cible.raison }];
    return { ...base, categorie: "non_verifiable", constats };
  }
  if (!lecture.trouve) {
    // Un identifiant qui ne rend rien, ou un article de code absent : un écart.
    // Un article d'arrêté cherché par numéro : la méthode n'est documentée que
    // pour les LEGITEXT, l'absence ne prouve rien.
    const constats: Constat[] =
      cible.par === "id" || (cible.par === "texte_et_numero" && cible.code)
        ? [
            {
              categorie: "introuvable",
              detail:
                cible.par === "id"
                  ? `l'identifiant ${cible.id} ne rend aucun article`
                  : `aucun article en vigueur « ${cible.nums[0]} » dans ${CODES[cible.textes[0]] ?? cible.textes[0]} (limite documentée de getArticleWithIdAndNum : un article à version différée n'est pas trouvé)`,
            },
          ]
        : [
            {
              categorie: "non_verifiable",
              detail: `recherche par texte et numéro sans résultat (${lecture.tentatives.length} essai(s))`,
            },
          ];
    return { ...base, categorie: plusGrave(constats), constats };
  }

  const { demande, courant } = lecture;
  const constats: Constat[] = [];
  const compare = { ...base.compare };

  // 4. abrogé / transféré — ou version future programmée.
  //
  // `ABROGE_DIFF` est l'état d'une VERSION qui prend fin à une date connue,
  // pas celui d'un article qui disparaît : relevé au passage réel du
  // 2026-09-27, R. 4227-37, L. 8222-2 et C. env. L. 512-7 sont tous trois
  // `ABROGE_DIFF` ET suivis d'une version `VIGUEUR_DIFF` commençant le jour
  // même de la fin (décret 2025-1100, loi 2026-534, loi 2025-794). C'est une
  // modification programmée ; seule une version `ABROGE_DIFF` sans suivante
  // est une abrogation différée. La date « 2222-02-22 » est la date
  // conventionnelle de Légifrance pour une entrée en vigueur non encore
  // fixée (L. 512-7 : « à la date de publication de l'acte d'exécution »
  // européen) : elle se signale, elle ne se compare pas.
  const etat = courant.etat ?? "";
  const fin = jourCivil(courant.dateFin);
  const suivante =
    etat === "ABROGE_DIFF"
      ? (courant.articleVersions ?? []).find((v) => v.etat === "VIGUEUR_DIFF" && jourCivil(v.dateDebut) === fin)
      : undefined;
  if (suivante) {
    const date = jourCivil(suivante.dateDebut);
    if (date !== DATE_NON_FIXEE && a.versionFuture !== date) {
      constats.push({
        categorie: "version_differente",
        detail: `version future programmée au ${date} (${suivante.id ?? "?"}, VIGUEUR_DIFF) ; corpus versionFuture : ${a.versionFuture ?? "absente"}`,
      });
    }
  } else if (ETATS_FIN.has(etat)) {
    constats.push({
      categorie: "abroge",
      detail: `état « ${etat} »${courant.dateFin && etat !== "ABROGE_DIFF" ? ` depuis le ${jourCivil(courant.dateFin)}` : ""}${etat === "ABROGE_DIFF" ? ` — abrogation différée au ${jourCivil(courant.dateFin) ?? "?"}` : ""}`,
    });
  } else if (etat !== "VIGUEUR" && etat !== "VIGUEUR_DIFF" && !versionEnVigueur(courant.articleVersions ?? [])) {
    constats.push({ categorie: "abroge", detail: `état « ${etat || "?"} » et aucune version en vigueur` });
  }

  // 1. citation
  // Le nota suit le texte, comme Légifrance l'affiche : le corpus le cite
  // parfois pour la date d'application (arrêté 1986-01-31 art. 103, C51).
  const corps = courant.texteHtml ? texteDepuisHtml(courant.texteHtml) : (courant.texte ?? "");
  const nota = courant.notaHtml ? texteDepuisHtml(courant.notaHtml) : (courant.nota ?? "");
  const texte = corps.trim() !== "" && nota.trim() !== "" ? `${corps} ${nota}` : corps;
  let comparaison: ComparaisonCitation | undefined;
  let distance: number | undefined;
  if (a.citationCle && texte.trim() !== "") {
    compare.citation = true;
    comparaison = comparerCitation(a.citationCle, texte);
    if (!comparaison.exacte) {
      distance = comparaison.ecarts.reduce((s, e) => s + e.distance, 0);
      const lignes = comparaison.ecarts.map((e) =>
        e.distance > e.fragment.split(" ").length / 2
          ? `aucun passage proche (distance ${e.distance} pour ${e.fragment.split(" ").length} mots) : « ${tronquer(e.fragment, 160)} »`
          : diffLisible(e.diff),
      );
      constats.push({
        categorie: "ecart_citation",
        detail: `${comparaison.ecarts.length}/${comparaison.fragments} fragment(s) non retrouvé(s) : ${lignes.join(" ‖ ")}`,
      });
    }
  }

  // 2. version
  const debut = jourCivil(courant.dateDebut);
  if (a.versionEnVigueur && debut) {
    compare.version = true;
    if (a.versionEnVigueur !== debut) {
      const differee = (courant.articleVersions ?? []).find(
        (v) => v.etat === "VIGUEUR_DIFF" && jourCivil(v.dateDebut) === a.versionEnVigueur,
      );
      constats.push({
        categorie: "version_differente",
        detail: `corpus ${a.versionEnVigueur}, Légifrance ${debut}${differee ? " (le corpus date la version DIFFÉRÉE)" : ""}`,
      });
    }
  }

  // 3. modificateur
  const modifs = modificateursCourants(courant);
  if (a.modifiePar !== undefined) {
    compare.modificateur = true;
    const creation = modifs.every((m) => m.source === "texte" || /CREATION|CREE|CODIFICATION/i.test(m.type ?? ""));
    if (a.modifiePar === null) {
      // « Rien à signaler » : contredit seulement par un lien qui MODIFIE la version courante.
      if (modifs.length > 0 && !creation) {
        constats.push({
          categorie: "modificateur_different",
          detail: `corpus : aucun (null) ; Légifrance : ${modifs.map((m) => m.titre).join(" ; ")}`,
        });
      }
    } else if (modifs.length === 0) {
      constats.push({
        categorie: "modificateur_different",
        detail: `corpus : « ${a.modifiePar.texte} » ; Légifrance : aucun lien daté du ${debut ?? "?"}`,
      });
    } else {
      const cleCorpus = cleTexte(a.modifiePar.texte, a.modifiePar.url);
      const clesApi = modifs.map((m) => ({
        ...cleTexte(m.titre),
        jorftext: m.cid?.startsWith("JORFTEXT") ? m.cid : undefined,
        date: m.dateSignature ?? cleTexte(m.titre).date,
      }));
      const verdicts = clesApi.map((k) => memeTexte(cleCorpus, k));
      if (!verdicts.some((v) => v === true)) {
        // Le titre concorde (numéro ou date) mais le JORFTEXT de l'URL du
        // corpus désigne un autre texte : c'est l'URL qui est en cause, le dire.
        const urlSeule = cleCorpus.jorftext
          ? clesApi.find((k) => memeTexte({ ...cleCorpus, jorftext: undefined }, { ...k, jorftext: undefined }) === true)
          : undefined;
        constats.push({
          categorie: "modificateur_different",
          detail: `corpus : « ${a.modifiePar.texte} » ; Légifrance : ${modifs.map((m) => m.titre).join(" ; ")}${
            urlSeule
              ? ` (même titre, mais l'URL du corpus pointe ${cleCorpus.jorftext}, Légifrance ${urlSeule.jorftext ?? "?"})`
              : verdicts.every((v) => v === undefined)
                ? " (identité non établie : ni JORFTEXT, ni numéro, ni date comparables)"
                : ""
          }`,
        });
      }
    }
  }

  return {
    ...base,
    compare,
    categorie: plusGrave(constats),
    constats,
    distanceCitation: distance,
    officiel: {
      id: courant.id,
      etat: courant.etat,
      dateDebut: debut,
      modificateurs: modifs,
      idDemandePerime: demande.id !== courant.id,
      versionSuivante: suivante ? { id: suivante.id, dateDebut: jourCivil(suivante.dateDebut) } : undefined,
    },
  };
}

function tronquer(t: string, n: number): string {
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

// ---------------------------------------------------------------------------
// 4. ORCHESTRER
// ---------------------------------------------------------------------------

export type Selection = { refs?: string[]; corpus?: string[] };

export function selectionner(
  corpus: readonly Corpus[],
  sel: Selection,
): { corpus: Corpus; article: ArticleDepouille }[] {
  const normRef = (r: string) => r.replace(/\s+/g, " ").trim();
  const refs = sel.refs?.map(normRef);
  return corpus
    .filter((c) => !sel.corpus || sel.corpus.includes(c.id))
    .flatMap((c) => c.articles.map((article) => ({ corpus: c, article })))
    .filter(({ article }) => !refs || refs.includes(normRef(article.ref)));
}

export async function verifierCorpus(
  src: SourceArticles,
  articles: { corpus: Corpus; article: ArticleDepouille }[],
  surProgression?: (r: ResultatArticle, i: number, n: number) => void,
): Promise<ResultatArticle[]> {
  // Un même article peut figurer dans plusieurs corpus : une lecture par cible.
  const cache = new Map<string, Promise<Lecture>>();
  const out: ResultatArticle[] = [];
  for (let i = 0; i < articles.length; i++) {
    const { corpus, article } = articles[i];
    const cible = resoudreCible(article, corpus);
    let r: ResultatArticle;
    if (cible.par === "aucun") {
      r = analyser(article, corpus.id, cible, { trouve: false, tentatives: [] });
    } else {
      const cle = JSON.stringify(cible);
      if (!cache.has(cle)) cache.set(cle, lireArticle(src, cible));
      try {
        r = analyser(article, corpus.id, cible, await cache.get(cle)!);
      } catch (e) {
        // Une erreur d'authentification arrête tout : la suite échouerait pareil.
        const nature = e && typeof e === "object" && "nature" in e ? (e as { nature: unknown }).nature : undefined;
        if (nature === "authentification" || nature === "configuration") throw e;
        r = {
          corpusId: corpus.id,
          ref: article.ref,
          statut: article.statut,
          url: article.url,
          categorie: "non_verifiable",
          constats: [
            { categorie: "non_verifiable", detail: `erreur API : ${e instanceof Error ? e.message : String(e)}` },
          ],
          tentatives: [],
          compare: { citation: false, version: false, modificateur: false },
          erreurApi: true,
        };
      }
    }
    out.push(r);
    surProgression?.(r, i, articles.length);
  }
  return out;
}

export function aEchoueSurApi(r: ResultatArticle): boolean {
  return r.erreurApi === true;
}

// ---------------------------------------------------------------------------
// 5. RENDRE
// ---------------------------------------------------------------------------

export function compter(rs: ResultatArticle[]): Record<Categorie, number> {
  const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Categorie, number>;
  for (const r of rs) c[r.categorie]++;
  return c;
}

/** Nombre d'articles touchés par chaque catégorie de constat (un article peut en cumuler). */
export function compterConstats(rs: ResultatArticle[]): Record<Categorie, number> {
  const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Categorie, number>;
  for (const r of rs) for (const k of new Set(r.constats.map((x) => x.categorie))) c[k]++;
  return c;
}

/** Les écarts, du plus important au moins important. */
export function ecartsParImportance(rs: ResultatArticle[]): ResultatArticle[] {
  const rang = (r: ResultatArticle) => CATEGORIES.indexOf(r.categorie);
  const poidsStatut = (r: ResultatArticle) => (r.statut === "retenu" ? 0 : r.statut === "obligation_manquante" ? 1 : 2);
  return rs
    .filter((r) => estEcart(r.categorie))
    .sort(
      (x, y) =>
        rang(x) - rang(y) ||
        poidsStatut(x) - poidsStatut(y) ||
        y.constats.length - x.constats.length ||
        (y.distanceCitation ?? 0) - (x.distanceCitation ?? 0),
    );
}

const echapper = (t: string) => t.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function rendreRapport(
  rs: ResultatArticle[],
  meta: { date: string; env: string; selection: string; appels: number; reprises: number; commit?: string },
): string {
  const n = compter(rs);
  const nc = compterConstats(rs);
  const L: string[] = [];
  L.push(`# Vérification du corpus contre l'API Légifrance — ${meta.date}`);
  L.push("");
  L.push(
    `*Produit par \`pnpm legifrance:verifier\` (\`scripts/verifier-corpus-legifrance.ts\`). Environnement PISTE : **${meta.env}**. Sélection : ${meta.selection}. ${rs.length} article(s), ${meta.appels} appel(s) à l'API, ${meta.reprises} reprise(s).${meta.commit ? ` Corpus à \`${meta.commit}\`.` : ""} Mode d'emploi : \`docs/outils/legifrance-api.md\`.*`,
  );
  L.push("");
  L.push("Ce rapport CONSTATE. Il ne corrige rien : chaque écart se contre-vérifie sur Légifrance avant de toucher au corpus.");
  L.push("");
  L.push("## Compteurs");
  L.push("");
  L.push("| Catégorie | Articles (catégorie la plus grave) | Articles touchés (cumul) |");
  L.push("|---|---:|---:|");
  for (const k of CATEGORIES) L.push(`| ${LIBELLES[k]} | ${n[k]} | ${nc[k]} |`);
  L.push("");
  const comp = {
    citation: rs.filter((r) => r.compare.citation).length,
    version: rs.filter((r) => r.compare.version).length,
    modificateur: rs.filter((r) => r.compare.modificateur).length,
  };
  L.push(
    `Comparaisons effectuées : citation ${comp.citation}, version ${comp.version}, modificateur ${comp.modificateur}. Un article sans \`citationCle\`, sans \`versionEnVigueur\` ou sans \`modifiePar\` n'est pas comparé sur ce point — il n'est pas pour autant « OK » sur ce point.`,
  );
  L.push("");
  const ecarts = ecartsParImportance(rs);
  L.push(`## Écarts (${ecarts.length}), du plus important au moins important`);
  L.push("");
  L.push("Ordre : gravité (abrogé, introuvable, citation, version, modificateur), puis articles `retenu` d'abord, puis nombre de constats, puis distance de la citation.");
  L.push("");
  L.push("Diff : `[-mot-]` est dans le corpus seulement, `{+mot+}` dans le texte officiel seulement.");
  L.push("");
  for (const r of ecarts) {
    L.push(`### ${r.ref} — ${LIBELLES[r.categorie]} (\`${r.corpusId}\`, ${r.statut})`);
    L.push("");
    for (const c of r.constats) L.push(`- **${LIBELLES[c.categorie]}** : ${c.detail}`);
    if (r.officiel) {
      L.push(
        `- Légifrance : \`${r.officiel.id ?? "?"}\`, état ${r.officiel.etat ?? "?"}, en vigueur depuis ${r.officiel.dateDebut ?? "?"}${r.officiel.idDemandePerime ? " — l'identifiant du corpus désigne une version antérieure" : ""}.`,
      );
    }
    L.push(`- Appels : ${r.tentatives.join(" ; ") || "aucun"}`);
    L.push("");
  }
  const futures = rs.filter((r) => r.officiel?.versionSuivante);
  if (futures.length) {
    L.push(`## Versions futures programmées (${futures.length})`);
    L.push("");
    L.push("Version en vigueur `ABROGE_DIFF` suivie d'une version `VIGUEUR_DIFF` : une modification programmée, pas une abrogation. « 2222-02-22 » = date non encore fixée (convention Légifrance).");
    L.push("");
    for (const r of futures) {
      const v = r.officiel!.versionSuivante!;
      L.push(`- ${r.ref} (\`${r.corpusId}\`, ${r.statut}) : \`${v.id ?? "?"}\` à compter du ${v.dateDebut === DATE_NON_FIXEE ? "— date non fixée (2222-02-22)" : v.dateDebut}.`);
    }
    L.push("");
  }
  L.push("## Tous les articles");
  L.push("");
  L.push("| Corpus | Article | Résultat | Citation | Version | Modificateur | Légifrance |");
  L.push("|---|---|---|---|---|---|---|");
  const marque = (compare: boolean, cat: Categorie, r: ResultatArticle) =>
    !compare ? "—" : r.constats.some((c) => c.categorie === cat) ? "✗" : "✓";
  for (const r of rs) {
    L.push(
      `| ${r.corpusId} | ${echapper(r.ref)} | ${LIBELLES[r.categorie]}${r.categorie === "non_verifiable" ? ` : ${echapper(r.constats[0]?.detail ?? "")}` : ""} | ${marque(r.compare.citation, "ecart_citation", r)} | ${marque(r.compare.version, "version_differente", r)} | ${marque(r.compare.modificateur, "modificateur_different", r)} | ${r.officiel ? `${r.officiel.id ?? ""} ${r.officiel.etat ?? ""} ${r.officiel.dateDebut ?? ""}` : ""} |`,
    );
  }
  L.push("");
  return L.join("\n");
}
