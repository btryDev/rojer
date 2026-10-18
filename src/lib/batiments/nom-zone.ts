// Le nom d'une ZONE, tel que l'écran et les PDF l'affichent (2026-10-17,
// décision de la propriétaire, ADR-029 amendée : un établissement = un
// bâtiment ; les zones, trois au plus, en sont des subdivisions).
//
// Le modèle `Batiment` porte des zones sous un nom historique. Les dossiers
// créés avant le 2026-09-01 ont semé leur première zone sous le nom « Bâtiment
// principal » (ADR-019) ; le nom stocké ne migre pas (ADR-029). Affiché tel
// quel, il se lisait comme un second bâtiment à côté de l'établissement : il
// s'affiche donc sous le nom que sèment les dossiers récents. Le nom stocké ne
// change pas.
//
// Module pur : il ne dépend que de `schema.ts` (zod), et se charge dans un
// composant client.
//
// Limite assumée : un dossier ancien qui porte À LA FOIS « Bâtiment
// principal » et une zone nommée « Zone principale » (l'unicité du nom ne les
// empêche pas) affiche deux fois « Zone principale ». On ne les numérote pas :
// la collision suppose un dossier d'avant le 2026-09-01 ET une zone créée sous
// le nom exact que sème la création, la production ne porte que des données
// factices (2026-10-08), et le renommage préremplit le nom STOCKÉ — c'est par
// là que le dirigeant les distingue et en renomme une. Ce n'est pas
// `nomDeZone` qui préremplit : renommer en « Zone principale » lèverait la
// contrainte d'unicité (P2002).

import { NOM_BATIMENT_PRINCIPAL } from "./schema";

/** Le nom semé avant le 2026-09-01 (ADR-019). */
export const NOM_HISTORIQUE_PREMIERE_ZONE = "Bâtiment principal";

/** Le nom d'une zone à l'écran : le nom historique se lit « Zone principale ». */
export function nomDeZone(nom: string): string {
  return nom.trim() === NOM_HISTORIQUE_PREMIERE_ZONE ? NOM_BATIMENT_PRINCIPAL : nom;
}
