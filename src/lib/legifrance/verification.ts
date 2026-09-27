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
  | { par: "aucun"; raison: string };

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

  // Règlement de sécurité ERP : « PE 4 », « MS 38 », « GH U 16 ».
  const erp = /^([A-Z]{1,3}(?: [A-Z])?) (\d+(?:-\d+)?)$/.exec(a.ref.trim());
  if (erp && /^arrete-1980/.test(c.id)) {
    const textes = [...new Set([...idsTexte(url), ...idsTexte(c.url), ...REGLEMENT_ERP])];
    return {
      par: "texte_et_numero",
      textes,
      nums: [`${erp[1]} ${erp[2]}`, `${erp[1].replace(/ /g, "")}${erp[2]}`],
      code: false,
    };
  }

  // Article d'arrêté : « Arrêté 2004-03-01 art. 19 », « … art. 1er », « … art. 26 § 3 ».
  const ar = /\bart\.\s*(\d+(?:-\d+)?)(er)?\b/.exec(a.ref);
  if (ar) {
    const textes = [...new Set([...idsTexte(url), ...idsTexte(c.url)])];
    if (textes.length === 0) {
      return { par: "aucun", raison: "article d'arrêté sans identifiant de texte (LEGITEXT/JORFTEXT) au corpus" };
    }
    const nums = ar[2] ? [`${ar[1]}er`, ar[1]] : [ar[1]];
    return { par: "texte_et_numero", textes, nums, code: false };
  }
  if (/\bannexe\b/i.test(a.ref)) return { par: "aucun", raison: "annexe : pas un article numéroté" };
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
 * Les liens qui ont produit la version courante : ceux dont la date de début
 * de la cible est la date de début de la version. Faute de quoi (lien non
 * daté), aucun — on ne devine pas.
 *
 * Le SENS du lien (`linkOrientation`) n'est pas documenté au Swagger. Le
 * filtre retient donc tous les sens à la bonne date, en préférant « cible »
 * s'il en existe : un article porte les liens vers les textes qui l'ont
 * modifié avec le sens « cible » dans les données LEGI. À confirmer au
 * premier passage réel (docs/outils/legifrance-api.md, « points ouverts »).
 */
export function modificateursCourants(a: ArticleApi): Modificateur[] {
  const debut = jourCivil(a.dateDebut);
  const liens = (a.lienModifications ?? []).filter(
    (l) => debut !== undefined && jourCivil(l.dateDebutCible) === debut && !/CITATION/i.test(l.linkType ?? ""),
  );
  const cibles = liens.filter((l) => (l.linkOrientation ?? "").toLowerCase() === "cible");
  const retenus = cibles.length > 0 ? cibles : liens;
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
  // Pas de lien daté : si la version courante est la première, c'est le texte porteur qui l'a produite.
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

  // 4. abrogé / transféré
  const etat = courant.etat ?? "";
  if (ETATS_FIN.has(etat)) {
    constats.push({
      categorie: "abroge",
      detail: `état « ${etat} »${courant.dateFin && etat !== "ABROGE_DIFF" ? ` depuis le ${jourCivil(courant.dateFin)}` : ""}${etat === "ABROGE_DIFF" ? ` — abrogation différée au ${jourCivil(courant.dateFin) ?? "?"}` : ""}`,
    });
  } else if (etat !== "VIGUEUR" && etat !== "VIGUEUR_DIFF" && !versionEnVigueur(courant.articleVersions ?? [])) {
    constats.push({ categorie: "abroge", detail: `état « ${etat || "?"} » et aucune version en vigueur` });
  }

  // 1. citation
  const texte = courant.texteHtml ? texteDepuisHtml(courant.texteHtml) : (courant.texte ?? "");
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
    const creation = modifs.every((m) => m.source === "texte" || /CREATION|CREE/i.test(m.type ?? ""));
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
      const verdicts = modifs.map((m) =>
        memeTexte(cleCorpus, { ...cleTexte(m.titre), jorftext: m.cid?.startsWith("JORFTEXT") ? m.cid : undefined, date: m.dateSignature ?? cleTexte(m.titre).date }),
      );
      if (!verdicts.some((v) => v === true)) {
        constats.push({
          categorie: "modificateur_different",
          detail: `corpus : « ${a.modifiePar.texte} » ; Légifrance : ${modifs.map((m) => m.titre).join(" ; ")}${verdicts.every((v) => v === undefined) ? " (identité non établie : ni JORFTEXT, ni numéro, ni date comparables)" : ""}`,
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
