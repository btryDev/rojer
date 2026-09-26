// Le fait générateur d'une ligne « Quand ça arrive » est ce que le dirigeant
// lit pour savoir si l'obligation le concerne. `lignes.ts` promet qu'il est
// écrit « dans les mots du texte ». Ce fichier rend la promesse vérifiable.
//
// POURQUOI CE TEST EXISTE. La contre-lecture du 2026-09-21 a trouvé, sur onze
// faits générateurs, des écarts au texte que rien n'avait signalés :
// « particulièrement vulnérable à la chaleur intense » là où l'article écrit
// « particulièrement vulnérable aux risques liés à l'exposition aux épisodes
// de chaleur intense », « d'accidents ou de maladies » pour « d'accident du
// travail ou de maladie professionnelle ou à caractère professionnel »…
// Une paraphrase de bonne foi ne se voit pas à la relecture : elle se lit bien.
//
// POURQUOI PAS UN CONTRÔLE MOT À MOT. La première version de ce test cherchait
// chaque mot du fait dans le texte. Elle passait sur toutes ces paraphrases :
// elles n'emploient que des mots de l'article, rangés autrement. Ce qui les
// trahit est l'ORDRE.
//
// LA RÈGLE. Le fait se découpe à la ponctuation (virgule, point-virgule,
// deux-points, point, tiret). Chaque segment, privé d'une conjonction de tête
// (« et », « ou »), est un EXTRAIT CONTINU du verbatim consigné pour
// l'obligation — la `note` de ses références légales, ou la `citationCle` du
// corpus pour ces mêmes articles. Deux souplesses, écrites ici plutôt que
// laissées à l'appréciation : la casse et la ponctuation sont ignorées, et le
// singulier vaut le pluriel (« épisode » / « épisodes »).
//
// CE QU'ELLE NE PROUVE PAS : que les segments sont dans l'ordre du texte, ni
// qu'une virgule n'a pas été ajoutée ou retirée — celle qui, dans `R. 4141-12`,
// faisait pencher le rattachement d'une incise.

import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";

function jetons(texte: string): string[] {
  return texte.replace(/[’‘]/g, "'").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

const singulier = (m: string) => (/[sx]$/.test(m) && m.length > 3 ? m.slice(0, -1) : m);
const memeMot = (a: string, b: string) => a === b || singulier(a) === singulier(b);

function estExtrait(segment: string[], texte: string[]): boolean {
  if (segment.length === 0) return true;
  for (let i = 0; i + segment.length <= texte.length; i++) {
    if (segment.every((m, k) => memeMot(m, texte[i + k]))) return true;
  }
  return false;
}

const CONJONCTION_DE_TETE = new Set(["et", "ou"]);

/** Les segments du fait qui ne sont un extrait continu d'aucun des textes. */
function segmentsHorsTexte(fait: string, textes: string[]): string[] {
  const sequences = textes.map(jetons);
  return fait
    .split(/[,;:.—]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => {
      const j = jetons(s);
      const segment = CONJONCTION_DE_TETE.has(j[0]) ? j.slice(1) : j;
      return !sequences.some((t) => estExtrait(segment, t));
    });
}

/** Le verbatim consigné pour une obligation : ses notes, et la clé de corpus de ses articles. */
function verbatimDe(o: (typeof obligationsConformite)[number]): string[] {
  const index = indexArticlesParRef();
  const textes: string[] = [];
  for (const r of o.referencesLegales) {
    if (r.note) textes.push(r.note);
    const cle = r.article ? index.get(r.article)?.article.citationCle : undefined;
    if (cle) textes.push(cle);
  }
  return textes;
}

const avecFait = obligationsConformite.filter((o) => o.faitGenerateur);
const parId = (id: string) => {
  const o = avecFait.find((x) => x.id === id);
  if (!o) throw new Error(`${id} n'a plus de fait générateur`);
  return o;
};

describe("le fait générateur est écrit dans les mots du texte", () => {
  it("il y a des faits générateurs à contrôler — sinon ce test ne contrôle rien", () => {
    expect(avecFait.length).toBeGreaterThanOrEqual(11);
  });

  it.each(avecFait.map((o) => [o.id, o] as const))(
    "%s : chaque segment est un extrait du texte",
    (_id, o) => {
      expect(segmentsHorsTexte(o.faitGenerateur!, verbatimDe(o))).toEqual([]);
    },
  );

  // LA GARDE ÉPROUVÉE EN LA CASSANT — avec les paraphrases que la
  // contre-lecture a réellement trouvées, pas avec des erreurs fabriquées
  // pour l'occasion. Chacune doit être refusée.
  it.each([
    [
      "prevention-etablissement-chaleur-travailleur-vulnerable",
      "Lorsque l'employeur est informé qu'un travailleur est, notamment en raison de son âge ou de son état de santé, particulièrement vulnérable à la chaleur intense",
    ],
    [
      "formation-securite-etablissement-apres-accident-grave",
      "En cas d'accident du travail grave, ou de maladie professionnelle ou à caractère professionnel grave — et en cas d'accidents ou de maladies présentant un caractère répété à un même poste, à des postes similaires, dans une même fonction ou des fonctions similaires",
    ],
    ["prevention-etablissement-chaleur-mise-en-oeuvre", "Lors de la survenue d'un épisode de chaleur intense"],
    [
      "formation-securite-etablissement-travail-sur-ecran",
      "Avant la première affectation d'un salarié à un travail sur écran",
    ],
  ])("la paraphrase historique de %s est refusée", (id, paraphrase) => {
    expect(segmentsHorsTexte(paraphrase, verbatimDe(parId(id))).length).toBeGreaterThan(0);
  });

  it("le pluriel du texte couvre le singulier du fait, et la conjonction de tête est admise", () => {
    expect(segmentsHorsTexte("ou épisode de chaleur", ["des épisodes de chaleur intense"])).toEqual([]);
    expect(segmentsHorsTexte("ou un épisode de chaleur", ["des épisodes de chaleur intense"])).toEqual([
      "ou un épisode de chaleur",
    ]);
  });
});
