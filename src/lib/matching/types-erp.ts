import { TYPES_ERP, type TypeErp } from "@/lib/referentiels/types-communs";

/**
 * Les types d'ERP de l'établissement (ADR-045) : le premier déclaré, puis les
 * autres, sans doublon. `[]` si aucun n'est déclaré.
 *
 * C'est la seule lecture des types que le moteur fasse — et que les surfaces
 * fassent (`etablissements/types-erp-affiches.ts`). `typeErp` seul est le
 * premier type déclaré, pas un type principal : GN 2 n'en connaît pas.
 *
 * Elle ne regarde pas le régime : c'est `matchTypologie` qui écarte les
 * autres types d'un établissement qui n'est pas ERP.
 */
export function typesErpDe<T extends string>(etab: {
  typeErp: T | null;
  typesErpAutres: readonly T[];
}): T[] {
  return [...new Set([...(etab.typeErp ? [etab.typeErp] : []), ...etab.typesErpAutres])];
}

/**
 * Les mêmes types, dans l'ordre de `TYPES_ERP` — l'ordre du PRODUIT, et non
 * celui de GN 1 (qui range J en tête ; voir le commentaire de `TYPES_ERP`).
 * C'est lui qui décide, quand plusieurs types satisfont une ligne, du type
 * dont le moteur rend les raisons, et de l'article cité en principal au
 * fondement : ni l'un ni l'autre ne doit dépendre de l'ordre de saisie.
 */
export function typesErpOrdreProduit(etab: {
  typeErp: TypeErp | null;
  typesErpAutres: readonly TypeErp[];
}): TypeErp[] {
  return typesErpDe(etab).sort((a, b) => TYPES_ERP.indexOf(a) - TYPES_ERP.indexOf(b));
}
