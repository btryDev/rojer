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
import { ErreurStockage, FichierIntrouvable, echecStockage } from "./erreurs";
import { verifierCleStockage } from "./cle-stockage";

/**
 * Pilote S3 du `FileStorage`, pour Cellar, le stockage objet de Clever Cloud
 * (plan de bascule, 0.7 ; 2026-10-30).
 *
 * Ce que dit la doc de Cellar, et ce qu'on en fait
 * (https://www.clever.cloud/developers/doc/deploy/storage/cellar/) :
 * - L'add-on injecte `CELLAR_ADDON_HOST`, `CELLAR_ADDON_KEY_ID` et
 *   `CELLAR_ADDON_KEY_SECRET` ; la doc donne l'hôte tantôt en URL complète,
 *   tantôt nu : `pointDAcces` accepte les deux, en https seulement.
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
 * après leur propre contrôle d'appartenance ; même règle de clé
 * (`cle-stockage.ts`) ; une seule famille d'erreurs pour l'appelant
 * (`ErreurStockage`, `FichierIntrouvable`), dont le message nomme
 * l'opération, la clé et ce que le service a dit, jamais les clés d'accès.
 *
 * Le client est une interface minimale (`ClientS3`) : le `S3Client` du SDK la
 * satisfait tel quel, et les tests la remplacent par un double sans réseau.
 */

export interface ClientS3 {
  send(commande: object, options?: { abortSignal?: AbortSignal }): Promise<unknown>;
}

/**
 * Pourquoi l'hôte de Cellar n'est pas utilisable, ou `null`. Les fichiers
 * transitent par ce lien : jamais en clair (revue de sécurité de la PR #129).
 */
export function refusDuPointDAcces(hote: string): string | null {
  return /^http:\/\//i.test(hote.trim())
    ? "CELLAR_ADDON_HOST est en http:// : le stockage exige une connexion chiffrée (https)."
    : null;
}

/** L'hôte de Cellar, nu ou en URL https, rendu en URL https. */
export function pointDAcces(hote: string): string {
  const refus = refusDuPointDAcces(hote);
  if (refus) throw new ErreurStockage(refus);
  const h = hote.trim().replace(/\/+$/, "");
  return /^https:\/\//i.test(h) ? h : `https://${h}`;
}

/**
 * Un OBJET absent : `NoSuchKey` (lecture) ou `NotFound` (HEAD, sans corps
 * d'erreur), et 404. Pas « tout 404 » : `NoSuchBucket` (bucket mal nommé ou
 * pas créé) est une panne de configuration, qui doit se voir comme telle.
 * Limite : un HEAD sur un bucket absent rend aussi `NotFound` ; `exists` ne
 * sert qu'à l'inventaire du ZIP de contrôle, en lecture.
 */
function estAbsent(e: unknown): boolean {
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    (err?.name === "NoSuchKey" || err?.name === "NotFound") &&
    err?.$metadata?.httpStatusCode === 404
  );
}

/** Ce que le service a dit : son nom d'erreur, le statut HTTP, le message. */
function motifS3(e: unknown): string {
  const err = e as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const statut = err?.$metadata?.httpStatusCode;
  return (
    [err?.name, statut ? `HTTP ${statut}` : null, err?.message].filter(Boolean).join(" — ") ||
    "erreur inconnue"
  );
}

export class S3FileStorage implements FileStorage {
  /**
   * `delaiMs` borne l'opération ENTIÈRE, lecture du corps comprise, comme
   * `fetchAvecDelai` pour Supabase : le `requestTimeout` du SDK s'arrête aux
   * en-têtes de la réponse et, sans `throwOnRequestTimeout`, ne fait que
   * journaliser. Un signal d'abandon par opération coupe la requête et son
   * corps.
   */
  constructor(
    private readonly client: ClientS3,
    private readonly bucket: string,
    private readonly delaiMs: number,
  ) {}

  /**
   * Une opération : la clé vérifiée, l'échéance posée, toute erreur rendue en
   * `ErreurStockage`. `siAbsent` dit ce que vaut un objet absent pour cette
   * opération ; sans lui, l'absence est une erreur comme une autre.
   */
  private async appel<T>(
    operation: string,
    key: StorageKey,
    f: (cle: string, options: { abortSignal: AbortSignal }) => Promise<T>,
    siAbsent?: () => T,
  ): Promise<T> {
    const cle = verifierCleStockage(key);
    try {
      return await f(cle, { abortSignal: AbortSignal.timeout(this.delaiMs) });
    } catch (e) {
      if (e instanceof ErreurStockage) throw e;
      if (siAbsent && estAbsent(e)) return siAbsent();
      throw echecStockage("S3", operation, key, motifS3(e));
    }
  }

  async put(key: StorageKey, data: Buffer, mime: string): Promise<void> {
    // Même contrat que les autres pilotes : « Écrase si la clé existe déjà ».
    await this.appel("l'écriture", key, (cle, o) =>
      this.client.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: cle, Body: data, ContentType: mime }),
        o,
      ),
    );
  }

  async get(key: StorageKey): Promise<Buffer> {
    return this.appel(
      "la lecture",
      key,
      async (cle, o) => {
        // La même échéance pour la requête et la lecture du corps.
        const { Body } = (await this.client.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: cle }),
          o,
        )) as { Body?: { transformToByteArray(): Promise<Uint8Array> } };
        if (!Body) throw new FichierIntrouvable(key);
        const octets = await Body.transformToByteArray();
        // Une vue sur les octets reçus, pas une seconde copie.
        return Buffer.from(octets.buffer, octets.byteOffset, octets.byteLength);
      },
      () => {
        throw new FichierIntrouvable(key);
      },
    );
  }

  async delete(key: StorageKey): Promise<void> {
    // S3 ne signale pas l'absence à la suppression : supprimer une clé absente
    // ne lève rien, comme les autres pilotes. Une vraie erreur remonte.
    await this.appel("la suppression", key, (cle, o) =>
      this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: cle }), o),
    );
  }

  async exists(key: StorageKey): Promise<boolean> {
    return this.appel(
      "la vérification",
      key,
      async (cle, o) => {
        await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: cle }), o);
        return true;
      },
      () => false,
    );
  }
}
