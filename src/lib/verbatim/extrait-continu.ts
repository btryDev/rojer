// Un texte qui se dit « dans les mots de l'article » l'est-il ? La règle, UNE
// fois, pour les deux gardes qui la tiennent :
//
//  - `quand-ca-arrive/fait-dans-le-texte.test.ts` — le fait générateur et le
//    libellé d'une ligne « Quand ça arrive » ;
//  - `verbatim/extraits-affiches.test.ts` — l'`extrait` d'un `LegalBadge`,
//    présenté entre guillemets comme le texte de l'article.
//
// Extrait de la première le 2026-09-26, quand la seconde a dû exister : la
// recopier aurait fait deux règles qui dérivent, et c'est la dérive entre deux
// relevés du même texte que ces gardes existent pour empêcher.
//
// LA RÈGLE. Le texte contrôlé se découpe à la ponctuation. Chaque segment est
// un EXTRAIT CONTINU du verbatim, qui COMMENCE ET SE TERMINE LÀ OÙ UNE
// PROPOSITION DU TEXTE COMMENCE ET SE TERMINE (ponctuation, numéro d'item
// « 1° », début ou fin du texte). Deux souplesses, écrites ici plutôt que
// laissées à l'appréciation : la casse et la ponctuation ne comptent pas, et le
// singulier vaut le pluriel. Aucune conjonction n'est offerte : un segment qui
// en a besoin la prend dans le texte.
//
// Les commentaires d'usage — ce que la règle attrape, ce qu'elle ne prouve pas —
// sont dans chacune des deux gardes, parce qu'ils diffèrent.

export const normaliser = (t: string) => t.replace(/[’‘]/g, "'").toLowerCase();
const MOT = /[\p{L}\p{N}]+/gu;
const FIN_DE_PROPOSITION = /^\s*(?:$|[,;:.—–…»«()[\]°!?])/;
// « V.-A.-Le document… » : le séparateur de numérotation de Légifrance
// (« I.- », « A.- ») ouvre une proposition, comme « 1° ». Ajouté le 2026-09-26 :
// sans lui, rien de ce qui suit un « V.-A.- » ne pouvait être cité.
const DEBUT_DE_PROPOSITION = /(?:^|[,;:.—–…»«()[\]°!?]|\.-)\s*$/;
// Mais la LETTRE de numérotation n'est pas une proposition : « A » dans
// « V.-A.-Le », suivie de son « .- ». Sans cette exclusion (contre-lecture du
// 2026-09-26), « a le document unique… » passait sur `L. 4121-3-1` — le « A »
// de la numérotation lu comme le verbe avoir.
const SUIVI_DU_SEPARATEUR = /^\.-/;

export type Jeton = { mot: string; debutDeProposition: boolean; finDeProposition: boolean };

export function jetonsDuTexte(texte: string): Jeton[] {
  const t = normaliser(texte);
  return [...t.matchAll(MOT)].map((m) => ({
    mot: m[0],
    debutDeProposition:
      DEBUT_DE_PROPOSITION.test(t.slice(0, m.index!)) &&
      !SUIVI_DU_SEPARATEUR.test(t.slice(m.index! + m[0].length)),
    finDeProposition: FIN_DE_PROPOSITION.test(t.slice(m.index! + m[0].length)),
  }));
}
export const mots = (t: string) => normaliser(t).match(MOT) ?? [];

export const singulier = (m: string) => (/[sx]$/.test(m) && m.length > 3 ? m.slice(0, -1) : m);
const memeMot = (a: string, b: string) => a === b || singulier(a) === singulier(b);

/**
 * Où le segment se trouve dans le texte, à partir de `depuis` : l'indice du
 * jeton qui suit sa dernière occurrence retenue, ou -1.
 *
 * `debutLibre` / `finLibre` lèvent l'exigence de proposition d'UN côté — celui
 * d'une élision marquée, et de lui seul (voir `ecartsDeCitation`).
 */
function trouver(
  segment: string[],
  texte: Jeton[],
  depuis = 0,
  { debutLibre = false, finLibre = false } = {},
): number {
  if (segment.length === 0) return depuis;
  for (let i = depuis; i + segment.length <= texte.length; i++) {
    if (
      segment.every((m, k) => memeMot(m, texte[i + k].mot)) &&
      (debutLibre || texte[i].debutDeProposition) &&
      (finLibre || texte[i + segment.length - 1].finDeProposition)
    )
      return i + segment.length;
  }
  return -1;
}

export function estExtraitComplet(segment: string[], texte: Jeton[]): boolean {
  return trouver(segment, texte) >= 0;
}

const PONCTUATION_DE_COUPE = /[,;:.—]/;

/** Les segments du fait qui ne sont pas un extrait complet d'un des textes. */
export function segmentsHorsTexte(fait: string, textes: string[]): string[] {
  const sequences = textes.map(jetonsDuTexte);
  return fait
    .split(PONCTUATION_DE_COUPE)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => {
      const j = mots(s);
      return !sequences.some((t) => estExtraitComplet(j, t));
    });
}

/** Les mots du libellé que le texte n'emploie pas. */
export function motsHorsTexte(libelle: string, textes: string[]): string[] {
  const vocabulaire = new Set(textes.flatMap(mots).map(singulier));
  return mots(libelle).filter((m) => !vocabulaire.has(singulier(m)));
}

/** Le passage entre guillemets d'une note : du premier « au dernier ». */
export const entreGuillemets = (note: string) => {
  const a = note.indexOf("«");
  const b = note.lastIndexOf("»");
  return a >= 0 && b > a ? note.slice(a + 1, b) : "";
};

/** « […] », et sa graphie à trois points. */
const ELISION = /\[\s*(?:…|\.\.\.)\s*\]/;

/**
 * Les segments d'une CITATION qui ne se retrouvent pas dans le verbatim, ou
 * `[]` si elle le reproduit.
 *
 * C'est la règle ci-dessus, plus trois choses qu'une citation porte et qu'un
 * fait générateur ne porte pas :
 *
 *  - « […] » est une ÉLISION ADMISE. Elle coupe le segment, et elle lève
 *    l'exigence de proposition du côté où elle se trouve, et de ce côté
 *    seulement : « Des arrêtés […] déterminent » coupe au milieu d'une
 *    proposition, et c'est ce que le lecteur voit. Ce qu'elle n'excuse pas :
 *    un mot retiré SANS la marque — le défaut historique de `R. 4121-2`,
 *    « d'évaluation des risques est réalisée » sans « professionnels ».
 *  - « … » FINAL est admis : il lève l'exigence de fin sur le dernier segment.
 *  - LES SEGMENTS SONT DANS L'ORDRE DU TEXTE, et tous dans le MÊME texte. Une
 *    citation entre guillemets donne à lire une suite ; deux extraits exacts
 *    intervertis n'en sont pas une.
 */
export function ecartsDeCitation(citation: string, textes: string[]): string[] {
  const sequences = textes.map(jetonsDuTexte).filter((t) => t.length > 0);
  if (sequences.length === 0) return [citation];

  let corps = citation.trim();
  const suspendue = /…$/.test(corps) && !/\]\s*$/.test(corps);
  if (suspendue) corps = corps.replace(/…$/, "");

  type Segment = { brut: string; mots: string[]; debutLibre: boolean; finLibre: boolean };
  const segments: Segment[] = [];
  const morceaux = corps.split(ELISION);
  morceaux.forEach((morceau, im) => {
    const parts = morceau
      .split(PONCTUATION_DE_COUPE)
      .map((s) => s.trim())
      .filter((s) => mots(s).length > 0);
    parts.forEach((brut, ip) => {
      segments.push({
        brut,
        mots: mots(brut),
        // Une élision avant ce morceau (il n'est pas le premier) libère le
        // début de son premier segment ; une élision après (il n'est pas le
        // dernier) libère la fin de son dernier.
        debutLibre: ip === 0 && im > 0,
        finLibre:
          ip === parts.length - 1 &&
          (im < morceaux.length - 1 || (suspendue && im === morceaux.length - 1)),
      });
    });
  });

  // Le texte qui laisse le moins de segments dehors : c'est l'écart le plus
  // honnête à montrer. Zéro dans l'un d'eux suffit.
  let meilleur: string[] | null = null;
  for (const texte of sequences) {
    const dehors: string[] = [];
    let curseur = 0;
    for (const s of segments) {
      const apres = trouver(s.mots, texte, curseur, s);
      if (apres < 0) dehors.push(s.brut);
      else curseur = apres;
    }
    if (!meilleur || dehors.length < meilleur.length) meilleur = dehors;
    if (dehors.length === 0) break;
  }
  return meilleur!;
}
