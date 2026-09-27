/**
 * Assainissement des noms de fichier destinés à sortir de l'application.
 *
 * Le nom d'origine d'une pièce jointe (`File.name`) vient du poste de
 * l'utilisateur : il est conservé tel quel en base pour pouvoir réafficher
 * « attestation-urssaf-2026.pdf » plutôt qu'une clé de stockage. C'est une
 * donnée d'affichage, jamais un chemin.
 *
 * Elle en redevient un dès qu'on la réemploie comme nom d'entrée dans une
 * archive : l'export contrôle est fait pour être transmis à un tiers
 * (inspection, assureur, bailleur) qui le décompresse avec l'outil qu'il a
 * sous la main. Un nom qui remonte l'arborescence écrit alors hors du
 * dossier de décompression. `nomEntreeArchive` coupe cette chaîne à la
 * sortie, à l'endroit où l'on sait ce qu'on est en train de fabriquer.
 *
 * On garde l'extension : c'est elle qui décide de l'application qui ouvrira
 * la pièce chez le destinataire.
 */

const CARACTERES_INTERDITS = /[^a-zA-Z0-9._-]/g;

/**
 * Nom sûr pour une entrée d'archive : ni séparateur de chemin, ni segment
 * de remontée, ni nom vide.
 */
export function nomEntreeArchive(nom: string | null | undefined, defaut: string): string {
  const brut = (nom ?? "").normalize("NFC").trim();
  // On ne garde que le dernier segment : `dossier/piece.pdf` est un chemin,
  // pas un nom de fichier.
  const dernierSegment = brut.split(/[/\\]/).pop() ?? "";
  const nettoye = dernierSegment
    .replace(CARACTERES_INTERDITS, "_")
    // `..`, `...` et leurs variantes ne désignent aucun fichier réel : seuls
    // des points en tête restent une remontée une fois le reste nettoyé.
    .replace(/^\.+/, "")
    .trim();
  // La troncature à 120 garde l'EXTENSION (contre-lecture du 2026-09-27) :
  // « …rapport-tres-long.pdf » coupé devenait un fichier sans type.
  const ext = /\.[A-Za-z0-9]{1,10}$/.exec(nettoye)?.[0] ?? "";
  const assaini =
    nettoye.length <= 120
      ? nettoye
      : `${nettoye.slice(0, 120 - ext.length)}${ext}`;
  return assaini.length > 0 ? assaini : defaut;
}

/**
 * Nom sûr pour un dossier d'archive. Même règle, sans extension à préserver,
 * et les espaces deviennent des soulignés pour rester lisible partout.
 */
export function nomDossierArchive(nom: string | null | undefined, defaut: string): string {
  const brut = (nom ?? "").normalize("NFC").trim().replace(/\s+/g, "_");
  return nomEntreeArchive(brut, defaut);
}
