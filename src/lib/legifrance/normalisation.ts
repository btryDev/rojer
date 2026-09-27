// Une citation du corpus est-elle un extrait EXACT du texte officiel ?
//
// Module pur. La question est posée mot pour mot, après une normalisation
// qui n'efface QUE de la typographie. Chaque règle ci-dessous est appliquée
// des deux côtés à l'identique ; aucune ne change un mot, et c'est ce que
// `normalisation.test.ts` éprouve en changeant un mot.
//
// Ce que la normalisation neutralise, et rien d'autre :
//  1. Unicode NFC (un « é » composé ou décomposé est le même) ;
//  2. espaces : insécable (U+00A0), fine insécable (U+202F), fines et autres
//     espaces Unicode, tabulations, sauts de ligne → une espace ; espaces
//     multiples → une ;
//  3. apostrophes ’ ‘ ʼ ′ → ' ; guillemets « » “ ” „ → " , sans espace à
//     l'intérieur ;
//  4. tirets – — ‑ ‐ − → - ; entre deux lettres ou chiffres, sans espace
//     (« celle-ci ») ; ailleurs, entouré d'une espace (« I.-La » = « I. - La ») ;
//  5. ponctuation haute : pas d'espace avant : ; ! ? ni avant ) , ni après ( ;
//  6. numérotation : « 1 ° » = « 1° », « º » (indicateur ordinal) = « ° »,
//     « ᵉʳ » = « er », « ᵉ » = « e », « §3 » = « § 3 ».
//
// Ce qu'elle NE neutralise PAS : la casse, les accents (« A cet effet » et
// « À cet effet » restent deux textes), la ponctuation autre que ses espaces,
// un mot, un chiffre. Une citation qui diffère par l'un d'eux est un écart,
// et le rapport montre lequel.
//
// Les coupures : `[…]`, `[...]`, `(…)`, `(...)` et un `…` isolé marquent une
// élision. La citation est alors découpée en fragments, et chaque fragment
// doit se trouver dans le texte officiel, DANS L'ORDRE.

export function normaliser(texte: string): string {
  return (
    texte
      .normalize("NFC")
      // 2. toutes les espaces Unicode
      .replace(/[\s\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]+/g, " ")
      // 3. apostrophes et guillemets
      .replace(/[\u2019\u2018\u02bc\u2032]/g, "'")
      .replace(/[\u00ab\u201c\u201e]\s*/g, '"')
      .replace(/\s*[\u00bb\u201d]/g, '"')
      // 4. tirets
      .replace(/[\u2013\u2014\u2011\u2010\u2212]/g, "-")
      .replace(/\s*-\s*/g, "-")
      // …puis un tiret qui ne lie pas deux lettres ou chiffres est un séparateur :
      // « I.-L'employeur » et « I. - L'employeur » donnent tous deux « I. - L'employeur »,
      // « celle-ci », « R. 4227-26 » restent d'un seul tenant.
      .replace(/([^\p{L}\p{N}\s])-/gu, "$1 - ")
      .replace(/-([^\p{L}\p{N}\s-])/gu, " - $1")
      .replace(/^-/, "- ")
      // 6. numérotation
      .replace(/\u00ba/g, "\u00b0")
      .replace(/\u1d49\u02b3/g, "er")
      .replace(/\u1d49/g, "e")
      .replace(/\s*\u00b0/g, "\u00b0")
      .replace(/\u00a7\s*/g, "\u00a7 ")
      // 5. ponctuation haute
      .replace(/\s+([:;!?)])/g, "$1")
      .replace(/\(\s+/g, "(")
      .replace(/ +/g, " ")
      .trim()
  );
}

/** Le texte d'un article rendu par l'API, HTML compris, en texte suivi. */
export function texteDepuisHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/?\s*(p|div|li|ul|ol|table|tr|td|th|h\d)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&laquo;/g, "\u00ab")
    .replace(/&raquo;/g, "\u00bb")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const ELISION = /\s*(?:\[\s*(?:\u2026|\.\.\.)\s*\]|\(\s*(?:\u2026|\.\.\.)\s*\)|(?:^|\s)\u2026(?=\s|$))\s*/g;

/** Les fragments d'une citation, coupée à ses élisions, guillemets englobants retirés. */
export function fragmentsDeCitation(citation: string): string[] {
  let c = citation.trim();
  // Une citation entière entre guillemets : les guillemets sont du corpus, pas du texte.
  const m = /^[\u00ab"\u201c]\s*([\s\S]*?)\s*[\u00bb"\u201d]$/.exec(c);
  if (m) c = m[1];
  return c
    .split(ELISION)
    .map((f) => normaliser(f))
    .filter((f) => f.length > 0);
}

export type DiffMot =
  | { op: "egal"; mot: string }
  /** Dans la citation, pas dans le texte officiel. */
  | { op: "retire"; mot: string }
  /** Dans le texte officiel, pas dans la citation. */
  | { op: "ajoute"; mot: string };

export type EcartCitation = {
  /** Le fragment de la citation qui n'a pas été trouvé, normalisé. */
  fragment: string;
  /** Le passage du texte officiel le plus proche, normalisé. */
  passageOfficiel: string;
  /** Distance d'édition en mots (Levenshtein : substitution, ajout, retrait = 1). */
  distance: number;
  /** Diff mot à mot, du fragment vers le passage officiel. */
  diff: DiffMot[];
};

export type ComparaisonCitation =
  | { exacte: true; fragments: number }
  | { exacte: false; fragments: number; ecarts: EcartCitation[] };

/**
 * La citation est-elle un extrait exact du texte officiel ?
 *
 * Exacte = chaque fragment normalisé est une sous-chaîne du texte officiel
 * normalisé, et les fragments se suivent dans l'ordre. Sinon, pour chaque
 * fragment manquant, le passage officiel le plus proche (alignement mot à
 * mot à extrémités libres) et le diff.
 */
export function comparerCitation(citation: string, texteOfficiel: string): ComparaisonCitation {
  const officiel = normaliser(texteOfficiel);
  const fragments = fragmentsDeCitation(citation);
  const ecarts: EcartCitation[] = [];
  let curseur = 0;
  for (const f of fragments) {
    const i = officiel.indexOf(f, curseur);
    if (i >= 0) {
      curseur = i + f.length;
      continue;
    }
    // Trouvé plus haut, hors de l'ordre : c'est aussi un écart (fragments intervertis).
    ecarts.push(alignerFragment(f, officiel));
  }
  return ecarts.length === 0
    ? { exacte: true, fragments: fragments.length }
    : { exacte: false, fragments: fragments.length, ecarts };
}

function mots(t: string): string[] {
  return t.split(" ").filter((m) => m.length > 0);
}

/**
 * Alignement « à extrémités libres » : le fragment entier contre la meilleure
 * fenêtre du texte officiel (distance d'édition en mots, début et fin libres
 * dans l'officiel). O(n·m), n = mots du fragment, m = mots du texte.
 */
export function alignerFragment(fragment: string, officielNormalise: string): EcartCitation {
  const a = mots(fragment);
  const b = mots(officielNormalise);
  const n = a.length;
  const m = b.length;
  // D[i][j] : coût d'aligner a[0..i) avec un suffixe de b[0..j).
  const D: Uint32Array[] = [];
  for (let i = 0; i <= n; i++) D.push(new Uint32Array(m + 1));
  for (let i = 1; i <= n; i++) D[i][0] = i;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      const del = D[i - 1][j] + 1;
      const ins = D[i][j - 1] + 1;
      D[i][j] = Math.min(sub, del, ins);
    }
  }
  let jFin = 0;
  // À coût égal, la fenêtre la plus longue : un mot changé en bout de citation
  // se lit comme une substitution, pas comme un mot retiré.
  for (let j = 1; j <= m; j++) if (D[n][j] <= D[n][jFin]) jFin = j;
  const distance = D[n][jFin];
  // Remontée.
  const diff: DiffMot[] = [];
  let i = n;
  let j = jFin;
  while (i > 0) {
    if (j > 0 && a[i - 1] === b[j - 1] && D[i][j] === D[i - 1][j - 1]) {
      diff.push({ op: "egal", mot: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && D[i][j] === D[i - 1][j - 1] + 1) {
      // Substitution : un retiré, un ajouté (poussés à l'envers, remis à l'endroit plus bas).
      diff.push({ op: "ajoute", mot: b[j - 1] });
      diff.push({ op: "retire", mot: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && D[i][j] === D[i][j - 1] + 1) {
      diff.push({ op: "ajoute", mot: b[j - 1] });
      j--;
    } else {
      diff.push({ op: "retire", mot: a[i - 1] });
      i--;
    }
  }
  diff.reverse();
  // Le passage officiel aligné : de j (début) à jFin.
  const passageOfficiel = b.slice(j, jFin).join(" ");
  return { fragment, passageOfficiel, distance, diff };
}

/**
 * Le diff rendu en une ligne lisible : seuls les mots qui diffèrent, avec
 * trois mots de contexte. `[-mot-]` est dans la citation seulement,
 * `{+mot+}` dans le texte officiel seulement.
 */
export function diffLisible(diff: DiffMot[], contexte = 3): string {
  const garder = new Array(diff.length).fill(false);
  diff.forEach((d, k) => {
    if (d.op !== "egal") {
      for (let x = Math.max(0, k - contexte); x <= Math.min(diff.length - 1, k + contexte); x++) {
        garder[x] = true;
      }
    }
  });
  const morceaux: string[] = [];
  let saut = false;
  diff.forEach((d, k) => {
    if (!garder[k]) {
      saut = true;
      return;
    }
    if (saut && morceaux.length > 0) morceaux.push("…");
    saut = false;
    morceaux.push(d.op === "egal" ? d.mot : d.op === "retire" ? `[-${d.mot}-]` : `{+${d.mot}+}`);
  });
  return morceaux.join(" ");
}
