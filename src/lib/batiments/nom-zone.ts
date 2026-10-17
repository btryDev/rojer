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
// Module pur, sans dépendance : il se charge dans un composant client.

/** Le nom semé avant le 2026-09-01 (ADR-019). */
export const NOM_HISTORIQUE_PREMIERE_ZONE = "Bâtiment principal";

/** Le nom semé depuis (ADR-029) — la même valeur que `NOM_BATIMENT_PRINCIPAL`. */
const NOM_PREMIERE_ZONE = "Zone principale";

/** Le nom d'une zone à l'écran : le nom historique se lit « Zone principale ». */
export function nomDeZone(nom: string): string {
  return nom.trim() === NOM_HISTORIQUE_PREMIERE_ZONE ? NOM_PREMIERE_ZONE : nom;
}
