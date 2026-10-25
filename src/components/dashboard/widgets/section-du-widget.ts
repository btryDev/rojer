"use client";

// La section du rail du widget en cours de rendu, pour la coiffe de sa carte.
//
// Posée par `WidgetShell`, qui connaît le widget, et lue par `CarteBoard`, qui
// dessine la carte : les widgets n'ont rien à transmettre. Hors du tableau de
// bord, pas de contexte, donc pas de coiffe.

import { createContext, useContext } from "react";
import type { RailCategorieId } from "@/components/layout/sidebar-nav";

const SectionDuWidget = createContext<RailCategorieId | null>(null);

export const FournisseurSectionDuWidget = SectionDuWidget.Provider;

export function useSectionDuWidget(): RailCategorieId | null {
  return useContext(SectionDuWidget);
}
