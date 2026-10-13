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

/** Les ligatures que la décomposition Unicode ne sépare pas. */
const LIGATURES: Record<string, string> = {
  œ: "oe",
  Œ: "OE",
  æ: "ae",
  Æ: "AE",
  ß: "ss",
};

/**
 * Les lettres accentuées TRANSLITTÉRÉES (é → e) avant le filtre du jeu sûr.
 *
 * Le filtre remplaçait chaque lettre accentuée par « _ » : le dossier d'un
 * prestataire « Sécurité Incendie Ouest » sortait du ZIP en
 * « S_curit__Incendie_Ouest » (contrôle visuel du 2026-10-13). Garder les
 * accents tels quels n'est pas sûr — l'encodage des noms d'entrée de ZIP est
 * mal lu par plusieurs outils de décompression encore répandus ; la lettre de
 * base, elle, se lit partout.
 */
function translitterer(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[œŒæÆß]/g, (c) => LIGATURES[c] ?? c);
}

/** Lettres translittérées, puis tout ce qui sort du jeu sûr remplacé par « _ ». */
function assainir(nom: string): string {
  return translitterer(nom).replace(CARACTERES_INTERDITS, "_");
}

/**
 * La troncature garde l'EXTENSION (contre-lecture du 2026-09-27) :
 * « …rapport-tres-long.pdf » coupé devenait un fichier sans type.
 */
function tronquerEnGardantExtension(nom: string, longueurMax: number): string {
  if (nom.length <= longueurMax) return nom;
  const ext = /\.[A-Za-z0-9]{1,10}$/.exec(nom)?.[0] ?? "";
  return `${nom.slice(0, longueurMax - ext.length)}${ext}`;
}

/**
 * Nom sûr pour une entrée d'archive : ni séparateur de chemin, ni segment
 * de remontée, ni nom vide.
 */
export function nomEntreeArchive(nom: string | null | undefined, defaut: string): string {
  const brut = (nom ?? "").normalize("NFC").trim();
  // On ne garde que le dernier segment : `dossier/piece.pdf` est un chemin,
  // pas un nom de fichier.
  const dernierSegment = brut.split(/[/\\]/).pop() ?? "";
  const nettoye = assainir(dernierSegment)
    // `..`, `...` et leurs variantes ne désignent aucun fichier réel : seuls
    // des points en tête restent une remontée une fois le reste nettoyé.
    .replace(/^\.+/, "")
    .trim();
  const assaini = tronquerEnGardantExtension(nettoye, 120);
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

/**
 * Le nom d'origine d'une pièce, réduit à un segment de clé de stockage.
 *
 * Une seule fonction pour toutes les clés qui portent le nom du fichier
 * (rapports, pièces de prestataire) : elles en avaient chacune une copie.
 *
 * Les pilotes refusent toute clé qui contient « .. » (`local.ts`,
 * `supabase.ts`) — c'est leur garde contre la remontée d'arborescence, et elle
 * reste entière. L'assainissement gardait pourtant les points consécutifs du
 * nom d'origine : « rapport..pdf », banal quand un nom est tapé à la main,
 * donnait une clé refusée, et le dépôt échouait (audit du 2026-10-13). Une
 * suite de points devient un seul point : la clé ne peut plus porter « .. »,
 * et l'extension survit — à la troncature aussi.
 */
export function segmentCleStockage(nomFichier: string): string {
  const sansSuiteDePoints = (n: string) => n.replace(/\.{2,}/g, ".");
  // Même politique que `nomEntreeArchive` (revue du 2026-10-13) : lettres
  // accentuées translittérées, extension gardée à la troncature. La seconde
  // réduction couvre une coupe qui tomberait juste avant le point de
  // l'extension.
  return sansSuiteDePoints(
    tronquerEnGardantExtension(sansSuiteDePoints(assainir(nomFichier.normalize("NFC"))), 200),
  );
}
