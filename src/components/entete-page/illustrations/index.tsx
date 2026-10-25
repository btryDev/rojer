import type { ComponentType } from "react";

import type { SidebarItemId } from "@/components/layout/sidebar-nav";

import { IllustrationCalendrier } from "./Calendrier";
import { IllustrationDuerp } from "./Duerp";
import { IllustrationEnPlace } from "./EnPlace";
import { IllustrationEquipe } from "./Equipe";
import { IllustrationPerimetre } from "./Perimetre";
import { IllustrationPermisFeu } from "./PermisFeu";
import { IllustrationPlanActions } from "./PlanActions";
import { IllustrationPlansPrevention } from "./PlansPrevention";
import { IllustrationPrescriptions } from "./Prescriptions";

/**
 * L'illustration de chaque page d'entrée. Une page sans illustration rend
 * un en-tête sans colonne de droite : la migration se fait section par
 * section (2026-10-25).
 *
 * Le style est commun à toutes : trait noir d'épaisseur constante, aplats
 * noirs ponctuels, objets blancs en perspective isométrique, posés sur la
 * teinte de la section — pas de fond propre. Une seule animation par dessin
 * vectoriel (une image générée, comme celle du Calendrier, reste fixe),
 * jouée une fois au chargement (`ep-*` dans `globals.css`), aucune si le
 * visiteur a demandé moins de mouvement.
 */
const ILLUSTRATIONS: Partial<Record<SidebarItemId, ComponentType>> = {
  calendrier: IllustrationCalendrier,
  actions: IllustrationPlanActions,
  "etats-permanents": IllustrationEnPlace,
  duerp: IllustrationDuerp,
  equipe: IllustrationEquipe,
  prescriptions: IllustrationPrescriptions,
  "permis-feu": IllustrationPermisFeu,
  "plan-prevention": IllustrationPlansPrevention,
  perimetre: IllustrationPerimetre,
};

/** La page a-t-elle son dessin ? Sans lui, l'en-tête n'ouvre pas de
 *  panneau : un aplat teinté vide occuperait la moitié droite. */
export function aUneIllustration(item: SidebarItemId): boolean {
  return item in ILLUSTRATIONS;
}

export function IllustrationEnTete({ item }: { item: SidebarItemId }) {
  const Dessin = ILLUSTRATIONS[item];
  return Dessin ? <Dessin /> : null;
}

/** Les pages qui ont déjà leur dessin — lu par le test de couverture. */
export const ITEMS_ILLUSTRES = Object.keys(ILLUSTRATIONS) as SidebarItemId[];
