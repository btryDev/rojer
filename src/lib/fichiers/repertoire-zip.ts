/**
 * Lecture du répertoire central d'une archive zip, SANS RIEN DÉCOMPRESSER.
 *
 * Deux usages (audit ASVS du 2026-10-13) :
 *   - l'import d'un DUERP (`duerps/import/parser.ts`) borne la taille
 *     décompressée d'un .xlsx / .ods / .xlsb avant de le confier à SheetJS
 *     (V5.2.3) ;
 *   - le dépôt d'un rapport (`rapports/validator.ts`) vérifie qu'un .docx
 *     contient bien un document Word (V5.2.2).
 *
 * Module pur, sans dépendance Node : le validateur est aussi importé par un
 * composant client.
 *
 * On lit les champs aux mêmes positions que SheetJS (`parse_zip` de
 * xlsx 0.20.3) : la DERNIÈRE signature d'End Of Central Directory du fichier,
 * le nombre d'entrées « sur ce disque » et le décalage du répertoire. Lire un
 * autre répertoire que celui qu'il lira ferait contrôler une archive et en
 * décompresser une autre.
 *
 * Tout ce qui sort de l'ordinaire rend `null` — l'appelant refuse : signature
 * absente, champ hors du fichier, archive multi-volumes, ZIP64 (un tableur ou
 * un .docx de quelques Mo n'en a jamais besoin, et ses tailles sur 64 bits
 * sont lues ailleurs que dans les champs contrôlés ici).
 */

export type EntreeZip = {
  nom: string;
  /** 0 = stockée, 8 = deflate. */
  methode: number;
  tailleCompressee: number;
  /** DÉCLARÉE par l'archive : elle peut mentir (cf. `parser.ts`). */
  tailleDecompressee: number;
  /** Décalage de l'en-tête local de l'entrée. */
  decalageLocal: number;
};

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;
const ZIP64 = 0xffffffff;
const EXTRA_ZIP64 = 0x0001;

function vueSur(octets: Uint8Array) {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  return {
    u16: (p: number) => vue.getUint16(p, true),
    u32: (p: number) => vue.getUint32(p, true),
  };
}

/**
 * Vrai si les champs extra `[debut, debut + longueur[` portent un bloc ZIP64
 * — que SheetJS lit et qui REMPLACE les tailles des champs contrôlés. Même
 * parcours que son `parse_extra_field`.
 */
function porteZip64(octets: Uint8Array, debut: number, longueur: number): boolean {
  const { u16 } = vueSur(octets);
  const fin = Math.min(debut + longueur, octets.length);
  for (let p = debut; p <= fin - 4; p += 4 + u16(p + 2)) {
    if (u16(p) === EXTRA_ZIP64) return true;
  }
  return false;
}

/** Les quatre premiers octets d'une archive : `PK\x03\x04`. */
export function commeUneArchiveZip(octets: Uint8Array): boolean {
  return (
    octets.length >= 4 &&
    octets[0] === 0x50 &&
    octets[1] === 0x4b &&
    octets[2] === 0x03 &&
    octets[3] === 0x04
  );
}

export function lireRepertoireCentral(octets: Uint8Array): EntreeZip[] | null {
  const { u16, u32 } = vueSur(octets);

  // La dernière signature, comme SheetJS, qui la cherche dans tout le fichier.
  let eocd = -1;
  for (let i = octets.length - 4; i >= 0; i--) {
    if (u32(i) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0 || eocd + 22 > octets.length) return null;
  const disque = u16(eocd + 4);
  const disqueRepertoire = u16(eocd + 6);
  const nbEntrees = u16(eocd + 8);
  const debut = u32(eocd + 16);
  if (disque !== 0 || disqueRepertoire !== 0) return null;
  if (nbEntrees === 0xffff || debut === ZIP64) return null;

  const entrees: EntreeZip[] = [];
  let p = debut;
  for (let n = 0; n < nbEntrees; n++) {
    if (p + 46 > octets.length || u32(p) !== SIG_CENTRAL) return null;
    const lgNom = u16(p + 28);
    const lgExtra = u16(p + 30);
    const lgCommentaire = u16(p + 32);
    const entree: EntreeZip = {
      methode: u16(p + 10),
      tailleCompressee: u32(p + 20),
      tailleDecompressee: u32(p + 24),
      decalageLocal: u32(p + 42),
      nom: "",
    };
    if (p + 46 + lgNom > octets.length) return null;
    if (
      entree.tailleCompressee === ZIP64 ||
      entree.tailleDecompressee === ZIP64 ||
      entree.decalageLocal === ZIP64 ||
      porteZip64(octets, p + 46 + lgNom, lgExtra)
    ) {
      return null;
    }
    entree.nom = new TextDecoder().decode(octets.subarray(p + 46, p + 46 + lgNom));
    entrees.push(entree);
    p += 46 + lgNom + lgExtra + lgCommentaire;
  }
  return entrees;
}

export type EnTeteLocal = {
  /** La méthode de l'en-tête LOCAL : c'est elle que SheetJS applique. */
  methode: number;
  tailleCompressee: number;
  /** Déclarée : SheetJS s'en sert pour allouer son tampon de sortie. */
  tailleDecompressee: number;
  /** Premier octet des données de l'entrée. */
  debutDonnees: number;
};

/** L'en-tête local d'une entrée ; `null` s'il est absent, tronqué ou ZIP64. */
export function lireEnTeteLocal(octets: Uint8Array, decalage: number): EnTeteLocal | null {
  const { u16, u32 } = vueSur(octets);
  if (decalage + 30 > octets.length || u32(decalage) !== SIG_LOCAL) return null;
  const lgNom = u16(decalage + 26);
  const lgExtra = u16(decalage + 28);
  const debutDonnees = decalage + 30 + lgNom + lgExtra;
  if (debutDonnees > octets.length) return null;
  const entete: EnTeteLocal = {
    methode: u16(decalage + 8),
    tailleCompressee: u32(decalage + 18),
    tailleDecompressee: u32(decalage + 22),
    debutDonnees,
  };
  if (
    entete.tailleCompressee === ZIP64 ||
    entete.tailleDecompressee === ZIP64 ||
    porteZip64(octets, decalage + 30 + lgNom, lgExtra)
  ) {
    return null;
  }
  return entete;
}
