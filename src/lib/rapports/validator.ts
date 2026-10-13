import { commeUneArchiveZip, lireRepertoireCentral } from "@/lib/fichiers/repertoire-zip";

/**
 * Validation du fichier uploadé : taille, type déclaré, extension du nom et
 * octets du contenu.
 *
 * On accepte en MVP :
 *   - PDF (majorité des rapports de vérification)
 *   - PNG / JPEG (photos de plaques, rapports scannés)
 *   - DOCX (rapports bureautiques)
 *
 * Limite taille : 20 Mo. Au-dessus, l'utilisateur doit compresser le PDF
 * (majorité des rapports courants font < 5 Mo). On n'accepte pas de ZIP
 * pour éviter le contournement du typage MIME.
 */

export const MIME_AUTORISES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type MimeAutorise = (typeof MIME_AUTORISES)[number];

export const TAILLE_MAX_OCTETS = 20 * 1024 * 1024; // 20 Mo

export type ValidationFichierOk = {
  ok: true;
  mime: MimeAutorise;
  taille: number;
};

export type ValidationFichierError = {
  ok: false;
  erreur: string;
};

export type ResultatValidationFichier =
  | ValidationFichierOk
  | ValidationFichierError;

/**
 * CE QUI CONFIRME LE TYPE DÉCLARÉ (ASVS 5.0.0 V5.2.2, audit du 2026-10-13).
 *
 * Le type MIME d'un fichier déposé est celui que DÉCLARE le navigateur — donc
 * ce que l'auteur de la requête veut. Il était le seul contrôle : un HTML
 * nommé `facture.html` et déclaré `application/pdf` passait, un exécutable
 * nommé `rapport.exe` et déclaré `image/png` aussi. Or le nom est gardé : le
 * ZIP de contrôle remet les pièces à des tiers (inspection, assureur) sous
 * leur nom d'origine, et `storage/servir.ts` redéduit un type de l'extension.
 *
 * Les trois doivent donc dire la même chose : le type déclaré, l'EXTENSION du
 * nom (liste fermée par type) et les OCTETS de tête du contenu. Un .docx est
 * une archive zip : `PK\x03\x04` ne prouve rien, on exige dans son répertoire
 * central `[Content_Types].xml` (tout paquet OOXML) et `word/document.xml` (un
 * document Word, pas un classeur ni une archive quelconque renommée).
 *
 * Le même validateur sert aux rapports, aux pièces des prestataires et aux
 * rapports d'analyse légionelles : la règle tient pour les trois.
 */
type Format = {
  libelle: string;
  extensions: readonly string[];
  /** Les octets de tête suffisent-ils, ou faut-il tout le fichier ? */
  lireTout: boolean;
  contenu: (octets: Uint8Array) => boolean;
};

const commencePar = (signature: readonly number[]) => (octets: Uint8Array) =>
  octets.length >= signature.length && signature.every((b, i) => octets[i] === b);

function estUnDocumentWord(octets: Uint8Array): boolean {
  if (!commeUneArchiveZip(octets)) return false;
  const noms = new Set(lireRepertoireCentral(octets)?.map((e) => e.nom) ?? []);
  return noms.has("[Content_Types].xml") && noms.has("word/document.xml");
}

const FORMATS: Record<MimeAutorise, Format> = {
  "application/pdf": {
    libelle: "PDF",
    extensions: [".pdf"],
    lireTout: false,
    contenu: commencePar([0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  },
  "image/png": {
    libelle: "PNG",
    extensions: [".png"],
    lireTout: false,
    contenu: commencePar([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  "image/jpeg": {
    libelle: "JPEG",
    extensions: [".jpg", ".jpeg"],
    lireTout: false,
    contenu: commencePar([0xff, 0xd8, 0xff]),
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    libelle: "document Word (.docx)",
    extensions: [".docx"],
    lireTout: true,
    contenu: estUnDocumentWord,
  },
};

export async function validerFichier(
  fichier: File | null,
): Promise<ResultatValidationFichier> {
  if (!fichier || fichier.size === 0) {
    return { ok: false, erreur: "Aucun fichier sélectionné" };
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return {
      ok: false,
      erreur: `Fichier trop volumineux (max ${Math.round(
        TAILLE_MAX_OCTETS / 1024 / 1024,
      )} Mo)`,
    };
  }
  if (!MIME_AUTORISES.includes(fichier.type as MimeAutorise)) {
    return {
      ok: false,
      erreur: `Type de fichier non accepté (${fichier.type || "inconnu"}). Acceptés : PDF, PNG, JPEG, DOCX.`,
    };
  }
  const mime = fichier.type as MimeAutorise;
  const format = FORMATS[mime];
  const nom = fichier.name.toLowerCase();
  if (!format.extensions.some((ext) => nom.endsWith(ext))) {
    return {
      ok: false,
      erreur: `Le nom du fichier ne correspond pas à son type : un ${format.libelle} doit se terminer par ${format.extensions.join(" ou ")} (fichier reçu : « ${fichier.name} »). Renommez-le, ou enregistrez-le à nouveau depuis le logiciel qui l'a produit.`,
    };
  }
  const octets = new Uint8Array(
    await (format.lireTout ? fichier : fichier.slice(0, 16)).arrayBuffer(),
  );
  if (!format.contenu(octets)) {
    return {
      ok: false,
      erreur: `Le contenu du fichier ne correspond pas à un ${format.libelle} : il n'a pas été accepté. Vérifiez qu'il s'ouvre bien comme tel sur votre poste, ou enregistrez-le à nouveau depuis le logiciel qui l'a produit.`,
    };
  }
  return { ok: true, mime, taille: fichier.size };
}
