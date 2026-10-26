// Le dessin du bâtiment affiché en tête de tableau de bord.
//
// **Ce qu'il dit, et ce qu'il ne dit pas.** L'application connaît l'activité
// déclarée (type ERP, code NAF) ; elle ne connaît rien du bâti — ni hauteur,
// ni nombre d'étages, ni forme. `Batiment` (ADR-019) ne porte qu'un nom, un
// complément d'adresse et un rang. Le dessin est donc un **emblème du genre de
// lieu**, jamais un portrait : il rappelle qu'on parle d'un restaurant ou d'un
// hôtel, il ne prétend pas montrer celui-ci.
//
// [2026-10-25] Six planches au lieu de deux (« commerce », « neutre ») : le
// hero du tableau de bord s'est construit autour du dessin (décision de la
// propriétaire), et une devanture unique pour un restaurant et un magasin,
// un même cube pour un bureau et un hôtel, ne disaient plus le genre de lieu.
//
// Module **serveur** : la reconnaissance par code NAF lit les référentiels
// sectoriels, qui n'ont pas à partir dans le bundle du board. Le choix arrive
// au client tout fait (`DashboardBundle.illustrationHero`).

import "server-only";
import { trouverReferentielParNaf } from "@/lib/referentiels";
import { typesErpDe } from "@/lib/matching/types-erp";

/** Les planches de `public/illustrations/batiments/`, une par fichier. */
export const ILLUSTRATIONS_BATIMENT = [
  "restaurant",
  "magasin",
  "bureaux",
  "hotel",
  "salle-sport",
  "local",
] as const;

export type IllustrationBatiment = (typeof ILLUSTRATIONS_BATIMENT)[number];

/**
 * Les types ERP qui ont leur planche, **dans l'ordre où ils l'emportent**
 * quand un établissement en porte plusieurs (ADR-045).
 *
 * Un ordre fixe, et non celui de la saisie : le dessin ne doit pas changer
 * parce que le dirigeant a coché les types dans un autre ordre. La devanture
 * passe en tête — un hôtel qui exploite un restaurant se voit d'abord depuis
 * la rue par sa salle —, puis ce qui reçoit le public, puis le bureau.
 */
const PLANCHE_PAR_TYPE_ERP: ReadonlyArray<readonly [string, IllustrationBatiment]> = [
  ["N", "restaurant"],
  ["M", "magasin"],
  ["O", "hotel"],
  ["X", "salle-sport"],
  ["W", "bureaux"],
];

/**
 * Le référentiel sectoriel du DUERP que désigne le code NAF, quand aucun type
 * ERP n'a de planche. On réutilise sa table de codes plutôt qu'une liste de
 * divisions recopiée ici : le jour où le référentiel « bureau » couvre un code
 * de plus, le dessin le suit.
 */
const PLANCHE_PAR_SECTEUR: Readonly<Record<string, IllustrationBatiment>> = {
  restauration: "restaurant",
  commerce: "magasin",
  bureau: "bureaux",
};

/**
 * Choisit la planche à afficher. Déterministe : le type ERP déclaré d'abord
 * (il qualifie le local reçu du public, là où le code NAF ne dit que
 * l'activité de l'entreprise), puis le secteur du code NAF, puis le local
 * générique.
 *
 * `codeNaf` est celui de l'établissement, obligatoire depuis le 2026-10-26.
 */
export function illustrationBatiment(etab: {
  typeErp: string | null;
  typesErpAutres: readonly string[];
  codeNaf: string;
}): IllustrationBatiment {
  const types = new Set(typesErpDe(etab));
  const parType = PLANCHE_PAR_TYPE_ERP.find(([t]) => types.has(t));
  if (parType) return parType[1];

  const secteur = trouverReferentielParNaf(etab.codeNaf);
  return (secteur && PLANCHE_PAR_SECTEUR[secteur.id]) ?? "local";
}
