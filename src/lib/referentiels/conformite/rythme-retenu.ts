/**
 * Le rythme retenu (ADR-039) : la seule lecture du rythme qui date une ligne,
 * les règles qu'un rythme retenu doit tenir, et la mention qui le dit.
 *
 * **Module feuille.** Il n'importe que des types — pas même la table des
 * libellés de périodicité, dont le module tire, par un `import type`, celui des
 * échéances et donc la base ; la mention vit à côté (`mention-rythme.ts`).
 * Le générateur, les états permanents, le moteur de
 * prescriptions, les PDF, le MCP et les scripts le lisent, et aucun d'eux ne
 * doit tirer le référentiel entier — ni la base — pour savoir à quel rythme
 * une obligation revient.
 */

import type { ArticleDepouille } from "../corpus/types";
import type { Periodicite } from "../types-communs";
import type {
  Obligation,
  ReferenceLegale,
  RythmeRetenu,
} from "./types";

/** Ce qu'il faut d'une obligation pour en dire le rythme. */
type AvecRythme = { periodicite: Periodicite; rythmeRetenu?: RythmeRetenu };

/**
 * LE rythme d'une obligation : celui du texte, sinon celui que Rojer retient.
 *
 * **Une seule fonction, et c'est le point** (ADR-039 § 3). Générateur,
 * réconciliateur, états permanents, prescriptions, guide, grille, export,
 * MCP : tous lisent ici. Une lecture de `o.periodicite` seule, ailleurs, rend
 * `autre` là où une ligne annuelle existe — et l'obligation apparaît au
 * calendrier ET à l'écran « en place », ou à aucun des deux.
 *
 * La surcharge d'une prescription particulière se pose PAR-DESSUS, chez
 * l'appelant qui la connaît (`surcharge?.periodicite ?? periodiciteEffective(o)`).
 */
export function periodiciteEffective(o: AvecRythme): Periodicite {
  return o.rythmeRetenu?.periodicite ?? o.periodicite;
}

/** Le rythme effectif est-il retenu par Rojer plutôt qu'écrit par le texte ? */
export function aUnRythmeRetenu(o: AvecRythme): boolean {
  return o.rythmeRetenu !== undefined;
}

/**
 * Toutes les références qu'une obligation cite, la norme de son rythme
 * retenu comprise.
 *
 * Les contrôles de corpus (clé présente, texte dépouillé, liens dans les deux
 * sens) passent par ici : une référence que l'on ne compte pas est une
 * référence que l'on ne relit pas, et la norme d'un rythme retenu décide d'une
 * date au même titre qu'un arrêté.
 */
export function referencesCitees(
  o: Pick<Obligation, "referencesLegales" | "rythmeRetenu">,
): ReferenceLegale[] {
  const r = o.rythmeRetenu;
  return r?.motif === "norme"
    ? [...o.referencesLegales, r.reference]
    : [...o.referencesLegales];
}

// -----------------------------------------------------------------------------
// Les règles
// -----------------------------------------------------------------------------

/** L'identifiant du corpus où une norme doit avoir été lue. */
export const CORPUS_DES_NORMES = "normes";

/** Ce qu'un contrôle sait d'une clé d'article : son corpus et son entrée. */
export type ArticleDeCorpus = (
  cle: string,
) => { corpusId: string; article: ArticleDepouille } | undefined;

/**
 * Les règles d'un rythme retenu que le type ne peut pas porter (ADR-039 § 3).
 * Rend la liste des violations, vide si tout tient.
 *
 * Paramétrée par la lecture du corpus plutôt que de l'importer : le corpus
 * importe le référentiel, et ce module est lu par le référentiel. Le test
 * l'appelle sur les obligations livrées ET sur des obligations fabriquées qui
 * violent chaque règle une à une — une garde que rien ne fait échouer n'en est
 * pas une.
 */
export function controlerRythmeRetenu(
  o: Obligation,
  articleDe: ArticleDeCorpus,
): string[] {
  const r = o.rythmeRetenu;
  if (!r) return [];
  const v: string[] = [];
  const ici = `${o.id} (rythme retenu, motif ${r.motif})`;

  // 1. Un rythme écrit l'emporte toujours : le rythme retenu ne vit que là où
  //    le texte n'en chiffre aucun. `mise_en_service_uniquement` n'est pas un
  //    rythme vague, c'est un acte unique.
  if (o.periodicite !== "autre") {
    v.push(
      `${ici} : le texte porte déjà « ${o.periodicite} ». Un rythme retenu ne se pose que sur \`periodicite: "autre"\`.`,
    );
  }
  // 2. Un fait ou un acte unique n'a pas de rythme à retenir. « Chaque fois
  //    que nécessaire » est un déclencheur, pas un rythme vague.
  if (o.nature === "evenementielle" || o.nature === "ponctuelle") {
    v.push(
      `${ici} : nature « ${o.nature} ». Seule une obligation qui revient (échéance récurrente, état à maintenir) reçoit un rythme retenu.`,
    );
  }
  // Le rythme retenu doit être un rythme.
  if (r.periodicite === "autre" || r.periodicite === "mise_en_service_uniquement") {
    v.push(`${ici} : « ${r.periodicite} » n'est pas un rythme.`);
  }

  if (r.motif === "norme") {
    // 3. La norme est citée comme norme, lue, et au corpus des normes.
    if (r.reference.source !== "NORME") {
      v.push(`${ici} : la référence est de source « ${r.reference.source} », pas « NORME ».`);
    }
    if (!r.reference.reference.startsWith(r.norme)) {
      v.push(
        `${ici} : la citation « ${r.reference.reference} » ne commence pas par l'intitulé affiché « ${r.norme} ».`,
      );
    }
    const cle = r.reference.article;
    const lu = cle ? articleDe(cle) : undefined;
    if (!cle || !lu) {
      v.push(`${ici} : la clé « ${cle ?? "(absente)"} » n'est dans aucun corpus.`);
    } else {
      if (lu.corpusId !== CORPUS_DES_NORMES || lu.article.statut !== "norme") {
        v.push(
          `${ici} : « ${cle} » est au corpus « ${lu.corpusId} » (${lu.article.statut}), pas au corpus des normes.`,
        );
      }
      if (!lu.article.lecture || lu.article.lecture === "indirect") {
        v.push(
          `${ici} : « ${cle} » n'a été lue qu'indirectement — une norme qu'on n'a pas ouverte ne donne pas de rythme.`,
        );
      }
    }
  }

  // 4. Le mot vague est celui du texte, mot pour mot. Le défaut annuel l'exige
  //    (le type aussi) ; une norme peut l'ajouter, et alors la même règle vaut.
  if (r.texteVague !== undefined) {
    const citations = o.referencesLegales
      .map((ref) => (ref.article ? articleDe(ref.article)?.article : undefined))
      .flatMap((a) => [a?.citationCle, a?.prescrit])
      .filter((t): t is string => typeof t === "string");
    if (r.texteVague.trim().length === 0) {
      v.push(`${ici} : le texte vague est vide.`);
    } else if (!citations.some((t) => t.includes(r.texteVague!))) {
      v.push(
        `${ici} : « ${r.texteVague} » ne figure mot pour mot dans aucune citation lue des références de l'obligation.`,
      );
    }
  }
  // Le type le tient ; un `as` ou un JSON ne le tiendraient pas.
  const rythmeDeclare: string = r.periodicite;
  if (r.motif === "defaut_annuel" && rythmeDeclare !== "annuelle") {
    v.push(`${ici} : le défaut est annuel, pas « ${rythmeDeclare} ».`);
  }
  return v;
}
