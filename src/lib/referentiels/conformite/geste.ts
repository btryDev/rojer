/**
 * Le GESTE d'une obligation portée par un appareil (ADR-057, décision de la
 * propriétaire du 2026-11-05).
 *
 * Plusieurs régimes demandent parfois le même acte sur le même appareil : la
 * vérification annuelle de l'extincteur est écrite par le règlement ERP
 * (MS 38 § 4), par le Code du travail (R. 4227-29, rythme de la NF S 61-919)
 * et, en 5ᵉ catégorie, par PE 4 § 2. Les régimes se cumulent ; le dirigeant ne
 * fait pourtant qu'un contrôle. Les obligations qui portent le même geste ne
 * font donc qu'UNE ligne par appareil — le rythme le plus court, toutes les
 * références citées, l'intervenant que tous les textes admettent.
 *
 * LE GESTE EST UNE DONNÉE, JAMAIS UNE DÉDUCTION (ADR-024). Rien ne réunit
 * deux obligations parce qu'elles visent la même catégorie ou le même
 * domaine : la vérification électrique du Code du travail et celle de l'ERP
 * restent deux lignes, et elles ne portent pas de geste. Une obligation n'en
 * reçoit un que si la propriétaire a décidé que l'acte est le même et qu'un
 * même intervenant peut le faire pour tous les textes.
 *
 * LA FUSION EST PAR APPAREIL. `PE 4 § 2` vise huit catégories : sur un
 * extincteur il rejoint l'annuelle ERP, sur un ascenseur il reste seul. Le
 * moteur réunit, appareil par appareil, les obligations applicables qui
 * portent le même geste (`fusionnerGestes`, `matching/engine.ts`).
 *
 * Module feuille, sans le référentiel : il ne lit que des champs.
 */

import type { Realisateur } from "../types-communs";
import { referencesCitees } from "./rythme-retenu";
import type { Obligation, ReferenceLegale } from "./types";

/**
 * Les gestes que le référentiel connaît. Fermé, comme `NiveauObligation` : un
 * geste neuf se nomme ici, avec ce qu'il réunit.
 *
 * `verification_periodique` — l'entretien et la vérification périodique
 * générale de l'appareil, par une personne compétente ou qualifiée. N'y
 * entrent ni les essais de l'exploitant (hebdomadaires, mensuels), ni les
 * vérifications par organisme agréé seul, ni les contrôles d'un objet
 * particulier (extinction automatique, pollution spécifique) : ce sont
 * d'autres actes, par d'autres intervenants.
 */
export type GesteObligation = "verification_periodique";

/**
 * Le geste de l'obligation, ou `null`. LA lecture du champ : aucune surface
 * ne lit `o.geste` elle-même.
 */
export function gesteDe(o: Obligation): GesteObligation | null {
  return "geste" in o && o.geste !== undefined ? o.geste : null;
}

/**
 * Les intervenants que TOUS les textes admettent : l'intersection, dans
 * l'ordre de la première obligation. Une ligne fusionnée exige l'un d'eux —
 * prendre l'union laisserait faire par une personne compétente ce qu'un des
 * textes réserve à une personne qualifiée.
 *
 * Jamais vide pour un geste du référentiel : `geste.test.ts` l'éprouve sur
 * chaque catégorie. Deux textes qu'aucun intervenant ne satisfait à la fois ne
 * forment pas un geste — c'est la règle de la propriétaire, « si deux
 * échéances existent sur une même installation par des intervenants
 * différents, il faut garder les deux échéances distinctes ».
 */
export function intervenantsCommuns(
  obligations: readonly Pick<Obligation, "realisateurs">[],
): Realisateur[] {
  const [premiere, ...autres] = obligations;
  if (premiere === undefined) return [];
  return premiere.realisateurs.filter((r) =>
    autres.every((o) => o.realisateurs.includes(r)),
  );
}

/**
 * Les références d'une ligne qui suit plusieurs obligations du même geste :
 * celles du titulaire d'abord — l'article qu'on citerait seul devant un
 * inspecteur reste en tête —, puis celles des absorbées, sans doublon. La norme
 * d'un rythme retenu y est, comme partout (`referencesCitees`).
 */
export function referencesDuGeste(
  titulaire: Pick<Obligation, "referencesLegales" | "rythmeRetenu">,
  absorbees: readonly Pick<Obligation, "referencesLegales" | "rythmeRetenu">[],
): ReferenceLegale[] {
  const vues = new Set<string>();
  const out: ReferenceLegale[] = [];
  for (const o of [titulaire, ...absorbees]) {
    for (const r of referencesCitees(o)) {
      if (vues.has(r.reference)) continue;
      vues.add(r.reference);
      out.push(r);
    }
  }
  return out;
}
