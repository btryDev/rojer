// Serveur seulement : la clé `service_role` et le client qui la porte ne
// doivent jamais entrer dans un bundle navigateur. Next remplace ce module
// par un module vide côté serveur, et par une erreur de compilation côté
// client (2026-09-27).
import "server-only";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { LocalFileStorage } from "./local";
import { SupabaseFileStorage, type ClientStockage } from "./supabase";
import { StockageNonConfigure } from "./erreurs";
import { diagnostic, formeDeLaCle, nettoyer, refusDeLaCle } from "./cle-service";
import type { FileStorage } from "./types";

export type { FileStorage, StorageKey } from "./types";
export {
  ErreurStockage,
  MESSAGE_ECHEC_ENREGISTREMENT,
  FichierIntrouvable,
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_FICHIER_INTROUVABLE,
  StockageNonConfigure,
} from "./erreurs";

/**
 * Factory — renvoie l'implémentation de stockage à utiliser côté serveur,
 * choisie par `STORAGE_DRIVER`.
 *
 *   - `local` (défaut en développement) : le disque, sous `STORAGE_LOCAL_PATH`
 *     ou `./storage`. **Refusé en production** : sur Vercel, le disque est en
 *     lecture seule et éphémère, et aucun fichier n'y survit (2026-09-27,
 *     `lot/stockage-supabase`). Refus sur le patron de `email/index.ts` et de
 *     son driver `console`.
 *   - `supabase` : Supabase Storage, bucket privé `STORAGE_BUCKET`, clé
 *     `SUPABASE_SERVICE_ROLE_KEY` (serveur seulement), URL du projet
 *     `NEXT_PUBLIC_SUPABASE_URL` (déjà posée pour l'authentification).
 *
 * Un pilote S3 (migration prévue vers Clever Cloud) s'ajoutera ici, derrière
 * la même interface. Procédure côté propriétaire : `docs/deploiement-stockage.md`.
 */

const VARIABLES_SUPABASE = [
  "STORAGE_BUCKET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

/**
 * Pourquoi le stockage n'est pas utilisable ici, ou `null` s'il l'est. UNE
 * règle, lue par `getStorage` (qui lève) et par `stockageEnService` (qui
 * répond avant qu'on lise le formulaire) : les deux ne peuvent pas se
 * contredire. Le motif nomme les variables, jamais leur valeur.
 */
function refusDuStockage(): string | null {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    return process.env.NODE_ENV === "production"
      ? `STORAGE_DRIVER vaut « local »${process.env.STORAGE_DRIVER ? "" : " (non défini)"} en production : ` +
          "le disque du serveur est en lecture seule et éphémère, aucun fichier " +
          "déposé n'y survivrait. Poser STORAGE_DRIVER=supabase, STORAGE_BUCKET " +
          "et SUPABASE_SERVICE_ROLE_KEY (docs/deploiement-stockage.md)."
      : null;
  }
  if (driver === "supabase") {
    // Nettoyées avant d'être jugées : une variable faite d'un seul retour à la
    // ligne est « manquante », pas présente.
    const manquantes = VARIABLES_SUPABASE.filter((v) => !nettoyer(process.env[v]));
    if (manquantes.length > 0)
      return (
        `STORAGE_DRIVER vaut « supabase », mais ${manquantes.join(", ")} ` +
        `${manquantes.length > 1 ? "ne sont pas définies" : "n'est pas définie"}.`
      );
    // La FORME de la clé, jugée avant tout appel : une clé mal collée ou d'un
    // autre format partait jusqu'à Storage, qui répondait « Invalid Compact
    // JWS » (production, 2026-09-27). `cle-service.ts`.
    return refusDeLaCle(formeDeLaCle(nettoyer(process.env.SUPABASE_SERVICE_ROLE_KEY)));
  }
  return `Driver de stockage non supporté : ${driver}. Utiliser « local » (développement) ou « supabase ».`;
}

/**
 * Le dépôt de fichiers peut-il marcher ici ? À appeler AVANT de lire le
 * fichier du formulaire ou d'écrire en base : un dépôt refusé doit le dire —
 * `MESSAGE_DEPOT_NON_CONFIGURE` — plutôt que d'échouer au milieu.
 */
export function stockageEnService(): boolean {
  return refusDuStockage() === null;
}

let _storage: FileStorage | null = null;

export function getStorage(): FileStorage {
  if (_storage) return _storage;
  const refus = refusDuStockage();
  if (refus) {
    // Le motif nomme la variable et la FORME de la clé, jamais sa valeur ; il
    // va au journal du serveur, l'écran dit `MESSAGE_DEPOT_NON_CONFIGURE`.
    console.error(`[stockage] non configuré : ${refus}`);
    throw new StockageNonConfigure(refus);
  }

  if ((process.env.STORAGE_DRIVER ?? "local") === "supabase") {
    const cle = nettoyer(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const url = nettoyer(process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.info(
      `[stockage] pilote supabase, bucket « ${nettoyer(process.env.STORAGE_BUCKET)} », ` +
        `clé : ${diagnostic(formeDeLaCle(cle))}`,
    );
    const client = createClient(url, cle, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Sans conversion : le client supabase-js satisfait `ClientStockage` tel
    // quel, et le compilateur le vérifie à chaque montée de version.
    const stockage: ClientStockage = client;
    _storage = new SupabaseFileStorage(stockage, nettoyer(process.env.STORAGE_BUCKET));
    return _storage;
  }

  const root =
    process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), "storage");
  _storage = new LocalFileStorage(root);
  return _storage;
}

/** Pour les tests : oublie le pilote construit, la configuration a changé. */
export function __oublierPiloteStockage(): void {
  _storage = null;
}

/**
 * Construit la clé de stockage d'un rapport. Stable (évite d'inclure le
 * timestamp) pour permettre un upsert ultérieur si nécessaire, mais inclut
 * le rapportId qui est un cuid unique.
 */
export function cleRapport(
  etablissementId: string,
  rapportId: string,
  nomFichier: string,
): string {
  // Nettoyage basique du nom : uniquement alphanum, point, tiret, underscore.
  const safe = nomFichier.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return `rapports/${etablissementId}/${rapportId}-${safe}`;
}
