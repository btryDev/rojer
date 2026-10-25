import type { ComponentType } from "react";

import type { SidebarItemId } from "@/components/layout/sidebar-nav";

import { IllustrationCalendrier } from "./Calendrier";
import { IllustrationEnPlace } from "./EnPlace";
import { IllustrationPlanActions } from "./PlanActions";

/**
 * L'illustration de chaque page d'entrée. Une page sans illustration rend
 * un en-tête sans colonne de droite : la migration se fait section par
 * section (2026-10-25).
 *
 * Le style est commun à toutes : trait noir d'épaisseur constante, aplats
 * noirs ponctuels, objets blancs en perspective isométrique, posés sur la
 * teinte de la section — pas de fond propre. Une seule animation par dessin,
 * jouée une fois au chargement (`ep-*` dans `globals.css`), aucune si le
 * visiteur a demandé moins de mouvement.
 */
const ILLUSTRATIONS: Partial<Record<SidebarItemId, ComponentType>> = {
  calendrier: IllustrationCalendrier,
  actions: IllustrationPlanActions,
  "etats-permanents": IllustrationEnPlace,
};

export function IllustrationEnTete({ item }: { item: SidebarItemId }) {
  const Dessin = ILLUSTRATIONS[item];
  return Dessin ? <Dessin /> : null;
}

/** Les pages qui ont déjà leur dessin — lu par le test de couverture. */
export const ITEMS_ILLUSTRES = Object.keys(ILLUSTRATIONS) as SidebarItemId[];
