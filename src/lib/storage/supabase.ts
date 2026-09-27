// Serveur seulement : la clé `service_role` et le client qui la porte ne
// doivent jamais entrer dans un bundle navigateur. Next remplace ce module
// par un module vide côté serveur, et par une erreur de compilation côté
// client (2026-09-27).
import "server-only";
import type { FileStorage, StorageKey } from "./types";
import { ErreurStockage, FichierIntrouvable } from "./erreurs";

/**
 * Pilote Supabase Storage du `FileStorage` (2026-09-27, `lot/stockage-supabase`).
 *
 * LE CONSTAT QUI L'APPELLE. Le seul pilote était `local` : il écrit dans
 * `process.cwd()/storage`. Sur Vercel, ce disque est en lecture seule et
 * éphémère — un dépôt de rapport, de pièce de prestataire ou d'analyse de
 * légionelles y échouait, ou disparaissait au déploiement suivant.
 *
 * CE QU'IL FAIT, ET NE FAIT PAS.
 * - Côté serveur seulement : il reçoit un client construit avec la clé
 *   `service_role` (`SUPABASE_SERVICE_ROLE_KEY`, jamais `NEXT_PUBLIC_…`), qui
 *   contourne les règles d'accès — d'où un bucket PRIVÉ, et aucune URL signée
 *   ni publique : les routes de l'application continuent de streamer le
 *   fichier après leur propre contrôle d'appartenance.
 * - Il est interchangeable : l'interface est `FileStorage`, et un pilote S3
 *   (migration prévue vers Clever Cloud) se branchera à côté, dans
 *   `getStorage()`, sans toucher aux appelants.
 * - Il ne dit jamais la clé de service dans une erreur : il nomme
 *   l'opération, la clé de stockage et le message du service.
 *
 * Le client est une interface minimale (`ClientStockage`) plutôt que le type
 * complet de supabase-js : c'est ce qui permet de le tester contre un double
 * sans réseau, et d'y brancher demain un autre SDK de même forme.
 */

type ErreurService = { message: string; status?: number; statusCode?: string };
type Reponse<T> = { data: T; error: null } | { data: T | null; error: ErreurService };

export interface BucketStockage {
  upload(
    chemin: string,
    corps: Buffer,
    options: { contentType: string; upsert: boolean },
  ): PromiseLike<Reponse<unknown>>;
  download(chemin: string): PromiseLike<Reponse<Blob | null>>;
  remove(chemins: string[]): PromiseLike<Reponse<unknown>>;
  list(
    dossier: string,
    options: { search: string; limit: number },
  ): PromiseLike<Reponse<{ name: string }[] | null>>;
}

export interface ClientStockage {
  storage: { from(bucket: string): BucketStockage };
}

/** « Absent » selon le service : 404, ou 400 « not found » (l'API de Storage rend l'un ou l'autre). */
function estAbsent(e: ErreurService): boolean {
  return (
    e.status === 404 ||
    e.statusCode === "404" ||
    ((e.status === 400 || e.statusCode === "400") && /not.?found/i.test(e.message))
  );
}

export class SupabaseFileStorage implements FileStorage {
  constructor(
    private readonly client: ClientStockage,
    private readonly bucket: string,
  ) {}

  /** Même règle que le pilote local : pas de remontée, pas de chemin absolu. */
  private verifier(key: StorageKey): string {
    if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
      throw new ErreurStockage(`Clé de stockage invalide : ${key}`);
    }
    return key;
  }

  private echec(operation: string, key: StorageKey, e: ErreurService): never {
    throw new ErreurStockage(
      `Stockage Supabase : échec de ${operation} pour « ${key} » (${e.message})`,
    );
  }

  private get api(): BucketStockage {
    return this.client.storage.from(this.bucket);
  }

  /**
   * L'appel au service, dont une exception brute (réseau, ou `exists` qui lève
   * hors 400/404) devient une `ErreurStockage` : l'appelant n'a qu'un type à
   * connaître, et le message ne porte que ce que le service a dit.
   */
  private async appel<T>(
    operation: string,
    key: StorageKey,
    f: () => PromiseLike<Reponse<T>>,
  ): Promise<Reponse<T>> {
    try {
      return await f();
    } catch (e) {
      if (e instanceof ErreurStockage) throw e;
      const message = e instanceof Error ? e.message : String(e);
      return this.echec(operation, key, { message });
    }
  }

  async put(key: StorageKey, data: Buffer, mime: string): Promise<void> {
    const cle = this.verifier(key);
    const { error } = await this.appel("l'écriture", key, () =>
      this.api.upload(cle, data, {
        contentType: mime,
        // Même contrat que le pilote local : « Écrase si la clé existe déjà ».
        upsert: true,
      }),
    );
    if (error) this.echec("l'écriture", key, error);
  }

  async get(key: StorageKey): Promise<Buffer> {
    const cle = this.verifier(key);
    const { data, error } = await this.appel("la lecture", key, () =>
      this.api.download(cle),
    );
    if (error) {
      if (estAbsent(error)) throw new FichierIntrouvable(key);
      this.echec("la lecture", key, error);
    }
    if (!data) throw new FichierIntrouvable(key);
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: StorageKey): Promise<void> {
    // `remove` d'une clé absente ne rend pas d'erreur côté Supabase : no-op,
    // comme le pilote local. Une vraie erreur (droits, réseau) remonte.
    const cle = this.verifier(key);
    const { error } = await this.appel("la suppression", key, () =>
      this.api.remove([cle]),
    );
    if (error && !estAbsent(error)) this.echec("la suppression", key, error);
  }

  /**
   * PAR `list`, PAS PAR `exists` — constaté contre un vrai service Storage
   * (`supabase/storage-api` v1.19, test d'intégration du 2026-09-27) :
   * `exists()` passe par une requête HEAD, et le service y a répondu « 400 Bad
   * Request » pour un fichier PRÉSENT comme pour un absent. Un `exists` qui ne
   * distingue rien n'est pas « fiable ». La liste du dossier, filtrée sur le
   * nom exact, l'est.
   */
  async exists(key: StorageKey): Promise<boolean> {
    const cle = this.verifier(key);
    const i = cle.lastIndexOf("/");
    const dossier = i === -1 ? "" : cle.slice(0, i);
    const nom = cle.slice(i + 1);
    const { data, error } = await this.appel("la vérification", key, () =>
      this.api.list(dossier, { search: nom, limit: 100 }),
    );
    if (error) {
      if (estAbsent(error)) return false;
      this.echec("la vérification", key, error);
    }
    // `search` est un préfixe : « a.pdf » trouverait « a.pdf.bak ». On veut le nom exact.
    return (data ?? []).some((o) => o.name === nom);
  }
}
