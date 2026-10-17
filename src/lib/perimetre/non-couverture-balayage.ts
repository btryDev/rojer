// Ce que les textes de couverture affirment, confronté au référentiel.
//
// Même geste que `referentiels/corpus/citations-ecran.ts`, sur un autre objet.
// Celui-là balaie les surfaces qui s'affichent et vérifie qu'aucune ne cite un
// article hors corpus. Celui-ci balaie les textes de couverture et vérifie
// qu'aucun ne se contredise avec le référentiel — ni en annonçant non porté ce
// qui l'est, ni en promettant ce qui ne l'est pas.
//
// LA DIFFICULTÉ EST QU'UNE PROSE LIBRE NE SE RAPPROCHE PAS. Un article se
// reconnaît à sa forme (`R. 4121-2`), une obligation nommée en français ne se
// reconnaît à rien. D'où `non-couverture.ts` : le texte déclare ses sujets en
// les écrivant, et c'est le même mot qui s'affiche et qui se confronte. Rien
// n'est recopié — la référence est le référentiel lui-même, et il ne se répare
// pas en recopiant.
//
// TROIS RÈGLES, ET ELLES SE CHAÎNENT.
//
//  1. Tout `nonPorte(sujet)` doit rester sans réponse dans le référentiel.
//     C'est la règle qui aurait attrapé le défaut du 2026-09-03.
//  2. Tout `porte(sujet)` doit en trouver au moins une. Le défaut retourné :
//     promettre ce qu'on ne livre pas.
//  3. Toute `pieceAttendue` du référentiel qui apparaît dans un texte de
//     couverture doit être à l'intérieur d'un de ces deux appels. C'est la
//     règle qui ferme le chemin d'entrée : le lot 8 n'a pas menti dans un
//     `nonPorte()` — il a livré une obligation sous une prose que personne
//     n'avait déclarée. La règle 3 refuse la prose muette, la règle 1 juge la
//     prose déclarée, et il n'y a pas de troisième état.
//
// CE QU'ELLE NE VOIT PAS, et il faut le dire aussi. Une obligation nommée dans
// une prose muette et DÉPOURVUE de `pieceAttendue` — une vérification
// périodique, par exemple — passe : la règle 3 n'a alors aucune prise, seule la
// discipline du `nonPorte()` la rattrape. Les vingt pièces attendues du
// référentiel sont le filet, pas le mur.
//
// LE RAPPROCHEMENT EST VOLONTAIREMENT LARGE : le sujet déclaré est cherché dans
// le libellé, la description ET la pièce attendue de chaque obligation, sans
// accents ni casse. Il lève donc des alertes sur des voisinages de mots — « le
// compartimentage » répond au SSI d'un ERP. C'est le bon sens de l'erreur : une
// alerte se lève en précisant la phrase, ce qui rend le texte meilleur ; un
// silence ne se lève jamais, et c'est comme ça que le règlement intérieur a
// tenu trois jours sur une page qui prétendait ne pas le porter.
//
// LE PÉRIMÈTRE DU BALAYAGE est celui des textes de couverture : les modules qui
// les rédigent, et l'écran qui les entoure de sa propre prose. Pas les
// documents PDF, qui projettent sans rédiger (`pdf/mentions-perimetre.ts` ne
// nomme aucune obligation, il met en forme celles qu'on lui donne), ni
// `docs/couverture-declaree-du-produit.md`, dont les références d'articles sont
// déjà rapprochées du corpus par `corpus/doc-couverture.test.ts`.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { obligationsConformite } from "@/lib/referentiels/conformite";

/** Les répertoires où se rédigent les textes de couverture. */
export const SURFACES_DE_COUVERTURE = [
  "src/lib/perimetre",
  "src/app/etablissements/[id]/perimetre",
  // 2026-10-14 : l'aide des catégories (`labels.ts`) et la liste des
  // matériels non couverts disent désormais, elles aussi, ce que Rojer ne
  // suit pas — les annonces du gaz, des escaliers mécaniques, de l'eau et des
  // échelles y ont été déplacées depuis la page « Ce que Rojer ne couvre
  // pas ». Elles passent par `nonPorte` / `porte`, et sont confrontées ici.
  "src/lib/equipements",
  // 2026-10-17, sous-lot D : l'aide par type d'ERP (`AIDE_TYPE_ERP`). Un
  // fichier, pas le dossier : le reste de `etablissements` ne dit rien de la
  // couverture, et `aides-regimes.ts` dit ce qui EST porté sans marqueur.
  "src/lib/etablissements/aide-type-erp.ts",
] as const;

/**
 * Les deux marqueurs, repérés dans la source.
 *
 * `(?<![A-Za-z])` est nécessaire et pas décoratif : sans lui, `porte`
 * capturerait la fin de `nonPorte`, et toutes les affirmations de non-couverture
 * seraient lues à l'envers — le balayage passerait au vert en mesurant le
 * contraire de ce qu'il annonce.
 *
 * La virgule finale est facultative parce que le formateur la met dès que
 * l'appel passe à la ligne. Sans elle, un appel reformaté cessait d'être vu —
 * les deux tests d'injection l'ont montré à la première exécution, ce qui est
 * précisément ce qu'on leur demande.
 */
const MARQUEUR = /(?<![A-Za-z])(nonPorte|porte)\s*\(\s*"([^"]*)"\s*,?\s*\)/g;

const sansAccent = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’ʼ]/g, "'")
    .toLowerCase();

/** Les articles français en tête de sujet, qui ne portent aucun sens ici. */
const ARTICLE_INITIAL = /^(?:les |le |la |l'|un |une |des |du |de la |de l')/;

const clef = (s: string) =>
  sansAccent(s).replace(/\s+/g, " ").trim().replace(ARTICLE_INITIAL, "");

/**
 * Le texte d'un fichier source, réduit à ce qu'il affiche.
 *
 * Trois réductions, chacune contre un faux négatif constaté en écrivant ce
 * module :
 *
 *  - les commentaires partent — ils racontent des décisions, le dirigeant ne
 *    les lit pas, et celui de `couverture.ts` nomme le règlement intérieur pour
 *    expliquer précisément ce défaut-ci ;
 *  - les concaténations de littéraux se recollent — `"…registre de " + "sécurité…"`
 *    aurait coupé une pièce attendue en deux, et `pdf/mentions-perimetre.ts`
 *    écrit ses phrases exactement comme ça ;
 *  - les blancs se replient sur une espace — la prose d'un écran est coupée en
 *    fin de ligne par le formateur, et « registre de\n sécurité » n'aurait été
 *    vu par aucune recherche ligne à ligne.
 */
function texteAffiche(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ")
    .replace(/(["'`])\s*\+\s*(["'`])/g, "")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function fichiersSources(racine: string, dossier: string): string[] {
  const chemin = join(racine, dossier);
  // Une surface peut être un fichier seul (2026-10-17, `aides-regimes.ts`).
  if (statSync(chemin).isFile()) return [chemin];
  const trouves: string[] = [];
  const descendre = (d: string) => {
    for (const entree of readdirSync(d)) {
      const p = join(d, entree);
      if (statSync(p).isDirectory()) {
        if (entree !== "node_modules") descendre(p);
      } else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) {
        // Le balayage n'est pas son propre sujet : les deux modules de la garde
        // écrivent `nonPorte` et `porte` pour en parler, pas pour l'affirmer.
        if (!/non-couverture/.test(entree)) trouves.push(p);
      }
    }
  };
  descendre(chemin);
  return trouves;
}

function surfaces(racine: string): { fichier: string; texte: string }[] {
  const lus: { fichier: string; texte: string }[] = [];
  for (const dossier of SURFACES_DE_COUVERTURE) {
    for (const fichier of fichiersSources(racine, dossier)) {
      lus.push({
        fichier: fichier.slice(racine.length + 1),
        texte: texteAffiche(readFileSync(fichier, "utf8")),
      });
    }
  }
  return lus;
}

/** Une obligation du référentiel, telle qu'on la nomme dans un constat. */
export type ObligationNommee = { id: string; libelle: string };

/**
 * Les obligations du référentiel auxquelles ce sujet répond.
 *
 * Dérivé, jamais recopié : la seule liste consultée est `obligationsConformite`.
 * Le jour où une obligation entre, sort ou change de libellé, ce que ce module
 * répond change avec elle — c'est toute la différence avec une liste
 * d'exceptions, qui se répare en recopiant et cesse alors de vérifier.
 */
export function obligationsRepondantA(sujet: string): ObligationNommee[] {
  const cherche = clef(sujet);
  if (cherche === "") return [];
  return obligationsConformite
    .filter((o) => {
      const pieceAttendue = (o as { pieceAttendue?: string }).pieceAttendue ?? "";
      const mots = clef([o.libelle, o.description ?? "", pieceAttendue].join(" · "));
      return mots.includes(cherche);
    })
    .map((o) => ({ id: o.id, libelle: o.libelle }));
}

export type AffirmationConfrontee = {
  /** Le sujet tel que le texte l'écrit, et tel que le dirigeant le lit. */
  sujet: string;
  /** Où il est affirmé, relatif à la racine du dépôt. */
  fichier: string;
  /** Ce que le référentiel répond. */
  obligations: ObligationNommee[];
};

function affirmations(
  racine: string,
  marqueur: "nonPorte" | "porte",
): AffirmationConfrontee[] {
  const vues: AffirmationConfrontee[] = [];
  for (const { fichier, texte } of surfaces(racine)) {
    for (const trouve of texte.matchAll(MARQUEUR)) {
      if (trouve[1] !== marqueur) continue;
      vues.push({
        sujet: trouve[2],
        fichier,
        obligations: obligationsRepondantA(trouve[2]),
      });
    }
  }
  return vues;
}

/**
 * Toutes les affirmations de non-couverture que le balayage voit, démenties ou
 * non (2026-10-17, ADR-046). Sert à prouver qu'un texte passe bien par
 * `nonPorte` — les sujets des annonces, les phrases des familles : un sujet
 * écrit hors du marqueur échapperait à la règle 1 sans que rien le signale.
 */
export function affirmationsDeNonCouverture(racine: string): AffirmationConfrontee[] {
  return affirmations(racine, "nonPorte");
}

/**
 * Règle 1 — les affirmations de non-couverture que le référentiel dément.
 *
 * Vide, et rien d'autre. Chaque entrée est une phrase qui annonce au dirigeant
 * un manque que le produit a comblé.
 */
export function nonCouverturesContredites(racine: string): AffirmationConfrontee[] {
  return affirmations(racine, "nonPorte").filter((a) => a.obligations.length > 0);
}

/**
 * Règle 2 — les affirmations de couverture que rien ne fonde.
 *
 * Vide, et rien d'autre. Chaque entrée est une phrase qui promet au dirigeant
 * une obligation dont le référentiel n'a aucune trace.
 */
export function couverturesSansObligation(racine: string): AffirmationConfrontee[] {
  return affirmations(racine, "porte").filter((a) => a.obligations.length === 0);
}

export type PieceNommee = {
  /** La pièce attendue, telle que le référentiel l'écrit. */
  piece: string;
  fichier: string;
  /** Les obligations qui l'attendent. */
  obligations: ObligationNommee[];
  /** La phrase autour, pour retrouver l'endroit sans le chercher. */
  extrait: string;
};

/** Les pièces attendues du référentiel, dérivées et non listées. */
export function piecesAttenduesDuReferentiel(): Map<string, ObligationNommee[]> {
  const pieces = new Map<string, ObligationNommee[]>();
  for (const o of obligationsConformite) {
    const piece = (o as { pieceAttendue?: string }).pieceAttendue;
    if (!piece) continue;
    const deja = pieces.get(piece) ?? [];
    deja.push({ id: o.id, libelle: o.libelle });
    pieces.set(piece, deja);
  }
  return pieces;
}

/**
 * Règle 3 — les pièces du référentiel nommées par une prose qui ne se déclare
 * pas.
 *
 * On retire d'abord les deux marqueurs du texte : ce qu'ils encadrent est déjà
 * jugé par les règles 1 et 2, et le compter ici le ferait deux fois. Reste la
 * prose muette — celle qui a porté le défaut d'origine.
 */
export function piecesNommeesSansMarqueur(racine: string): PieceNommee[] {
  const pieces = piecesAttenduesDuReferentiel();
  const vues: PieceNommee[] = [];

  for (const { fichier, texte } of surfaces(racine)) {
    const muet = texte.replace(MARQUEUR, " ");
    const cherche = sansAccent(muet);
    for (const [piece, obligations] of pieces) {
      const ou = cherche.indexOf(sansAccent(piece));
      if (ou === -1) continue;
      vues.push({
        piece,
        fichier,
        obligations,
        extrait: muet.slice(Math.max(0, ou - 60), ou + piece.length + 60).trim(),
      });
    }
  }
  return vues;
}
