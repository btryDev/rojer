// Serveur seulement : les clés d'accès au bucket ne doivent jamais entrer dans
// un bundle navigateur.
import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { FileStorage, StorageKey } from "./types";
import { ErreurStockage, FichierIntrouvable } from "./erreurs";

/**
 * Pilote S3 du `FileStorage`, pour Cellar, le stockage objet de Clever Cloud
 * (plan de bascule, 0.7 ; 2026-10-30).
 *
 * Ce que dit la doc de Cellar, et ce qu'on en fait
 * (https://www.clever.cloud/developers/doc/deploy/storage/cellar/) :
 * - L'add-on injecte `CELLAR_ADDON_HOST`, `CELLAR_ADDON_KEY_ID` et
 *   `CELLAR_ADDON_KEY_SECRET` ; la doc donne l'hôte tantôt en URL complète,
 *   tantôt nu : `pointDAcces` accepte les deux.
 * - `region: "default"`, le SDK exigeant une région même avec un point
 *   d'accès propre.
 * - `requestChecksumCalculation` / `responseChecksumValidation` à
 *   `WHEN_REQUIRED` : avec le SDK v3 récent, la doc signale des erreurs de
 *   somme de contrôle sans ce réglage.
 * - Chemin dans l'URL (`forcePathStyle`) : le nom du bucket ne passe pas par
 *   le DNS, comme dans l'exemple d'URL présignée de la doc.
 *
 * Ce qu'il fait comme les autres pilotes : bucket PRIVÉ, aucune URL publique
 * ni présignée — les routes de l'application continuent de servir le fichier
 * après leur propre contrôle d'appartenance ; même règle de clé (ni remontée,
 * ni chemin absolu) ; une seule erreur à connaître pour l'appelant
 * (`ErreurStockage`, `FichierIntrouvable`), dont le message nomme l'opération,
 * la clé et ce que le service a dit, jamais les clés d'accès.
 *
 * Le client est une interface minimale (`ClientS3`) : le `S3Client` du SDK la
 * satisfait tel quel, et les tests la remplacent par un double sans réseau.
 */

export interface ClientS3 {
  send(commande: object): Promise<unknown>;
}

/** L'hôte de Cellar, nu ou en URL, rendu en URL https. */
export function pointDAcces(hote: string): string {
  const h = hote.trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(h) ? h : `https://${h}`;
}

/** Ce que le SDK rend pour un objet absent : 404, `NoSuchKey` ou `NotFound`. */
function estAbsent(e: unknown): boolean {
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    err?.name === "NoSuchKey" ||
    err?.name === "NotFound" ||
    err?.$metadata?.httpStatusCode === 404
  );
}

function messageDe(e: unknown): string {
  const err = e as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const statut = err?.$metadata?.httpStatusCode;
  return [err?.name, statut ? `HTTP ${statut}` : null, err?.message]
    .filter(Boolean)
    .join(" — ") || "erreur inconnue";
}

export class S3FileStorage implements FileStorage {
  constructor(
    private readonly client: ClientS3,
    private readonly bucket: string,
  ) {}

  /** Même règle que les autres pilotes : pas de remontée, pas de chemin absolu. */
  private verifier(key: StorageKey): string {
    if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
      throw new ErreurStockage(`Clé de stockage invalide : ${key}`);
    }
    return key;
  }

  private echec(operation: string, key: StorageKey, e: unknown): never {
    throw new ErreurStockage(`Stockage S3 : échec de ${operation} pour « ${key} » (${messageDe(e)})`);
  }

  async put(key: StorageKey, data: Buffer, mime: string): Promise<void> {
    const cle = this.verifier(key);
    try {
      // Même contrat que les autres pilotes : « Écrase si la clé existe déjà ».
      await this.client.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: cle, Body: data, ContentType: mime }),
      );
    } catch (e) {
      this.echec("l'écriture", key, e);
    }
  }

  async get(key: StorageKey): Promise<Buffer> {
    const cle = this.verifier(key);
    let reponse: { Body?: { transformToByteArray(): Promise<Uint8Array> } };
    try {
      reponse = (await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: cle }),
      )) as typeof reponse;
    } catch (e) {
      if (estAbsent(e)) throw new FichierIntrouvable(key);
      this.echec("la lecture", key, e);
    }
    if (!reponse.Body) throw new FichierIntrouvable(key);
    try {
      return Buffer.from(await reponse.Body.transformToByteArray());
    } catch (e) {
      this.echec("la lecture", key, e);
    }
  }

  async delete(key: StorageKey): Promise<void> {
    // S3 ne signale pas l'absence à la suppression : no-op, comme les autres
    // pilotes. Une vraie erreur (droits, réseau) remonte.
    const cle = this.verifier(key);
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: cle }));
    } catch (e) {
      if (!estAbsent(e)) this.echec("la suppression", key, e);
    }
  }

  async exists(key: StorageKey): Promise<boolean> {
    const cle = this.verifier(key);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: cle }));
      return true;
    } catch (e) {
      if (estAbsent(e)) return false;
      this.echec("la vérification", key, e);
    }
  }
}
