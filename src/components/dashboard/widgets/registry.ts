// Registre central des widgets du tableau de bord.
// Chaque entrée : id stable, taille, variants, composant de rendu,
// statut par défaut (inclus ou masqué).

import { WidgetEtablissement } from "./impl/etablissement";
import { WidgetScore } from "./impl/score";
import {
  WidgetKpiEnRetard,
  WidgetKpiSous30j,
  WidgetKpiActions,
  WidgetKpiRapports,
} from "./impl/kpis";
import { WidgetBarsObligations } from "./impl/bars";
import { WidgetProchainesEcheances } from "./impl/echeances";
import {
  WidgetRegistre,
  WidgetEquipements,
  WidgetDuerp,
  WidgetGuide,
  WidgetRecos,
} from "./impl/simples";
import {
  WidgetIndicateurs,
  WidgetEcheances,
  WidgetActivite,
} from "./impl/groupes";
import {
  BlocAFaire,
  BlocActionsEnRetard,
  BlocCeQuiAChange,
  BlocControle,
  BlocDocuments,
  BlocFrise,
  BlocParOuCommencer,
  BlocPlanActions,
  BlocProchaineEcheance,
} from "./impl/board";
import { WidgetAnciennete } from "./impl/anciennete";
import { WidgetSemaine } from "./impl/semaine";
import { WidgetMeteo } from "./impl/meteo";
import type { LayoutItem, WidgetDefinition, WidgetId } from "./types";

export const REGISTRY: Record<WidgetId, WidgetDefinition> = {
  etablissement: {
    id: "etablissement",
    titre: "Identité établissement",
    description:
      "Carte d'identité de l'établissement — raison, adresse, effectif, NAF/SIRET, régimes, avec un CTA vers un préventeur.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetEtablissement,
    exclueDuDefaut: true,
  },
  score: {
    id: "score",
    titre: "Score de conformité",
    description:
      "Indicateur global + détail par famille. Trois visualisations disponibles.",
    taille: "medium",
    variants: [
      { id: "anneau", label: "Anneau" },
      { id: "gauge", label: "Jauge" },
      { id: "nombre", label: "Nombre seul" },
    ],
    defaultVariant: "anneau",
    Component: WidgetScore,
  },
  indicateurs: {
    id: "indicateurs",
    titre: "Indicateurs",
    description:
      "Vue d'ensemble en 6 chiffres : en retard · à planifier · sous 30 j, puis actions en cours · rapports 12 m · délai depuis le dernier rapport.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetIndicateurs,
  },
  echeances: {
    id: "echeances",
    titre: "Échéances (séparé)",
    description:
      "Compteurs vérifications isolés — déjà inclus dans le widget « Indicateurs ».",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetEcheances,
    exclueDuDefaut: true,
  },
  activite: {
    id: "activite",
    titre: "Activité (séparé)",
    description:
      "Compteurs actions & rapports isolés — déjà inclus dans le widget « Indicateurs ».",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetActivite,
    exclueDuDefaut: true,
  },
  "kpi-en-retard": {
    id: "kpi-en-retard",
    titre: "KPI · En retard",
    description:
      "Compteur isolé des vérifications dépassées (déjà présent dans Échéances).",
    taille: "small",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetKpiEnRetard,
    exclueDuDefaut: true,
  },
  "kpi-sous-30j": {
    id: "kpi-sous-30j",
    titre: "KPI · Échéances sous 30 j",
    description:
      "Compteur isolé des vérifications à planifier sous un mois (déjà présent dans Échéances).",
    taille: "small",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetKpiSous30j,
    exclueDuDefaut: true,
  },
  "kpi-actions": {
    id: "kpi-actions",
    titre: "KPI · Actions en cours",
    description:
      "Compteur isolé des actions ouvertes (déjà présent dans Activité).",
    taille: "small",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetKpiActions,
    exclueDuDefaut: true,
  },
  "kpi-rapports": {
    id: "kpi-rapports",
    titre: "KPI · Rapports 12 mois",
    description:
      "Compteur isolé des rapports déposés sur 12 mois (déjà présent dans Activité).",
    taille: "small",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetKpiRapports,
    exclueDuDefaut: true,
  },
  "bars-obligations": {
    id: "bars-obligations",
    titre: "Obligations · volumes",
    description:
      "Volume d'obligations par mois, réparti par statut. Vue chiffrée complémentaire à la frise « Calendrier ».",
    taille: "medium",
    variants: [
      { id: "bars", label: "Barres" },
      { id: "radial", label: "Donut" },
    ],
    defaultVariant: "bars",
    Component: WidgetBarsObligations,
    exclueDuDefaut: true,
  },
  "prochaines-echeances": {
    id: "prochaines-echeances",
    titre: "Prochaines échéances",
    description:
      "Les 5 prochaines vérifications — en liste ou sur une frise horizontale.",
    taille: "medium",
    variants: [
      { id: "list", label: "Liste" },
      { id: "timeline", label: "Frise" },
    ],
    defaultVariant: "list",
    Component: WidgetProchainesEcheances,
  },
  "par-ou-commencer": {
    id: "par-ou-commencer",
    titre: "Par où commencer",
    description:
      "Les deux premières choses à traiter, extraites de ce qui a dépassé son échéance, avec le solde à trente jours.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocParOuCommencer,
    // Hors layout par défaut : le hero dit l'état, pas la marche à suivre.
    // Celui qui veut une file de départ l'ajoute depuis le tiroir.
    exclueDuDefaut: true,
  },
  "a-faire": {
    id: "a-faire",
    titre: "À faire",
    description:
      "La to-do du dossier : vérifications et actions mélangées, triées par urgence, avec date et retard. Remplace les cartes « Prochaine échéance » et « Actions en retard ».",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocAFaire,
  },
  "plan-actions": {
    id: "plan-actions",
    titre: "Où en est le plan d'actions",
    description:
      "Répartition des actions en anneau — ouvertes, en cours, clôturées ce mois — avec le nombre d'échéances dépassées.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocPlanActions,
  },
  "actions-retard": {
    id: "actions-retard",
    titre: "Actions en retard",
    description:
      "Compteur des actions dépassées, retard moyen et plus ancienne — déjà couvert par la liste « À faire ».",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocActionsEnRetard,
    exclueDuDefaut: true,
  },
  controle: {
    id: "controle",
    titre: "Préparer un contrôle",
    description:
      "Raccourci vers le dossier à présenter en cas de visite — inspection, assurance, bailleur.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocControle,
  },
  registre: {
    id: "registre",
    titre: "Registre — dernières entrées",
    description: "Les 4 derniers rapports déposés au registre de sécurité.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetRegistre,
  },
  "equipements-grid": {
    id: "equipements-grid",
    titre: "Équipements",
    description: "Grille des équipements déclarés + bouton d'ajout rapide.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetEquipements,
    obligatoire: true,
  },
  documents: {
    id: "documents",
    titre: "Vos documents, en un coup d'œil",
    description:
      "Matrice en ronds — en place, à jour, sans retard — pour le DUERP, le registre, les vérifications, le plan d'actions, et chaque registre actif chez vous (accessibilité, permis de feu, plans de prévention, carnet sanitaire, prestataires).",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocDocuments,
  },
  duerp: {
    id: "duerp",
    titre: "DUERP",
    description:
      "Accès rapide à la dernière version du Document Unique (déjà inclus dans le hub « Vos documents »).",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetDuerp,
    exclueDuDefaut: true,
  },
  guide: {
    id: "guide",
    titre: "Guide pédagogique",
    description:
      "Rappel des obligations, du rythme annuel et des rôles — lien vers la page Comprendre.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetGuide,
  },
  recos: {
    id: "recos",
    titre: "À faire en priorité",
    description:
      "Les 3 actions les plus urgentes (vérif dépassée, action en retard, DUERP à jour). Masqué par défaut car redondant avec les prochaines échéances.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetRecos,
    exclueDuDefaut: true,
  },
  "calendrier-type": {
    id: "calendrier-type",
    titre: "Votre calendrier",
    description:
      "Vue calendrier de vos vérifications — grille mensuelle ou année entière — avec bascule en frise horizontale défilante (3 mois en arrière à 24 mois en avant, zoom 90 jours / 12 mois).",
    // Demi-largeur, comme le reste : sur un écran de portable, un widget
    // pleine largeur mangeait une ligne entière à lui seul. La frise défile
    // horizontalement et se recadre sur aujourd'hui — elle montre moins de
    // mois d'un coup, elle n'est pas tronquée.
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocFrise,
  },
  countdown: {
    id: "countdown",
    titre: "Prochaine échéance",
    description:
      "La vérification la plus proche, avec le nombre de jours restants en gros chiffre — déjà couverte par la liste « À faire ».",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocProchaineEcheance,
    exclueDuDefaut: true,
  },
  anciennete: {
    id: "anciennete",
    titre: "Âge des documents",
    description:
      "DUERP et dernier rapport : depuis combien de jours ? Ton rouge / ambre / vert selon le seuil.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetAnciennete,
  },
  semaine: {
    id: "semaine",
    titre: "Semaine en cours",
    description:
      "Mini-agenda 7 jours — échéance(s) par jour, aujourd'hui mis en évidence.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetSemaine,
  },
  "flux-registre": {
    id: "flux-registre",
    titre: "Ce qui a changé",
    description:
      "Les derniers rapports déposés au registre, avec leur résultat, et le premier « à faire » du moteur de recommandations.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: BlocCeQuiAChange,
  },
  meteo: {
    id: "meteo",
    // L'identifiant `meteo` reste : il est la clé des tableaux de bord déjà
    // personnalisés. Le nom, lui, était trompeur (2026-09-14).
    titre: "30 prochains jours",
    description:
      "Chaque case est un jour, colorée selon l'échéance la plus urgente qui y tombe.",
    taille: "medium",
    variants: [{ id: "default", label: "Défaut" }],
    defaultVariant: "default",
    Component: WidgetMeteo,
  },
};

export type { WidgetId } from "./types";

/**
 * Vérifie qu'un variant donné appartient bien à la définition du widget.
 * Les "default" implicites restent acceptés même s'ils ne figurent pas
 * dans la liste de variants explicites.
 */
export function variantValide(
  def: WidgetDefinition,
  variantId: string,
): boolean {
  if (variantId === def.defaultVariant) return true;
  return def.variants.some((v) => v.id === variantId);
}

/**
 * Ordre canonique du layout par défaut — le « board éditorial » (4a).
 * Le brief n'y figure pas : c'est le bandeau de tête, rendu par la page.
 * Grille 6 colonnes :
 *   row 1 : le calendrier      (6)
 *   row 2 : équipements        (6)
 *   row 3 : à faire            (3) + plan d'actions       (3)
 *   row 4 : documents          (3) + ce qui a changé      (3)
 *   row 5 : préparer un contrôle (3) + guide pédagogique  (3) — le guide
 *           est visible d'emblée pour le nouvel inscrit ; les layouts
 *           déjà personnalisés ne sont pas réécrits.
 *
 * « À faire » fusionne les anciennes cartes « Prochaine échéance » et
 * « Actions en retard » : une seule to-do, l'utilisateur n'a pas à
 * trier lui-même entre échéances de vérification et actions.
 *
 * Tout le reste du registre demeure disponible dans le tiroir
 * « Ajouter un widget » — le board est un point de départ, pas un mur.
 */
const ORDRE_DEFAUT: WidgetId[] = [
  "calendrier-type",
  "equipements-grid",
  "a-faire",
  "plan-actions",
  "documents",
  "flux-registre",
  "controle",
  "guide",
];

export function layoutParDefaut(): LayoutItem[] {
  return ORDRE_DEFAUT.filter((id) => !REGISTRY[id].exclueDuDefaut).map(
    (widgetId) => ({
      widgetId,
      variant: REGISTRY[widgetId].defaultVariant,
    }),
  );
}

/**
 * La portée d'un widget, **par palier de grille**.
 *
 * Une seule table pour les deux lectures : la classe qui rend, et le nombre
 * de colonnes que la barre d'édition affiche. Elles vivaient séparément, et
 * un widget passé de `large` à `medium` aurait pu être rendu à demi-largeur
 * pendant que le tiroir continuait d'annoncer « 6 col. ».
 *
 * Les classes sont écrites en toutes lettres et non composées : le scanner
 * de Tailwind lit le source, un `col-span-${n}` calculé ne génère rien.
 *
 * Trois paliers, parce que la grille en a trois :
 *   - une colonne   → tout prend la largeur, il n'y a rien à partager ;
 *   - deux colonnes → `small` et `medium` prennent une piste — deux widgets
 *     côte à côte — et `large` prend les deux ;
 *   - six colonnes  → les portées de référence.
 *
 * La portée est une classe et non un style inline : elle change au point de
 * rupture, c'est donc une règle CSS — et un style inline gagnerait de toute
 * façon sur la règle. Elle l'était, et la grille à deux colonnes ramenait
 * alors toute portée supérieure à deux à la largeur entière : entre 640 et
 * 1024 px, chaque widget occupait sa propre ligne.
 */
const PORTEES: Record<
  WidgetDefinition["taille"],
  { colonnes: number; classe: string }
> = {
  small: { colonnes: 2, classe: "col-span-1 sm:col-span-1 lg:col-span-2" },
  medium: { colonnes: 3, classe: "col-span-1 sm:col-span-1 lg:col-span-3" },
  large: { colonnes: 6, classe: "col-span-1 sm:col-span-2 lg:col-span-6" },
};

/** Le nombre de colonnes occupées sur la grille de référence (six colonnes).
 *  Sert à l'affichage du tiroir, pas au rendu — cf. `classePortee`. */
export function tailleEnCol(taille: WidgetDefinition["taille"]): number {
  return PORTEES[taille].colonnes;
}

export function classePortee(taille: WidgetDefinition["taille"]): string {
  return PORTEES[taille].classe;
}

/** IDs des widgets dans l'ordre du registre — utile pour le tiroir. */
export function tousLesWidgetIds(): WidgetId[] {
  return Object.keys(REGISTRY) as WidgetId[];
}
