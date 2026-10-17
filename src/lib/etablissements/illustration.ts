import { typesErpAffiches } from "./types-erp-affiches";
// Le dessin du bâtiment affiché en tête de tableau de bord.
//
// **Ce qu'il dit, et ce qu'il ne dit pas.** L'application connaît l'activité
// déclarée (type ERP, code NAF) ; elle ne connaît rien du bâti — ni hauteur,
// ni nombre d'étages, ni forme. `Batiment` (ADR-019) ne porte qu'un nom, un
// complément d'adresse et un rang. Le dessin ne fait donc varier que l'usage
// du rez-de-chaussée, jamais le gabarit : une boucherie au pied d'un immeuble
// de six étages est un cas courant, et un dessin qui changerait la hauteur
// affirmerait ce qu'on ignore.
//
// C'est une illustration, pas un plan : elle rappelle de quel genre de lieu
// il s'agit, elle ne le décrit pas.

/** Les planches disponibles dans `public/illustrations/`. */
export type IllustrationBatiment = "neutre" | "commerce";

/**
 * Types ERP dont l'activité se tient derrière une devanture — les deux seuls
 * de la nomenclature qui correspondent aux secteurs couverts par le DUERP
 * (commerce de détail, restauration).
 *
 * - `M` — magasins de vente, centres commerciaux
 * - `N` — restaurants et débits de boissons
 *
 * Le type `W` (bureaux) n'y est pas : le troisième secteur couvert n'a pas de
 * devanture, il retombe sur la planche neutre.
 */
const TYPES_ERP_DEVANTURE = new Set(["M", "N"]);

/**
 * Divisions NAF de repli, quand aucun type ERP n'est déclaré — un
 * établissement soumis au seul régime « travail » n'en a pas.
 *
 * - `47` — commerce de détail
 * - `56` — restauration
 */
const DIVISIONS_NAF_DEVANTURE = new Set(["47", "56"]);

/**
 * Choisit la planche à afficher. Déterministe, sans repli implicite : tout ce
 * qui n'est pas explicitement une devanture reçoit le dessin neutre.
 *
 * `codeNaf` est celui de l'établissement s'il en a un, sinon celui de
 * l'entreprise — l'établissement ne renseigne le sien que lorsqu'il diffère.
 */
export function illustrationBatiment(etab: {
  typeErp: string | null;
  typesErpAutres: readonly string[];
  codeNaf: string | null;
  entreprise: { codeNaf: string };
}): IllustrationBatiment {
  // Le type ERP tranche seul dès qu'il est déclaré : il qualifie le local
  // reçu du public, là où le code NAF ne dit que l'activité de l'entreprise.
  // Sans cette priorité, un établissement de type W dont l'entreprise porte
  // un NAF de commerce recevait la devanture.
  // ADR-045 : sur l'ensemble des types — un hôtel qui exploite un restaurant
  // a une devanture.
  const types = typesErpAffiches(etab);
  if (types.length > 0) {
    return types.some((t) => TYPES_ERP_DEVANTURE.has(t)) ? "commerce" : "neutre";
  }

  const naf = etab.codeNaf ?? etab.entreprise.codeNaf;
  // Les codes NAF s'écrivent « 47.11Z » ou « 4711Z » selon la saisie : on ne
  // lit que les deux premiers chiffres, qui portent la division.
  const division = naf.replace(/\D/g, "").slice(0, 2);
  if (DIVISIONS_NAF_DEVANTURE.has(division)) return "commerce";

  return "neutre";
}

/** Le chemin public de la planche. */
export function sourceIllustrationBatiment(
  illustration: IllustrationBatiment,
): string {
  return `/illustrations/batiment-${illustration}.png`;
}
