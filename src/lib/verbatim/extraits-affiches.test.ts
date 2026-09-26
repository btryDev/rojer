// Un `LegalBadge` porte un `extrait` : le texte de l'article, déplié sous la
// pastille, en italique, derrière un filet de citation. Le dirigeant le lit
// comme LE TEXTE. Ce fichier vérifie qu'il l'est.
//
// POURQUOI CE TEST EXISTE. `citations-ecran.ts` vérifie que l'ARTICLE cité à
// l'écran est dépouillé ; rien ne vérifiait que l'EXTRAIT montré était son
// texte. Les deux citations de `R. 4121-2` écrivaient « d'évaluation des
// risques est réalisée », sans « professionnels », et personne ne l'avait vu :
// une citation amputée d'un mot se lit aussi bien qu'une citation exacte.
// Corrigé le 2026-09-26 (`EXTRAIT_R4121_2`) ; ce fichier empêche le suivant.
//
// LA RÈGLE est celle de `fait-dans-le-texte.test.ts`, partagée dans
// `extrait-continu.ts` : chaque segment, découpé à la ponctuation, est un
// extrait continu du verbatim qui commence et finit sur une proposition du
// texte. Plus trois choses propres à une citation : « […] » est une élision
// admise (elle coupe le segment et libère la proposition de son côté), « … »
// final est admis, et les segments se suivent dans l'ordre d'un même texte.
//
// LE VERBATIM est la `citationCle` de l'article que la pastille nomme dans sa
// `reference` — jamais la prose qui l'entoure, jamais le `prescrit`, qui est
// notre résumé. Un article absent du corpus, ou présent sans `citationCle`,
// fait échouer le test : un extrait confronté à rien n'est pas vérifié, et le
// taire serait le défaut même que ce fichier corrige.
//
// CE QUE LA GARDE NE PROUVE PAS, et qui reste à la relecture humaine :
// - que la `citationCle` du corpus est juste — elle se relit sur Légifrance ;
// - qu'une élision « […] » ne retire pas ce qui change le sens (une condition,
//   une négation) : elle est marquée, le lecteur la voit, la garde non ;
// - qu'une virgule n'a pas été ajoutée ou retirée, ni la casse changée ;
// - qu'un extrait est tiré du bon ALINÉA quand la `citationCle` en porte
//   plusieurs ;
// - qu'un verbatim déclaré dans HORS_CORPUS a été relu : la garde exige
//   qu'il soit écrit, avec son adresse et sa date NON VIDES (le type seul
//   laissait passer une chaîne vide), pas qu'il soit juste. Il se relit comme
//   une `citationCle`, et sa date dit quand.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CORPUS } from "@/lib/referentiels/corpus";
import { SURFACES_AFFICHEES, dateArrete } from "@/lib/referentiels/corpus/citations-ecran";
import type { ArticleDepouille } from "@/lib/referentiels/corpus/types";
import { EXTRAIT_R4121_2 } from "@/lib/referentiels/conformite/texte-r4121-2";
import { ecartsDeCitation, normaliser } from "./extrait-continu";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// ── Ce que la garde ne sait pas confronter, et pourquoi ─────────────────────

/**
 * Les `extrait={…}` qui ne sont pas une chaîne littérale. Chacun se résout ici
 * NOMMÉMENT : une expression inconnue fait échouer le test, au lieu d'être
 * sautée en silence.
 *
 * `null` veut dire « confronté ailleurs, par construction » — avec le motif.
 */
const EXPRESSIONS: Record<string, string | { motif: string }> = {
  EXTRAIT_R4121_2,
  // `DocumentsObligatoires.tsx` : la pastille affiche la `citationCle` du
  // corpus elle-même, lue par `documentsObligatoires()`. L'extrait EST le
  // verbatim ; le confronter à lui-même ne prouverait rien.
  "f.citationCle": { motif: "la citationCle du corpus, affichée telle quelle" },
};

/**
 * Les textes qu'on cite et qu'aucun corpus du dépôt ne dépouille, avec le
 * motif. Le corpus est celui du droit de la santé-sécurité et de la sécurité
 * incendie : ce qui n'en relève pas s'y inscrirait à faux — il y serait compté
 * parmi les articles « sans objet » d'un référentiel qui ne le concerne pas.
 *
 * Une entrée ici porte quand même le verbatim, lu à la source avec sa date :
 * l'extrait affiché y est confronté comme les autres. Hors corpus veut dire
 * « pas au corpus », pas « pas vérifié ».
 */
const HORS_CORPUS: Record<
  string,
  { motif: string; url: string; luLe: string; versionEnVigueur: string; verbatim: string }
> = {
  "Art. 1366 · 1367 Code civil · eIDAS simple": {
    motif:
      "Code civil, la preuve par écrit électronique — citée sur les écrans de " +
      "signature et d'accès par lien. Hors du droit que le corpus dépouille. " +
      "L'extrait est l'article 1366 seul ; 1367 et eIDAS sont nommés dans la " +
      "pastille, pas cités.",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042461",
    luLe: "2026-09-26",
    versionEnVigueur: "2016-10-01",
    verbatim:
      "L'écrit électronique a la même force probante que l'écrit sur support papier, " +
      "sous réserve que puisse être dûment identifiée la personne dont il émane et " +
      "qu'il soit établi et conservé dans des conditions de nature à en garantir " +
      "l'intégrité.",
  },
};

// ── Le relevé des pastilles ─────────────────────────────────────────────────

type Pastille = { ou: string; reference: string; extrait: string | { motif: string } };

function fichiers(dossier: string): string[] {
  const out: string[] = [];
  const descendre = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) descendre(p);
      else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
    }
  };
  descendre(join(RACINE, dossier));
  return out;
}

/** La balise ouvrante entière, guillemets et accolades respectés. */
function baliseOuvrante(source: string, debut: number): string {
  let profondeur = 0;
  let chaine: string | null = null;
  for (let i = debut; i < source.length; i++) {
    const c = source[i];
    if (chaine) {
      if (c === chaine && source[i - 1] !== "\\") chaine = null;
    } else if (c === '"' || c === "'" || c === "`") {
      if (profondeur > 0 || c === '"') chaine = c;
    } else if (c === "{") profondeur++;
    else if (c === "}") profondeur--;
    else if (c === ">" && profondeur === 0) return source.slice(debut, i + 1);
  }
  throw new Error("balise LegalBadge non refermée");
}

const attribut = (balise: string, nom: string) => {
  const litteral = new RegExp(`\\b${nom}="([^"]*)"`).exec(balise);
  if (litteral) return { litteral: litteral[1] };
  const expression = new RegExp(`\\b${nom}=\\{([^}]*)\\}`).exec(balise);
  return expression ? { expression: expression[1].trim() } : null;
};

function pastilles(): Pastille[] {
  const out: Pastille[] = [];
  for (const dossier of SURFACES_AFFICHEES) {
    for (const f of fichiers(dossier)) {
      const source = readFileSync(f, "utf8");
      for (const m of source.matchAll(/<LegalBadge\b/g)) {
        const balise = baliseOuvrante(source, m.index!);
        const extrait = attribut(balise, "extrait");
        if (!extrait) continue;
        const ref = attribut(balise, "reference");
        const ligne = source.slice(0, m.index!).split("\n").length;
        const ou = `${f.slice(RACINE.length + 1)}:${ligne}`;
        const reference = ref?.litteral ?? ref?.expression ?? "";
        if ("litteral" in extrait) {
          out.push({ ou, reference, extrait: extrait.litteral! });
          continue;
        }
        const resolu = EXPRESSIONS[extrait.expression!];
        if (resolu === undefined)
          throw new Error(
            `${ou} : extrait={${extrait.expression}} n'est pas résolu. ` +
              `L'inscrire dans EXPRESSIONS — sa valeur, ou le motif pour lequel ` +
              `il est confronté ailleurs. Une expression inconnue n'est pas sautée.`,
          );
        out.push({ ou, reference, extrait: resolu });
      }
    }
  }
  return out;
}

// ── De la `reference` affichée aux articles du corpus ───────────────────────

const MOTIF_ARTICLE = /\b[LRD]\.\s?\d{3,4}-\d+(?:-\d+)*\b/g;
/** `GN 13`, `PE 4`, `MS 73` : les articles des règlements de sécurité. */
const MOTIF_REGLEMENT = /\b[A-Z]{1,3}\s\d+\b/g;
const MOTIF_ARRETE =
  /arrêtés?\s+(?:du\s+)?(?:(\d{1,2})(?:er)?\s+([a-zéèûô]+)\s+(\d{4})|(\d{2,4})-(\d{2})-(\d{2,4}))/gi;
const espaces = (t: string) => t.replace(/\s+/g, " ").trim();
const numeroArticle = (t: string) => /\bart\.\s*(\d+)(?:er)?\b/i.exec(t)?.[1];

/**
 * Le code que la `reference` nomme — ou `null`.
 *
 * LU DEPUIS LE 2026-09-26 (contre-lecture) : la clé seule faisait rendre
 * `CCH R. 164-6` à une pastille « Art. R. 164-6 CT ». Aucune ne se trompait de
 * code ce jour-là ; la garde n'en aurait rien dit.
 */
const CODES: [string, RegExp][] = [
  ["CT", /\bCT\b|code du travail/i],
  ["CCH", /\bCCH\b|code de la construction/i],
  ["CSP", /\bCSP\b|code de la santé publique/i],
  ["C. env.", /C\.\s?env\.|code de l'environnement/i],
];
const codeNomme = (reference: string) => CODES.find(([, m]) => m.test(reference))?.[0] ?? null;

/**
 * Le code d'un article du corpus : son préfixe (`CCH R. 164-6`,
 * `C. env. R. 557-14-1`), sinon celui que l'identifiant du corpus déclare
 * (`code-travail-…`, `cch-…`, `csp-…`). `null` quand ni l'un ni l'autre ne le
 * dit : l'article ne se rapproche alors d'aucune pastille qui nomme un code.
 */
function codeDeLArticle(corpusId: string, ref: string): string | null {
  const prefixe = /^(.*?)\s*[LRD]\.\s?\d/.exec(ref)?.[1]?.trim();
  if (prefixe) return codeNomme(prefixe);
  if (corpusId.startsWith("code-travail")) return "CT";
  if (corpusId.startsWith("cch")) return "CCH";
  if (corpusId.startsWith("csp")) return "CSP";
  return null;
}

/**
 * Les mots qui qualifient un arrêté dans la `reference` — « Travaux
 * dangereux » —, une fois la date et l'article retirés.
 *
 * DEUX ARRÊTÉS DU MÊME JOUR (contre-lecture du 2026-09-26) : le 19 mars 1993
 * en a deux au corpus, les travaux dangereux et les EPI. La date seule les
 * confondait, et une phrase de l'arrêté EPI passait sous la pastille
 * « Travaux dangereux ». Chaque mot qualifiant doit figurer dans l'intitulé du
 * corpus retenu.
 */
const qualifiantsDArrete = (reference: string) =>
  reference
    .replace(MOTIF_ARRETE, " ")
    .replace(/\bart\.\s*\d+(?:er)?/gi, " ")
    .split(/[^\p{L}]+/u)
    // Les mots de quatre lettres et plus, ET les sigles en capitales :
    // « EPI » était ignoré (contre-lecture du 2026-09-26), et « Arrêté du
    // 19 mars 1993 · EPI » se résolvait vers les deux arrêtés du jour.
    .filter((m) => m.length >= 4 || /^\p{Lu}{2,}$/u.test(m))
    .map(normaliser);

/** Les mots d'un corpus et d'un article, où un qualifiant doit se trouver — le sigle « (EPI) » est dans la `ref`. */
const motsDe = (...textes: string[]) =>
  new Set(textes.flatMap((t) => normaliser(t).split(/[^\p{L}]+/u)).filter(Boolean));

/** Les articles du corpus que la `reference` nomme. */
function articlesNommes(reference: string): ArticleDepouille[] {
  const articles = new Set([...reference.matchAll(MOTIF_ARTICLE)].map((m) => espaces(m[0])));
  const reglement = new Set([...reference.matchAll(MOTIF_REGLEMENT)].map((m) => espaces(m[0])));
  const code = codeNomme(reference);
  const arretes = [...reference.matchAll(MOTIF_ARRETE)].map(dateArrete).filter(Boolean);
  const numero = numeroArticle(reference);
  const qualifiants = qualifiantsDArrete(reference);

  const trouves: ArticleDepouille[] = [];
  for (const c of CORPUS) {
    for (const a of c.articles) {
      const ref = espaces(a.ref);
      const sesCles = new Set([ref, ...[...ref.matchAll(MOTIF_ARTICLE)].map((m) => espaces(m[0]))]);
      // Un article de code : la clé ET le code. Une pastille qui ne nomme pas
      // de code ne se rapproche d'aucun.
      const parArticle =
        code !== null &&
        [...articles].some((k) => sesCles.has(k)) &&
        codeDeLArticle(c.id, ref) === code;
      // Un article de règlement de sécurité (`GN 13`) : le seul règlement
      // numéroté ainsi au corpus est celui du 25 juin 1980.
      const parReglement = c.id.startsWith("arrete-1980") && reglement.has(ref);
      const saDate = [...ref.matchAll(MOTIF_ARRETE)].map(dateArrete)[0];
      const parArrete =
        saDate !== undefined &&
        arretes.includes(saDate) &&
        (numero === undefined || numeroArticle(ref) === numero) &&
        qualifiants.every((q) => motsDe(c.intitule, a.ref).has(q));
      if (parArticle || parReglement || parArrete) trouves.push(a);
    }
  }
  return trouves;
}

// ── La garde ────────────────────────────────────────────────────────────────

const TOUTES = pastilles();
const A_CONFRONTER = TOUTES.filter(
  (p): p is Pastille & { extrait: string } => typeof p.extrait === "string",
);

/** Le verbatim contre lequel une pastille se confronte. */
const verbatimDe = (reference: string): string[] =>
  reference in HORS_CORPUS
    ? [HORS_CORPUS[reference].verbatim]
    : articlesNommes(reference)
        .map((a) => a.citationCle)
        .filter((t): t is string => Boolean(t));

describe("les extraits affichés entre guillemets sont le texte de l'article", () => {
  it("le relevé voit les pastilles — sinon ce test ne contrôle rien", () => {
    // Borne basse : 24 extraits littéraux ou résolus au 2026-09-26. Un
    // collecteur cassé rendrait zéro et passerait au vert.
    expect(TOUTES.length).toBeGreaterThanOrEqual(24);
    expect(A_CONFRONTER.length).toBeGreaterThanOrEqual(24);
  });

  it.each(A_CONFRONTER.map((p) => [p.ou, p.reference, p] as const))(
    "%s (%s) : l'extrait reproduit le verbatim du corpus",
    (_ou, _ref, p) => {
      const textes = verbatimDe(p.reference);
      expect(
        textes.length,
        `« ${p.reference} » ne nomme aucun article du corpus qui porte une ` +
          `citationCle. Deux remèdes : consigner le verbatim au corpus, ou ` +
          `déclarer le texte dans HORS_CORPUS avec son motif.`,
      ).toBeGreaterThan(0);
      expect(ecartsDeCitation(p.extrait, textes)).toEqual([]);
    },
  );

  it("chaque texte déclaré hors corpus porte un verbatim, une adresse et des dates non vides", () => {
    for (const [ref, h] of Object.entries(HORS_CORPUS)) {
      expect(h.verbatim.trim(), ref).not.toBe("");
      expect(h.url, ref).toMatch(/^https:\/\/www\.legifrance\.gouv\.fr\//);
      expect(h.luLe, ref).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(h.versionEnVigueur, ref).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(h.motif.trim(), ref).not.toBe("");
    }
  });

  it("chaque texte déclaré hors corpus est encore cité — sinon l'aveu est mort", () => {
    const citees = new Set(TOUTES.map((p) => p.reference));
    for (const ref of Object.keys(HORS_CORPUS)) expect(citees, ref).toContain(ref);
  });

  it("chaque texte déclaré hors corpus l'est vraiment", () => {
    // Un article qui entre au corpus sort de la liste : il devient confrontable.
    for (const ref of Object.keys(HORS_CORPUS))
      expect(articlesNommes(ref).filter((a) => a.citationCle), ref).toEqual([]);
  });
});

describe("la garde éprouvée en la cassant", () => {
  it("refuse le défaut historique de R. 4121-2 : « professionnels » retiré sans marque", () => {
    // Le texte qu'affichaient `duerp/page.tsx` et `ChezVous.tsx` jusqu'à
    // `48cc576` (2026-09-26), recopié tel quel depuis `git show 48cc576^`.
    const fautif =
      "La mise à jour du document unique d'évaluation des risques est réalisée : " +
      "au moins chaque année dans les entreprises d'au moins onze salariés ; " +
      "lors de toute décision d'aménagement important…";
    expect(ecartsDeCitation(fautif, verbatimDe("Art. R. 4121-2 CT"))).toEqual([
      "La mise à jour du document unique d'évaluation des risques est réalisée",
    ]);
    // Et la version corrigée passe : la garde n'accuse pas tout.
    expect(ecartsDeCitation(EXTRAIT_R4121_2, verbatimDe("Art. R. 4121-2 CT"))).toEqual([]);
  });

  it("refuse les deux écarts qu'elle a trouvés à sa première mesure, le 2026-09-26", () => {
    // `duerp/page.tsx`, jusqu'à ce commit : deux segments intervertis
    // (« est conservé » précède « dans ses versions successives », que le
    // texte place avant), et une durée que l'article ne formule pas ainsi —
    // il dit « La durée, qui ne peut être inférieure à quarante ans, […] sont
    // fixées par décret en Conseil d'Etat ».
    expect(
      ecartsDeCitation(
        "Le document unique d'évaluation des risques professionnels […] est conservé, dans ses versions successives, […] pendant une durée qui ne peut être inférieure à quarante ans.",
        verbatimDe("Art. L. 4121-3-1 CT"),
      ).length,
    ).toBeGreaterThan(0);
    // `actions/page.tsx`, jusqu'à ce commit : « œuvre », « Éviter »,
    // « Évaluer » là où Légifrance imprime « oeuvre », « Eviter », « Evaluer ».
    // La casse ne compte pas ; la graphie, si — un relevé ne se « corrige »
    // pas (même règle que la citationCle de `GN 1`).
    expect(
      ecartsDeCitation(
        "L'employeur met en œuvre les mesures prévues à l'article L. 4121-1 sur le fondement des principes généraux de prévention suivants : 1° Éviter les risques ; […]",
        verbatimDe("Art. L. 4121-2 CT"),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("refuse les trois cas que la contre-lecture a fait passer, le 2026-09-26", () => {
    // 1. Deux arrêtés du même jour : une phrase de l'arrêté EPI du 19 mars
    // 1993, verbatim de son article 1er au corpus, sous la pastille de
    // l'arrêté « Travaux dangereux » du même jour.
    const epi = CORPUS.find((c) => c.id === "arrete-1993-03-19-epi")!.articles[0].citationCle!;
    const phraseEpi = epi.split(" : ")[0];
    const travauxDangereux = verbatimDe("Arrêté du 19 mars 1993 · Travaux dangereux");
    expect(travauxDangereux).not.toContain(epi);
    expect(ecartsDeCitation(phraseEpi, travauxDangereux).length).toBeGreaterThan(0);
    // Et la pastille des travaux dangereux trouve toujours son texte.
    expect(travauxDangereux.length).toBe(1);
    // 2. Le code nommé : « R. 164-6 CT » n'est pas « CCH R. 164-6 ».
    expect(articlesNommes("Art. R. 164-6 CT")).toEqual([]);
    expect(articlesNommes("Art. R. 164-6 CCH · Accessibilité").map((a) => a.ref)).toEqual(["CCH R. 164-6"]);
    // 3. La lettre de numérotation : « a le document unique… », le « A » de
    // « V.-A.- » lu comme le verbe avoir.
    expect(
      ecartsDeCitation(
        "a le document unique d'évaluation des risques professionnels, dans ses versions successives, est conservé par l'employeur […]",
        verbatimDe("Art. L. 4121-3-1 CT"),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("une citation qui GARDE la numérotation de Légifrance passe ; la lettre seule, non (2026-09-26)", () => {
    const l4121_3_1 = verbatimDe("Art. L. 4121-3-1 CT");
    // Passaient à 752933f, refusées à 8e40d19 sur leur seul numéro.
    for (const c of [
      "V.-A.-Le document unique d'évaluation des risques professionnels, dans ses versions successives, est conservé par l'employeur […]",
      "III.-Les résultats de cette évaluation débouchent : […]",
      "VI.-Le document unique d'évaluation des risques professionnels est transmis par l'employeur à chaque mise à jour au service de prévention et de santé au travail auquel il adhère.",
    ])
      expect(ecartsDeCitation(c, l4121_3_1), c).toEqual([]);
    // Et le refus que la règle existe pour tenir.
    expect(
      ecartsDeCitation("a le document unique d'évaluation des risques professionnels […]", l4121_3_1).length,
    ).toBeGreaterThan(0);
  });

  it("un sigle qualifie l'arrêté : « EPI » ne se résout plus vers les deux arrêtés du jour", () => {
    const refs = (r: string) => articlesNommes(r).map((a) => a.ref);
    expect(refs("Arrêté du 19 mars 1993 · EPI").every((r) => r.includes("(EPI)"))).toBe(true);
    expect(refs("Arrêté du 19 mars 1993 · EPI").length).toBeGreaterThan(0);
    expect(refs("Arrêté du 19 mars 1993 · Travaux dangereux")).toEqual(["Arrêté 1993-03-19 art. 1er"]);
  });

  it("la même coupe, MARQUÉE d'une élision, est admise — c'est ce que le lecteur voit", () => {
    expect(
      ecartsDeCitation(
        "La mise à jour du document unique d'évaluation des risques […] est réalisée : […]",
        verbatimDe("Art. R. 4121-2 CT"),
      ),
    ).toEqual([]);
  });

  it("« V.-A.- » ouvre une proposition ; un trait d'union seul, non ; la lettre de numérotation, non plus", () => {
    expect(ecartsDeCitation("Le document est conservé.", ["V.-A.-Le document est conservé."])).toEqual([]);
    expect(ecartsDeCitation("A le document est conservé.", ["V.-A.-Le document est conservé."])).toEqual([
      "A le document est conservé",
    ]);
    expect(ecartsDeCitation("document est conservé.", ["Le porte-document est conservé."])).toEqual([
      "document est conservé",
    ]);
  });

  it("l'élision ne libère que son côté ; l'ordre du texte est exigé", () => {
    const texte = ["Le document, dans ses versions successives, est conservé pendant quarante ans."];
    expect(ecartsDeCitation("Le document […] est conservé pendant quarante ans.", texte)).toEqual([]);
    // Début de proposition toujours exigé du côté sans élision.
    expect(ecartsDeCitation("document […] est conservé pendant quarante ans.", texte)).toEqual([
      "document",
    ]);
    // Fin toujours exigée du côté sans élision, et sans « … » final.
    expect(ecartsDeCitation("Le document […] est conservé pendant", texte)).toEqual([
      "est conservé pendant",
    ]);
    expect(ecartsDeCitation("Le document […] est conservé pendant…", texte)).toEqual([]);
    // Deux extraits exacts intervertis ne sont pas une citation.
    expect(ecartsDeCitation("dans ses versions successives, Le document", texte)).toEqual([
      "Le document",
    ]);
  });
});
