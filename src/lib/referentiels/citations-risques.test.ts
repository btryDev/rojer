// Les référentiels de risques du document unique — `commun.ts`,
// `restauration.ts`, `commerce.ts`, `bureau.ts` — disent-ils ce que leurs
// sources disent ?
//
// POURQUOI CE TEST EXISTE. Une relecture du 2026-09-26 y a trouvé, sur des
// textes que le dirigeant lit ET QUE LE PRODUIT RECOPIE EN BASE quand il retient
// un risque ou une mesure (décision E10) : une obligation attribuée à l'article
// qui ne la porte pas (« éviter le recours à la manutention manuelle
// (R. 4541-2) » — c'est R. 4541-3), un article résumé sans sa seconde
// condition (R. 4421-1), « contrôles annuels obligatoires » là où l'arrêté du
// 26 décembre 2011 admet deux ans, « le train sur l'autoroute » là où l'INRS
// recommande le train ET l'autoroute, des citations de l'INRS reformulées entre
// guillemets, « risque majeur », « reconnu », « normé » sans texte. Rien ne
// confrontait ces phrases à quoi que ce soit.
//
// DEUX RÈGLES.
//
// 1. UNE CITATION ENTRE GUILLEMETS EST LE TEXTE DE SA SOURCE. Chaque « … »
//    d'un champ affiché est rattaché à sa source, dans cet ordre :
//      - la parenthèse qui suit la citation — « … » (art. R. 4433-2) — ou qui
//        suit une suite de citations accolées : « … » « … » (art. R. 4541-9)
//        vaut pour les deux ;
//      - sinon la dernière source nommée avant elle dans le même champ —
//        « ED 840, fiche 5 « Risques liés à… » », « page « … » : « … » » ;
//      - sinon, pour une mesure ou une question, les sources nommées dans la
//        description du risque qu'elle sert.
//    Le verbatim est la `citationCle` de l'article du CORPUS que la source
//    désigne — Code du travail, arrêté, ou fiche INRS consignée dans
//    `corpus/inrs-documentaire.ts` —, et la citation lui est confrontée par
//    la règle partagée de `verbatim/extrait-continu.ts`.
//    Une citation qu'aucune source ne réclame n'est admise que si c'est un
//    INTITULÉ — le nom d'un outil OiRA, d'un dossier, d'un dépliant, d'une
//    unité ou d'un référentiel —, annoncé comme tel par le mot qui le précède.
//    Elle ne cite rien, elle nomme.
//
// 2. PAS DE MOT QUI QUALIFIE HORS D'UNE CITATION. « Obligatoire »,
//    « réglementaire », « impose », « exige », « doit », « majeur »,
//    « reconnu », « normé », « aux normes », « conforme » : hors guillemets,
//    ces mots font dire au produit ce qu'un texte dirait. Rojer calcule, il
//    n'avise pas. Une référence en parenthèse NE SUFFIT PAS : l'ancienne phrase
//    de `trv-charges` en portait une (« impose … (R. 4541-2) »), et elle était
//    fausse. Ce qui qualifie se cite.
//
// CE QUE LA GARDE NE PROUVE PAS :
// - qu'une phrase SANS guillemets dise vrai (« Concerne tout déplacement
//   professionnel… ») ; elle se relit ;
// - qu'un chiffre sans guillemets ait une source (le « 10 kg » de `q-charges`
//   n'aurait pas été vu) ;
// - que le numéro de fiche nommé sans citation soit le bon (« ED 840 fiche
//   19 » pour une coupure n'aurait pas été vu) ;
// - que la `citationCle` soit juste — elle se relit à la source ;
// - qu'une élision « […] » ne retire pas une condition.

import { describe, expect, it } from "vitest";
import { CORPUS } from "./corpus";
import { dateArrete } from "./corpus/citations-ecran";
import type { ArticleDepouille } from "./corpus/types";
import { ecartsDeCitation } from "@/lib/verbatim/extrait-continu";
import { referentielsSectoriels } from "./index";
import { questionsDetectionTransverses, risquesTransverses } from "./commun";
import type { RisqueReferentiel } from "./types";

// ── Les textes affichés ─────────────────────────────────────────────────────

type Champ = {
  ou: string;
  texte: string;
  /** Pour une mesure ou une question : la description du risque qu'elle sert. */
  repli?: string;
};

function champsDuRisque(prefixe: string, r: RisqueReferentiel): Champ[] {
  const ou = `${prefixe}/${r.id}`;
  return [
    { ou: `${ou}.libelle`, texte: r.libelle },
    ...(r.description ? [{ ou: `${ou}.description`, texte: r.description }] : []),
    ...r.mesuresRecommandees.map((m) => ({
      ou: `${ou}/${m.id}`,
      texte: m.libelle,
      repli: r.description,
    })),
  ];
}

function champsAffiches(): Champ[] {
  const out: Champ[] = [];
  for (const ref of referentielsSectoriels) {
    for (const u of ref.unitesTravailSuggerees) {
      out.push({ ou: `${ref.id}/${u.id}.nom`, texte: u.nom });
      if (u.description) out.push({ ou: `${ref.id}/${u.id}.description`, texte: u.description });
    }
    for (const r of ref.risques) out.push(...champsDuRisque(ref.id, r));
    for (const a of ref.activitesNonCouvertes) {
      for (const k of ["libelle", "question", "aide", "cequiManque", "pourquoi"] as const) {
        const t = a[k];
        if (t) out.push({ ou: `${ref.id}/${a.id}.${k}`, texte: t });
      }
    }
  }
  for (const r of risquesTransverses) out.push(...champsDuRisque("transverse", r));
  for (const q of questionsDetectionTransverses) {
    out.push({
      ou: `transverse/${q.id}`,
      texte: q.intitule,
      repli: risquesTransverses.find((r) => r.id === q.risqueIdAssocie)?.description,
    });
  }
  return out;
}

// ── Des sources nommées aux articles du corpus ──────────────────────────────

type Mention = { debut: number; ref: string };

const MOIS = "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";

/**
 * Les formes sous lesquelles les référentiels nomment une source, et la
 * `ref` du corpus que chacune désigne. Une forme nouvelle s'ajoute ici ; une
 * source qui n'est pas au corpus ne se résout pas, et sa citation échoue.
 */
const FORMES: [RegExp, (m: RegExpExecArray) => string | null][] = [
  [/\bart\.\s*([LRD]\.\s?\d{4}-\d+(?:-\d+)*)/g, (m) => m[1].replace(/\s+/g, " ")],
  [
    new RegExp(`arrêté du (\\d{1,2}(?:er)? (?:${MOIS}) \\d{4}),\\s*art\\.\\s*(\\d+)`, "gi"),
    (m) => {
      const d = dateArrete(("arrêté du " + m[1]).match(/arrêtés?\s+(?:du\s+)?(\d{1,2})(?:er)?\s+([a-zéèûô]+)\s+(\d{4})/i)!);
      return d ? `Arrêté ${d} art. ${m[2]}` : null;
    },
  ],
  [/\bED\s?(\d{3,4}),?\s+fiche\s+(\d+)/g, (m) => `INRS ED ${m[1]} fiche ${m[2]}`],
  [/\bED\s?(\d{3,4}),?\s+p\.\s*(\d+)/g, (m) => `INRS ED ${m[1]} p. ${m[2]}`],
  [/\bED\s?6305\b/g, () => "INRS ED 6305"],
  [/page « Travail de bureau\. Les risques du métier »/g, (m) => `INRS ${m[0]}`],
  [/dossier web « [^»]+ »/g, (m) => `INRS ${m[0]}`],
  // Les articles du règlement de sécurité ERP : « art. MS 38 », « art. PE 1 ».
  [/\bart\.\s*([A-Z]{1,3}\s\d+)\b/g, (m) => m[1]],
];

function mentions(texte: string): Mention[] {
  const out: Mention[] = [];
  for (const [motif, versRef] of FORMES) {
    motif.lastIndex = 0;
    for (let m = motif.exec(texte); m; m = motif.exec(texte)) {
      const ref = versRef(m);
      if (ref) out.push({ debut: m.index, ref });
    }
  }
  return out.sort((a, b) => a.debut - b.debut);
}

/** L'article du corpus que désigne une `ref` — un article de code : du Code du travail. */
function articleDuCorpus(ref: string): ArticleDepouille | undefined {
  for (const c of CORPUS) {
    const estCode = /^[LRD]\. /.test(ref);
    if (estCode && !c.id.startsWith("code-travail")) continue;
    // `MS 38`, `PE 1` : le seul règlement numéroté ainsi au corpus est celui
    // du 25 juin 1980.
    const estReglement = /^[A-Z]{1,3} \d+$/.test(ref);
    if (estReglement && !c.id.startsWith("arrete-1980")) continue;
    const a = c.articles.find((x) => x.ref === ref);
    if (a) return a;
  }
  return undefined;
}

// ── Les citations d'un champ, et leur source ────────────────────────────────

type Citation = { texte: string; debut: number; sources: string[]; intitule: boolean };

/** Le mot qui annonce un intitulé : la citation nomme, elle ne cite pas. */
const ANNONCE_D_INTITULE =
  /(?:OiRA|outil|dossier(?: INRS)?|dépliant(?: INRS)?(?: ED \d+)?|brochure(?: INRS)?(?: ED \d+)?|page(?: métier)?(?: INRS)?|unité|référentiel|ED \d{3,4}|QR \d+|rubrique|INRS)\s*$/i;

function citations(champ: Champ): Citation[] {
  const t = champ.texte;
  const brutes: { texte: string; debut: number; fin: number }[] = [];
  for (let i = t.indexOf("«"); i >= 0; i = t.indexOf("«", i + 1)) {
    const j = t.indexOf("»", i);
    if (j < 0) throw new Error(`${champ.ou} : guillemet ouvrant sans fermant`);
    brutes.push({ texte: t.slice(i + 1, j), debut: i, fin: j + 1 });
    i = j;
  }
  const toutes = mentions(t);
  const out: Citation[] = [];
  // Une suite de citations accolées (séparées par des blancs seulement)
  // partage la parenthèse qui la clôt.
  let k = 0;
  while (k < brutes.length) {
    let l = k;
    while (l + 1 < brutes.length && /^\s*$/.test(t.slice(brutes[l].fin, brutes[l + 1].debut))) l++;
    const apres = /^\s*\(([^)]*)\)/.exec(t.slice(brutes[l].fin));
    const parParenthese = apres ? mentions(apres[1]).map((m) => m.ref) : [];
    for (let x = k; x <= l; x++) {
      const b = brutes[x];
      let sources = parParenthese;
      if (sources.length === 0) {
        const avant = toutes.filter((m) => m.debut < brutes[k].debut);
        if (avant.length > 0) sources = [avant[avant.length - 1].ref];
      }
      if (sources.length === 0 && champ.repli) sources = mentions(champ.repli).map((m) => m.ref);
      const intitule =
        sources.length === 0 &&
        ANNONCE_D_INTITULE.test(t.slice(0, b.debut)) &&
        b.texte.split(/\s+/).length <= 10;
      out.push({ texte: b.texte, debut: b.debut, sources, intitule });
    }
    k = l + 1;
  }
  return out;
}

/** Ce que la citation n'a pas de son verbatim, ou `null` si elle le reproduit. */
function ecartDe(c: Citation): string | null {
  if (c.intitule) return null;
  if (c.sources.length === 0) return "aucune source ne la réclame";
  const verbatims = c.sources
    .map(articleDuCorpus)
    .map((a) => a?.citationCle)
    .filter((v): v is string => Boolean(v));
  if (verbatims.length === 0)
    return `source hors corpus ou sans citationCle : ${c.sources.join(", ")}`;
  const dehors = ecartsDeCitation(c.texte, verbatims);
  return dehors.length === 0 ? null : `hors du verbatim de ${c.sources.join(", ")} : ${dehors.map((d) => `« ${d} »`).join(", ")}`;
}

function ecartsDuChamp(champ: Champ): string[] {
  return citations(champ)
    .map((c) => [c, ecartDe(c)] as const)
    .filter(([, e]) => e !== null)
    .map(([c, e]) => `${champ.ou} — « ${c.texte.trim()} » : ${e}`);
}

// ── Les mots qui qualifient ─────────────────────────────────────────────────

const QUALIFIANTS = new RegExp(
  "(?<![\\p{L}\\p{N}])(" +
    [
      "obligatoires?",
      "réglementaires?",
      "réglementairement",
      "imposent",
      "impose",
      "imposée?s?",
      "exigent",
      "exige",
      "exigée?s?",
      "doit",
      "doivent",
      "majeure?s?",
      "reconnue?s?",
      "normée?s?",
      "aux normes",
      "conformes?",
    ].join("|") +
    ")(?![\\p{L}\\p{N}])",
  "giu",
);

/**
 * Les emplois admis, NOMMÉMENT et à l'expression exacte : « imposer » y décrit
 * un fait de travail, pas une règle. Une admission vaut pour la phrase, pas
 * pour le mot — la même forme ailleurs est refusée.
 */
const ADMIS = [
  // bur-travail-casque.cequiManque : la file d'appels impose la cadence.
  "cadence imposée par la file d'appels",
  // trv-nuit-recours : l'activité impose, ou non, le travail de nuit.
  "là où l'activité ne l'impose pas",
];

/** Le champ privé de ses citations et des emplois admis : ce que le PRODUIT dit, lui. */
const horsCitations = (t: string) =>
  ADMIS.reduce((acc, a) => acc.split(a).join(" "), t.replace(/«[^»]*»/g, "« »"));

function qualifiantsDuChamp(champ: Champ): string[] {
  return [...horsCitations(champ.texte).matchAll(QUALIFIANTS)].map(
    (m) => `${champ.ou} — « ${m[0]} »`,
  );
}

// ── Les périodicités ────────────────────────────────────────────────────────
//
// TROISIÈME RÈGLE (2026-09-26, seconde passe). Une périodicité écrite hors
// guillemets — « vérifiés annuellement », « tous les deux ans » — doit être
// suivie, dans la même proposition (jusqu'au « ; » ou à la phrase suivante),
// d'une source du corpus dont le verbatim porte CETTE périodicité. Nommer une
// source ne suffit pas : « annuellement (art. R. 4227-29) » est refusé parce
// que R. 4227-29 ne fixe aucun rythme, et « (art. R. 4227-39) » parce qu'il
// dit six mois. C'est la faute exacte de `resto-extincteurs`, qui écrivait
// « vérifiés annuellement » sans rien derrière.

const NOMBRES = "deux|trois|quatre|cinq|six|dix";
const PERIODICITES: { hors: RegExp; porte: (m: RegExpExecArray) => RegExp }[] = [
  {
    hors: /(?<![\p{L}])(?:annuel(?:le)?s?|annuellement|tous les ans|chaque année)(?![\p{L}])/giu,
    porte: () => /annuel|\bun an\b|chaque année/i,
  },
  {
    hors: /(?<![\p{L}])(?:semestriel(?:le)?s?|semestriellement)(?![\p{L}])/giu,
    porte: () => /semestr|six mois/i,
  },
  {
    hors: /(?<![\p{L}])(?:mensuel(?:le)?s?|mensuellement|tous les mois|chaque mois)(?![\p{L}])/giu,
    porte: () => /mensuel|par mois|chaque mois/i,
  },
  {
    hors: /(?<![\p{L}])(?:trimestriel(?:le)?s?|triennal(?:e|es|aux)?|quinquennal(?:e|es|aux)?|décennal(?:e|es|aux)?)(?![\p{L}])/giu,
    porte: (m) =>
      /^trim/i.test(m[0]) ? /trimestr|trois mois/i
      : /^trien/i.test(m[0]) ? /triennal|trois ans/i
      : /^quinq/i.test(m[0]) ? /quinquennal|cinq ans/i
      : /décennal|dix ans/i,
  },
  {
    hors: new RegExp(`(?<![\\p{L}])tous les (${NOMBRES}) (ans|mois)(?![\\p{L}])`, "giu"),
    porte: (m) => new RegExp(`${m[1]} ${m[2]}`, "i"),
  },
];

/** Jusqu'où une périodicité cherche sa source : le « ; » ou la phrase suivante. */
// « art. MS 38 » n'est pas une fin de phrase.
const FIN_DE_PROPOSITION_ = /;|(?<!\bart)\.\s+(?=[A-ZÀ-ÖØ-Ý«])/;

function periodicitesSansTexte(champ: Champ): string[] {
  const t = champ.texte.replace(/«[^»]*»/g, (q) => "«" + " ".repeat(q.length - 2) + "»");
  const out: string[] = [];
  for (const { hors, porte } of PERIODICITES) {
    hors.lastIndex = 0;
    for (let m = hors.exec(t); m; m = hors.exec(t)) {
      const suite = t.slice(m.index);
      const fin = FIN_DE_PROPOSITION_.exec(suite);
      const segment = fin ? suite.slice(0, fin.index) : suite;
      const verbatims = mentions(segment)
        .map((x) => articleDuCorpus(x.ref)?.citationCle)
        .filter((v): v is string => Boolean(v));
      if (!verbatims.some((v) => porte(m!).test(v)))
        out.push(`${champ.ou} — « ${m[0]} » : aucune source qui porte ce rythme`);
    }
  }
  return out;
}

// ── La garde ────────────────────────────────────────────────────────────────

const CHAMPS = champsAffiches();

describe("référentiels de risques du DUERP — ce qui s'affiche dit ce que la source dit", () => {
  it("le relevé voit les champs et les citations — sinon il ne contrôle rien", () => {
    // Bornes basses, mesurées le 2026-09-26 : 3 référentiels, 9 transverses.
    expect(CHAMPS.length).toBeGreaterThan(200);
    const confrontees = CHAMPS.flatMap(citations).filter((c) => !c.intitule);
    expect(confrontees.length).toBeGreaterThanOrEqual(30);
    // Et chaque famille de source est exercée au moins une fois.
    const sources = new Set(confrontees.flatMap((c) => c.sources));
    expect([...sources].some((s) => /^R\. 45/.test(s))).toBe(true);
    expect([...sources].some((s) => s.startsWith("Arrêté 2011-12-26"))).toBe(true);
    expect([...sources].some((s) => s.startsWith("INRS ED 840 fiche"))).toBe(true);
  });

  it("chaque citation entre guillemets reproduit le verbatim de sa source au corpus", () => {
    expect(CHAMPS.flatMap(ecartsDuChamp)).toEqual([]);
  });

  it("aucun mot qui qualifie hors d'une citation", () => {
    expect(CHAMPS.flatMap(qualifiantsDuChamp)).toEqual([]);
  });

  it("aucune périodicité hors d'une citation sans la source qui la porte", () => {
    expect(CHAMPS.flatMap(periodicitesSansTexte)).toEqual([]);
    // Borne basse : la règle traverse au moins les deux mesures électriques
    // et la mesure des extincteurs, sinon elle ne voit rien.
    const vues = CHAMPS.filter((c) =>
      PERIODICITES.some(({ hors }) => { hors.lastIndex = 0; return hors.test(c.texte.replace(/«[^»]*»/g, "")); }),
    );
    expect(vues.length).toBeGreaterThanOrEqual(3);
  });
});

describe("la garde éprouvée sur les défauts réels du 2026-09-26", () => {
  // Chaque texte ci-dessous est recopié de `git show eb75c0b:<fichier>` —
  // la base de ce lot —, pas fabriqué.
  const champ = (ou: string, texte: string, repli?: string): Champ => ({ ou, texte, repli });

  it("refuse l'obligation d'éviter attribuée à R. 4541-2 — hors citation comme en citation", () => {
    // commun.ts:151, trv-charges, tel qu'il était.
    const avant = champ(
      "commun.ts:151",
      "INRS ED 840 fiche 5 « Risques liés à la charge physique de travail ». Le Code du travail impose d'éviter le recours à la manutention manuelle (R. 4541-2) ; il ne fixe pas de seuil général, seulement des limites hautes avec avis médical (R. 4541-9 : 55 kg, 105 kg au maximum). Le repère de 10 kg est une valeur de bonne pratique.",
    );
    expect(qualifiantsDuChamp(avant)).toEqual(["commun.ts:151 — « impose »"]);
    // Et le texte de R. 4541-3, cité mais attribué à R. 4541-2 comme
    // l'était la paraphrase : refusé, R. 4541-2 est une définition.
    const citeAFaux = champ(
      "sonde",
      "« L'employeur prend les mesures d'organisation appropriées ou utilise les moyens appropriés, et notamment les équipements mécaniques, afin d'éviter le recours à la manutention manuelle de charges par les travailleurs. » (art. R. 4541-2)",
    );
    expect(ecartsDuChamp(citeAFaux).length).toBe(1);
    // La même citation, attribuée au bon article : admise.
    expect(ecartsDuChamp({ ...citeAFaux, texte: citeAFaux.texte.replace("R. 4541-2", "R. 4541-3") })).toEqual([]);
  });

  it("refuse R. 4421-1 amputé de sa seconde condition, s'il est cité", () => {
    // commun.ts:303 paraphrasait l'alinéa 2 sans « et que l'évaluation des
    // risques prévue au chapitre III ne met pas en évidence de risque
    // spécifique ». Mise entre guillemets telle quelle, la coupe ne passe
    // que MARQUÉE : sans « […] » ni « … », refusée.
    const ampute = champ(
      "sonde",
      "« Toutefois, les dispositions des articles R. 4424-2, R. 4424-3, R. 4424-7 à R. 4424-10, R. 4425-6 et R. 4425-7 ne sont pas applicables lorsque l'activité, bien qu'elle puisse conduire à exposer des travailleurs, n'implique pas normalement l'utilisation délibérée d'un agent biologique. » (art. R. 4421-1)",
    );
    expect(ecartsDuChamp(ampute).length).toBe(1);
  });

  it("refuse « contrôles annuels obligatoires », « largeur réglementaire », « normé », « risque majeur », « reconnu »", () => {
    const avant = [
      champ("restauration.ts:277", "ED 880 fiche 3 + ED 840 fiche 14. Contrôles périodiques annuels obligatoires."),
      champ("restauration.ts:285", "Contrôles périodiques réglementaires des installations électriques (annuel)"),
      champ("bureau.ts:262", "ED 840 fiche 14. Contrôles annuels obligatoires."),
      champ("bureau.ts:132", "Allées dégagées (largeur réglementaire), pas de stockage temporaire dans les passages"),
      champ("bureau.ts:85", "Aménagement ergonomique : siège réglable normé, écran à hauteur des yeux, clavier et souris adaptés"),
      champ("commerce.ts:147", "Escabeau ou marchepied stable conforme aux normes (NF), proscrire les escaliers improvisés"),
      champ("commerce.ts:198", "ED 840 fiche 5. Risque majeur des hôtes/hôtesses de caisse."),
      champ("bureau.ts:184", "ED 840 fiche 17. Ameli.fr : risque sectoriel reconnu en tertiaire d'accueil."),
      champ("commun.ts:253", "Le recours au travail de nuit est exceptionnel et doit être justifié (art. L. 3122-1)"),
    ];
    expect(avant.map((c) => qualifiantsDuChamp(c).length)).toEqual([1, 1, 1, 1, 1, 2, 1, 1, 1]);
  });

  it("refuse « vérifiés annuellement » sans texte, et une source qui ne porte pas ce rythme", () => {
    // restauration.ts:267 à eb75c0b, tel quel.
    const avant = champ(
      "restauration.ts:267",
      "Extincteurs adaptés (classe F pour huiles), accessibles, signalés, vérifiés annuellement",
    );
    expect(periodicitesSansTexte(avant)).toEqual([
      "restauration.ts:267 — « annuellement » : aucune source qui porte ce rythme",
    ]);
    // Une source nommée ne suffit pas : R. 4227-29 ne fixe aucun rythme,
    // R. 4227-39 dit six mois.
    for (const art of ["R. 4227-29", "R. 4227-39"])
      expect(periodicitesSansTexte(champ("sonde", `Extincteurs vérifiés annuellement (art. ${art})`))).toHaveLength(1);
    // MS 38 porte la vérification annuelle : admis.
    expect(
      periodicitesSansTexte(champ("sonde", "Extincteurs vérifiés annuellement (arrêté du 25 juin 1980, art. MS 38)")),
    ).toEqual([]);
    // Et la mesure électrique de eb75c0b : « (annuel) » sans source.
    expect(
      periodicitesSansTexte(champ("restauration.ts:285", "Contrôles périodiques réglementaires des installations électriques (annuel)")),
    ).toHaveLength(1);
  });

  it("une admission vaut pour sa phrase exacte, pas pour le mot", () => {
    expect(qualifiantsDuChamp(champ("sonde", "La cadence imposée par la file d'appels."))).toEqual([]);
    expect(qualifiantsDuChamp(champ("sonde", "La cadence imposée par le Code du travail."))).toEqual([
      "sonde — « imposée »",
    ]);
  });

  it("refuse les citations de l'INRS reformulées entre guillemets", () => {
    // bureau.ts:77, :112, :240 à la base : les mots n'étaient pas ceux de
    // la page. Réattribuées à la page relevée au corpus, elles échouent.
    for (const reformulee of [
      "« les TMS et lombalgies constituent l'essentiel des maladies professionnelles »",
      "« les chutes constituent une des principales causes d'accident dans le tertiaire »",
      "« bruit en bureaux ouverts »",
    ])
      expect(
        ecartsDuChamp(champ("sonde", `INRS, page « Travail de bureau. Les risques du métier » : ${reformulee}`)).length,
      ).toBe(1);
  });

  it("refuse une citation qu'aucune source ne réclame, et admet un intitulé annoncé", () => {
    expect(ecartsDuChamp(champ("sonde", "Le texte dit « tout va bien »."))).toEqual([
      "sonde — « tout va bien » : aucune source ne la réclame",
    ]);
    expect(ecartsDuChamp(champ("sonde", "L'INRS publie l'outil OiRA « Poissonnerie »."))).toEqual([]);
  });

  it("une mesure se rattache à la source de son risque : « fini-quitte » est dans ED 840 fiche 4, pas dans la fiche 5", () => {
    const mesure = "Planification des déplacements : temps de conduite et de pause respectés ; pas de « fini-quitte »";
    expect(ecartsDuChamp(champ("sonde", mesure, "INRS ED 840, fiche 4."))).toEqual([]);
    expect(ecartsDuChamp(champ("sonde", mesure, "INRS ED 840, fiche 5."))).toHaveLength(1);
  });
});
