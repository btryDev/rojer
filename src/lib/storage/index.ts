// Serveur seulement : la clé `service_role` et le client qui la porte ne
// doivent jamais entrer dans un bundle navigateur. Next remplace ce module
// par un module vide côté serveur, et par une erreur de compilation côté
// client (2026-09-27).
import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { S3Client } from "@aws-sdk/client-s3";
import { LocalFileStorage } from "./local";
import { SupabaseFileStorage, type ClientStockage } from "./supabase";
import { S3FileStorage, pointDAcces, type ClientS3 } from "./s3";
import { StockageNonConfigure } from "./erreurs";
import { diagnostic, formeDeLaCle, nettoyer, refusDeLaCle } from "./cle-service";
import { segmentCleStockage } from "./noms";
import type { FileStorage } from "./types";
import { fetchAvecDelai } from "@/lib/reseau/delai";

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
 *   - `s3` : Cellar, le stockage objet de Clever Cloud (2026-10-30, plan de
 *     bascule 0.7), bucket privé `STORAGE_BUCKET`, accès par les variables
 *     que l'add-on injecte (`CELLAR_ADDON_HOST`, `CELLAR_ADDON_KEY_ID`,
 *     `CELLAR_ADDON_KEY_SECRET`). Voir `s3.ts`.
 *
 * Procédure côté propriétaire : `docs/deploiement-stockage.md`.
 */

/**
 * Délai maximal d'un appel au service de stockage (audit Next.js du
 * 2026-10-14, M9). Il couvre la réponse entière : un dépôt de 20 Mo (borne de
 * `rapports/validator.ts`) ou le téléchargement d'un fichier pour le ZIP de
 * contrôle doivent y tenir sur un lien lent, d'où une minute plutôt que
 * quelques secondes. Au-delà, l'opération échoue en `ErreurStockage` comme
 * une panne : l'écran dit `MESSAGE_ECHEC_ENREGISTREMENT`, rien n'est écrit en
 * base. Le pilote S3 (Cellar) prend le même délai, par le `requestTimeout`
 * de son gestionnaire HTTP, et un essai de plus au plus (`maxAttempts`).
 */
export const DELAI_STOCKAGE_MS = 60_000;

const VARIABLES_S3 = [
  "STORAGE_BUCKET",
  "CELLAR_ADDON_HOST",
  "CELLAR_ADDON_KEY_ID",
  "CELLAR_ADDON_KEY_SECRET",
] as const;

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
          "déposé n'y survivrait. Poser STORAGE_DRIVER=supabase (Vercel) ou " +
          "STORAGE_DRIVER=s3 (Clever Cloud) et leurs variables " +
          "(docs/deploiement-stockage.md)."
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
  if (driver === "s3") {
    const manquantes = VARIABLES_S3.filter((v) => !nettoyer(process.env[v]));
    if (manquantes.length > 0)
      return (
        `STORAGE_DRIVER vaut « s3 », mais ${manquantes.join(", ")} ` +
        `${manquantes.length > 1 ? "ne sont pas définies" : "n'est pas définie"}.`
      );
    return null;
  }
  return `Driver de stockage non supporté : ${driver}. Utiliser « local » (développement), « supabase » ou « s3 ».`;
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
      global: { fetch: fetchAvecDelai(DELAI_STOCKAGE_MS) },
    });
    // Sans conversion : le client supabase-js satisfait `ClientStockage` tel
    // quel, et le compilateur le vérifie à chaque montée de version.
    const stockage: ClientStockage = client;
    _storage = new SupabaseFileStorage(stockage, nettoyer(process.env.STORAGE_BUCKET));
    return _storage;
  }

  if ((process.env.STORAGE_DRIVER ?? "local") === "s3") {
    const bucket = nettoyer(process.env.STORAGE_BUCKET);
    console.info(`[stockage] pilote s3 (Cellar), bucket « ${bucket} »`);
    const client = new S3Client({
      endpoint: pointDAcces(nettoyer(process.env.CELLAR_ADDON_HOST)),
      // La doc de Cellar : une région est exigée par le SDK, « default » convient.
      region: "default",
      forcePathStyle: true,
      credentials: {
        accessKeyId: nettoyer(process.env.CELLAR_ADDON_KEY_ID),
        secretAccessKey: nettoyer(process.env.CELLAR_ADDON_KEY_SECRET),
      },
      // Sans ces deux réglages, la doc de Cellar signale des erreurs de somme
      // de contrôle avec le SDK v3 récent.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      requestHandler: { requestTimeout: DELAI_STOCKAGE_MS, connectionTimeout: 10_000 },
      maxAttempts: 2,
    });
    // Sans conversion : `S3Client` satisfait `ClientS3` tel quel.
    const s3: ClientS3 = client;
    _storage = new S3FileStorage(s3, bucket);
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

/** La clé de la pièce qui prouve la correction d'un point (ADR-048). */
export function clePieceDePoint(
  etablissementId: string,
  actionId: string,
  nomFichier: string,
): string {
  // Le suffixe aléatoire distingue deux pièces successives d'un même point (réouvert
  // puis corrigé de nouveau) : la clé n'est jamais réécrite.
  const safe = segmentCleStockage(nomFichier);
  return `points/${etablissementId}/${actionId}-${randomUUID()}-${safe}`;
}

/**
 * La clé de la photo d'un établissement (2026-10-25). Le suffixe aléatoire
 * distingue deux photos successives : la clé n'est jamais réécrite, l'ancienne
 * est libérée une fois la nouvelle enregistrée en base.
 */
export function clePhotoEtablissement(etablissementId: string, nomFichier: string): string {
  return `photos/${etablissementId}/${randomUUID()}-${segmentCleStockage(nomFichier)}`;
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
  const safe = segmentCleStockage(nomFichier);
  return `rapports/${etablissementId}/${rapportId}-${safe}`;
}
