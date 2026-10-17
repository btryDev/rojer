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

/**
 * Le champ TÉMOIN posté avec les cases des autres types (ADR-045, lot 3) : des
 * cases toutes décochées ne postent rien. Présent, la liste postée est la
 * réponse — vide comprise ; absent, le champ n'était pas affiché et la valeur
 * en base est gardée.
 */
export const CHAMP_TEMOIN_TYPES_ERP_AUTRES = "typesErpAutresAffiche";

/**
 * Les autres types lus d'un formulaire : la liste postée si le témoin est là
 * (vide comprise) ou si au moins une case l'est, `undefined` sinon — le champ
 * n'était pas affiché. Seule lecture, pour la fiche et le parcours d'accueil.
 */
export function typesErpAutresPostes(fd: FormData): string[] | undefined {
  if (!fd.has(CHAMP_TEMOIN_TYPES_ERP_AUTRES) && !fd.has("typesErpAutres")) return undefined;
  return fd
    .getAll("typesErpAutres")
    .filter((v): v is string => typeof v === "string" && v !== "");
}
