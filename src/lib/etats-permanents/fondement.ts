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
 * [2026-10-14 : sauf une ligne fondée sur un chapitre de type du livre II,
 * titre II, qui montre l'article du type de l'établissement ; et un article
 * de type cité en contexte s'ajoute en complément — voir `ContexteFondement`.]
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
import type { Obligation, ReferenceLegale } from "@/lib/referentiels/conformite/types";
import type { CategorieErp, TypeErp } from "@/lib/referentiels/types-communs";
import { typesErpOrdreProduit } from "@/lib/matching/types-erp";
import { porteGn10 } from "@/lib/referentiels/conformite/texte-gn10";

export type FondementLigne = {
  /** La `reference` du référentiel, telle qu'elle s'imprime ailleurs. */
  reference: string;
  /** L'adresse de l'article ; `null` si le référentiel n'en porte pas. */
  href: string | null;
  /** La `citationCle` du corpus ; `null` si le corpus n'en porte pas. */
  extrait: string | null;
  /**
   * Les articles de CONTEXTE propres aux types de l'établissement, montrés à
   * côté du fondement (2026-10-14) : `N 20` sur la consigne du Code du
   * travail, pour un restaurant de type N des catégories 1 à 4. Depuis
   * l'ADR-045 (lot 3), une LISTE : un établissement qui groupe plusieurs
   * exploitations voit l'article de chacun de ses types — `N 17` à côté de
   * `O 18` pour un hôtel-restaurant. Absent quand il n'y en a aucun.
   */
  complement?: FondementLigne[];
  /**
   * La ligne cite GN 10 (`porteGn10`, 2026-10-17, contrôle visuel de c6) :
   * la pastille dit alors, sous l'article, que le règlement ne s'applique
   * pas aux établissements existants (`MENTION_GN_10`). Absent sinon.
   */
  gn10?: true;
};

/**
 * Ce que la ligne sait de l'établissement pour choisir son article
 * (2026-10-14, revue du lot livre II, titre II).
 *
 * POURQUOI. Une ligne fondée sur un chapitre de type (livre II, titre II)
 * réunit les articles de plusieurs types — `N 17`, `M 29`, `O 18`, `W 13` pour
 * le personnel désigné. Afficher toujours `referencesLegales[0]` montrait
 * « N 17 … type N » à un magasin. Le fondement affiché est celui du type de
 * l'établissement ; la ligne reste une (pas de scission).
 */
export type ContexteFondement = {
  /**
   * Les types d'ERP de l'établissement (ADR-045), dans l'ordre de
   * `TYPES_ERP` (l'ordre du produit, `typesErpOrdreProduit`) ; vide hors ERP.
   */
  readonly typesErp: readonly TypeErp[];
  readonly categorieErp: CategorieErp | null;
  /**
   * Marque : seul `contexteFondementDe` fabrique un contexte (revue du
   * 2026-10-16). Le type est structurel — sans marque, l'établissement entier
   * ou sa projection (`projeterEtablissement`, qui garde un type périmé après
   * décochage d'« ERP ») passaient à sa place, tests et tsc au vert. Le défaut
   * se fabrique à l'écriture, comme `SourceLegalBadge`.
   */
  readonly [MARQUE_CONTEXTE]: true;
};

declare const MARQUE_CONTEXTE: unique symbol;

/**
 * Le contexte d'un établissement pour choisir l'article d'une ligne : son type
 * et sa catégorie d'ERP, `null` s'il n'est pas un ERP — ses colonnes peuvent
 * garder des valeurs qui ne valent plus rien (2026-10-16, revue c6). Une
 * seule écriture pour « Ce qui doit être en place » et pour la section
 * « Équipements de sécurité » ; aucune lecture, l'appelant passe ce qu'il a.
 */
export function contexteFondementDe(e: {
  estERP: boolean;
  typeErp: TypeErp | null;
  // Requis : un appelant qui l'omettrait citerait l'article du seul premier
  // type, sans que tsc le voie (même raison que dans `matching/types.ts`).
  typesErpAutres: readonly TypeErp[];
  categorieErp: CategorieErp | null;
}): ContexteFondement {
  return {
    typesErp: e.estERP ? typesErpOrdreProduit(e) : [],
    categorieErp: e.estERP ? e.categorieErp : null,
    // `as unknown as` : la marque est un symbole DÉCLARÉ, sans valeur à
    // l'exécution — on ne peut pas l'écrire dans l'objet, et tsc refuse la
    // conversion directe d'un objet qui ne la porte pas (revue du lot 3, R1).
  } as unknown as ContexteFondement;
}

/** Le type dont un article est le chapitre (livre II, titre II), ou `null`. */
const CHAPITRE_DE_TYPE = /^([LMNOPRSTUVWXYJ]) (?:\d|annexe)/;
function typeDuChapitre(article: string | undefined): string | null {
  return CHAPITRE_DE_TYPE.exec(article ?? "")?.[1] ?? null;
}
const QUATRE_PREMIERES: readonly string[] = ["N1", "N2", "N3", "N4"];

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

export function fondementDe(
  obligation: Obligation,
  contexte?: ContexteFondement,
): FondementLigne | null {
  const f = fondementSansGn10(obligation, contexte);
  return f && porteGn10(obligation) ? { ...f, gn10: true } : f;
}

function fondementSansGn10(
  obligation: Obligation,
  contexte?: ContexteFondement,
): FondementLigne | null {
  const refs = obligation.referencesLegales;
  const premiere = refs[0];
  if (!premiere) return null;
  const types: readonly string[] = contexte?.typesErp ?? [];
  // Les références que la ligne cite pour l'un des types de l'établissement,
  // dans l'ordre de `TYPES_ERP`, l'ordre du produit (le contexte est déjà trié).
  const desTypes = (candidates: readonly ReferenceLegale[]) =>
    types.flatMap((t) => {
      const r = candidates.find((x) => typeDuChapitre(x.article) === t);
      return r ? [r] : [];
    });
  if (typeDuChapitre(premiere.article)) {
    // Fondée sur un chapitre de type : l'article du premier type de
    // l'établissement que la ligne cite, puis ceux des autres types ; à
    // défaut, la première référence, comme partout.
    const [principale, ...autres] = desTypes(refs);
    if (!principale) return ligneDe(premiere);
    return avecComplement(ligneDe(principale), autres);
  }
  // Fondée ailleurs et citant EN CONTEXTE le chapitre des types de
  // l'établissement, servi en catégories 1 à 4 : ces compléments s'affichent.
  const enContexte =
    contexte?.categorieErp && QUATRE_PREMIERES.includes(contexte.categorieErp)
      ? desTypes(refs.slice(1))
      : [];
  return avecComplement(ligneDe(premiere), enContexte);
}

function avecComplement(ligne: FondementLigne, complement: readonly ReferenceLegale[]): FondementLigne {
  return complement.length > 0 ? { ...ligne, complement: complement.map(ligneDe) } : ligne;
}

function ligneDe(r: ReferenceLegale): FondementLigne {
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
