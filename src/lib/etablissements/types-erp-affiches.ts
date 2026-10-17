/**
 * Les types d'ERP d'un établissement, tels que les surfaces les affichent
 * (ADR-045) : le premier déclaré, puis les autres, sans doublon. Une seule
 * écriture pour le PDF, le MCP, le registre, le widget et l'illustration — un
 * écran qui ne lirait que `typeErp` montrerait « type N » à un hôtel-
 * restaurant.
 *
 * L'ordre est celui de la saisie : il ne décide de rien (le moteur lit l'union),
 * il suit seulement ce que le dirigeant a écrit, comme son arrêté.
 */
export function typesErpAffiches(e: {
  typeErp: string | null;
  typesErpAutres: readonly string[];
}): string[] {
  return [...new Set([...(e.typeErp ? [e.typeErp] : []), ...e.typesErpAutres])];
}

/** « type N », « types N, O, L », ou `null` sans type. */
export function libelleTypesErp(e: {
  typeErp: string | null;
  typesErpAutres: readonly string[];
}): string | null {
  const types = typesErpAffiches(e);
  if (types.length === 0) return null;
  return `${types.length > 1 ? "types" : "type"} ${types.join(", ")}`;
}
