/**
 * « de » devant un nom, élidé devant une voyelle : « la proposition
 * d'Entretien Test A-Z », « la proposition de Nettoyage Pro SARL »
 * (relecture du 2026-11-23 : la fiche du plan écrivait « de Entretien »).
 *
 * Le « h » n'est pas élidé : muet ou aspiré, un nom propre ne le dit pas, et
 * « de Hôtel… » se lit mieux que « d'Hachette… » ne se lit mal.
 */
export function deNom(nom: string): string {
  return /^[aeiouyàâäéèêëîïôöùûüœæ]/i.test(nom.trim()) ? `d'${nom}` : `de ${nom}`;
}
