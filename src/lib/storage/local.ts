import { promises as fs } from "node:fs";
import path from "node:path";
import type { FileStorage, StorageKey } from "./types";
import { FichierIntrouvable } from "./erreurs";

/**
 * Implémentation filesystem locale du `FileStorage`.
 *
 * Tous les fichiers sont stockés sous `rootDir`. Les clés sont des chemins
 * relatifs (avec slashes), et sont sanitisées pour refuser toute tentative
 * de sortie du rootDir (path traversal).
 */
export class LocalFileStorage implements FileStorage {
  constructor(private readonly rootDir: string) {}

  private resolveKey(key: StorageKey): string {
    // On refuse les caractères parents et les chemins absolus.
    if (key.includes("..") || path.isAbsolute(key)) {
      throw new Error(`Clé de stockage invalide : ${key}`);
    }
    const full = path.join(this.rootDir, key);
    // Sécurité supplémentaire : vérifier que le chemin résolu reste sous root.
    const normalized = path.resolve(full);
    const rootResolved = path.resolve(this.rootDir);
    if (!normalized.startsWith(rootResolved + path.sep) && normalized !== rootResolved) {
      throw new Error(`Clé de stockage hors du dossier racine : ${key}`);
    }
    return normalized;
  }

  async put(key: StorageKey, data: Buffer, _mime: string): Promise<void> {
    void _mime;
    const full = this.resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }

  async get(key: StorageKey): Promise<Buffer> {
    const full = this.resolveKey(key);
    try {
      return await fs.readFile(full);
    } catch (err: unknown) {
      // Même contrat que le pilote Supabase : une clé absente est
      // `FichierIntrouvable`, que les routes traduisent en « introuvable ».
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT")
        throw new FichierIntrouvable(key);
      throw err;
    }
  }

  async delete(key: StorageKey): Promise<void> {
    const full = this.resolveKey(key);
    try {
      await fs.unlink(full);
    } catch (err: unknown) {
      // ENOENT (fichier absent) n'est pas une erreur ici.
      if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
    }
  }

  async exists(key: StorageKey): Promise<boolean> {
    const full = this.resolveKey(key);
    try {
      await fs.access(full);
      return true;
    } catch {
      return false;
    }
  }
}
