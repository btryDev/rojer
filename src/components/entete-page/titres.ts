import type { SidebarItemId } from "@/components/layout/sidebar-nav";

/**
 * Les pages dont le titre n'est pas le nom du rail — les seules. Partout
 * ailleurs, le titre et le menu disent la même chose (`LABEL_ITEM`).
 *
 * Une table plutôt qu'une prop : l'assistant DUERP et sa porte d'entrée, les
 * deux branches de l'accessibilité, écrivaient chacun le même titre ; il
 * n'est plus écrit qu'ici (relecture du 2026-10-25).
 */
export const TITRE_EN_TETE: Partial<Record<SidebarItemId, string>> = {
  duerp: "Votre DUERP",
  // « À vous seul » est le propre de la page : la prescription particulière,
  // opposée au référentiel commun ; qui l'a prescrite se lit ligne par ligne.
  // « Une autorité » n'allait pas : un assureur n'en est pas une (ADR-032).
  prescriptions: "Ce qu'on vous a prescrit, à vous seul",
  accessibilite: "Registre d'accessibilité",
  "carnet-sanitaire": "Carnet sanitaire eau",
  guide: "Comprendre vos obligations",
};
