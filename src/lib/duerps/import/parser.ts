import { inflateRawSync } from "node:zlib";
import * as XLSX from "xlsx";
import { lireEnTeteLocal, lireRepertoireCentral } from "@/lib/fichiers/repertoire-zip";

/**
 * Parseur de DUERP Excel / CSV.
 *
 * Colonnes attendues (détection flexible, insensible à la casse/accents) :
 *   - Unité de travail (obligatoire)
 *   - Risque (obligatoire)
 *   - Description (optionnel)
 *   - Gravité (1-4) (obligatoire)
 *   - Probabilité (1-4) (obligatoire)
 *   - Maîtrise (1-4) (obligatoire)
 *   - Mesures existantes (optionnel, séparées par | ou ;)
 *   - Mesures à mettre en œuvre / en place (optionnel, séparées par | ou ;) — depuis le
 *     2026-10-12 : une colonne de mesures prévues, proposées ou à mettre en
 *     œuvre n'est jamais lue comme des mesures en place. Elle était prise par
 *     inclusion du mot « mesures », et ses lignes devenaient des actions
 *     LEVÉES (audit du 2026-10-12) ; elles deviennent des actions ouvertes.
 *
 * On ne fait AUCUN LLM pour mapper : c'est du matching exact de noms de
 * colonnes normalisés (cf. CLAUDE.md « Pas de LLM »). Si une colonne
 * obligatoire n'est pas détectée, on remonte un mapping manuel à l'UI.
 */

export type LigneParsee = {
  ligne: number; // index dans le fichier (1-based, en-tête exclue)
  uniteTravail: string;
  libelleRisque: string;
  description: string | null;
  gravite: number;
  probabilite: number;
  maitrise: number;
  mesuresExistantes: string[];
  /** Mesures prévues / à mettre en œuvre : des actions OUVERTES à l'import. */
  mesuresPrevues: string[];
};

export type ErreurLigne = {
  ligne: number;
  champ: string;
  message: string;
};

export type ResultatParsing = {
  lignes: LigneParsee[];
  erreurs: ErreurLigne[];
  totalLignes: number;
  mappingDetecte: Record<ColonneAttendue, string | null>;
};

export type ColonneAttendue =
  | "uniteTravail"
  | "libelleRisque"
  | "description"
  | "gravite"
  | "probabilite"
  | "maitrise"
  | "mesures"
  | "mesuresPrevues";

/** Le nom de chaque champ, tel que l'aperçu le donne en face de la colonne
 *  retenue. */
export const LIBELLE_CHAMP_IMPORT: Record<ColonneAttendue, string> = {
  uniteTravail: "Unité de travail",
  libelleRisque: "Risque",
  description: "Description",
  gravite: "Gravité",
  probabilite: "Probabilité",
  maitrise: "Maîtrise",
  mesures: "Mesures en place",
  mesuresPrevues: "Mesures à mettre en œuvre",
};

const ALIASES: Record<ColonneAttendue, readonly string[]> = {
  uniteTravail: [
    "unite de travail",
    "unite",
    "poste",
    "atelier",
    "lieu",
    "zone",
  ],
  libelleRisque: ["risque", "libelle", "libelle du risque", "danger"],
  description: ["description", "detail", "precision", "commentaire"],
  gravite: ["gravite", "severite", "g"],
  probabilite: ["probabilite", "frequence", "occurrence", "p"],
  maitrise: ["maitrise", "niveau de maitrise", "m"],
  mesures: [
    "mesures existantes",
    "mesures",
    "actions existantes",
    "moyens de prevention",
    "moyens",
  ],
  mesuresPrevues: [
    "mesures prevues",
    "mesures a mettre en oeuvre",
    "mesures a mettre en place",
    "mesures proposees",
    "actions prevues",
    "actions a mettre en oeuvre",
    "actions a mettre en place",
  ],
};

/**
 * Les mots qui disent qu'une mesure n'est PAS en place. Une colonne de mesures
 * qui en porte un est lue « à mettre en œuvre », jamais « en place » : l'erreur
 * inverse inscrirait au DUERP une prévention qui n'existe pas encore, sous la
 * forme d'actions levées que personne ne rouvrira.
 */
const MARQUEURS_A_VENIR = [
  "prevu",
  "prevue",
  "prevues",
  "a mettre en oeuvre",
  // ~~Absents~~ jusqu'au 2026-10-12 (relecture indépendante) : « Mesures à
  // mettre en place » était lue comme des mesures EN PLACE — l'erreur que
  // cette liste existe pour empêcher — et, à côté de « Mesures existantes »,
  // n'était pas importée du tout. Avec les tournures de même sens.
  "a mettre en place",
  "a faire",
  "a planifier",
  "a engager",
  "a envisager",
  "a prevoir",
  "propose",
  "proposee",
  "proposees",
  "a realiser",
  "envisagee",
  "envisagees",
  "a venir",
  "complementaire",
  "complementaires",
];

/** Ce qui fait d'une colonne une colonne de mesures. */
const MOTS_MESURE = ["mesure", "mesures", "action", "actions", "moyens"];

/**
 * Les mots d'une colonne de cotation. « Niveau de risque » contient
 * « risque », et la passe par inclusion la prenait pour le libellé du risque
 * (audit du 2026-10-12).
 */
const MOTS_COTATION = ["niveau", "cotation", "criticite", "score", "indice", "priorite"];

function porteUnMot(normal: string, mots: readonly string[]): boolean {
  const avecBords = ` ${normal} `;
  return mots.some((m) => avecBords.includes(` ${m} `));
}

const estColonneAVenir = (normal: string) =>
  porteUnMot(normal, MOTS_MESURE) && porteUnMot(normal, MARQUEURS_A_VENIR);

function normaliser(s: string): string {
  return s
    .toLowerCase()
    // « œ » et « æ » ne se décomposent pas : sans cela « mise en œuvre »
    // devenait « mise en uvre ».
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Une colonne retenue pour un champ n'est plus candidate pour un autre :
 * « Mesures de prévention du risque » ne devient pas, en plus, le libellé du
 * risque. Les champs passent dans l'ordre d'`ORDRE_INCLUSION`, du plus
 * spécifique au plus large.
 */
const ORDRE_INCLUSION: readonly ColonneAttendue[] = [
  "mesuresPrevues",
  "mesures",
  "gravite",
  "probabilite",
  "maitrise",
  "uniteTravail",
  "description",
  "libelleRisque",
];

/** Ce qu'une colonne doit ne pas être pour être candidate à un champ. */
function exclueDe(col: ColonneAttendue, normal: string): boolean {
  if (col === "mesures") return estColonneAVenir(normal);
  if (col === "libelleRisque") return porteUnMot(normal, MOTS_COTATION);
  return false;
}

function detecterColonnes(
  enTetes: string[],
): Record<ColonneAttendue, string | null> {
  const entries = enTetes.map((e) => ({ original: e, normal: normaliser(e) }));
  const result = {} as Record<ColonneAttendue, string | null>;
  const prises = new Set<string>();
  // Passe 1 : match exact. Passe 2 : match par inclusion, mais uniquement
  // pour les alias ≥ 3 caractères (évite que « p » matche « description »),
  // et jamais sur une colonne exclue du champ ou déjà retenue.
  for (const col of ORDRE_INCLUSION) {
    const match = entries.find(
      (e) => !prises.has(e.original) && ALIASES[col].includes(e.normal),
    );
    result[col] = match?.original ?? null;
    if (match) prises.add(match.original);
  }
  for (const col of ORDRE_INCLUSION) {
    if (result[col] !== null) continue;
    const candidate = (e: { original: string; normal: string }) =>
      !prises.has(e.original) && !exclueDe(col, e.normal);
    const match =
      col === "mesuresPrevues"
        ? entries.find((e) => candidate(e) && estColonneAVenir(e.normal))
        : entries.find(
            (e) =>
              candidate(e) &&
              ALIASES[col].some((a) => a.length >= 3 && e.normal.includes(a)),
          );
    result[col] = match?.original ?? null;
    if (match) prises.add(match.original);
  }
  return result;
}

function validerEntier(
  val: unknown,
  min: number,
  max: number,
): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n =
    typeof val === "number" ? val : parseInt(String(val).trim(), 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n);
}

function splitMesures(val: unknown): string[] {
  if (val === null || val === undefined || val === "") return [];
  return String(val)
    .split(/[|;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse un buffer (ou Uint8Array) Excel ou CSV.
 * Pour CSV : le type MIME `text/csv` est passé en tant que fichier Excel
 * via XLSX — la lib gère les deux uniformément.
 */
/**
 * Lit le classeur, en décodant l'UTF-8 d'un CSV qui n'a pas de BOM.
 *
 * Lu en `type: "buffer"`, un CSV sans BOM est pris par SheetJS pour un jeu de
 * caractères d'un octet : « Unité » devient « UnitÃ© », l'en-tête n'est plus
 * reconnu et rien ne s'importe. C'est le CSV que produisent LibreOffice,
 * Google Sheets et Numbers (audit du 2026-10-12). Avec BOM ou en
 * Windows-1252 (Excel), il passait.
 *
 * Un classeur binaire (.xlsx, zip ; .xls, conteneur OLE) est lu tel quel. Un
 * texte qui est de l'UTF-8 valide est décodé ici ; sinon — Windows-1252, où
 * « é » est un octet seul, invalide en UTF-8 — il garde la lecture d'origine.
 */
function lireClasseur(buffer: ArrayBuffer | Buffer | Uint8Array): XLSX.WorkBook {
  // `sheetRows` : l'en-tête, les lignes admises, et UNE de plus — la
  // sentinelle qui dit que le fichier dépasse (cf. `LIGNES_MAX_IMPORT`).
  const options = { sheetRows: LIGNES_MAX_IMPORT + 2 };
  const octets = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  // La borne de taille décompressée, AVANT SheetJS. Un CSV précédé d'un BOM
  // est lu en texte sans ce BOM : si ce qui suit est une archive, SheetJS la
  // décompresse aussi — on contrôle donc ce qu'il verra.
  const bom = octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf;
  const contenu = bom ? octets.subarray(3) : octets;
  if (routeVersZip(contenu)) {
    const refus = controlerArchive(contenu);
    if (refus) throw new RefusArchive(refus);
  }
  const zip = octets[0] === 0x50 && octets[1] === 0x4b;
  const ole = octets[0] === 0xd0 && octets[1] === 0xcf && octets[2] === 0x11;
  if (!zip && !ole) {
    let texte: string | null = null;
    try {
      texte = new TextDecoder("utf-8", { fatal: true }).decode(octets);
    } catch {
      texte = null;
    }
    if (texte !== null) {
      return XLSX.read(texte.replace(/^\uFEFF/, ""), {
        type: "string",
        ...options,
      });
    }
  }
  return XLSX.read(buffer, { type: "buffer", ...options });
}

/**
 * La taille, une fois décompressé, d'un classeur zip (.xlsx, .ods, .xlsb)
 * qu'on accepte de confier à SheetJS — toutes entrées comprises.
 *
 * `LIGNES_MAX_IMPORT` ne suffit pas : SheetJS décompresse TOUTE l'archive
 * avant de lire une cellule. Un .xlsx de 4,31 Mo portant 158 Mo de XML faisait
 * monter le tas de 98 à 465 Mo, borne de lignes comprise (audit ASVS du
 * 2026-10-13, V5.2.3).
 *
 * 20 Mo : un classeur de 5 000 lignes — la borne — à huit colonnes de texte
 * long en occupe 3,7 Mo en .xlsx et 6,6 Mo en .ods, mesuré le 2026-10-13. La
 * marge est de trois à cinq fois, et quatre fois la taille brute admise
 * (`TAILLE_MAX_IMPORT_OCTETS`, 5 Mo) : une image incompressible jointe au
 * classeur passe.
 */
export const TAILLE_DECOMPRESSEE_MAX_IMPORT = 20 * 1024 * 1024;

/**
 * Le nombre d'entrées d'un classeur zip. Un .xlsx d'Excel en compte une
 * dizaine, quelques dizaines avec des images, des thèmes, plusieurs feuilles ;
 * un .ods, six. Mille laisse plus d'un ordre de grandeur, et borne le travail
 * de la vérification ci-dessous (une décompression par entrée).
 */
export const ENTREES_ZIP_MAX_IMPORT = 1000;

/**
 * Les octets que SheetJS (`readSync`, xlsx 0.20.3) envoie à sa lecture zip :
 * `P K` puis deux octets inférieurs à 9. La même condition, ni plus large ni
 * plus étroite — seuls ces fichiers-là sont décompressés.
 *
 * Les autres formats n'ont pas besoin de cette borne, et la taille brute de
 * 5 Mo (`TAILLE_MAX_IMPORT_OCTETS`) suffit à les tenir :
 *   - le .xls est un conteneur OLE (CFB) : des secteurs lus tels quels, sans
 *     compression — ce qui est en mémoire est de l'ordre de ce qui a été
 *     déposé ; un .xlsx chiffré dans un CFB est refusé par SheetJS ;
 *   - le CSV et les autres textes (HTML, SYLK, DIF…) sont lus caractère par
 *     caractère : aucun facteur d'expansion, et `sheetRows` borne les
 *     cellules construites.
 */
function routeVersZip(o: Uint8Array): boolean {
  return o.length >= 4 && o[0] === 0x50 && o[1] === 0x4b && o[2] < 0x09 && o[3] < 0x09;
}

class RefusArchive extends Error {}

const MESSAGE_ILLISIBLE =
  "Fichier illisible : il n'a pas pu être ouvert comme un tableur. Vérifiez qu'il s'agit bien d'un fichier Excel (.xlsx / .xls) ou CSV, et qu'il s'ouvre dans votre tableur.";

const MESSAGE_TROP_DECOMPRESSE = `Fichier refusé : une fois décompressé, ce classeur dépasse ${TAILLE_DECOMPRESSEE_MAX_IMPORT / 1024 / 1024} Mo. Rien n'a été importé — un DUERP en occupe quelques centaines de kilo-octets. Enregistrez-le à nouveau depuis votre tableur, sans images ni feuilles inutiles, ou exportez-le en CSV.`;

/**
 * Contrôle un classeur zip avant SheetJS ; rend le motif du refus, ou `null`.
 *
 * 1. LES TAILLES DÉCLARÉES, sans rien décompresser : le répertoire central
 *    (`lireRepertoireCentral`) donne le nombre d'entrées et la taille
 *    décompressée annoncée de chacune. Refus au-delà des bornes.
 * 2. LES TAILLES RÉELLES, parce que les déclarées peuvent mentir : SheetJS
 *    n'en tient aucun compte et décompresse chaque flux jusqu'à sa fin. On
 *    décompresse donc chaque entrée là où SheetJS la lira (en-tête LOCAL,
 *    méthode locale), avec `maxOutputLength` réglé sur ce qui reste du budget :
 *    zlib s'arrête à la borne ; la sortie du contrôle est relâchée entrée par
 *    entrée. Une entrée citée deux fois par le répertoire est comptée deux
 *    fois, comme SheetJS la décompresse deux fois.
 *
 * L'en-tête local porte aussi une taille déclarée, que SheetJS utilise pour
 * ALLOUER son tampon de sortie, et qu'il garde entrée après entrée : leur
 * SOMME est bornée de même, indépendamment des tailles réelles.
 *
 * LIMITE QUI RESTE. Le contrôle repose sur zlib, la lecture sur l'inflateur
 * JavaScript de SheetJS. Pour un flux deflate valide, les deux rendent les
 * mêmes octets ; un flux que zlib rejette est refusé ici. Un flux invalide
 * pour zlib mais accepté par SheetJS ne passe donc pas — l'écart inverse
 * (valide pour zlib, lu plus long par SheetJS) supposerait un défaut de
 * l'inflateur de SheetJS, que ce contrôle ne couvre pas.
 */
function controlerArchive(octets: Uint8Array): string | null {
  const entrees = lireRepertoireCentral(octets);
  if (!entrees) return MESSAGE_ILLISIBLE;
  if (entrees.length > ENTREES_ZIP_MAX_IMPORT) {
    return `Fichier refusé : ce classeur contient plus de ${ENTREES_ZIP_MAX_IMPORT} éléments internes, quand un tableur ordinaire en compte quelques dizaines. Rien n'a été importé. Enregistrez-le à nouveau depuis votre tableur, ou exportez-le en CSV.`;
  }
  let declaree = 0;
  for (const e of entrees) declaree += e.tailleDecompressee;
  if (declaree > TAILLE_DECOMPRESSEE_MAX_IMPORT) return MESSAGE_TROP_DECOMPRESSE;

  let reelle = 0;
  let allouee = 0;
  for (const e of entrees) {
    const local = lireEnTeteLocal(octets, e.decalageLocal);
    if (!local) return MESSAGE_ILLISIBLE;
    // SheetJS alloue, pour CHAQUE entrée, un tampon de la taille locale
    // déclarée et le garde : c'est la SOMME de ces tailles qui est bornée, pas
    // chacune contre le reste du budget réel (revue du 2026-10-13, C1).
    allouee += local.tailleDecompressee;
    if (allouee > TAILLE_DECOMPRESSEE_MAX_IMPORT) return MESSAGE_TROP_DECOMPRESSE;
    const reste = TAILLE_DECOMPRESSEE_MAX_IMPORT - reelle;
    if (local.methode === 0) {
      // Stockée : SheetJS en prend une tranche du fichier, sans expansion.
      reelle += Math.min(local.tailleCompressee, octets.length - local.debutDonnees);
    } else if (local.methode === 8) {
      try {
        reelle += inflateRawSync(octets.subarray(local.debutDonnees), {
          maxOutputLength: Math.max(reste, 1),
        }).length;
      } catch (err) {
        return (err as { code?: string }).code === "ERR_BUFFER_TOO_LARGE"
          ? MESSAGE_TROP_DECOMPRESSE
          : MESSAGE_ILLISIBLE;
      }
    } else {
      return MESSAGE_ILLISIBLE; // SheetJS ne lit que stockée ou deflate.
    }
    if (reelle > TAILLE_DECOMPRESSEE_MAX_IMPORT) return MESSAGE_TROP_DECOMPRESSE;
  }
  return null;
}

/**
 * Le nombre de lignes de données qu'un import lit, au plus.
 *
 * Un DUERP réel, c'est cinq unités de travail et quelques centaines de risques
 * au plus : 5 000 lignes laissent plus d'un ordre de grandeur de marge. La
 * borne est passée à SheetJS (`sheetRows`), qui cesse alors de construire des
 * cellules : un classeur de 5 Mo très compressé peut en déplier des millions,
 * et chacune devient un objet en mémoire (1 000 000 de lignes : 874 Mo de tas
 * sans borne, 68 Mo avec — mesuré le 2026-10-13).
 *
 * UNE BORNE QUI NE SE TAIT PAS. Lu jusqu'à la borne puis importé, un fichier
 * plus long perdrait sa fin sans que personne le voie : des risques absents du
 * DUERP. Il est refusé en entier, avec la raison (`depasseLaBorne`).
 */
export const LIGNES_MAX_IMPORT = 5000;

/**
 * Vrai si la feuille a plus de lignes, après l'en-tête, que l'import n'en lit.
 *
 * On lit la sentinelle (la ligne LIGNES_MAX_IMPORT + 2) sur deux plages :
 *   - `!ref`, la plage des cellules lues — pour un CSV, elle couvre aussi les
 *     lignes vides ;
 *   - `!fullref`, que SheetJS pose sur un .xlsx ou un .xls quand il a coupé la
 *     lecture : la seule trace d'un dépassement quand la sentinelle est vide.
 *
 * `!fullref` reprend la dimension déclarée par le classeur : des lignes vides
 * mises en forme au-delà de la borne font refuser le fichier. Le message le
 * dit ; c'est le prix d'une borne qui ne tronque jamais en silence.
 */
function depasseLaBorne(sheet: XLSX.WorkSheet): boolean {
  const indexSentinelle = LIGNES_MAX_IMPORT + 1; // base 0, en-tête = 0
  return [sheet["!ref"], sheet["!fullref"]].some(
    (plage) =>
      typeof plage === "string" &&
      XLSX.utils.decode_range(plage).e.r >= indexSentinelle,
  );
}

/**
 * L'erreur qui porte sur le fichier entier, s'il y en a une : vide, illisible,
 * trop long. Elle est à rendre telle quelle — compter « 1 ligne à corriger »
 * ne dirait rien au dirigeant.
 */
export function erreurDeFichier(res: ResultatParsing): string | null {
  return res.erreurs.find((e) => e.ligne === 0 && e.champ === "fichier")
    ?.message ?? null;
}

function refusFichier(message: string): ResultatParsing {
  return {
    lignes: [],
    erreurs: [{ ligne: 0, champ: "fichier", message }],
    totalLignes: 0,
    mappingDetecte: {} as Record<ColonneAttendue, string | null>,
  };
}

export function parserFichierDuerp(
  buffer: ArrayBuffer | Buffer | Uint8Array,
  mappingUtilisateur?: Partial<Record<ColonneAttendue, string>>,
): ResultatParsing {
  // SheetJS lève sur un fichier qu'il ne sait pas lire (zip tronqué, .xlsx
  // renommé qui n'en est pas un) : sans ce garde, l'exception remontait de
  // l'action serveur et le dirigeant voyait une page d'erreur générique.
  let wb: XLSX.WorkBook;
  try {
    wb = lireClasseur(buffer);
  } catch (err) {
    return refusFichier(err instanceof RefusArchive ? err.message : MESSAGE_ILLISIBLE);
  }
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return refusFichier("Fichier vide");
  const sheet = wb.Sheets[firstSheetName];
  if (!sheet) return refusFichier("Fichier vide");
  if (depasseLaBorne(sheet)) {
    return refusFichier(
      `Fichier trop long : plus de ${LIGNES_MAX_IMPORT} lignes après l'en-tête, lignes vides mises en forme comprises. Rien n'a été importé — un DUERP en compte au plus quelques centaines ; supprimez les lignes en trop ou scindez le fichier.`,
    );
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false, // string-ify les nombres pour traitement uniforme
  });

  if (rows.length === 0) {
    return {
      lignes: [],
      erreurs: [
        { ligne: 0, champ: "fichier", message: "Aucune ligne de données" },
      ],
      totalLignes: 0,
      mappingDetecte: {} as Record<ColonneAttendue, string | null>,
    };
  }

  const enTetes = Object.keys(rows[0] ?? {});
  const auto = detecterColonnes(enTetes);
  const mapping: Record<ColonneAttendue, string | null> = {
    ...auto,
    ...Object.fromEntries(
      Object.entries(mappingUtilisateur ?? {}).filter(([, v]) => v != null),
    ),
  };

  const lignes: LigneParsee[] = [];
  const erreurs: ErreurLigne[] = [];

  rows.forEach((row, idx) => {
    const numLigne = idx + 2; // en-tête = ligne 1
    const ut = mapping.uniteTravail ? row[mapping.uniteTravail] : null;
    const risque = mapping.libelleRisque ? row[mapping.libelleRisque] : null;

    const uniteStr = ut ? String(ut).trim() : "";
    const risqueStr = risque ? String(risque).trim() : "";

    // Ligne entièrement vide → on skippe sans erreur
    if (!uniteStr && !risqueStr) return;

    let skip = false;
    if (!uniteStr) {
      erreurs.push({
        ligne: numLigne,
        champ: "uniteTravail",
        message: "Unité de travail manquante",
      });
      skip = true;
    }
    if (!risqueStr) {
      erreurs.push({
        ligne: numLigne,
        champ: "libelleRisque",
        message: "Libellé du risque manquant",
      });
      skip = true;
    }

    const g = mapping.gravite
      ? validerEntier(row[mapping.gravite], 1, 4)
      : null;
    const p = mapping.probabilite
      ? validerEntier(row[mapping.probabilite], 1, 4)
      : null;
    const m = mapping.maitrise
      ? validerEntier(row[mapping.maitrise], 1, 4)
      : null;

    if (g === null) {
      erreurs.push({
        ligne: numLigne,
        champ: "gravite",
        message: "Gravité attendue : entier entre 1 et 4",
      });
      skip = true;
    }
    if (p === null) {
      erreurs.push({
        ligne: numLigne,
        champ: "probabilite",
        message: "Probabilité attendue : entier entre 1 et 4",
      });
      skip = true;
    }
    if (m === null) {
      erreurs.push({
        ligne: numLigne,
        champ: "maitrise",
        message: "Maîtrise attendue : entier entre 1 et 4",
      });
      skip = true;
    }

    if (skip) return;

    const desc = mapping.description ? row[mapping.description] : null;
    const mesures = mapping.mesures ? splitMesures(row[mapping.mesures]) : [];
    const prevues = mapping.mesuresPrevues
      ? splitMesures(row[mapping.mesuresPrevues])
      : [];

    lignes.push({
      ligne: numLigne,
      uniteTravail: uniteStr,
      libelleRisque: risqueStr,
      description: desc ? String(desc).trim() || null : null,
      gravite: g as number,
      probabilite: p as number,
      maitrise: m as number,
      mesuresExistantes: mesures,
      mesuresPrevues: prevues,
    });
  });

  return {
    lignes,
    erreurs,
    totalLignes: rows.length,
    mappingDetecte: mapping,
  };
}

/**
 * Agrège une liste de lignes parsées en un plan d'import : on regroupe les
 * risques par unité de travail, en dédupliquant l'unité par nom normalisé.
 */
export type PlanImport = {
  unites: Array<{
    nom: string;
    risques: LigneParsee[];
  }>;
  nbRisques: number;
  nbMesures: number;
  nbMesuresPrevues: number;
};

export function planifierImport(lignes: LigneParsee[]): PlanImport {
  const mapUnites = new Map<string, { nom: string; risques: LigneParsee[] }>();
  for (const l of lignes) {
    const cle = normaliser(l.uniteTravail);
    const existing = mapUnites.get(cle);
    if (existing) {
      existing.risques.push(l);
    } else {
      mapUnites.set(cle, { nom: l.uniteTravail, risques: [l] });
    }
  }
  const unites = Array.from(mapUnites.values());
  return {
    unites,
    nbRisques: lignes.length,
    nbMesures: lignes.reduce((a, l) => a + l.mesuresExistantes.length, 0),
    nbMesuresPrevues: lignes.reduce((a, l) => a + l.mesuresPrevues.length, 0),
  };
}
