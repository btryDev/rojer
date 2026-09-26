/**
 * Une durée de surveillance, en heures et minutes — « 2h », « 1h30 ».
 *
 * UNE écriture pour la fiche et le ZIP (vérification du 2026-09-26) : le ZIP
 * arrondissait à l'heure (`Math.round(min / 60)`), et 90 minutes y
 * devenaient « 2h » là où la fiche disait « 1h30 ».
 */
export function dureeHhMm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
