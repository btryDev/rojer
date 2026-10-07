// À quel point le référentiel repose-t-il sur des textes réellement lus ?
//
// Le corpus sait dire ce qu'il a lu. Le référentiel sait dire ce qu'il cite.
// Personne ne savait dire ce que le second doit au premier — et l'information
// existait pourtant, éparpillée entre les champs de deux modules, des messages
// de commit et un compte rendu de nuit que personne ne rouvre. Le 2026-09-01,
// deux personnes ont cru successivement, à quelques minutes d'écart, qu'aucune
// relecture n'avait eu lieu puis que tout avait été vérifié. Les deux étaient
// faux, et une relecture complète a failli être relancée sur des articles déjà
// lus.
//
// Ce module fait le rapprochement, et il ne fait que ça : il mesure ce qui est
// écrit. Il ne dit pas si une périodicité est juste, ni si un champ
// d'application est le bon — ces questions supposent d'ouvrir le texte, ce
// qu'aucun script ne sait faire, et prétendre le contraire serait exactement le
// défaut que ce travail combat.
//
// LES DEUX CHAMPS QU'ON CONFOND, et il faut les tenir séparés pour lire quoi
// que ce soit ici :
//
//   `ArticleDepouille.luLe` / `.lecture` / `.citationCle` (corpus)
//        → la trace de LECTURE : quand le texte a été ouvert, par quel moyen,
//          et ce qu'on en a relevé.
//   `ReferenceLegale.versionConstatee` (obligation)
//        → l'ancre de VEILLE : la version du texte contre laquelle l'obligation
//          a été calée, celle qui permettra de voir qu'il a bougé.
//
// Ce sont deux questions distinctes. Une référence peut être lue à la source
// avec verbatim et ne porter aucune ancre de veille ; l'inverse existe aussi.
// Les fondre en une note unique effacerait celle des deux qui manque, et c'est
// pourquoi ce module rend deux axes et non un.
//
// Les deux se rejoignent par la clé `article`, et par elle seule.
//
// Module **pur** : ni Prisma, ni React, ni horloge — la date du rendu est
// passée en argument, pour que le document produit soit reproductible.

import { obligationsConformite } from "../conformite";
import type { Obligation, ReferenceLegale } from "../conformite/types";
import { porteurDe, type PorteurObligation } from "../conformite/types";
import { referencesCitees } from "../conformite/rythme-retenu";
import { CORPUS, indexArticlesParRef } from "./index";
import type { ArticleDepouille } from "./types";

// -----------------------------------------------------------------------------
// L'échelle
// -----------------------------------------------------------------------------

/**
 * Le degré de vérification d'une référence, sur l'axe de la LECTURE.
 *
 * L'échelle répond à une seule question — « qu'est-ce que le dépôt prouve
 * qu'on a lu du texte que cette obligation cite ? » — et ses barreaux sont
 * ceux que les données permettent de distinguer, pas ceux qu'on aimerait
 * avoir. Chacun correspond à une combinaison de champs réellement présente ou
 * réellement possible dans les types du corpus ; aucun n'est décoratif.
 *
 * L'axe de la VEILLE (`versionConstatee`) est tenu à part, dans `Ancrage`.
 */
export type CodeDegre =
  | "premiere_main"
  | "agent_verbatim"
  | "lu_sans_verbatim"
  | "lecture_indirecte"
  | "sans_trace_de_lecture"
  | "jamais_ouvert";

export type Degre = {
  code: CodeDegre;
  /** Plus le rang est haut, plus la vérification est solide. */
  rang: number;
  titre: string;
  /** Le titre en deux mots, pour une colonne de tableau. */
  court: string;
  /** Ce que le dépôt permet d'affirmer à ce degré — et rien de plus. */
  affirme: string;
  /** Pourquoi ce barreau est distinct du précédent. */
  pourquoiDistinct: string;
};

/**
 * Les six degrés, du plus solide au plus faible.
 *
 * La justification tient en trois coupures :
 *
 * 1. **Qui a lu** sépare `premiere_main` d'`agent_verbatim`. Le corpus porte
 *    déjà cette distinction dans `SourceLecture` et la commente ainsi : un
 *    relevé d'agent « vaut constat, pas garantie ». La reprendre ici n'invente
 *    rien, elle refuse seulement d'aplatir ce que le type distingue.
 * 2. **Ce qu'on a rapporté** sépare les deux premiers de `lu_sans_verbatim`.
 *    Sans `citationCle`, la date de lecture atteste qu'on a ouvert le texte et
 *    rien d'autre : un relecteur ne peut ni contrôler ni contredire l'encodage
 *    sans rouvrir Légifrance. C'est la coupure qui porte le plus de monde.
 * 3. **Où on a lu** isole `lecture_indirecte`, que le corpus déclare lui-même
 *    incapable de fonder une entrée. Le degré existe donc au-dessous de la
 *    lecture sans verbatim : mieux vaut savoir qu'on a ouvert le bon texte sans
 *    rien en relever, que d'avoir lu un résumé qui ne porte pas la version.
 *
 * Les deux derniers barreaux ne parlent plus de qualité de lecture mais
 * d'absence : le texte est au corpus sans trace de lecture, ou il n'y a rien à
 * ouvrir du tout. Ils valent zéro et un plutôt que d'être fondus, parce que le
 * remède diffère — dépouiller dans un cas, rattacher une clé dans l'autre.
 */
export const DEGRES: readonly Degre[] = [
  {
    code: "premiere_main",
    rang: 5,
    court: "première main",
    titre: "lu à la source, verbatim relevé",
    affirme:
      "le texte a été ouvert sur Légifrance par la personne qui l'encode, ou relu par l'API officielle Légifrance, à une date connue, et la phrase décisive est recopiée dans le dépôt",
    pourquoiDistinct:
      "le verbatim est relisible sans rouvrir le texte, et le relevé n'a pas transité par un tiers",
  },
  {
    code: "agent_verbatim",
    rang: 4,
    court: "agent + verbatim",
    titre: "lu à la source par un agent, verbatim rapporté",
    affirme:
      "un agent a ouvert le texte à une date connue et en a rapporté la phrase décisive — constat, pas garantie : le verbatim n'a pas été recoupé",
    pourquoiDistinct:
      "le corpus porte déjà cette réserve dans SourceLecture ; l'aplatir sur le degré précédent la ferait disparaître",
  },
  {
    code: "lu_sans_verbatim",
    rang: 3,
    court: "lu sans verbatim",
    titre: "lu et daté, aucun verbatim",
    affirme:
      "le texte a été ouvert à une date connue ; ce qu'il dit n'est nulle part dans le dépôt",
    pourquoiDistinct:
      "rien n'est relisible : contrôler ou contredire l'encodage suppose de rouvrir le texte",
  },
  {
    code: "lecture_indirecte",
    rang: 2,
    court: "indirect",
    titre: "lu ailleurs qu'à la source",
    affirme:
      "quelqu'un a lu une reproduction, un résumé ou une base professionnelle — aucune date de version ne fait foi",
    pourquoiDistinct:
      "le corpus déclare lui-même qu'une lecture indirecte ne peut pas fonder une entrée du référentiel",
  },
  {
    code: "sans_trace_de_lecture",
    rang: 1,
    court: "sans trace",
    titre: "au corpus, aucune trace de lecture",
    affirme:
      "l'article est inscrit au corpus et rien n'atteste qu'il ait été ouvert : statut « non dépouillé », ou pas de date, ou pas de moyen de lecture",
    pourquoiDistinct:
      "il y a un texte identifié à aller lire — le remède est de le dépouiller",
  },
  {
    code: "jamais_ouvert",
    rang: 0,
    court: "non rattaché",
    titre: "rien à ouvrir",
    affirme:
      "la référence ne porte pas de clé d'article, ou porte une clé qu'aucun corpus ne connaît : elle n'est rapprochable de rien",
    pourquoiDistinct:
      "le remède n'est pas de lire mais de rattacher — tant que la clé manque, l'article n'apparaît même pas dans la liste de travail du dépouillement",
  },
] as const;

const PAR_CODE = new Map(DEGRES.map((d) => [d.code, d]));

export function degre(code: CodeDegre): Degre {
  const d = PAR_CODE.get(code);
  // Impossible par typage ; la garde existe pour que l'ajout d'un code sans
  // barreau échoue bruyamment plutôt que de rendre `undefined`.
  if (!d) throw new Error(`Degré sans définition : ${code}`);
  return d;
}

function plusFaible(a: CodeDegre, b: CodeDegre): CodeDegre {
  return degre(a).rang <= degre(b).rang ? a : b;
}

// -----------------------------------------------------------------------------
// L'axe de veille
// -----------------------------------------------------------------------------

/**
 * L'ancre de veille d'une référence : le dépôt saura-t-il voir que le texte a
 * bougé ?
 *
 * `divergent` n'est pas un défaut de veille mais une contradiction interne :
 * l'obligation dit avoir constaté une version, le corpus en a lu une autre. Le
 * cas mérite son propre nom parce que le remède n'est pas le même — il faut
 * trancher laquelle des deux dates est la bonne, pas aller relire.
 */
export type Ancrage = "ancre" | "divergent" | "jamais_constate";

export const ANCRAGES: readonly { code: Ancrage; titre: string }[] = [
  { code: "ancre", titre: "version constatée, concordante avec le corpus" },
  {
    code: "divergent",
    titre: "version constatée ≠ version lue au corpus — à trancher",
  },
  {
    code: "jamais_constate",
    titre: "aucune version constatée — à vérifier, pas « à jour »",
  },
] as const;

// -----------------------------------------------------------------------------
// La mesure, référence par référence
// -----------------------------------------------------------------------------

export type ReferenceMesuree = {
  obligation: string;
  /** 0 = le fondement ; au-delà, les références de contexte. */
  position: number;
  source: string;
  reference: string;
  article: string | null;
  corpus: string | null;
  statutCorpus: string | null;
  luLe: string | null;
  lecture: string | null;
  aPrescrit: boolean;
  aCitationCle: boolean;
  versionEnVigueur: string | null;
  versionConstatee: string | null;
  degre: CodeDegre;
  ancrage: Ancrage;
};

/**
 * Le degré d'une référence, à partir de la seule chose qui l'établisse : ce que
 * le corpus porte sur l'article qu'elle désigne.
 *
 * Exporté pour être éprouvé barreau par barreau. Trois des six degrés ne sont
 * atteints par aucune référence du dépôt aujourd'hui ; sans un test qui les
 * fabrique, rien ne dirait qu'ils fonctionnent le jour où une référence y
 * tombe — et une échelle dont le bas ne marche pas classerait une lacune au
 * milieu.
 */
export function degreDeReference(
  r: ReferenceLegale,
  article: ArticleDepouille | undefined,
): CodeDegre {
  if (!r.article || !article) return "jamais_ouvert";
  if (article.statut === "non_depouille") return "sans_trace_de_lecture";
  // Une lecture sans date ni moyen déclaré n'est pas une lecture attestée,
  // quel que soit le statut affiché : le statut dit ce qu'on a conclu, pas
  // qu'on a ouvert le texte.
  if (!article.luLe || !article.lecture) return "sans_trace_de_lecture";
  if (article.lecture === "indirect") return "lecture_indirecte";
  if (!article.citationCle) return "lu_sans_verbatim";
  // `api_legifrance` : verbatim recopié de l'API officielle et recomparé par
  // le script à chaque passage — le recoupement qui manque à un relevé d'agent.
  return article.lecture === "premiere_main" || article.lecture === "api_legifrance"
    ? "premiere_main"
    : "agent_verbatim";
}

/** L'ancre de veille d'une référence. Exportée pour la même raison. */
export function ancrageDeReference(
  r: ReferenceLegale,
  article: ArticleDepouille | undefined,
): Ancrage {
  if (!r.versionConstatee) return "jamais_constate";
  if (
    article?.versionEnVigueur &&
    article.versionEnVigueur !== r.versionConstatee
  ) {
    return "divergent";
  }
  return "ancre";
}

// -----------------------------------------------------------------------------
// La mesure, obligation par obligation
// -----------------------------------------------------------------------------

export type ObligationMesuree = {
  id: string;
  domaine: string;
  porteur: PorteurObligation;
  libelle: string;
  references: ReferenceMesuree[];
  /** Le degré de la référence qui fonde l'obligation — la première. */
  degreFondement: CodeDegre;
  /**
   * Le degré de la plus faible de ses références, contexte compris.
   *
   * C'est le chiffre de tête, et pas celui du fondement seul : le Code du
   * travail renvoie presque toujours la périodicité à un arrêté, et cet arrêté
   * est une référence de contexte. Ne mesurer que le fondement reviendrait à
   * déclarer vérifiée une obligation dont le chiffre repose sur un texte que
   * personne n'a ouvert.
   */
  degrePlancher: CodeDegre;
  /** Date de lecture la plus ancienne parmi ses références, s'il y en a une. */
  luLeDepuis: string | null;
  /** Date de lecture la plus tardive parmi ses références. */
  luLeJusqua: string | null;
};

export function mesurerObligation(
  o: Obligation,
  index: Map<string, { corpusId: string; article: ArticleDepouille }>,
): ObligationMesuree {
  // La norme d'un rythme retenu se mesure comme une référence de contexte :
  // c'est elle qui porte le chiffre (ADR-039).
  const references = referencesCitees(o).map((r, position) => {
    const e = r.article ? index.get(r.article) : undefined;
    const a = e?.article;
    return {
      obligation: o.id,
      position,
      source: r.source,
      reference: r.reference,
      article: r.article ?? null,
      corpus: e?.corpusId ?? null,
      statutCorpus: a?.statut ?? null,
      luLe: a?.luLe ?? null,
      lecture: a?.lecture ?? null,
      aPrescrit: Boolean(a?.prescrit),
      aCitationCle: Boolean(a?.citationCle),
      versionEnVigueur: a?.versionEnVigueur ?? null,
      versionConstatee: r.versionConstatee ?? null,
      degre: degreDeReference(r, a),
      ancrage: ancrageDeReference(r, a),
    } satisfies ReferenceMesuree;
  });

  const dates = references
    .map((r) => r.luLe)
    .filter((d): d is string => d !== null)
    .sort();

  return {
    id: o.id,
    domaine: o.domaine,
    porteur: porteurDe(o),
    libelle: o.libelle,
    references,
    degreFondement: references[0].degre,
    degrePlancher: references.map((r) => r.degre).reduce(plusFaible),
    luLeDepuis: dates[0] ?? null,
    luLeJusqua: dates[dates.length - 1] ?? null,
  };
}

export function mesurerReferentiel(): ObligationMesuree[] {
  const index = indexArticlesParRef();
  return obligationsConformite.map((o) => mesurerObligation(o, index));
}

// -----------------------------------------------------------------------------
// Les agrégats
// -----------------------------------------------------------------------------

export type Agregat = {
  cle: string;
  obligations: number;
  references: number;
  /** Combien d'obligations à chaque degré, mesurées au plancher. */
  obligationsParDegre: Record<CodeDegre, number>;
  /** Combien de références à chaque degré. */
  referencesParDegre: Record<CodeDegre, number>;
  referencesParAncrage: Record<Ancrage, number>;
  luLeDepuis: string | null;
  luLeJusqua: string | null;
};

function zeroDegres(): Record<CodeDegre, number> {
  return Object.fromEntries(DEGRES.map((d) => [d.code, 0])) as Record<
    CodeDegre,
    number
  >;
}

function zeroAncrages(): Record<Ancrage, number> {
  return Object.fromEntries(ANCRAGES.map((a) => [a.code, 0])) as Record<
    Ancrage,
    number
  >;
}

export function agreger(
  mesures: readonly ObligationMesuree[],
  cleDe: (o: ObligationMesuree) => string,
): Agregat[] {
  const par = new Map<string, ObligationMesuree[]>();
  for (const m of mesures) {
    par.set(cleDe(m), [...(par.get(cleDe(m)) ?? []), m]);
  }
  return [...par]
    .map(([cle, groupe]) => resumer(cle, groupe))
    .sort((a, b) => a.cle.localeCompare(b.cle, "fr"));
}

export function resumer(
  cle: string,
  groupe: readonly ObligationMesuree[],
): Agregat {
  const obligationsParDegre = zeroDegres();
  const referencesParDegre = zeroDegres();
  const referencesParAncrage = zeroAncrages();
  let references = 0;
  const dates: string[] = [];

  for (const m of groupe) {
    obligationsParDegre[m.degrePlancher] += 1;
    for (const r of m.references) {
      references += 1;
      referencesParDegre[r.degre] += 1;
      referencesParAncrage[r.ancrage] += 1;
      if (r.luLe) dates.push(r.luLe);
    }
  }
  dates.sort();

  return {
    cle,
    obligations: groupe.length,
    references,
    obligationsParDegre,
    referencesParDegre,
    referencesParAncrage,
    luLeDepuis: dates[0] ?? null,
    luLeJusqua: dates[dates.length - 1] ?? null,
  };
}

/** Les dates de lecture rencontrées, et combien de références chacune porte. */
export function lecturesParDate(
  mesures: readonly ObligationMesuree[],
): { date: string; references: number; obligations: number }[] {
  const refs = new Map<string, number>();
  const obl = new Map<string, Set<string>>();
  for (const m of mesures) {
    for (const r of m.references) {
      if (!r.luLe) continue;
      refs.set(r.luLe, (refs.get(r.luLe) ?? 0) + 1);
      obl.set(r.luLe, (obl.get(r.luLe) ?? new Set()).add(m.id));
    }
  }
  return [...refs]
    .map(([date, references]) => ({
      date,
      references,
      obligations: obl.get(date)?.size ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// -----------------------------------------------------------------------------
// L'autre sens : ce qui est lu et que personne ne cite
// -----------------------------------------------------------------------------

/**
 * Les articles dépouillés qu'aucune obligation ne cite, comptés par corpus.
 *
 * Le pendant exact de la mesure ci-dessus, et il répond à la moitié de la
 * question « où en est-on » que le rapprochement par obligation ne peut pas
 * voir : une référence n'existe que si une obligation la cite, donc un texte lu
 * et non branché n'apparaît nulle part dans les degrés. Il n'est pas de la
 * dette de lecture — il est lu — mais de la lecture qui ne sert encore à rien,
 * et la confondre avec du travail restant à faire ferait relancer un
 * dépouillement déjà fait. C'est précisément l'erreur que ce document existe
 * pour empêcher.
 */
export function lecturesNonCitees(): {
  corpus: string;
  articles: number;
  total: number;
  luLeDepuis: string | null;
  luLeJusqua: string | null;
}[] {
  const cites = new Set(
    obligationsConformite.flatMap((o) =>
      referencesCitees(o)
        .map((r) => r.article)
        .filter((a): a is string => Boolean(a)),
    ),
  );
  return CORPUS.map((c) => {
    const orphelins = c.articles.filter((a) => !cites.has(a.ref));
    const dates = orphelins
      .map((a) => a.luLe)
      .filter((d): d is string => Boolean(d))
      .sort();
    return {
      corpus: c.id,
      articles: orphelins.length,
      total: c.articles.length,
      luLeDepuis: dates[0] ?? null,
      luLeJusqua: dates[dates.length - 1] ?? null,
    };
  })
    .filter((c) => c.articles > 0)
    .sort((a, b) => b.articles - a.articles);
}
