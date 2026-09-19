/**
 * Ce qu'on accepte d'importer comme DUERP : un tableur, et rien d'autre.
 *
 * POURQUOI UN VALIDATEUR À PART. Jusqu'au 2026-09-19, l'import appelait
 * `validerFichier` (`src/lib/rapports/validator.ts`), qui est le validateur des
 * RAPPORTS de vérification — PDF, PNG, JPEG, DOCX. Un .xlsx ou un .csv passait
 * le premier contrôle de l'import, puis était refusé par le second : **l'import
 * d'un DUERP n'a jamais pu aboutir depuis le 2026-04-24**. Relevé par le lot
 * de mise à jour de `xlsx` pendant l'audit du 2026-09-19. Et la liste locale
 * acceptait `application/pdf`, sous un commentaire qui disait « PDF exclu ».
 *
 * Les deux étapes — aperçu et import — passent par ICI, la seconde comprise :
 * elle relit le fichier, et un contrôle posé sur la seule première se
 * contourne en appelant la seconde directement.
 *
 * LA TAILLE EST BORNÉE PLUS BAS QUE POUR UN RAPPORT. Un DUERP de cinq unités
 * tient en quelques dizaines de kilo-octets ; le fichier est analysé en
 * mémoire côté serveur par SheetJS. 5 Mo laisse une marge de deux ordres de
 * grandeur sans offrir au parseur un fichier de 20 Mo.
 */

export const TAILLE_MAX_IMPORT_OCTETS = 5 * 1024 * 1024;

/** Les types qu'un navigateur envoie pour un tableur. */
export const MIME_IMPORT = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls — aussi envoyé pour un .csv par certains navigateurs
  "text/csv",
  "text/plain", // certains navigateurs envoient un CSV ainsi
] as const;

const EXTENSIONS_IMPORT = [".xlsx", ".xls", ".csv"] as const;

/**
 * Les types qu'on refuse même quand l'extension est celle d'un tableur : un
 * fichier dont le navigateur déclare qu'il est un PDF ou une image n'est pas
 * un tableur renommé, c'est un autre document.
 */
const MIME_REFUSES = /^(application\/pdf|image\/)/;

export type ResultatFormatImport = { ok: true } | { ok: false; erreur: string };

export function validerFichierImport(fichier: File | null): ResultatFormatImport {
  if (!fichier || fichier.size === 0) {
    return { ok: false, erreur: "Aucun fichier fourni." };
  }
  if (fichier.size > TAILLE_MAX_IMPORT_OCTETS) {
    return {
      ok: false,
      erreur: `Fichier trop volumineux (max ${TAILLE_MAX_IMPORT_OCTETS / 1024 / 1024} Mo). Un DUERP tient en quelques dizaines de kilo-octets.`,
    };
  }
  const nom = fichier.name.toLowerCase();
  const extensionTableur = EXTENSIONS_IMPORT.some((e) => nom.endsWith(e));
  const typeTableur = (MIME_IMPORT as readonly string[]).includes(fichier.type);
  if (MIME_REFUSES.test(fichier.type) || (!typeTableur && !extensionTableur)) {
    return {
      ok: false,
      erreur: `Format non accepté (${fichier.type || "inconnu"}). Fournissez un fichier Excel (.xlsx / .xls) ou CSV.`,
    };
  }
  return { ok: true };
}
