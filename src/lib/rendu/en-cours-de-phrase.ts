/**
 * Un libellé repris en cours de phrase : l'initiale en minuscule, sauf si le
 * premier mot est un sigle (« SSI et équipement d'alarme incendie »,
 * « SSI/alarme »). Le reste est laissé tel quel — « Ventilation (VMC, CTA) »
 * → « ventilation (VMC, CTA) », pas « ventilation (vmc, cta) ».
 */
export function enCoursDePhrase(libelle: string): string {
  const premierMot = libelle.split(/[\s'’(/,-]/, 1)[0];
  if (premierMot.length > 1 && premierMot === premierMot.toUpperCase()) return libelle;
  return libelle.charAt(0).toLowerCase() + libelle.slice(1);
}
