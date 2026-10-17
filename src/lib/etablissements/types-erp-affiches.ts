import { typesErpDe } from "@/lib/matching/types-erp";

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
  return typesErpDe(e);
}

/**
 * Le régime ERP en une ligne, pour le PDF et le widget (revue du lot 3, R2) :
 * « ERP · types N, O · cat. 3 ». Une seule forme, écrite ici.
 */
export function libelleRegimeErp(e: {
  typeErp: string | null;
  typesErpAutres: readonly string[];
  categorieErp: string | null;
}): string {
  return ["ERP", libelleTypesErp(e), e.categorieErp ? `cat. ${e.categorieErp.slice(1)}` : null]
    .filter(Boolean)
    .join(" · ");
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

/**
 * Les autres types après un changement du premier (revue du lot 3, C3).
 *
 * Si le nouveau premier type venait des autres — un ÉCHANGE : N en premier et
 * O en autre, le premier passe à O —, l'ancien premier prend sa place parmi
 * les autres : l'hôtel-restaurant reste un hôtel-restaurant. Sinon, c'est une
 * correction de saisie (N devient M) : l'ancien premier ne revient pas.
 * Dans les deux cas, le nouveau premier ne figure pas parmi les autres
 * (contrainte en base). L'ordre suit `ordre`, la liste des cases.
 */
export function autresApresChangementDuPremier(
  autres: readonly string[],
  ancien: string,
  nouveau: string,
  ordre: readonly string[],
): string[] {
  const echange = ancien !== "" && ancien !== nouveau && autres.includes(nouveau);
  const garde = new Set(autres.filter((t) => t !== nouveau));
  if (echange) garde.add(ancien);
  return ordre.filter((t) => garde.has(t));
}
