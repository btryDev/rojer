/**
 * Abstraction de stockage de fichiers (étape 7).
 *
 * Objectif : permettre de démarrer en **filesystem local** (dev + petit prod)
 * puis migrer vers ~~**Supabase Storage /**~~ **S3 / R2** sans changer le code métier.
 * [2026-11-17 : Supabase retiré (PR #337) ; le pilote s3 sert Cellar chez Clever Cloud.]
 *
 * Aucune méthode ne renvoie une URL signée directement : les rapports sont
 * toujours servis via une route API `/api/rapports/[id]/fichier` qui contrôle
 * l'accès et stream le fichier. Plus tard, on pourra ajouter une méthode
 * `getSignedUrl` quand on migrera vers un stockage externe.
 */

export type StorageKey = string;

export interface FileStorage {
  /** Écrit le fichier. Écrase si la clé existe déjà. */
  put(key: StorageKey, data: Buffer, mime: string): Promise<void>;

  /** Lit le fichier entier en mémoire. Utile pour petits fichiers. */
  get(key: StorageKey): Promise<Buffer>;

  /** Supprime le fichier. No-op si la clé n'existe pas. */
  delete(key: StorageKey): Promise<void>;

  /** Indique si le fichier existe. */
  exists(key: StorageKey): Promise<boolean>;
}
