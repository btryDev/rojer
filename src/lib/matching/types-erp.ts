import type { TypeErp } from "@/lib/referentiels/types-communs";
import type { EtablissementMatching } from "./types";

/**
 * Les types d'ERP de l'établissement (ADR-045) : le premier déclaré, puis les
 * autres, sans doublon. `[]` si aucun n'est déclaré.
 *
 * C'est la seule lecture des types que le moteur fasse. `typeErp` seul est
 * le premier type déclaré, pas un type principal : GN 2 n'en connaît pas.
 *
 * Elle ne regarde pas le régime : c'est `matchTypologie` qui écarte les
 * autres types d'un établissement qui n'est pas ERP.
 */
export function typesErpDe(
  etab: Pick<EtablissementMatching, "typeErp" | "typesErpAutres">,
): TypeErp[] {
  const tous = etab.typeErp ? [etab.typeErp, ...etab.typesErpAutres] : [...etab.typesErpAutres];
  return [...new Set(tous)];
}
