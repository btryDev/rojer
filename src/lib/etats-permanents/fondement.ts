/**
 * L'article qui fonde une ligne de « Ce qui doit être en place », et son texte.
 *
 * **Le constat qui l'appelle** (C40, 2026-09-26) : toute obligation datée cite
 * son article sur sa fiche de vérification, toute obligation d'une personne
 * sur sa fiche dans l'équipe — et les états permanents, CSE et règlement
 * intérieur compris, n'en citaient aucun. Le guide a dû l'avouer à l'écran
 * (« ne citent pas encore leur texte »). La propriétaire a demandé, le
 * 2026-09-27, d'y « penser un widget » ; la pastille est posée ici et sur la
 * ligne de l'écran, les deux lisant ce module.
 *
 * **Le premier article, et lui seul** : `referencesLegales[0]`, celui que le
 * référentiel place en tête — la même règle que la fiche d'un salarié
 * (`equipe/[salarieId]/page.tsx`, `slice(0, 1)`). Les suivants restent sur la
 * fiche de l'obligation ; une ligne qui en porterait trois ne se lirait plus.
 *
 * **L'extrait EST la `citationCle` du corpus**, prise telle quelle et jamais
 * recomposée. Une citation qu'on ne trouve pas au corpus — article absent,
 * non dépouillé, ou dépouillé sans verbatim — ne s'invente pas : la pastille
 * ouvre alors Légifrance sans rien citer, et `fondement.test.ts` le tient.
 *
 * Calculé côté serveur : le corpus ne traverse pas vers le navigateur, seules
 * trois chaînes le font.
 */

import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import type { Obligation } from "@/lib/referentiels/conformite";

export type FondementLigne = {
  /** La `reference` du référentiel, telle qu'elle s'imprime ailleurs. */
  reference: string;
  /** L'adresse de l'article ; `null` si le référentiel n'en porte pas. */
  href: string | null;
  /** La `citationCle` du corpus ; `null` si le corpus n'en porte pas. */
  extrait: string | null;
};

/**
 * Ce qui désigne l'article dans sa clé, sans le texte qui le porte :
 * `R. 4544-10`, `art. 103` (de « Arrêté 1986-01-31 art. 103 »), `R. 134-6`
 * (de « CCH R. 134-6 »), `MS 38`.
 */
function designation(article: string): string {
  const a = article.replace(/\s+/g, " ").trim();
  const m = /(?:art\. ?\S+|[LRD]\. ?\d[\d-]*\d|[A-Z]{1,3} \d+)$/.exec(a);
  return m?.[0] ?? a;
}

/**
 * Les articles qu'une `reference` imprimée nomme : `R. 4544-10`, `art. 103`,
 * `MS 38`. Un article de code précédé de « art. » (« CCH, art. R. 134-6 »)
 * compte une fois, sous sa forme de code.
 */
function designationsNommees(reference: string): Set<string> {
  const r = reference.replace(/\s+/g, " ");
  const out = new Set<string>();
  for (const m of r.matchAll(/\b[LRD]\. ?\d[\d-]*\d\b/g))
    out.add(m[0].replace(/\. ?/, ". "));
  for (const m of r.matchAll(/\bart\. ?(\d+(?:er)?)\b/gi))
    out.add(`art. ${m[1]}`);
  for (const m of r.matchAll(/\b[A-Z]{1,3} \d+\b/g)) out.add(m[0]);
  return out;
}

/** Un intervalle : « R. 4323-1 à R. 4323-5 », « art. 12 à 15 ». */
const INTERVALLE = /\sà\s+(?:[LRD]\.|art\.|\d|[A-Z]{1,3}\s\d)/;

/**
 * La `reference` affichée nomme-t-elle CET article, ET LUI SEUL ?
 *
 * LA QUESTION QUE LA PREMIÈRE ÉCRITURE NE POSAIT PAS (2026-09-27). La clé
 * `article` désigne un article ; la `reference` qu'on imprime peut en nommer
 * plusieurs. `elec-travail-habilitation-personnel` imprime « R. 4544-9 à
 * R. 4544-11 » sous la clé `R. 4544-10`.
 *
 * ET LA SECONDE ÉCRITURE NE LA POSAIT QU'À MOITIÉ (contre-lecture du même
 * jour, M1) : elle vérifiait que l'article était NOMMÉ, pas qu'il l'était
 * SEUL. « R. 4323-1 à R. 4323-5 » affichait le texte de R. 4323-1, « R. 4224-12
 * et R. 4224-13 » celui de R. 4224-13, « CCH, art. R. 134-6 et R. 134-7 »
 * celui de R. 134-6 — un article sous le nom de plusieurs. Le texte ne
 * s'affiche désormais que si la référence ne nomme QUE l'article dont il est
 * tiré ; sinon la pastille ouvre Légifrance sans rien citer.
 */
export function referenceNommeLArticle(
  reference: string,
  article: string,
): boolean {
  if (INTERVALLE.test(reference.replace(/\s+/g, " "))) return false;
  const nommes = designationsNommees(reference);
  return nommes.size === 1 && nommes.has(designation(article).replace(/\. ?/, ". "));
}

export function fondementDe(obligation: Obligation): FondementLigne | null {
  const r = obligation.referencesLegales[0];
  if (!r) return null;
  const lu =
    r.article && referenceNommeLArticle(r.reference, r.article)
      ? indexArticlesParRef().get(r.article)
      : undefined;
  const extrait =
    lu && lu.article.statut !== "non_depouille" && lu.article.citationCle
      ? lu.article.citationCle
      : null;
  return { reference: r.reference, href: r.url ?? null, extrait };
}
