/**
 * Les familles d'usage de l'écran « Ce qui doit être en place » (2026-10-17).
 *
 * L'écran rangeait ses lignes par **domaine juridique**, triés par ordre
 * alphabétique : douze ou treize cartes, dont quatre d'une ligne, et les
 * affichages éparpillés sur trois. Il les range désormais par **usage** — la
 * situation où l'on en a besoin en premier. Le référentiel, lui, reste par
 * domaine, et chaque ligne garde son article.
 *
 * Le rangement n'est pas une table d'identifiants tenue ici : c'est un champ
 * du référentiel, `usageEcran`, requis sur toute obligation. Une table aurait
 * laissé un ajout au référentiel tomber dans un groupe « autres » ; le champ
 * requis oblige chaque ajout à se prononcer, et `familles.test.ts` vérifie
 * qu'il est posé si et seulement si la ligne figure à l'écran.
 *
 * [2026-10-17, revue indépendante] Le groupe « Autres obligations » revient,
 * mais comme REPLI D'AFFICHAGE, pas comme valeur du référentiel : `autres`
 * n'est pas un `GroupeUsage`, aucune obligation ne peut le choisir. Il ne
 * recueille que la ligne de l'écran dont `usageEcran` vaut `null` — l'oubli
 * que `familles.test.ts` fait échouer. Ce test reste le garde-fou ; le repli
 * n'est qu'une ceinture, pour que l'oubli se VOIE à l'écran au lieu de faire
 * lever le score du tableau de bord, le PDF et le widget, qui passent tous
 * par la même lecture et qu'aucun `build` ne teste.
 *
 * Module pur : ni Prisma ni React. Le PDF garde l'ordre par domaine
 * (`pdf/mentions-etats-permanents.ts`) et ne lit rien d'ici.
 */

import type {
  GroupeUsage,
  Obligation,
  SousCategorie,
  UsageEcran,
} from "@/lib/referentiels/conformite";

export type { GroupeUsage, SousCategorie, UsageEcran };

export const LIBELLE_GROUPE: Record<GroupeUsage, string> = {
  incendie_secours: "Incendie et secours",
  quotidien: "Le quotidien de vos salariés",
  organisation: "Qui s'occupe de quoi",
  installations: "Vos installations et leurs registres",
};

export const LIBELLE_SOUS_CATEGORIE: Record<SousCategorie, string> = {
  prevenir: "Prévenir",
  alerter: "Alerter",
  eteindre: "Éteindre",
  evacuer: "Évacuer",
  secourir: "Secourir",
  conditions: "Conditions de travail",
  informer: "Informer et former",
};

/**
 * Le groupe de repli, hors du référentiel : une ligne de l'écran sans
 * rangement s'y affiche, en dernier, sans sous-catégorie, et compte comme les
 * autres. La cacher fausserait le compteur ; la ranger ailleurs mentirait sur
 * son usage ; lever faisait tomber tout ce qui lit l'écran.
 */
export const GROUPE_REPLI = "autres" as const;
export const LIBELLE_GROUPE_REPLI = "Autres obligations";

/** Un groupe tel que l'écran l'affiche : une famille du référentiel, ou le repli. */
export type GroupeAffichage = GroupeUsage | typeof GROUPE_REPLI;

/** L'ordre des familles à l'écran. Fixe : il ne dépend ni du dossier ni de la déclaration. */
export const ORDRE_GROUPES: readonly GroupeUsage[] = [
  "incendie_secours",
  "quotidien",
  "organisation",
  "installations",
];

/**
 * Les sous-catégories de chaque famille, dans leur ordre. `[]` : la famille
 * n'en a pas, et toutes ses lignes portent `sous: null`. L'incendie suit le
 * déroulé d'un sinistre — prévenir, alerter, éteindre, évacuer, secourir.
 */
export const ORDRE_SOUS_CATEGORIES: Record<
  GroupeUsage,
  readonly SousCategorie[]
> = {
  incendie_secours: ["prevenir", "alerter", "eteindre", "evacuer", "secourir"],
  quotidien: ["conditions", "informer"],
  organisation: [],
  installations: [],
};

/** Où l'obligation se range à l'écran, ou `null` si l'écran ne la liste pas. */
export function rangementDe(o: Obligation): UsageEcran | null {
  return o.usageEcran;
}
