import { ErreurStockage } from "./erreurs";
import type { StorageKey } from "./types";

/**
 * La règle de clé de TOUS les pilotes (local, Supabase, S3) : ni vide, ni
 * remontée, ni chemin absolu, ni séparateur Windows. Une seule écriture, pour
 * qu'un durcissement futur ne manque aucun pilote (revue de la PR #129). Le
 * pilote local y ajoute son propre contrôle de chemin résolu, propre au disque.
 */
export function verifierCleStockage(key: StorageKey): string {
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    throw new ErreurStockage(`Clé de stockage invalide : ${key}`);
  }
  return key;
}
