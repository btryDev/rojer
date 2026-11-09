/**
 * Un libellé repris en cours de phrase : l'initiale en minuscule, sauf si le
 * premier mot est un sigle (« SSI et équipement d'alarme incendie »,
 * « SSI/alarme »). Le reste est laissé tel quel — « Ventilation (VMC, CTA) »
 * → « ventilation (VMC, CTA) », pas « ventilation (vmc, cta) ».
 */
export function enCoursDePhrase(libelle: string): string {
  // Deux capitales en tête, sans minuscule à la suite : un sigle.
  if (/^\p{Lu}{2,}(?!\p{Ll})/u.test(libelle)) return libelle;
  return libelle.charAt(0).toLowerCase() + libelle.slice(1);
}
