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
