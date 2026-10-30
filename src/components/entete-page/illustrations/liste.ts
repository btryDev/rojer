import type { SidebarItemId } from "@/components/layout/sidebar-nav";

/**
 * Les pages qui ont leur dessin d'en-tête — la liste seule, sans les dessins.
 *
 * Séparée de `index.tsx` le 2026-10-28 (plan performance, lot 3) : le repli de
 * chargement, composant client, applique la même règle que l'en-tête (« sans
 * dessin, pas de panneau ») sans importer les dessins. `ILLUSTRATIONS` est
 * typée sur cette liste : un dessin sans entrée, ou une entrée sans dessin, ne
 * compile pas.
 */
export const ITEMS_ILLUSTRES = [
  "calendrier",
  "actions",
  "etats-permanents",
  "duerp",
  "equipe",
  "prescriptions",
  "permis-feu",
  "plan-prevention",
  "perimetre",
  "equipements",
  "batiments",
  "prestataires",
  "registre",
  "accessibilite",
  "carnet-sanitaire",
  "documents",
  "controle",
  "guide",
  "fiche",
  "connecter",
] as const satisfies readonly SidebarItemId[];

export type ItemIllustre = (typeof ITEMS_ILLUSTRES)[number];

/** La page a-t-elle son dessin ? Sans lui, l'en-tête n'ouvre pas de
 *  panneau : un aplat teinté vide occuperait la moitié droite. */
export function aUneIllustration(item: SidebarItemId): item is ItemIllustre {
  return (ITEMS_ILLUSTRES as readonly SidebarItemId[]).includes(item);
}
