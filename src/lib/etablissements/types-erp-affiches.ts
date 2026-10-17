import { typesErpDe } from "@/lib/matching/types-erp";
import { TYPE_ERP } from "./schema";

/**
 * Les types d'ERP d'un établissement, tels que les surfaces les affichent
 * (ADR-045) : `typesErpDe`, la lecture du moteur, réexportée sous son nom — le
 * PDF, le MCP, le registre, le widget et l'illustration la lisent. Un écran
 * qui ne lirait que `typeErp` montrerait « type N » à un hôtel-restaurant.
 *
 * ~~L'ordre est celui de la saisie~~ [2026-10-17, revue de c6 : faux] : le
 * premier déclaré, puis les autres dans l'ordre où la base les garde — celui de
 * `TYPE_ERP`, les écrans les y rangeant à l'écriture
 * (`autresApresChangementDuPremier`, `AutresTypesErp`). Il ne décide de rien :
 * le moteur lit l'union.
 */
export { typesErpDe };

/**
 * Le numéro de la catégorie, sans le code de l'enum : « 3 » pour « N3 ». Seule
 * écriture pour le PDF, le MCP, le résumé du parcours et le widget, qui gardent
 * chacun leur forme autour (revue de c6, 2026-10-17).
 */
export function numeroCategorie(categorieErp: string): string {
  return categorieErp.slice(1);
}

/**
 * Le régime ERP en une ligne, pour le widget (revue du lot 3, R2) :
 * « ERP · types N, O · cat. 3 ». Le PDF garde sa forme à lui, sans « · » —
 * sa ligne de régimes est une liste à virgules (`pdf/builders.ts`).
 */
export function libelleRegimeErp(e: {
  typeErp: string | null;
  typesErpAutres: readonly string[];
  categorieErp: string | null;
}): string {
  return ["ERP", libelleTypesErp(e), e.categorieErp ? `cat. ${numeroCategorie(e.categorieErp)}` : null]
    .filter(Boolean)
    .join(" · ");
}

/** « type N », « types N, O, L », ou `null` sans type. */
export function libelleTypesErp(e: {
  typeErp: string | null;
  typesErpAutres: readonly string[];
}): string | null {
  const types = typesErpDe(e);
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
  // Tronquée à une de plus que la borne du schéma : assez pour qu'il refuse,
  // jamais assez pour qu'un POST forgé de cent mille cases coûte cent mille
  // erreurs (revue de c6, 2026-10-17).
  return fd
    .getAll("typesErpAutres")
    .slice(0, TYPE_ERP.length + 1)
    .filter((v): v is string => typeof v === "string" && v !== "");
}

/**
 * Les autres types après un changement du premier — sur l'état COURANT, même
 * règle à la fiche et au parcours d'accueil (relecture du lot 3, décision de
 * c6 : la plus simple et la plus prévisible).
 *
 * - Si le nouveau premier figure parmi les autres, il en sort, et l'ancien
 *   premier (s'il n'est pas vide) prend sa place : un ÉCHANGE.
 * - Sinon, c'est une correction : l'ancien premier ne revient pas.
 *
 * Aller-retour : N + O → O donne O + N → N redonne N + O. Un type de passage
 * peut être rendu (N + O → M → O donne O + M) : le panneau s'ouvre alors
 * (`memesTypes`), M est coché sous les yeux, et se décoche. C'est assumé.
 * L'ordre suit `ordre`, la liste des cases.
 */
export function autresApresChangementDuPremier(
  autres: readonly string[],
  ancien: string,
  nouveau: string,
  ordre: readonly string[],
): string[] {
  if (!autres.includes(nouveau)) return ordre.filter((t) => autres.includes(t));
  const garde = new Set(autres.filter((t) => t !== nouveau));
  if (ancien !== "" && ancien !== nouveau) garde.add(ancien);
  return ordre.filter((t) => garde.has(t));
}

/** Les deux listes ont-elles les mêmes types ? (ouvrir le panneau quand un changement en coche ou décoche) */
export function memesTypes(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((t) => b.includes(t));
}
