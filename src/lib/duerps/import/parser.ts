import * as XLSX from "xlsx";

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
 *   - Mesures à mettre en œuvre (optionnel, séparées par | ou ;) — depuis le
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
    "mesures proposees",
    "actions prevues",
    "actions a mettre en oeuvre",
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
  const octets = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
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
      return XLSX.read(texte.replace(/^\uFEFF/, ""), { type: "string" });
    }
  }
  return XLSX.read(buffer, { type: "buffer" });
}

export function parserFichierDuerp(
  buffer: ArrayBuffer | Buffer | Uint8Array,
  mappingUtilisateur?: Partial<Record<ColonneAttendue, string>>,
): ResultatParsing {
  const wb = lireClasseur(buffer);
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return {
      lignes: [],
      erreurs: [{ ligne: 0, champ: "fichier", message: "Fichier vide" }],
      totalLignes: 0,
      mappingDetecte: {} as Record<ColonneAttendue, string | null>,
    };
  }
  const sheet = wb.Sheets[firstSheetName];
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
